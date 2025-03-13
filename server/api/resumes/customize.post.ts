import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes, applications, type Application, type Resume } from '../../../db/schema'
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
            return processFileData(secondAttemptData, application, resume.fileUrl, config)
          }
        }

        throw new Error(`Failed to download resume: ${downloadError.message || JSON.stringify(downloadError)}`)
      }

      if (!fileData) {
        console.error('No file data received, but no error was returned')
        throw new Error('No file data received from storage')
      }

      return processFileData(fileData, application, resume.fileUrl, config)
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
        // Convert Blob to Buffer for pdf.js-extract
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        try {
          // Dynamically import pdf.js-extract to avoid build issues
          const { PDFExtract } = await import('pdf.js-extract')

          // Initialize PDF extractor
          const pdfExtract = new PDFExtract()
          const options = {}

          // Extract text from PDF
          const data = await pdfExtract.extractBuffer(buffer, options)

          // Combine all page content
          if (data && data.pages && data.pages.length > 0) {
            // Extract text from each page and join them
            resumeText = data.pages.map((page) => {
              // Each page has content items with text
              return page.content
                .map(item => item.str)
                .join(' ')
            }).join('\n\n')

            console.log('PDF parsed successfully')
            console.log('PDF info:', {
              pageCount: data.pages.length,
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
          } else {
            console.error('PDF parsing returned no pages')
            throw new Error('PDF parsing returned no pages')
          }
        } catch (pdfError) {
          console.error('Error parsing PDF with pdf.js-extract:', pdfError)
          throw pdfError // Re-throw to be caught by outer catch
        }
      } catch (pdfProcessingError) {
        console.error('Error in PDF processing:', pdfProcessingError)
        // Fallback to regular text extraction if PDF parsing fails
        try {
          resumeText = await fileData.text()
          console.log('Fallback to regular text extraction')

          // Check if the text contains PDF header (%PDF)
          if (resumeText.startsWith('%PDF')) {
            console.log('Text contains PDF header but could not be parsed properly')
            // Extract only printable ASCII characters as a last resort
            resumeText = resumeText.replace(/[^\x20-\x7E\n]/g, '')
            resumeText = 'PDF EXTRACTION PARTIAL: ' + resumeText
          }
        } catch (fallbackError) {
          console.error('Even fallback text extraction failed:', fallbackError)
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
    
    Return an optimized version of the resume that would make the candidate more appealing for this specific role.
    Format the resume in a clean, professional way, fixing any formatting issues from the PDF extraction.
  `

  // Step 4: Send to Gemini and get response
  console.log('Sending resume to Gemini for optimization')
  const optimizeResult = await model.generateContent(optimizePrompt)
  const optimizeResponse = await optimizeResult.response
  const optimizedText = optimizeResponse.text()

  // Step 5: Log the result
  console.log('Received optimized resume from Gemini')
  console.log('Optimized resume length:', optimizedText.length)

  // Return success response with the optimized text
  return {
    success: true,
    data: {
      message: 'Resume optimization completed successfully',
      optimizedResumePreview: optimizedText.substring(0, 200) + '...' // Just return a preview
    }
  }
}
