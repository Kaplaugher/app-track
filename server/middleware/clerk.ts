import { clerkMiddleware } from '@clerk/nuxt/server'

export default clerkMiddleware((event) => {
  const { userId } = event.context.auth
  const isAdminRoute = event.path.startsWith('/dashboard')

  if (!userId && isAdminRoute) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User not signed in'
    })
  }
})
