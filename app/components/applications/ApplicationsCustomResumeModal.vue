<script setup lang="ts">
import type { Application, Resume } from '../../../db/schema'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface ResumesResponse {
  data: Resume[]
}

interface CustomResumeResponse {
  customResume: {
    id: number
    userId: string
    title: string
    fileUrl: string
    originalResumeId: number
    applicationId: number
    customizations: string[]
    createdAt: string
    updatedAt: string
  }
  fileUrl: string
}

const props = defineProps<{
  application: Application | null
}>()

const open = ref(false)
const isGenerating = ref(false)
const customResumeUrl = ref<string | null>(null)
const selectedResumeId = ref<number | null>(null)
const toast = useToast()
const fetchError = ref<string | null>(null)

// Reset state when modal is closed
watch(() => open.value, (newValue) => {
  if (!newValue) {
    selectedResumeId.value = null
    customResumeUrl.value = null
    isGenerating.value = false
  }
})

// Expose the open method to parent components
defineExpose({ open })

// Fetch user's resumes
const { data: resumesResponse, pending: loadingResumes, error: resumesError } = await useFetch<ApiResponse<ResumesResponse>>('/api/resumes', {
  onResponseError(error) {
    console.error('Error fetching resumes:', error)
    const errorMessage = error.response?._data?.message || error.response?.statusText || ''
    if (errorMessage.includes('relation "resumes" does not exist')
      || error.response?.statusText?.includes('relation "resumes" does not exist')) {
      fetchError.value = 'The resumes feature is not set up yet. Please set up the resumes table first.'
    } else {
      fetchError.value = 'Failed to load resumes. Please try again later.'
    }
  }
})

const resumes = computed(() => {
  if (resumesError.value || !resumesResponse.value?.success) return []
  return resumesResponse.value?.data?.data || []
})

// Handle resume generation
async function generateCustomResume() {
  if (!selectedResumeId.value || !props.application) {
    toast.add({
      title: 'Error',
      description: 'Please select a resume to customize',
      color: 'error'
    })
    return
  }

  isGenerating.value = true

  try {
    const response = await $fetch<ApiResponse<CustomResumeResponse>>('/api/resumes/customize', {
      method: 'POST',
      body: {
        resumeId: selectedResumeId.value,
        applicationId: props.application.id
      }
    })

    if (response.success && response.data) {
      customResumeUrl.value = response.data.fileUrl
      toast.add({
        title: 'Success',
        description: 'Custom resume generated successfully',
        icon: 'i-lucide-check',
        color: 'success'
      })
    } else {
      throw new Error(response.error || 'Failed to generate custom resume')
    }
  } catch (error) {
    console.error('Error generating custom resume:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to generate custom resume',
      color: 'error'
    })
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Generate Custom Resume" description="Create a tailored resume for this job application">
    <template #body>
      <div v-if="!application" class="py-4 text-center text-gray-500">
        No application selected
      </div>

      <div v-else-if="fetchError" class="py-4 text-center">
        <UIcon name="i-lucide-alert-triangle" class="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <p class="text-gray-700 dark:text-gray-300 font-medium mb-2">
          Database Error
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {{ fetchError }}
        </p>
        <UButton
          label="Close"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
      </div>

      <div v-else class="space-y-4">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <h4 class="font-medium mb-2">
            Application Details
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-gray-500">Company:</span>
              <span class="ml-2 font-medium">{{ application.companyName }}</span>
            </div>
            <div>
              <span class="text-gray-500">Position:</span>
              <span class="ml-2 font-medium">{{ application.jobTitle }}</span>
            </div>
            <div v-if="application.notes" class="col-span-2">
              <span class="text-gray-500">Notes:</span>
              <p class="mt-1 text-sm">
                {{ application.notes }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="loadingResumes" class="flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-gray-500" />
        </div>

        <div v-else-if="resumes.length === 0" class="text-center py-4">
          <p class="text-gray-500 mb-3">
            You need to upload a resume first
          </p>
          <UButton
            to="/dashboard/resume"
            label="Upload Resume"
            icon="i-lucide-upload"
            color="primary"
            variant="outline"
          />
        </div>

        <div v-else>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select a resume to customize for this job application. We'll analyze the job details and tailor your resume to highlight relevant skills and experience.
          </p>

          <UFormField label="Select Resume" required>
            <URadioGroup
              v-model="selectedResumeId"
              :items="resumes.map(resume => ({
                value: resume.id,
                label: resume.title,
                help: resume.isDefault ? 'Default resume' : undefined
              }))"
            />
          </UFormField>

          <div v-if="customResumeUrl" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium">
                  Custom Resume Generated
                </h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Your custom resume is ready to download
                </p>
              </div>
              <UButton
                :to="customResumeUrl"
                target="_blank"
                label="View Resume"
                icon="i-lucide-external-link"
                color="primary"
                variant="outline"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!fetchError" class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Generate Custom Resume"
          icon="i-lucide-sparkles"
          color="primary"
          variant="solid"
          :loading="isGenerating"
          :disabled="!selectedResumeId || isGenerating"
          @click="generateCustomResume"
        />
      </div>
    </template>
  </UModal>
</template>
