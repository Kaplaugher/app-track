<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

const { startCheckout } = useSubscription()

const features = ref([
  {
    title: 'Application Tracking',
    description: 'Keep track of all your job applications in one place with our intuitive dashboard.',
    icon: 'i-lucide-clipboard-list'

  },
  {
    title: 'AI Resume Optimization',
    description: 'Let our AI analyze and optimize your resume for each job application.',
    icon: 'i-lucide-sparkles'

  },
  {
    title: 'Job Analytics',
    description: 'Get insights into your application process and improve your success rate.',
    icon: 'i-lucide-bar-chart'

  }
])
const plans = ref([
  {
    title: 'Free',
    description: 'Tailored for indie hackers.',
    price: '$0',
    features: [
      'Application Tracking',
      'Lifetime access'
    ],
    button: {
      label: 'Start for free'
    }
  },
  {
    title: 'Pro',
    description: 'Best suited for small teams.',
    price: '$10/month',
    features: [
      'Browser Extension',
      'AI Resume Review',
      'Ghost Job Analysis'
    ],
    button: {
      label: 'Buy now',
      onClick: () => {
        startCheckout('1e52daf4-c3f4-452f-812d-e4bb644994be')
      }
    }
  }

])
</script>

<template>
  <UPage>
    <UPageHero
      title="Smart Job Application Tracking"
      description="Track your job applications, optimize your resume with AI, and increase your chances of landing your dream job with PrimeFit's comprehensive application management system."
      headline="Launch Your Career"
      orientation="horizontal"
      :links="links"
    >
      <img
        src="https://ui.nuxt.com/templates/dashboard1.png"
        alt="PrimeFit dashboard screenshot"
        class="rounded-lg shadow-2xl ring ring-(--ui-border)"
      >
    </UPageHero>
    <UPageSection
      title="Streamline Your Job Search"
      description="PrimeFit provides powerful tools to organize your job search, optimize your applications, and track your progress towards your next career move."
      :features="features"
    />
    <UPricingPlans :plans="plans" />
  </UPage>
</template>
