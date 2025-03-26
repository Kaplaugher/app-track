import { Polar } from '@polar-sh/sdk'

interface PolarError {
  statusCode?: number
  message?: string
}

export default defineEventHandler(async (event) => {
  try {
    const { productId, customerExternalId } = getQuery(event)
    const config = useRuntimeConfig()

    if (!productId || !customerExternalId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required parameters: productId or customerExternalId'
      })
    }

    const polar = new Polar({
      accessToken: config.private.polarAccessToken,
      server: config.private.polarServer as 'sandbox' | 'production'
    })

    const response = await polar.checkouts.create({
      productId: productId as string,
      customerExternalId: customerExternalId as string,
      successUrl: config.private.polarCheckoutSuccessUrl
    })

    return response
  } catch (error) {
    console.error('Checkout error:', error)
    const polarError = error as PolarError

    if (polarError.statusCode === 404) {
      throw createError({
        statusCode: 404,
        message: 'Product not found'
      })
    }
    throw createError({
      statusCode: polarError.statusCode || 500,
      message: polarError.message || 'Failed to create checkout session'
    })
  }
})
