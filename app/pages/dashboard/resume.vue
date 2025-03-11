<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Resume } from '~/db/schema'

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

// Fetch user's resumes
const { data: resumesResponse, refresh: refreshResumes, pending: loadingResumes } = await useFetch('/api/resumes')
const resumes = computed(() => {
  if (!resumesResponse.value?.success) return []
  return resumesResponse.value.data || []
})

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
    formData.append('title', resumeState.title)
    
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
      throw new Error(response.error || 'Failed to upload resume')
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
      throw new Error(response.error || 'Failed to delete resume')
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

// Function to set a resume as default
async function setAsDefault(id: number) {
  try {
    const response = await $fetch(`/api/resumes/${id}/default`, {
      method: 'PUT'
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to update resume')
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
                <UDropdown>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-more-vertical"
                    square
                  />

                  <template #items>
                    <UDropdownItem
                      label="Download"
                      icon="i-lucide-download"
                      :to="resume.fileUrl"
                      target="_blank"
                    />
                    <UDropdownItem
                      v-if="!resume.isDefault"
                      label="Set as default"
                      icon="i-lucide-check"
                      @click="setAsDefault(resume.id)"
                    />
                    <UDropdownItem
                      label="Delete"
                      icon="i-lucide-trash-2"
                      @click="deleteResume(resume.id)"
                    />
                  </template>
                </UDropdown>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
