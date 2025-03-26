import { useUser } from '@clerk/vue'

interface CheckoutResponse {
  url: string
}

export const useSubscription = () => {
  const { user } = useUser()

  const startCheckout = async (productId: string) => {
    console.log('Starting checkout for plan:', productId)
    try {
      const response = await $fetch<CheckoutResponse>('/api/checkout', {
        method: 'POST',
        params: {
          productId,
          customerExternalId: user.value?.id
        }
      })

      // Redirect to Polar's checkout page using Nuxt's navigation
      if (response.url) {
        await navigateTo(response.url, {
          external: true
        })
      }
    } catch (error) {
      console.error('Failed to start checkout:', error)
      throw error
    }
  }

  return {
    startCheckout
  }
}
