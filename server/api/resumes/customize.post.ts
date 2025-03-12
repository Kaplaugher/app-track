import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes, applications, customResumes, type Application, type Resume } from '../../../db/schema'

// Define interface for parsed resume content
interface ParsedResumeContent {
  contact_info: {
    name: string
    email: string
    phone: string
    location: string
  }
  summary: string
  skills: string[]
  experience: Array<{
    company: string
    title: string
    dates: string
    bullets: string[]
  }>
  education: Array<{
    school: string
    degree: string
    field: string
    dates: string
  }>
  customizations?: string[]
}

export default defineEventHandler(async (event) => {
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

    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceKey as string
    )

    // If the resume content hasn't been parsed yet, we need to parse it
    let parsedContent = resume.parsedContent as ParsedResumeContent | null

    if (!parsedContent) {
      console.log('Resume needs parsing, fileUrl:', resume.fileUrl)

      // Initialize the Gemini model for parsing
      const geminiApiKey = config.geminiApiKey

      if (!geminiApiKey) {
        throw createError({
          statusCode: 500,
          message: 'Gemini API key is not configured'
        })
      }

      // Initialize the Gemini model
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

      try {
        // Fetch the resume content from the storage URL
        const response = await fetch(resume.fileUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.statusText}`)
        }

        // Determine file type from URL or content
        const fileExtension = resume.fileUrl.split('.').pop()?.toLowerCase() || ''
        let resumeContent = ''

        // Handle different file types
        if (fileExtension === 'pdf') {
          // For PDFs, we'll tell Gemini it's a PDF and provide the URL directly
          resumeContent = `This is a PDF resume available at: ${resume.fileUrl}`
        } else if (fileExtension === 'docx' || fileExtension === 'doc') {
          // For Word documents, we'll tell Gemini it's a Word document and provide the URL directly
          resumeContent = `This is a Word document resume available at: ${resume.fileUrl}`
        } else {
          // For text-based files (HTML, TXT, etc.), get the content as text
          resumeContent = await response.text()
        }

        // Create a parsing prompt based on the file type
        let parsingPrompt = `
          You are a professional resume parser. Your task is to extract structured information from the following resume.
          
          Resume Content:
          ${resumeContent}
          
          Parse this resume and extract the following information in a structured JSON format:
          1. Contact information (name, email, phone, location)
          2. Professional summary or objective
          3. Skills (as an array of strings)
          4. Work experience (company, title, dates, and bullet points of responsibilities/achievements)
          5. Education (school, degree, field of study, dates)
          
          Return ONLY valid JSON with the following structure:
          {
            "contact_info": {
              "name": "",
              "email": "",
              "phone": "",
              "location": ""
            },
            "summary": "",
            "skills": ["skill1", "skill2", ...],
            "experience": [
              {
                "company": "",
                "title": "",
                "dates": "",
                "bullets": ["bullet1", "bullet2", ...]
              }
            ],
            "education": [
              {
                "school": "",
                "degree": "",
                "field": "",
                "dates": ""
              }
            ]
          }
          
          Return ONLY valid JSON without any explanation or markdown formatting.
        `

        // If it's a PDF or Word document, use a different prompt
        if (fileExtension === 'pdf') {
          parsingPrompt = `
            You are a professional resume parser. Your task is to extract structured information from a PDF resume.
            
            I'm providing you with a URL to a PDF resume: ${resume.fileUrl}
            
            You have the ability to understand and extract information from this PDF. Please analyze the PDF content and extract the following information in a structured JSON format:
            1. Contact information (name, email, phone, location)
            2. Professional summary or objective
            3. Skills (as an array of strings)
            4. Work experience (company, title, dates, and bullet points of responsibilities/achievements)
            5. Education (school, degree, field of study, dates)
            
            Return ONLY valid JSON with the following structure:
            {
              "contact_info": {
                "name": "",
                "email": "",
                "phone": "",
                "location": ""
              },
              "summary": "",
              "skills": ["skill1", "skill2", ...],
              "experience": [
                {
                  "company": "",
                  "title": "",
                  "dates": "",
                  "bullets": ["bullet1", "bullet2", ...]
                }
              ],
              "education": [
                {
                  "school": "",
                  "degree": "",
                  "field": "",
                  "dates": ""
                }
              ]
            }
            
            Return ONLY valid JSON without any explanation or markdown formatting.
          `
        } else if (fileExtension === 'docx' || fileExtension === 'doc') {
          parsingPrompt = `
            You are a professional resume parser. Your task is to extract structured information from a Word document resume.
            
            I'm providing you with a URL to a Word document resume: ${resume.fileUrl}
            
            You have the ability to understand and extract information from this document. Please analyze the document content and extract the following information in a structured JSON format:
            1. Contact information (name, email, phone, location)
            2. Professional summary or objective
            3. Skills (as an array of strings)
            4. Work experience (company, title, dates, and bullet points of responsibilities/achievements)
            5. Education (school, degree, field of study, dates)
            
            Return ONLY valid JSON with the following structure:
            {
              "contact_info": {
                "name": "",
                "email": "",
                "phone": "",
                "location": ""
              },
              "summary": "",
              "skills": ["skill1", "skill2", ...],
              "experience": [
                {
                  "company": "",
                  "title": "",
                  "dates": "",
                  "bullets": ["bullet1", "bullet2", ...]
                }
              ],
              "education": [
                {
                  "school": "",
                  "degree": "",
                  "field": "",
                  "dates": ""
                }
              ]
            }
            
            Return ONLY valid JSON without any explanation or markdown formatting.
          `
        }

        // Use Gemini to parse the resume
        const parsingResult = await model.generateContent(parsingPrompt)
        const parsingResponse = await parsingResult.response
        const parsedText = parsingResponse.text()

        // Extract the JSON from the response
        const jsonMatch = parsedText.match(/```json\n([\s\S]*?)\n```/)
          || parsedText.match(/```\n([\s\S]*?)\n```/)
          || [null, parsedText]

        const jsonContent = jsonMatch[1]

        // Parse the JSON
        parsedContent = JSON.parse(jsonContent) as ParsedResumeContent

        // Validate the parsed content structure
        if (!parsedContent.contact_info || !parsedContent.skills || !parsedContent.experience) {
          throw new Error('Parsed resume is missing required fields')
        }

        // Update the resume record with the parsed content
        await db
          .update(resumes)
          .set({ parsedContent })
          .where(eq(resumes.id, resumeId))

        console.log('Updated resume with parsed content from actual file')
      } catch (parseError) {
        console.error('Error parsing resume:', parseError)

        // If parsing fails, use a simplified structure as fallback
        parsedContent = {
          contact_info: {
            name: resume.title || 'Unnamed',
            email: 'Not available',
            phone: 'Not available',
            location: 'Not available'
          },
          summary: 'Unable to parse resume summary.',
          skills: ['Unable to parse skills'],
          experience: [
            {
              company: 'Unable to parse experience',
              title: 'Unknown',
              dates: 'Unknown',
              bullets: ['Unable to parse experience details']
            }
          ],
          education: [
            {
              school: 'Unable to parse education',
              degree: 'Unknown',
              field: 'Unknown',
              dates: 'Unknown'
            }
          ]
        } as ParsedResumeContent

        // Still try to update the resume with the fallback content
        try {
          await db
            .update(resumes)
            .set({ parsedContent })
            .where(eq(resumes.id, resumeId))

          console.log('Updated resume with fallback parsed content')
        } catch (dbError) {
          console.error('Error updating resume with fallback parsed content:', dbError)
          // Continue even if the update fails
        }
      }
    }

    // Now customize the resume for the specific job application
    // Get API token from runtime config
    const geminiApiKey = config.geminiApiKey

    if (!geminiApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Gemini API key is not configured'
      })
    }

    // Initialize the Gemini model
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const customizePrompt = `
      You are a professional resume customization expert. Your task is to customize a resume for a specific job application.
      
      Original Resume:
      ${JSON.stringify(parsedContent, null, 2)}
      
      Job Application:
      - Company: ${application.companyName}
      - Job Title: ${application.jobTitle}
      - Job Description/Notes: ${application.notes || 'Not provided'}
      
      IMPORTANT: The notes field contains critical information about how to optimize the resume for this specific job. 
      Pay special attention to any keywords, skills, or requirements mentioned in the notes and prioritize them in your customization.
      
      Please customize the resume to better match this job application. Make the following adjustments:
      1. Tailor the summary to highlight relevant experience for this specific role
      2. Reorder skills to prioritize those most relevant to the job (especially those mentioned in the notes)
      3. For each experience entry, emphasize achievements and responsibilities that align with the job requirements
      4. Use exact keywords and terminology from the notes/job description where appropriate
      5. Make any other subtle adjustments that would make the candidate more appealing for this specific role
      
      Return the customized resume as a JSON object with the same structure as the original, plus a "customizations" field that explains what changes were made.
      Return ONLY valid JSON without any explanation or markdown formatting.
    `

    const customizeResult = await model.generateContent(customizePrompt)
    const customizeResponse = await customizeResult.response
    const customizedText = customizeResponse.text()

    // Extract the JSON from the response
    const jsonMatch = customizedText.match(/```json\n([\s\S]*?)\n```/)
      || customizedText.match(/```\n([\s\S]*?)\n```/)
      || [null, customizedText]

    const jsonContent = jsonMatch[1]

    // Parse the JSON
    const customizedContent = JSON.parse(jsonContent) as ParsedResumeContent

    // Generate HTML for the customized resume
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            .section { margin-bottom: 20px; }
            .section-title { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .experience-item, .education-item { margin-bottom: 15px; }
            .company-title { display: flex; justify-content: space-between; }
            .skills { display: flex; flex-wrap: wrap; gap: 10px; }
            .skill { background: #f0f0f0; padding: 5px 10px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>${customizedContent.contact_info.name}</h1>
          <p>${customizedContent.contact_info.email} | ${customizedContent.contact_info.phone}</p>
          <p>${customizedContent.contact_info.location}</p>
          
          <div class="section">
            <h2 class="section-title">Summary</h2>
            <p>${customizedContent.summary}</p>
          </div>
          
          <div class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills">
              ${customizedContent.skills.map((skill: string) => `<div class="skill">${skill}</div>`).join('')}
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Experience</h2>
            ${customizedContent.experience.map(exp => `
              <div class="experience-item">
                <div class="company-title">
                  <strong>${exp.company}</strong>
                  <span>${exp.dates}</span>
                </div>
                <div>${exp.title}</div>
                <ul>
                  ${exp.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          
          <div class="section">
            <h2 class="section-title">Education</h2>
            ${customizedContent.education.map(edu => `
              <div class="education-item">
                <div class="company-title">
                  <strong>${edu.school}</strong>
                  <span>${edu.dates}</span>
                </div>
                <div>${edu.degree} in ${edu.field}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `

    // Convert HTML to a Blob
    const encoder = new TextEncoder()
    const htmlData = encoder.encode(html)

    // Upload the customized resume to Supabase Storage
    const customFileName = `${application.companyName.replace(/\s+/g, '_')}_${application.jobTitle.replace(/\s+/g, '_')}_resume.html`
    const customStoragePath = `custom_resumes/${userId}/${Date.now()}_${customFileName}`

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(customStoragePath, htmlData, {
        contentType: 'text/html',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading customized resume:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to upload customized resume'
      })
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(customStoragePath)

    // Insert the custom resume record into the database
    const customResumeTitle = `${application.companyName} - ${application.jobTitle} Resume`

    const dbResult = await db
      .insert(customResumes)
      .values({
        userId,
        originalResumeId: resumeId,
        applicationId,
        title: customResumeTitle,
        fileUrl: urlData.publicUrl,
        customizations: customizedContent.customizations || []
      })
      .returning()

    return {
      success: true,
      data: {
        customResume: dbResult[0],
        fileUrl: urlData.publicUrl
      }
    }
  } catch (error) {
    console.error('Error customizing resume:', error)

    // Provide more detailed error messages based on the type of error
    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      errorMessage = error.message

      // Check for specific error types
      if (errorMessage.includes('download')) {
        errorMessage = 'Failed to download the resume file. Please try again or upload a different resume.'
      } else if (errorMessage.includes('parse')) {
        errorMessage = 'Failed to parse the resume content. Please try a different resume format.'
      } else if (errorMessage.includes('generate')) {
        errorMessage = 'Failed to generate the customized resume. Please try again later.'
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
})
