<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { Notification } from '~/types'

const { isNotificationsSlideoverOpen } = useDashboard()

const { data: notifications } = await useFetch<Notification[]>('/api/notifications')

// Function to determine the appropriate route based on notification content
function getNotificationRoute(notification: Notification): string {
  const body = notification.body.toLowerCase()
  if (body.includes('application status')) {
    return `/applications?id=${notification.id}`
  } else if (body.includes('resume') && (body.includes('parsed') || body.includes('analysis'))) {
    return `/resumes?id=${notification.id}`
  } else if (body.includes('custom resume')) {
    return `/custom-resumes?id=${notification.id}`
  } else if (body.includes('new application')) {
    return `/applications?id=${notification.id}&new=true`
  } else if (body.includes('job match')) {
    return `/job-matches?id=${notification.id}`
  } else {
    return `/dashboard?notification=${notification.id}`
  }
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Notifications"
  >
    <template #body>
      <NuxtLink
        v-for="notification in notifications"
        :key="notification.id"
        :to="getNotificationRoute(notification)"
        class="px-3 py-2.5 rounded-md hover:bg-(--ui-bg-elevated)/50 flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3"
      >
        <UChip
          color="error"
          :show="!!notification.unread"
          inset
        >
          <UAvatar
            v-bind="notification.sender.avatar"
            :alt="notification.sender.name"
            size="md"
          />
        </UChip>

        <div class="text-sm flex-1">
          <p class="flex items-center justify-between">
            <span class="text-(--ui-text-highlighted) font-medium">{{ notification.sender.name }}</span>

            <time
              :datetime="notification.date"
              class="text-(--ui-text-muted) text-xs"
              v-text="formatTimeAgo(new Date(notification.date))"
            />
          </p>

          <p class="text-(--ui-text-dimmed)">
            {{ notification.body }}
          </p>
        </div>
      </NuxtLink>
    </template>
  </USlideover>
</template>
