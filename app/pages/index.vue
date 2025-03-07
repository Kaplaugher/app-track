<script setup lang="ts">
const links = ref([
  {
    label: 'Get started',
    to: '/getting-started',
    icon: 'i-lucide-square-play'
  },
  {
    label: 'Learn more',
    to: '/getting-started/theme',
    color: 'primary' as const,
    variant: 'subtle' as const,
    trailingIcon: 'i-lucide-arrow-right'
  }
])
const features = ref([
  {
    title: 'Application Tracking',
    description: 'Keep track of all your job applications in one place with our intuitive dashboard.',
    icon: 'i-lucide-clipboard-list',
    to: '/features/tracking'
  },
  {
    title: 'AI Resume Optimization',
    description: 'Let our AI analyze and optimize your resume for each job application.',
    icon: 'i-lucide-sparkles',
    to: '/features/ai-resume'
  },
  {
    title: 'Job Analytics',
    description: 'Get insights into your application process and improve your success rate.',
    icon: 'i-lucide-bar-chart',
    to: '/features/analytics'
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
      label: 'Buy now'
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
      label: 'Buy now'
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
