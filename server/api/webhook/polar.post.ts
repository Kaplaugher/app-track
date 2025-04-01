import { createClient } from '@supabase/supabase-js'
import type { RuntimeConfig } from 'nuxt/schema'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

type PolarWebhookEventType =
  | 'checkout.created' | 'checkout.updated'
  | 'customer.created' | 'customer.updated' | 'customer.deleted' | 'customer.state_changed'
  | 'order.created' | 'order.updated' | 'order.paid' | 'order.refunded'
  | 'subscription.created' | 'subscription.updated' | 'subscription.active'
  | 'subscription.canceled' | 'subscription.uncanceled' | 'subscription.revoked'
  | 'refund.created' | 'refund.updated'
  | 'product.created' | 'product.updated'
  | 'benefit.created' | 'benefit.updated'
  | 'benefit_grant.created' | 'benefit_grant.updated' | 'benefit_grant.revoked'
  | 'organization.updated'
  | 'pledge.created' | 'pledge.updated'

interface PolarWebhookEvent<T = unknown> {
  type: PolarWebhookEventType
  data: T
}

interface PolarSubscriptionData {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  amount: number
  currency: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  createdAt: string
  modifiedAt: string | null
  recurringInterval: string
  startedAt: string
  endsAt: string | null
  endedAt: string | null
  customerId: string
  discountId: string | null
  checkoutId: string
  customerCancellationReason: string | null
  customerCancellationComment: string | null
  priceId: string
  metadata: Record<string, unknown>
  customFieldData: Record<string, unknown>
  customer: {
    id: string
    email: string
    name: string
    externalId: string
    createdAt: string
    modifiedAt: string | null
    metadata: Record<string, unknown>
    emailVerified: boolean
    billingAddress?: {
      line1: string
      line2: string | null
      postalCode: string
      city: string
      state: string
      country: string
    }
    avatarUrl: string | null
  }
  product: {
    id: string
    name: string
    description: string
    recurringInterval: string
    isRecurring: boolean
    isArchived: boolean
    organizationId: string
    metadata: Record<string, unknown>
    createdAt: string
    modifiedAt: string | null
  }
  productId: string
  user: {
    id: string
    email: string
    publicName: string
    avatarUrl: string | null
    githubUsername: string | null
  }
}

interface PolarOrderData {
  subscription_id: string
  amount: number
  currency: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig() as RuntimeConfig
  const {
    private: { polarWebhookSecret, supabaseServiceKey },
    public: { supabaseUrl }
  } = config

  try {
    // Get the raw body and headers
    const body = await readRawBody(event)
    const headersObj: Record<string, string> = {}
    event.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value
    })

    if (!body) {
      throw createError({
        statusCode: 400,
        message: 'Missing request body'
      })
    }

    // Validate the webhook event
    const payload = validateEvent(
      body,
      headersObj,
      polarWebhookSecret
    ) as PolarWebhookEvent

    // Initialize Supabase client with service key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, data } = payload

    console.log('Received webhook type:', type)
    console.log('Webhook payload:', JSON.stringify(data, null, 2))

    switch (type) {
      // Subscription events
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        console.log('Entering subscription update case')
        const subData = data as PolarSubscriptionData
        try {
          const clerkId = subData.customer?.externalId
          console.log('Clerk User ID:', clerkId)

          if (!clerkId) {
            console.error('No Clerk ID found in customer external_id')
            throw new Error('Missing Clerk ID in customer data')
          }

          // Update the subscription
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .upsert({
              subscription_id: subData.id,
              user_id: clerkId,
              status: subData.status,
              plan_id: subData.product.id,
              current_period_end: new Date(subData.currentPeriodEnd).toISOString(),
              cancel_at: subData.canceledAt ? new Date(subData.canceledAt).toISOString() : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'subscription_id'
            })
            .select()

          if (subscriptionError) {
            console.error('Supabase subscription error:', subscriptionError)
            throw subscriptionError
          }

          console.log('Subscription upserted:', subscriptionData)

          // Then, create a payment record if this is a new subscription or renewal
          if (type === 'subscription.created' || type === 'subscription.active') {
            const { error: paymentError } = await supabase
              .from('subscription_payments')
              .insert({
                subscription_id: subData.id,
                amount: subData.amount,
                currency: subData.currency,
                status: 'succeeded',
                payment_date: new Date().toISOString(),
                created_at: new Date().toISOString()
              })

            if (paymentError) {
              console.error('Supabase payment error:', paymentError)
              throw paymentError
            }
          }

          console.log('Successfully updated subscription and payment records in database')
        } catch (error) {
          console.error('Error updating subscription:', error)
          throw error
        }
        break
      }

      case 'subscription.canceled': {
        const subData = data as PolarSubscriptionData
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            plan_id: subData.product.id // Ensure plan_id is maintained
          })
          .match({ subscription_id: subData.id })

        if (cancelError) {
          console.error('Error canceling subscription:', cancelError)
          throw cancelError
        }
        break
      }

      case 'subscription.uncanceled':
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            cancel_at: null,
            updated_at: new Date().toISOString()
          })
          .match({ subscription_id: (data as PolarSubscriptionData).id })
        break

      case 'subscription.revoked':
        await supabase
          .from('subscriptions')
          .update({
            status: 'revoked',
            updated_at: new Date().toISOString()
          })
          .match({ subscription_id: (data as PolarSubscriptionData).id })
        break

      // Order events
      case 'order.paid':
      case 'order.refunded': {
        const orderData = data as PolarOrderData
        const { error: paymentError } = await supabase
          .from('subscription_payments')
          .insert({
            id: crypto.randomUUID(), // Generate UUID for the payment
            subscription_id: orderData.subscription_id,
            amount: orderData.amount,
            currency: orderData.currency,
            status: type === 'order.paid' ? 'succeeded' : 'refunded',
            payment_date: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

        if (paymentError) {
          console.error('Error creating payment record:', paymentError)
          throw paymentError
        }
        break
      }

      // Customer events
      case 'customer.deleted':
        // Optional: Handle customer deletion if needed
        break

      default:
        // Log unhandled event types for monitoring
        console.log(`Unhandled webhook event type: ${type}`)
    }

    return { success: true }
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      throw createError({
        statusCode: 403,
        message: 'Invalid webhook signature'
      })
    }
    throw error
  }
})
