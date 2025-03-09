<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Application } from '../../../db/schema'

const props = defineProps<{
  application: Application | null
}>()

const schema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  jobTitle: z.string().min(2, 'Job title is too short'),
  email: z.string().email('Invalid email'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid amount (e.g. 75000 or 75000.00)'),
  status: z.string().default('pending'),
  notes: z.string().optional(),
  favorite: z.boolean().default(false)
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  companyName: '',
  jobTitle: '',
  email: '',
  amount: '',
  status: 'pending',
  notes: '',
  favorite: false
})

// Update state when application prop changes
watch(() => props.application, (newApplication) => {
  if (newApplication) {
    state.companyName = newApplication.companyName
    state.jobTitle = newApplication.jobTitle
    state.email = newApplication.email
    state.amount = String(newApplication.amount)
    state.status = newApplication.status
    state.notes = newApplication.notes || ''
    state.favorite = newApplication.favorite
  }
}, { immediate: true })

const statusItems = [
  { label: 'Pending', value: 'pending' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' }
]

const toast = useToast()
const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.application) return

  isSubmitting.value = true

  try {
    // Send data to the API
    await $fetch(`/api/applications/${props.application.id}`, {
      method: 'PUT',
      body: {
        companyName: event.data.companyName,
        jobTitle: event.data.jobTitle,
        email: event.data.email,
        status: event.data.status,
        amount: event.data.amount,
        notes: event.data.notes,
        favorite: event.data.favorite
      }
    })

    toast.add({
      title: 'Success',
      description: `Application for ${event.data.companyName} updated`,
      color: 'success'
    })

    // Close modal
    open.value = false

    // Refresh the applications list
    refreshNuxtData('applications')
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to update application. Please try again.',
      color: 'error'
    })
    console.error('Error updating application:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Expose the open method to parent components
defineExpose({ open })
</script>

<template>
  <UModal v-model:open="open" title="Edit Application" description="Update job application details">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Company Name" placeholder="Acme Inc." name="companyName">
          <UInput v-model="state.companyName" class="w-full" />
        </UFormField>
        <UFormField label="Job Title" placeholder="Software Engineer" name="jobTitle">
          <UInput v-model="state.jobTitle" class="w-full" />
        </UFormField>
        <UFormField label="Email" placeholder="recruiter@company.com" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <UFormField label="Salary Amount" placeholder="75000" name="amount">
          <UInput v-model="state.amount" class="w-full" />
        </UFormField>
        <UFormField label="Status" name="status">
          <USelect
            v-model="state.status"
            :items="statusItems"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Notes" name="notes">
          <UTextarea v-model="state.notes" class="w-full" />
        </UFormField>
        <UFormField label="Favorite" name="favorite">
          <UCheckbox v-model="state.favorite" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Update"
            color="primary"
            variant="solid"
            type="submit"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
