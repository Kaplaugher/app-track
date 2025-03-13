<script setup lang="ts">
import type { Application, Resume } from '../../../db/schema'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
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
  htmlUrl: string
  customResumeId: number
  optimizedResumePreview: string
  instructions: string
  message: string
}

const props = defineProps<{
  application: Application | null
}>()

const open = ref(false)
const isGenerating = ref(false)
const customResumeUrl = ref<string | null>(null)
const customResumeInstructions = ref<string | null>(null)
const optimizedResumePreview = ref<string | null>(null)
const selectedResumeId = ref<number | null>(null)
const toast = useToast()
const fetchError = ref<string | null>(null)

// Reset state when modal is closed
watch(() => open.value, (newValue) => {
  if (!newValue) {
    selectedResumeId.value = null
    customResumeUrl.value = null
    customResumeInstructions.value = null
    optimizedResumePreview.value = null
    isGenerating.value = false
  }
})

// Expose the open method to parent components
defineExpose({ open })

// Fetch user's resumes
const { data: resumesResponse, pending: loadingResumes, error: resumesError } = await useFetch<ApiResponse<Resume[]>>('/api/resumes', {
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
  console.log('Resume response:', resumesResponse.value)
  if (resumesError.value || !resumesResponse.value?.success) return []

  const data = resumesResponse.value?.data
  return Array.isArray(data) ? data : []
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
      customResumeUrl.value = response.data.htmlUrl || response.data.fileUrl
      customResumeInstructions.value = response.data.instructions || 'Open the link to view your optimized resume.'
      optimizedResumePreview.value = response.data.optimizedResumePreview || null

      toast.add({
        title: 'Success',
        description: response.data.message || 'Custom resume generated successfully',
        icon: 'i-lucide-check',
        color: 'success'
      })
    } else {
      throw new Error(response.error || 'Failed to generate custom resume')
    }
  } catch (error) {
    console.error('Error generating custom resume:', error)

    // Provide more specific error messages based on the error
    let errorMessage = 'Failed to generate custom resume'

    if (error instanceof Error) {
      errorMessage = error.message
    }

    toast.add({
      title: 'Error',
      description: errorMessage,
      color: 'error',
      icon: 'i-lucide-alert-triangle'
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
              <span class="text-gray-500 flex items-center gap-1">Notes
                <UTooltip text="These notes will be used to optimize your resume">
                  <UIcon name="i-lucide-info" class="h-4 w-4 text-primary" />
                </UTooltip>
              </span>
              <p class="mt-1 text-sm p-2 border-l-2 border-primary rounded">
                {{ application.notes }}
              </p>
            </div>
            <div v-else class="col-span-2 mt-2">
              <UAlert
                title="No Notes Available"
                description="Adding job description or keywords in the notes field will help optimize your resume better."
                color="warning"
                variant="soft"
                icon="i-lucide-alert-triangle"
              />
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
            <span class="font-medium block mt-1">The notes field above is crucial for optimization - it should contain job requirements or keywords.</span>
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
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium">
                    Custom Resume Generated
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Your optimized resume is ready to view
                  </p>
                </div>
                <UButton
                  :to="customResumeUrl"
                  target="_blank"
                  label="View Resume"
                  icon="i-lucide-external-link"
                  color="primary"
                  variant="solid"
                />
              </div>

              <div v-if="customResumeInstructions" class="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-2 border-blue-500">
                <div class="flex items-start gap-2">
                  <UIcon name="i-lucide-info" class="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p>{{ customResumeInstructions }}</p>
                </div>
              </div>

              <div v-if="optimizedResumePreview" class="mt-2">
                <h5 class="text-sm font-medium mb-1">
                  Preview:
                </h5>
                <div class="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                  {{ optimizedResumePreview }}
                </div>
              </div>
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
