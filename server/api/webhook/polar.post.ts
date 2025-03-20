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
  customer_id: string
  status: string
  plan_id: string
  current_period_end: string
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

    switch (type) {
      // Subscription events
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        const subData = data as PolarSubscriptionData
        await supabase
          .from('subscriptions')
          .upsert({
            subscription_id: subData.id,
            user_id: subData.customer_id,
            status: subData.status,
            plan_id: subData.plan_id,
            current_period_end: subData.current_period_end,
            cancel_at: null,
            updated_at: new Date().toISOString()
          })
        break
      }

      case 'subscription.canceled':
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .match({ subscription_id: (data as PolarSubscriptionData).id })
        break

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
        await supabase
          .from('subscription_payments')
          .insert({
            subscription_id: orderData.subscription_id,
            amount: orderData.amount,
            currency: orderData.currency,
            status: type === 'order.paid' ? 'succeeded' : 'refunded',
            payment_date: new Date().toISOString()
          })
        break
      }

      // Customer events
      case 'customer.deleted':
        // Optional: Handle customer deletion if needed
        break

      // Other events we might want to handle in the future
      case 'benefit_grant.created':
      case 'benefit_grant.updated':
      case 'benefit_grant.revoked':
        // Handle benefit grants if needed
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
