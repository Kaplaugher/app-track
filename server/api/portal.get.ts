// server/routes/api/portal.get.ts
export default defineEventHandler((event) => {
  const {
    private: { polarAccessToken, polarCheckoutSuccessUrl, polarServer }
  } = useRuntimeConfig()

  const customerPortalHandler = CustomerPortal({
    accessToken: polarAccessToken,
    server: polarServer as 'sandbox' | 'production',
    getCustomerId: (event) => {
      // Use your own logic to get the customer ID - from a database, session, etc.
      return Promise.resolve('9d89909b-216d-475e-8005-053dba7cff07')
    }
  })

  return customerPortalHandler(event)
})
