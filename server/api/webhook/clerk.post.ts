import { createClient } from '@supabase/supabase-js'
import type { WebhookEvent } from '@clerk/backend'
import type { RuntimeConfig } from 'nuxt/schema'
import { Webhook } from 'svix'

export default defineEventHandler(async (event) => {
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

  // Get the headers
  const svix_id = event.headers.get('svix-id')
  const svix_timestamp = event.headers.get('svix-timestamp')
  const svix_signature = event.headers.get('svix-signature')

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

  switch (type) {
    case 'user.created':
      await supabase
        .from('users')
        .insert({
          clerk_id: data.id,
          email: data.email_addresses[0]?.email_address,
          first_name: data.first_name,
          last_name: data.last_name,
          created_at: new Date(data.created_at).toISOString()
        })
      break

    case 'user.updated':
      await supabase
        .from('users')
        .update({
          email: data.email_addresses[0]?.email_address,
          first_name: data.first_name,
          last_name: data.last_name,
          updated_at: new Date().toISOString()
        })
        .match({ clerk_id: data.id })
      break

    case 'user.deleted':
      await supabase
        .from('users')
        .delete()
        .match({ clerk_id: data.id })
      break
  }

  return { success: true }
})
