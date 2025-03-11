<script setup lang="ts">
import type { Resume } from '../db/schema'

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
  applicationId: number
}>()

const toast = useToast()
const isGenerating = ref(false)
const customResumeUrl = ref<string | null>(null)
const selectedResumeId = ref<number | null>(null)

// Fetch user's resumes
const { data: resumesResponse, pending: loadingResumes, error: resumesError } = await useFetch<ApiResponse<ResumesResponse>>('/api/resumes')
const resumes = computed(() => {
  if (!resumesResponse.value?.success) return []
  return resumesResponse.value?.data?.data || []
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
  <div class="custom-resume-generator">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Generate Custom Resume
          </h3>
        </div>
      </template>

      <div v-if="loadingResumes" class="flex justify-center py-4">
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
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Select a resume to customize for this job application. We'll analyze the job details and tailor your resume to highlight relevant skills and experience.
        </p>

        <UFormGroup label="Select Resume" required>
          <URadioGroup v-model="selectedResumeId">
            <div class="space-y-2">
              <URadio
                v-for="resume in resumes"
                :key="resume.id"
                :value="resume.id"
                :label="resume.title"
                :help="resume.isDefault ? 'Default resume' : undefined"
              />
            </div>
          </URadioGroup>
        </UFormGroup>

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
