<script setup lang="ts">
definePageMeta({
  layout: 'viewer'
})
const route = useRoute()
const resumeId = computed(() => route.params.id as string)

interface ResumeResponse {
  success: boolean
  data?: {
    id: number
    userId: string
    originalResumeId: number
    applicationId: number
    title: string
    fileUrl: string
    customizations: unknown
    createdAt: Date
    updatedAt: Date
  }
  error?: string
}

const { data: resumeData, pending, error } = await useFetch<ResumeResponse>(`/api/resumes/custom/${resumeId.value}`)

const resume = computed(() => resumeData.value?.data)
const htmlContent = ref('')

// Fetch the HTML content from the fileUrl
async function fetchHtmlContent() {
  if (!resume.value?.fileUrl) return

  try {
    const response = await fetch(resume.value.fileUrl)
    if (!response.ok) throw new Error('Failed to fetch resume HTML')
    htmlContent.value = await response.text()
  } catch (err) {
    console.error('Error fetching HTML content:', err)
  }
}

// Function to print the resume
function printResume() {
  const iframe = document.querySelector('.resume-iframe') as HTMLIFrameElement
  if (iframe && iframe.contentWindow) {
    // Focus the iframe
    iframe.contentWindow.focus()
    // Print the iframe content directly
    iframe.contentWindow.print()
  }
}

// Function to adjust iframe height based on content
function adjustIframeHeight(iframe: HTMLIFrameElement) {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      // Get the height of the content
      const height = doc.documentElement.scrollHeight
      iframe.style.height = `${height}px`
    }
  } catch (err) {
    console.error('Error adjusting iframe height:', err)
  }
}

// Watch for resume data and fetch HTML content when available
watch(() => resume.value, async (newValue) => {
  if (newValue?.fileUrl) {
    await fetchHtmlContent()
  }
}, { immediate: true })

// Set page title
useHead({
  title: computed(() => resume.value?.title ? `${resume.value.title} | AppTrack` : 'Resume Viewer | AppTrack')
})
</script>

<template>
  <div class="resume-viewer-container">
    <div v-if="pending" class="loading-container">
      <div class="loading-spinner" />
      <p>Loading resume...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <h2>Error Loading Resume</h2>
      <p>{{ error.message || 'Failed to load the resume. Please try again.' }}</p>
      <NuxtLink to="/dashboard" class="back-button">
        Back to Dashboard
      </NuxtLink>
    </div>

    <div v-else-if="!resume" class="error-container">
      <h2>Resume Not Found</h2>
      <p>The requested resume could not be found or you don't have permission to view it.</p>
      <NuxtLink to="/dashboard" class="back-button">
        Back to Dashboard
      </NuxtLink>
    </div>

    <div v-else class="resume-content-container">
      <div class="resume-header">
        <h1>{{ resume.title }}</h1>
        <div class="actions">
          <button class="print-button" @click="printResume">
            <span class="icon">🖨️</span> Print / Save as PDF
          </button>
          <NuxtLink to="/dashboard" class="back-button">
            Back to Dashboard
          </NuxtLink>
        </div>
      </div>

      <div v-if="htmlContent" class="resume-iframe-container">
        <iframe
          :srcdoc="htmlContent"
          title="Resume Viewer"
          class="resume-iframe"
          sandbox="allow-same-origin allow-scripts allow-modals allow-popups allow-printing"
          @load="(e) => adjustIframeHeight(e.target as HTMLIFrameElement)"
        />
      </div>

      <div v-else class="loading-container">
        <div class="loading-spinner" />
        <p>Loading resume content...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resume-viewer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.resume-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.resume-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.print-button, .back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.print-button {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.print-button:hover {
  background-color: #2563eb;
}

.back-button {
  background-color: #f3f4f6;
  color: #374151;
  text-decoration: none;
}

.back-button:hover {
  background-color: #e5e7eb;
}

.resume-iframe-container {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.resume-iframe {
  width: 100%;
  min-height: 80vh;
  border: none;
  transition: height 0.2s ease;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-container h2 {
  color: #ef4444;
  margin-bottom: 1rem;
}

@media print {
  .resume-viewer-container {
    padding: 0;
    margin: 0;
    width: 100%;
  }

  .resume-header, .actions, .print-button, .back-button {
    display: none !important;
  }

  .resume-iframe-container {
    border: none;
    box-shadow: none;
    margin: 0;
    padding: 0;
  }

  .resume-iframe {
    height: auto !important;
    min-height: auto !important;
    width: 100% !important;
    margin: 0;
    padding: 0;
  }

  @page {
    size: auto;
    margin: 0.5in;
  }
}

@media (max-width: 640px) {
  .resume-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
