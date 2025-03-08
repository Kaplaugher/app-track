<script setup lang="ts">
const props = withDefaults(defineProps<{
  count?: number
  selectedIds?: number[]
}>(), {
  count: 0,
  selectedIds: () => []
})

const open = ref(false)
const isDeleting = ref(false)
const toast = useToast()

// Expose the open ref
defineExpose({ open })

interface DeleteResponse {
  success: boolean
  data?: {
    deleted: number
    ids: number[]
  }
  error?: string
}

async function onSubmit() {
  if (!props.selectedIds.length) return

  isDeleting.value = true

  try {
    // Send delete request to the API
    const response = await $fetch<DeleteResponse>('/api/applications/delete', {
      method: 'POST',
      body: {
        ids: props.selectedIds
      }
    })

    if (response.success) {
      toast.add({
        title: 'Success',
        description: `${response.data?.deleted || 0} application(s) deleted successfully`,
        color: 'success'
      })

      // Refresh the applications list
      refreshNuxtData('applications')
    } else {
      throw new Error(response.error || 'Failed to delete applications')
    }

    // Close modal
    open.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete applications. Please try again.',
      color: 'error'
    })
    console.error('Error deleting applications:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Delete ${props.count} application${props.count > 1 ? 's' : ''}`"
    :description="`Are you sure? This action cannot be undone.`"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          :loading="isDeleting"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
