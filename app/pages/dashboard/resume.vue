<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const fileRef = ref<HTMLInputElement>()
const resumeFile = ref<File | null>(null)
const resumePreviewUrl = ref<string | null>(null)
const isUploading = ref(false)
const toast = useToast()

// Define schema for resume form
const resumeSchema = z.object({
  title: z.string().min(2, 'Title is too short'),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  resumeFile: z.any().optional() // We'll handle file validation separately
})

type ResumeSchema = z.output<typeof resumeSchema>

const resumeState = reactive<Partial<ResumeSchema>>({
  title: '',
  description: '',
  isDefault: false
})

// Define a type for the resume response
interface ResumeResponse {
  success: boolean
  data?: Resume[]
  error?: string
}

// Define a type for a resume
interface Resume {
  id: number
  userId: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
  isDefault: boolean
  parsedContent: unknown
  createdAt: Date
  updatedAt: Date
}

// Define a type for custom resume
interface CustomResume {
  id: number
  userId: string
  originalResumeId: number
  applicationId: number
  title: string
  fileUrl: string
  customizations: string[]
  createdAt: string
  updatedAt: string
  application?: {
    companyName: string
    jobTitle: string
  }
}

// Define a type for dropdown menu items
interface DropdownMenuItem {
  label?: string
  icon?: string
  color?: 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
  to?: string
  target?: string
  onSelect?: (e: Event) => void
}

// Fetch user's resumes
const { data: resumesResponse, refresh: refreshResumes, pending: loadingResumes } = await useFetch<ResumeResponse>('/api/resumes')
const resumes = computed(() => {
  if (!resumesResponse.value?.success) return []
  return resumesResponse.value?.data || []
})

// Fetch user's custom resumes
const { data: customResumesResponse, refresh: refreshCustomResumes, pending: loadingCustomResumes } = await useFetch<{ success: boolean, data?: CustomResume[], error?: string }>('/api/resumes/custom')
const customResumes = computed(() => {
  if (!customResumesResponse.value?.success) return []
  return customResumesResponse.value?.data || []
})

// Format date function
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

// Create dropdown items for each resume
const getDropdownItems = (resume: Resume): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[][] = [
    [
      {
        label: 'Download',
        icon: 'i-lucide-download',
        to: resume.fileUrl,
        target: '_blank'
      }
    ]
  ]

  if (!resume.isDefault) {
    items.push([
      {
        label: 'Set as default',
        icon: 'i-lucide-check',
        onSelect: () => setAsDefault(resume.id)
      }
    ])
  }

  items.push([
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => deleteResume(resume.id)
    }
  ])

  return items
}

// Create dropdown items for each custom resume
const getCustomResumeDropdownItems = (resume: CustomResume): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[][] = [
    [
      {
        label: 'View',
        icon: 'i-lucide-eye',
        to: `/resume-viewer/${resume.id}`,
        target: '_blank'
      }
    ],
    [
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => deleteCustomResume(resume.id)
      }
    ]
  ]

  return items
}

// Handle file selection
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  const file = input.files[0]!
  resumeFile.value = file

  // Only create preview URL for PDF files
  if (file.type === 'application/pdf') {
    resumePreviewUrl.value = URL.createObjectURL(file)
  } else {
    resumePreviewUrl.value = null
  }

  // Auto-populate title with filename (without extension)
  const fileName = file.name.split('.').slice(0, -1).join('.')
  resumeState.title = fileName || 'My Resume'
}

function onFileClick() {
  fileRef.value?.click()
}

// Handle form submission
async function onSubmit(_event: FormSubmitEvent<ResumeSchema>) {
  if (!resumeFile.value) {
    toast.add({
      title: 'Error',
      description: 'Please select a resume file to upload',
      color: 'error'
    })
    return
  }

  isUploading.value = true

  try {
    // Create form data for the file upload
    const formData = new FormData()
    formData.append('file', resumeFile.value)
    formData.append('title', resumeState.title || '')

    if (resumeState.description) {
      formData.append('description', resumeState.description)
    }

    formData.append('isDefault', resumeState.isDefault ? 'true' : 'false')

    // Upload the resume
    const response = await $fetch('/api/resumes', {
      method: 'POST',
      body: formData
    })

    if (!response.success) {
      throw new Error((response as { error?: string }).error || 'Failed to upload resume')
    }

    toast.add({
      title: 'Success',
      description: 'Your resume has been uploaded successfully',
      icon: 'i-lucide-check',
      color: 'success'
    })

    // Reset form
    resumeState.title = ''
    resumeState.description = ''
    resumeState.isDefault = false
    resumeFile.value = null
    resumePreviewUrl.value = null

    if (fileRef.value) {
      fileRef.value.value = ''
    }

    // Refresh the resumes list
    refreshResumes()
  } catch (error) {
    console.error('Error uploading resume:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to upload resume. Please try again.',
      color: 'error'
    })
  } finally {
    isUploading.value = false
  }
}

// Function to delete a resume
async function deleteResume(id: number) {
  try {
    const response = await $fetch(`/api/resumes/${id}`, {
      method: 'DELETE'
    })

    if (!response.success) {
      // Use type assertion to access the error property
      const errorResponse = response as { success: boolean, error?: string }
      throw new Error(errorResponse.error || 'Failed to delete resume')
    }

    toast.add({
      title: 'Deleted',
      description: 'Resume has been removed',
      color: 'info'
    })

    // Refresh the resumes list
    refreshResumes()
  } catch (error) {
    console.error('Error deleting resume:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to delete resume',
      color: 'error'
    })
  }
}

// Function to delete a custom resume
async function deleteCustomResume(id: number) {
  try {
    const response = await $fetch<{ success: boolean, data?: { id: number, message: string }, error?: string }>(`/api/resumes/custom/${id}`, {
      method: 'DELETE'
    })

    if (!response.success) {
      // Use type assertion to access the error property
      const errorResponse = response as { success: boolean, error?: string }
      throw new Error(errorResponse.error || 'Failed to delete custom resume')
    }

    toast.add({
      title: 'Deleted',
      description: 'Custom resume has been removed',
      color: 'info'
    })

    // Refresh the custom resumes list
    refreshCustomResumes()
  } catch (error) {
    console.error('Error deleting custom resume:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to delete custom resume',
      color: 'error'
    })
  }
}

// Function to set a resume as default
async function setAsDefault(id: number) {
  try {
    const response = await $fetch(`/api/resumes/${id}/default`, {
      method: 'PUT'
    })

    if (!response.success) {
      // Use type assertion to access the error property
      const errorResponse = response as { success: boolean, error?: string }
      throw new Error(errorResponse.error || 'Failed to update resume')
    }

    toast.add({
      title: 'Updated',
      description: 'Default resume has been updated',
      color: 'success'
    })

    // Refresh the resumes list
    refreshResumes()
  } catch (error) {
    console.error('Error setting default resume:', error)
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to update resume',
      color: 'error'
    })
  }
}
</script>

<template>
  <UDashboardPanel id="resume">
    <template #header>
      <UDashboardNavbar title="Resume Management" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Upload new resume section -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                Upload New Resume
              </h2>
            </div>
          </template>

          <UForm
            :schema="resumeSchema"
            :state="resumeState"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              name="resumeFile"
              label="Resume File"
              description="Upload your resume in PDF, DOCX, or TXT format. Max 5MB."
              required
            >
              <div class="flex flex-col gap-4">
                <div
                  class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  @click="onFileClick"
                >
                  <UIcon name="i-lucide-file-text" class="size-12 mx-auto mb-2 text-gray-400" />
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    <span v-if="!resumeFile">Drag and drop your resume here, or click to browse</span>
                    <span v-else>{{ resumeFile.name }} ({{ (resumeFile.size / 1024).toFixed(0) }}KB)</span>
                  </p>
                </div>

                <input
                  ref="fileRef"
                  type="file"
                  class="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                  @change="onFileChange"
                >

                <div v-if="resumePreviewUrl" class="mt-2">
                  <p class="text-sm font-medium mb-1">
                    Preview:
                  </p>
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-eye"
                    :to="resumePreviewUrl"
                    target="_blank"
                    label="View PDF"
                  />
                </div>
              </div>
            </UFormField>

            <UFormField
              name="title"
              label="Resume Title"
              description="Give your resume a descriptive name"
              required
            >
              <UInput v-model="resumeState.title" />
            </UFormField>

            <UFormField
              name="description"
              label="Description"
              description="Optional notes about this resume version"
            >
              <UTextarea v-model="resumeState.description" :rows="3" />
            </UFormField>

            <UFormField
              name="isDefault"
              label="Set as default resume"
            >
              <UCheckbox v-model="resumeState.isDefault" />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                color="primary"
                :loading="isUploading"
                label="Upload Resume"
                icon="i-lucide-upload"
              />
            </div>
          </UForm>
        </UCard>

        <!-- Existing resumes section -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                Your Resumes
              </h2>
            </div>
          </template>

          <div v-if="loadingResumes" class="py-8 text-center">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-12 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400">
              Loading resumes...
            </p>
          </div>

          <div v-else-if="resumes.length === 0" class="py-8 text-center">
            <UIcon name="i-lucide-file-question" class="size-12 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400">
              No resumes uploaded yet
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="resume in resumes"
              :key="resume.id"
              class="p-4 border rounded-lg flex items-start justify-between gap-4"
            >
              <div class="flex items-start gap-3">
                <UIcon name="i-lucide-file-text" class="size-8 text-primary-500 mt-1" />
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium">
                      {{ resume.title }}
                    </h3>
                    <UBadge
                      v-if="resume.isDefault"
                      color="primary"
                      size="xs"
                      label="Default"
                    />
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ resume.description }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    Uploaded: {{ new Date(resume.createdAt).toLocaleDateString() }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <UDropdownMenu
                  :items="getDropdownItems(resume)"
                  mode="click"
                  :content="{
                    align: 'end',
                    side: 'bottom',
                    sideOffset: 8
                  }"
                  :ui="{
                    content: 'w-48'
                  }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-more-vertical"
                    square
                  />
                </UDropdownMenu>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Optimized resumes section -->
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">
                Optimized Resumes
              </h2>
              <UTooltip text="These are resumes that have been customized for specific job applications">
                <UIcon name="i-lucide-info" class="h-5 w-5 text-gray-400" />
              </UTooltip>
            </div>
          </template>

          <div v-if="loadingCustomResumes" class="py-8 text-center">
            <UIcon name="i-lucide-loader-2" class="animate-spin size-12 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400">
              Loading optimized resumes...
            </p>
          </div>

          <div v-else-if="customResumes.length === 0" class="py-8 text-center">
            <UIcon name="i-lucide-file-sparkles" class="size-12 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400">
              No optimized resumes yet
            </p>
            <p class="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Go to an application and click "Generate Custom Resume" to create a resume optimized for a specific job.
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="resume in customResumes"
              :key="resume.id"
              class="p-4 border rounded-lg flex items-start justify-between gap-4"
            >
              <div class="flex items-start gap-3">
                <UIcon name="i-lucide-file-sparkles" class="size-8 text-primary-500 mt-1" />
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium">
                      {{ resume.title }}
                    </h3>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Optimized for: <span class="font-medium">{{ resume.application?.companyName }}</span> - {{ resume.application?.jobTitle }}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    Created: {{ formatDate(resume.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  color="primary"
                  variant="ghost"
                  icon="i-lucide-eye"
                  :to="`/resume-viewer/${resume.id}`"
                  target="_blank"
                  size="sm"
                  label="View"
                />
                <UDropdownMenu
                  :items="getCustomResumeDropdownItems(resume)"
                  mode="click"
                  :content="{
                    align: 'end',
                    side: 'bottom',
                    sideOffset: 8
                  }"
                  :ui="{
                    content: 'w-48'
                  }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-more-vertical"
                    square
                    size="sm"
                  />
                </UDropdownMenu>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
