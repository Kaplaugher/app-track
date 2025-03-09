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
    // In a real implementation, you would upload the file to a server here
    // For now, we'll just simulate a successful upload
    await new Promise(resolve => setTimeout(resolve, 1500))

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
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to upload resume. Please try again.',
      color: 'error'
    })
  } finally {
    isUploading.value = false
  }
}

// Mock data for existing resumes
const existingResumes = ref([
  { id: 1, title: 'Software Engineer Resume', description: 'For tech positions', isDefault: true, date: '2023-12-15' },
  { id: 2, title: 'Product Manager Resume', description: 'For product roles', isDefault: false, date: '2023-11-20' }
])

// Function to delete a resume
function deleteResume(id: number) {
  existingResumes.value = existingResumes.value.filter(resume => resume.id !== id)
  toast.add({
    title: 'Deleted',
    description: 'Resume has been removed',
    color: 'info'
  })
}

// Function to set a resume as default
function setAsDefault(id: number) {
  existingResumes.value = existingResumes.value.map(resume => ({
    ...resume,
    isDefault: resume.id === id
  }))

  toast.add({
    title: 'Updated',
    description: 'Default resume has been updated',
    color: 'success'
  })
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

          <div v-if="existingResumes.length === 0" class="py-8 text-center">
            <UIcon name="i-lucide-file-question" class="size-12 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600 dark:text-gray-400">
              No resumes uploaded yet
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="resume in existingResumes"
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
                    Uploaded: {{ resume.date }}
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
