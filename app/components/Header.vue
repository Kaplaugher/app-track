<script setup lang="ts">
const route = useRoute()

const items = computed(() => [
  {
    label: 'Dashboard',
    to: '/dashboard',
    active: route.path.startsWith('/dashboard')
  }

])
</script>

<template>
  <UHeader>
    <template #title>
      <h1 class="text-2xl font-bold text-white">
        PrimeFit
      </h1>
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UTooltip text="Open on GitHub" :kbds="['meta', 'G']">
        <UButton
          color="neutral"
          variant="ghost"
          to="https://github.com/nuxt/ui"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
        />
      </UTooltip>

      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </template>
  </UHeader>
</template>
