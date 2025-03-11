import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes, applications, customResumes, type Application, type Resume } from '../../../db/schema'

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
    let parsedContent = resume.parsedContent

    if (!parsedContent) {
      // Download the resume file from Supabase
      const fileUrl = new URL(resume.fileUrl)
      const path = fileUrl.pathname.split('/').slice(-2).join('/')

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(path)

      if (downloadError) {
        console.error('Error downloading resume:', downloadError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to download resume'
        })
      }

      // Extract text from the file based on its type
      let text = ''

      if (resume.fileType === 'application/pdf') {
        // In a real implementation, you would use a PDF parsing library
        // For now, we'll simulate this with a placeholder
        text = 'Simulated PDF text extraction'
      } else if (resume.fileType.includes('word')) {
        // For DOCX/DOC files, extract text
        // In a real implementation, you would use a DOCX parsing library
        text = 'Simulated DOCX text extraction'
      } else if (resume.fileType === 'text/plain') {
        // For plain text files, read directly
        text = await fileData.text()
      }

      // Get API token from runtime config
      const config = useRuntimeConfig()
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
      const structurePrompt = `
        Parse the following resume text into a structured JSON format with these sections:
        - contact_info (name, email, phone, location, etc.)
        - summary
        - skills (as an array)
        - experience (array of positions with company, title, dates, and bullet points)
        - education (array of schools with degree, field, dates)
        - certifications (if any)
        - projects (if any)
        
        Resume text:
        ${text}
        
        Return ONLY valid JSON without any explanation or markdown formatting.
      `

      const structureResult = await model.generateContent(structurePrompt)
      const structureResponse = await structureResult.response
      const parsedText = structureResponse.text()

      // Extract the JSON from the response
      const jsonMatch = parsedText.match(/```json\n([\s\S]*?)\n```/)
        || parsedText.match(/```\n([\s\S]*?)\n```/)
        || [null, parsedText]

      const jsonContent = jsonMatch[1]

      // Parse the JSON
      parsedContent = JSON.parse(jsonContent)

      // Update the resume record with the parsed content
      await db
        .update(resumes)
        .set({ parsedContent })
        .where(eq(resumes.id, resumeId))
    }

    // Now customize the resume for the specific job application
    const genAI = new GoogleGenerativeAI(config.public.googleAiApiKey as string)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const customizePrompt = `
      You are a professional resume customization expert. Your task is to customize a resume for a specific job application.
      
      Original Resume:
      ${JSON.stringify(parsedContent, null, 2)}
      
      Job Application:
      - Company: ${application.companyName}
      - Job Title: ${application.jobTitle}
      - Job Description/Notes: ${application.notes || 'Not provided'}
      
      Please customize the resume to better match this job application. Make the following adjustments:
      1. Tailor the summary to highlight relevant experience for this specific role
      2. Reorder skills to prioritize those most relevant to the job
      3. For each experience entry, emphasize achievements and responsibilities that align with the job
      4. Make any other subtle adjustments that would make the candidate more appealing for this specific role
      
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
    const customizedContent = JSON.parse(jsonContent)

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
            ${customizedContent.experience.map((exp: any) => `
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
            ${customizedContent.education.map((edu: any) => `
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
