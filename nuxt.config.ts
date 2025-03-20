// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui-pro',
    '@vueuse/nuxt',
    '@clerk/nuxt',
    '@polar-sh/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Server-side only environment variables
    apifyToken: process.env.APIFY_TOKEN,
    geminiApiKey: process.env.GEMINI_API_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

    // Polar configuration
    private: {
      polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
      polarCheckoutSuccessUrl: process.env.POLAR_CHECKOUT_SUCCESS_URL,
      polarServer: process.env.POLAR_SERVER || 'sandbox',
      polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET
    },

    // Variables exposed to the client
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  future: {
    compatibilityVersion: 4
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
