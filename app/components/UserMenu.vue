<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useUser, useAuth } from '@clerk/vue'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const { isSignedIn, user, isLoaded } = useUser()
const { signOut } = useAuth()

const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.fullName || `${user.value.firstName || ''} ${user.value.lastName || ''}`.trim() || ''
})

const userImageUrl = computed(() => {
  return user.value?.imageUrl || ''
})

const items = computed<DropdownMenuItem[][]>(() => {
  if (!isLoaded.value || !isSignedIn.value || !user.value) {
    return [[]]
  }

  return [[{
    type: 'label',
    label: displayName.value,
    avatar: userImageUrl.value
      ? {
          src: userImageUrl.value,
          alt: displayName.value || 'User'
        }
      : undefined
  }], [{
    label: 'Billing',
    icon: 'i-lucide-credit-card'
  }], [{
    label: 'Theme',
    icon: 'i-lucide-palette',
    children: [{
      label: 'Primary',
      slot: 'chip',
      chip: appConfig.ui.colors.primary,
      content: {
        align: 'center',
        collisionPadding: 16
      },
      children: colors.map(color => ({
        label: color,
        chip: color,
        slot: 'chip',
        checked: appConfig.ui.colors.primary === color,
        type: 'checkbox',
        onSelect: (e) => {
          e.preventDefault()

          appConfig.ui.colors.primary = color
        }
      }))
    }, {
      label: 'Neutral',
      slot: 'chip',
      chip: appConfig.ui.colors.neutral,
      content: {
        align: 'end',
        collisionPadding: 16
      },
      children: neutrals.map(color => ({
        label: color,
        chip: color,
        slot: 'chip',
        type: 'checkbox',
        checked: appConfig.ui.colors.neutral === color,
        onSelect: (e) => {
          e.preventDefault()

          appConfig.ui.colors.neutral = color
        }
      }))
    }]
  }, {
    label: 'Appearance',
    icon: 'i-lucide-sun-moon',
    children: [{
      label: 'Light',
      icon: 'i-lucide-sun',
      type: 'checkbox',
      checked: colorMode.value === 'light',
      onSelect(e: Event) {
        e.preventDefault()

        colorMode.preference = 'light'
      }
    }, {
      label: 'Dark',
      icon: 'i-lucide-moon',
      type: 'checkbox',
      checked: colorMode.value === 'dark',
      onUpdateChecked(checked: boolean) {
        if (checked) {
          colorMode.preference = 'dark'
        }
      },
      onSelect(e: Event) {
        e.preventDefault()
      }
    }]
  }], [{
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      signOut.value()
    }
  }]]
})
</script>

<template>
  <div v-if="!isLoaded" class="flex items-center justify-center p-2">
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      disabled
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin" />
    </UButton>
  </div>

  <UDropdownMenu
    v-else-if="isSignedIn"
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-(--ui-bg-elevated)"
      :ui="{
        trailingIcon: 'text-(--ui-text-dimmed)'
      }"
    >
      <template #leading>
        <UAvatar
          v-if="userImageUrl"
          :src="userImageUrl"
          :alt="displayName || 'User'"
          size="xs"
        />
        <UIcon v-else name="i-lucide-user" />
      </template>
      <span v-if="!collapsed">
        {{ displayName || 'User' }}
      </span>
      <template #trailing>
        <UIcon v-if="!collapsed" name="i-lucide-chevrons-up-down" />
      </template>
    </UButton>

    <template #chip-leading="{ item }">
      <span
        :style="{ '--chip': `var(--color-${(item as any).chip}-400)` }"
        class="ms-0.5 size-2 rounded-full bg-(--chip)"
      />
    </template>
  </UDropdownMenu>

  <UButton
    v-else
    color="neutral"
    variant="ghost"
    block
    :square="collapsed"
  >
    <UIcon name="i-lucide-user" />
    <span v-if="!collapsed">Sign In</span>
  </UButton>
</template>
