<script setup lang="ts">

</script>

<template>
  <UHeader>
    <template #title>
      <h1 class="text-2xl font-bold text-white">
        AppTrack
      </h1>
    </template>

    <a href="/dashboard">Dashboard</a>

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
