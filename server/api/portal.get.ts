// server/routes/api/portal.get.ts
export default defineEventHandler((event) => {
  const {
    private: { polarAccessToken, polarServer }
  } = useRuntimeConfig()

  const customerPortalHandler = CustomerPortal({
    accessToken: polarAccessToken,
    server: polarServer as 'sandbox' | 'production',
    getCustomerId: (event) => {
      const { userId } = event.context.auth
      console.log('userId', userId)
      if (!userId) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: User not signed in'
        })
      }
      return Promise.resolve(userId)
    }
  })

  return customerPortalHandler(event)
})
