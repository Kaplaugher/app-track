import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes, applications, customResumes, type Application, type Resume } from '../../../db/schema'
// Import PDFExtract dynamically to avoid build issues

export default defineEventHandler(async (event) => {
  // Initialize Supabase client
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  try {
    // Get the authenticated user ID from the Clerk context
    const { userId } = event.context.auth

    // If no user is authenticated, return an error
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized: User not signed in'
      })
    }

    const body = await readBody(event)
    const { resumeId, applicationId } = body

    if (!resumeId || !applicationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing required fields'
      })
    }

    // Fetch the resume and application data
    const resumeData = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1)

    const applicationData = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!resumeData.length || !applicationData.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Resume or application not found'
      })
    }

    const resume = resumeData[0] as Resume
    const application = applicationData[0] as Application

    console.log('Starting resume customization process')
    console.log('Resume file URL:', resume.fileUrl)
    console.log('Application:', {
      company: application.companyName,
      jobTitle: application.jobTitle
    })

    // Validate the file URL
    if (!resume.fileUrl) {
      console.error('Resume file URL is empty or undefined')
      throw new Error('Resume file URL is missing')
    }

    // Log Supabase client details (without sensitive info)
    console.log('Supabase client initialized with URL:', config.public.supabaseUrl)

    // Check if the file path is correct
    // The fileUrl might be a full URL or just a path - we need to handle both cases
    let filePath = resume.fileUrl

    // If it's a full URL, extract just the path part
    if (filePath.startsWith('http')) {
      try {
        // Looking at the error logs, we can see the URL structure is:
        // https://chnuwptjcrzvdbmsgfgh.supabase.co/storage/v1/object/public/resumes/resumes/user_2tzeszv1EtmZuprbhU0SPWFSgUW/1741877825015_Kyle_Plaugher_Resume.pdf

        // For Supabase storage download, we need just the path after the bucket name:
        // resumes/user_2tzeszv1EtmZuprbhU0SPWFSgUW/1741877825015_Kyle_Plaugher_Resume.pdf

        const url = new URL(filePath)
        const pathParts = url.pathname.split('/')

        // Find the index of 'public' and the bucket name ('resumes')
        const publicIndex = pathParts.findIndex(part => part === 'public')

        if (publicIndex !== -1 && publicIndex + 1 < pathParts.length) {
          // Skip 'public' and the bucket name, and take the rest of the path
          const relevantParts = pathParts.slice(publicIndex + 2)
          filePath = relevantParts.join('/')
          console.log('Extracted file path from URL (public method):', filePath)
        } else {
          // Fallback to a simpler approach if we can't find 'public'
          // This assumes the structure is consistent with what we've seen
          const parts = filePath.split('/resumes/')
          if (parts.length > 1 && parts[1]) {
            filePath = parts[1]
            console.log('Extracted file path from URL (fallback method):', filePath)
          }
        }
      } catch (e) {
        console.error('Failed to parse URL:', e)
        // Continue with the original path
      }
    }

    console.log('Attempting to download file with path:', filePath)

    // Step 1: Download the resume file from Supabase storage
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(filePath)

      console.log('Download response received')

      if (downloadError) {
        console.error('Error downloading resume:', JSON.stringify(downloadError))

        // If the first attempt fails, try a different approach
        // Extract just the filename as a last resort
        const filename = filePath.split('/').pop()
        if (filename) {
          console.log('First download attempt failed, trying with just filename:', filename)

          const { data: secondAttemptData, error: secondAttemptError } = await supabase.storage
            .from('resumes')
            .download(filename)

          if (secondAttemptError) {
            console.error('Second download attempt also failed:', JSON.stringify(secondAttemptError))
            throw new Error(`Failed to download resume: ${downloadError.message || JSON.stringify(downloadError)}`)
          }

          if (secondAttemptData) {
            console.log('Second download attempt succeeded with filename')
            return processFileData(secondAttemptData, application, resume.fileUrl, userId, resumeId, config)
          }
        }

        throw new Error(`Failed to download resume: ${downloadError.message || JSON.stringify(downloadError)}`)
      }

      if (!fileData) {
        console.error('No file data received, but no error was returned')
        throw new Error('No file data received from storage')
      }

      return processFileData(fileData, application, resume.fileUrl, userId, resumeId, config)
    } catch (storageError) {
      console.error('Storage operation error:', storageError)
      console.error('Error details:', JSON.stringify(storageError, null, 2))

      // Try to list files in the bucket to verify access and bucket existence
      try {
        const { data: listData, error: listError } = await supabase.storage
          .from('resumes')
          .list()

        if (listError) {
          console.error('Error listing bucket contents:', listError)
        } else {
          console.log('Bucket contents:', listData.length ? 'Found files' : 'Empty bucket')
          // Log a few file names if available
          if (listData.length > 0) {
            console.log('Sample files:', listData.slice(0, 3).map(f => f.name))
          }
        }
      } catch (listError) {
        console.error('Failed to list bucket contents:', listError)
      }

      throw storageError
    }
  } catch (error) {
    console.error('Error in resume optimization process:', error)

    let errorMessage = 'Unknown error occurred during resume optimization'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
})

// Extract the file processing logic to a separate function
async function processFileData(
  fileData: Blob,
  application: Application,
  originalFilePath: string,
  userId: string,
  resumeId: number,
  config: ReturnType<typeof useRuntimeConfig>
) {
  console.log('Successfully downloaded resume file:', {
    type: fileData.type,
    size: fileData.size,
    isBlob: fileData instanceof Blob
  })

  // Convert file data to text
  let resumeText = ''
  try {
    // Check if the file is a PDF based on MIME type or original file path
    const isPdf = fileData.type === 'application/pdf'
      || (originalFilePath && originalFilePath.toLowerCase().endsWith('.pdf'))

    if (isPdf) {
      console.log('Processing PDF file')

      try {
        // Convert Blob to Buffer for PDF processing
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        try {
          // Use unpdf instead of pdf.js-extract
          const { getDocumentProxy, extractText } = await import('unpdf')

          // Load PDF from buffer
          const pdf = await getDocumentProxy(new Uint8Array(buffer))

          // Extract text from PDF
          const { totalPages, text } = await extractText(pdf, { mergePages: true })

          // Set the extracted text
          resumeText = text

          console.log('PDF parsed successfully')
          console.log('PDF info:', {
            pageCount: totalPages,
            textLength: resumeText.length
          })

          // Clean up the PDF text
          // Remove excessive whitespace and normalize line breaks
          resumeText = resumeText
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim()

          // Remove any PDF artifacts or non-printable characters
          resumeText = resumeText.replace(/[^\x20-\x7E\n]/g, '')

          console.log('PDF text cleaned, new length:', resumeText.length)

          if (!resumeText || resumeText.length === 0) {
            console.error('PDF parsing returned no text')
            throw new Error('PDF parsing returned no text')
          }
        } catch (pdfError) {
          console.error('Error parsing PDF with unpdf:', pdfError)

          // Try a simpler approach with unpdf if the first method failed
          try {
            const { getResolvedPDFJS } = await import('unpdf')
            const pdfjs = await getResolvedPDFJS()

            // Use the lower-level PDF.js API
            const loadingTask = pdfjs.getDocument(new Uint8Array(buffer))
            const doc = await loadingTask.promise

            let fullText = ''
            for (let i = 1; i <= doc.numPages; i++) {
              const page = await doc.getPage(i)
              const textContent = await page.getTextContent()
              // Handle different types of text items
              const pageText = textContent.items
                .map(item => 'str' in item ? item.str : '')
                .join(' ')
              fullText += pageText + '\n\n'
            }

            resumeText = fullText
            console.log('Fallback PDF extraction succeeded')

            // Clean up the text
            resumeText = resumeText
              .replace(/\r\n/g, '\n')
              .replace(/\s+/g, ' ')
              .replace(/\n+/g, '\n')
              .trim()
              .replace(/[^\x20-\x7E\n]/g, '')
          } catch (fallbackError) {
            console.error('Even fallback PDF extraction failed:', fallbackError)
            throw pdfError // Re-throw the original error
          }
        }
      } catch (pdfProcessingError) {
        console.error('Error in PDF processing:', pdfProcessingError)
        // Last resort: try to get text directly from the blob
        try {
          resumeText = await fileData.text()
          console.log('Last resort text extraction used')

          // Check if the text contains PDF header (%PDF)
          if (resumeText.startsWith('%PDF')) {
            console.log('Text contains PDF header but could not be parsed properly')
            // Extract only printable ASCII characters as a last resort
            resumeText = resumeText.replace(/[^\x20-\x7E\n]/g, '')
            resumeText = 'PDF EXTRACTION PARTIAL: ' + resumeText
          }
        } catch (fallbackError) {
          console.error('All PDF extraction methods failed:', fallbackError)
          resumeText = 'Failed to extract text from PDF file.'
        }
      }
    } else {
      // For non-PDF files, use regular text extraction
      resumeText = await fileData.text()
      console.log('Regular text extraction used (non-PDF file)')
    }

    console.log('Resume text extracted, length:', resumeText.length)

    // Log a preview of the content
    if (resumeText.length > 0) {
      console.log('Content preview:', resumeText.substring(0, 300) + '...')
    } else {
      console.log('Warning: Empty text content extracted from file')
    }
  } catch (textError: unknown) {
    console.error('Error converting file to text:', textError)
    const errorMessage = textError instanceof Error ? textError.message : String(textError)
    throw new Error(`Failed to extract text from file: ${errorMessage}`)
  }

  // Step 2: Initialize Gemini API
  const geminiApiKey = config.geminiApiKey
  if (!geminiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Gemini API key is not configured'
    })
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  // Step 3: Create a prompt for Gemini
  const optimizePrompt = `
    You are a professional resume optimization expert. Your task is to optimize a resume for a specific job application.
    
    Resume Content:
    ${resumeText}
    
    Job Application:
    - Company: ${application.companyName}
    - Job Title: ${application.jobTitle}
    - Job Description/Notes: ${application.notes || 'Not provided'}
    
    IMPORTANT: The resume content may have been extracted from a PDF and might contain formatting issues or artifacts. 
    Please do your best to understand the content despite any extraction issues.
    
    Please optimize this resume to better match this job application by:
    1. Highlighting relevant experience for this specific role
    2. Prioritizing skills most relevant to the job
    3. Emphasizing achievements that align with the job requirements
    4. Using keywords from the job description where appropriate
    
    Return an optimized version of the resume with the following HTML structure:
    
    <div class="contact-info">
      <h1>[Full Name]</h1>
      <p>[Email] | [Phone] | [Location]</p>
    </div>
    
    <div class="section">
      <h2>Professional Summary</h2>
      <p>[Optimized professional summary]</p>
    </div>
    
    <div class="section">
      <h2>Skills</h2>
      <div class="skills">
        <span class="skill">[Skill 1]</span>
        <span class="skill">[Skill 2]</span>
        <!-- More skills -->
      </div>
    </div>
    
    <div class="section">
      <h2>Experience</h2>
      <div class="experience-item">
        <div class="job-header">
          <span class="job-title">[Job Title]</span> at <span class="company">[Company]</span>
          <span class="dates">[Dates]</span>
        </div>
        <ul>
          <li>[Achievement/Responsibility 1]</li>
          <li>[Achievement/Responsibility 2]</li>
          <!-- More bullet points -->
        </ul>
      </div>
      <!-- More experience items -->
    </div>
    
    <div class="section">
      <h2>Education</h2>
      <div class="education-item">
        <div class="education-header">
          <span class="degree">[Degree]</span> in <span class="field">[Field]</span>
          <span class="school">[School]</span>
          <span class="dates">[Dates]</span>
        </div>
      </div>
      <!-- More education items -->
    </div>
    
    Follow this HTML structure exactly, filling in the appropriate content. Make sure to optimize the content for the specific job application.
  `

  // Step 4: Send to Gemini and get response
  console.log('Sending resume to Gemini for optimization')
  const optimizeResult = await model.generateContent(optimizePrompt)
  const optimizeResponse = await optimizeResult.response
  const optimizedText = optimizeResponse.text()

  // Step 5: Log the result
  console.log('Received optimized resume from Gemini')
  console.log('Optimized resume length:', optimizedText.length)

  // Step 6: Generate HTML for the resume
  const html = generateResumeHtml(optimizedText, application)

  // Step 7: Save the HTML as a file in Supabase
  const { htmlUrl, customResumeId } = await saveResumesToSupabase(html, userId, resumeId, application)

  // Return success response with the optimized text and file URLs
  return {
    success: true,
    data: {
      message: 'Resume optimization completed successfully',
      optimizedResumePreview: optimizedText.substring(0, 200) + '...',
      htmlUrl: htmlUrl,
      customResumeId,
      instructions: 'Your optimized resume will open in our resume viewer. You can use your browser\'s print function to save as PDF if needed.'
    }
  }
}

// Function to generate HTML from the optimized resume text
function generateResumeHtml(resumeText: string, application: Application): string {
  // Create a professional-looking HTML template
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';">
      <title>Optimized Resume for ${application.companyName}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
        }
        h1, h2, h3 {
          color: #2c3e50;
          margin-top: 0;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 5px;
        }
        h2 {
          font-size: 18px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-top: 20px;
        }
        .section {
          margin-bottom: 20px;
        }
        .contact-info {
          margin-bottom: 20px;
          text-align: center;
        }
        .contact-info p {
          margin-top: 0;
          color: #7f8c8d;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .skill {
          background-color: #f5f5f5;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 14px;
        }
        .experience-item, .education-item {
          margin-bottom: 15px;
        }
        .job-header, .education-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          flex-wrap: wrap;
        }
        .job-title, .degree {
          font-weight: bold;
        }
        .company, .school {
          font-weight: bold;
          color: #2c3e50;
        }
        .dates {
          color: #7f8c8d;
          font-style: italic;
        }
        ul {
          padding-left: 20px;
          margin-top: 5px;
        }
        li {
          margin-bottom: 5px;
        }
        @media print {
          body {
            padding: 0;
          }
          @page {
            margin: 0.5in;
          }
        }
      </style>
    </head>
    <body>
      <div class="resume-content">
        ${resumeText}
      </div>
    </body>
    </html>
  `
}

// Function to save the resume files to Supabase
async function saveResumesToSupabase(
  html: string,
  userId: string,
  resumeId: number,
  application: Application
): Promise<{ htmlUrl: string, customResumeId: number }> {
  try {
    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceKey as string
    )

    // Create file names
    const timestamp = Date.now()
    const sanitizedCompany = application.companyName.replace(/\s+/g, '_')
    const sanitizedTitle = application.jobTitle.replace(/\s+/g, '_')
    const baseFileName = `${sanitizedCompany}_${sanitizedTitle}_${timestamp}`

    // Save HTML file
    const htmlFileName = `${baseFileName}.html`
    const htmlPath = `custom_resumes/${userId}/${htmlFileName}`
    const htmlBlob = new Blob([html], { type: 'text/html' })

    const { error: htmlError } = await supabase.storage
      .from('resumes')
      .upload(htmlPath, htmlBlob, {
        contentType: 'text/html',
        upsert: false
      })

    if (htmlError) {
      console.error('Error uploading HTML file:', htmlError)
      throw new Error(`Failed to upload HTML file: ${htmlError.message}`)
    }

    // Get public URLs
    const { data: htmlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(htmlPath)

    // Save record to database
    const customResumeTitle = `${application.companyName} - ${application.jobTitle} Resume`

    const result = await db
      .insert(customResumes)
      .values({
        userId,
        originalResumeId: resumeId,
        applicationId: application.id,
        title: customResumeTitle,
        fileUrl: htmlData.publicUrl,
        customizations: ['Optimized for job application']
      })
      .returning()

    const customResumeId = result[0]?.id || 0

    // Create a URL for the resume viewer page
    const viewerUrl = `/resume-viewer/${customResumeId}`

    return {
      htmlUrl: viewerUrl, // Return the viewer URL instead of the direct file URL
      customResumeId
    }
  } catch (error) {
    console.error('Error saving resume files:', error)
    throw error
  }
}
