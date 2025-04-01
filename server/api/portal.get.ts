// server/routes/api/portal.get.ts
import { Polar } from '@polar-sh/sdk'

export default defineEventHandler(async (event) => {
  const {
    private: { polarAccessToken }
  } = useRuntimeConfig()

  const polar = new Polar({
    accessToken: polarAccessToken
  })

  const { userId } = event.context.auth
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: User not signed in'
    })
  }

  try {
    const result = await polar.customerSessions.create({
      customerId: 'e777ba37-a247-48ce-b1ae-d81d387c4257' // TODO: Replace with actual user mapping
    })

    return sendRedirect(event, result.customerPortalUrl)
  } catch (error) {
    console.error('Error creating customer session:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create customer portal session'
    })
  }
})
