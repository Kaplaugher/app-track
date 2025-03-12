<script setup lang="ts">
import type { Resume, Application } from '../../../db/schema'

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
}

const props = defineProps<{
  applicationId: number
}>()

const toast = useToast()
const isGenerating = ref(false)
const customResumeUrl = ref<string | null>(null)
const selectedResumeId = ref<number | null>(null)

// Fetch application details
const { data: applicationResponse, pending: loadingApplication } = await useFetch<ApiResponse<{ application: Application }>>(`/api/applications/${props.applicationId}`)
const application = computed(() => applicationResponse.value?.data?.application || null)

// Fetch user's resumes
const { data: resumesResponse, pending: loadingResumes, error: resumesError } = await useFetch<ApiResponse<Resume[]>>('/api/resumes')
const resumes = computed(() => {
  console.log('Resume response (standalone):', resumesResponse.value)
  if (!resumesResponse.value?.success) return []

  const data = resumesResponse.value?.data
  return Array.isArray(data) ? data : []
})

// Handle resume generation
async function generateCustomResume() {
  if (!selectedResumeId.value) {
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
        applicationId: props.applicationId
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
  <div class="custom-resume-generator">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Generate Custom Resume
          </h3>
        </div>
      </template>

      <div v-if="loadingApplication || loadingResumes" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-gray-500" />
      </div>

      <div v-else-if="resumesError" class="text-center py-4 text-red-500">
        <p>Failed to load resumes. Please try again.</p>
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

      <div v-else class="space-y-4">
        <div v-if="application" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
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
              <p class="mt-1 text-sm p-2 bg-primary-50 dark:bg-primary-950 border-l-2 border-primary rounded">
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

        <p class="text-sm text-gray-600 dark:text-gray-400">
          Select a resume to customize for this job application. We'll analyze the job details and tailor your resume to highlight relevant skills and experience.
          <span v-if="application" class="font-medium block mt-1">The notes field above is crucial for optimization - it should contain job requirements or keywords.</span>
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

        <div class="flex justify-end">
          <UButton
            label="Generate Custom Resume"
            icon="i-lucide-sparkles"
            color="primary"
            :loading="isGenerating"
            :disabled="!selectedResumeId"
            @click="generateCustomResume"
          />
        </div>

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
    </UCard>
  </div>
</template>
