import { clerkMiddleware } from '@clerk/nuxt/server'

export default clerkMiddleware((event) => {
  const { userId } = event.context.auth

  // Allow webhook routes to be public
  if (event.path.match(/^\/api\/webhook.*/)) {
    console.log('Webhook route')
    return
  }

  const isAdminRoute = event.path.startsWith('/dashboard')

  if (!userId && isAdminRoute) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User not signed in'
    })
  }
})
