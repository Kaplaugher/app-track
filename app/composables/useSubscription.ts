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
        body: {
          external_customer_id: user.value?.id,
          product_id: productId
        }
      })

      // Redirect to Polar's checkout page
      if (response.url) {
        window.location.href = response.url
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
