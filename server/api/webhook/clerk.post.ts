import { createClient } from '@supabase/supabase-js'
import type { WebhookEvent } from '@clerk/backend'
import type { RuntimeConfig } from 'nuxt/schema'
import { Webhook } from 'svix'

interface WebhookError extends Error {
  statusCode?: number
  statusMessage?: string
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig() as RuntimeConfig
    const {
      private: { supabaseServiceKey, clerkWebhookSecret },
      public: { supabaseUrl }
    } = config

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the webhook payload as a string
    const rawBody = await readRawBody(event)
    if (!rawBody) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing request body'
      })
    }

    // Get the webhook payload
    const payload = await readBody<WebhookEvent>(event)
    console.log('Received webhook payload:', { type: payload.type, id: payload.data.id })

    // Get the headers - using getHeader() which is compatible with h3 in Cloudflare
    const svix_id = getHeader(event, 'svix-id')
    const svix_timestamp = getHeader(event, 'svix-timestamp')
    const svix_signature = getHeader(event, 'svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing webhook headers'
      })
    }

    // Verify webhook signature
    try {
      const wh = new Webhook(clerkWebhookSecret)
      wh.verify(rawBody.toString(), {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature
      })
    } catch (err) {
      console.error('Webhook signature verification failed:', err instanceof Error ? err.message : String(err))
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid webhook signature'
      })
    }

    const { type, data } = payload
    console.log('Processing webhook type:', type)

    try {
      let result
      switch (type) {
        case 'user.created':
          result = await supabase
            .from('users')
            .insert({
              clerk_id: data.id,
              email: data.email_addresses[0]?.email_address,
              first_name: data.first_name,
              last_name: data.last_name,
              created_at: new Date(data.created_at).toISOString()
            })
          console.log('User created result:', result)
          break

        case 'user.updated':
          result = await supabase
            .from('users')
            .update({
              email: data.email_addresses[0]?.email_address,
              first_name: data.first_name,
              last_name: data.last_name,
              updated_at: new Date().toISOString()
            })
            .match({ clerk_id: data.id })
          console.log('User updated result:', result)
          break

        case 'user.deleted':
          result = await supabase
            .from('users')
            .delete()
            .match({ clerk_id: data.id })
          console.log('User deleted result:', result)
          break

        default:
          console.log('Unhandled webhook type:', type)
      }
    } catch (dbError: unknown) {
      console.error('Database operation failed:', dbError instanceof Error ? dbError.message : String(dbError))
      throw createError({
        statusCode: 500,
        statusMessage: 'Database operation failed'
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Webhook processing failed:', error instanceof Error ? error.message : String(error))
    const webhookError = error as WebhookError
    const statusCode = webhookError.statusCode || 500
    const statusMessage = webhookError.statusMessage || 'Internal server error occurred'

    throw createError({
      statusCode,
      statusMessage
    })
  }
})
