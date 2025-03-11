import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Application } from '../../db/schema'

interface ResumeContent {
  contact_info: {
    name: string
    email: string
    phone: string
    location: string
    [key: string]: string
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
  certifications?: string[]
  projects?: Array<{
    name: string
    description: string
    technologies?: string[]
  }>
  [key: string]: unknown
}

export function useResumeProcessor() {
  const config = useRuntimeConfig()
  const genAI = new GoogleGenerativeAI(config.public.googleAiApiKey as string)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

  /**
   * Parse a resume file to extract structured content
   * @param file The resume file (PDF, DOCX, TXT)
   * @returns Structured resume content
   */
  const parseResume = async (file: File) => {
    try {
      // For PDF files, we need to extract text first
      let text = ''

      if (file.type === 'application/pdf') {
        // In a real implementation, you would use a PDF parsing library
        // For now, we'll simulate this with a placeholder
        text = 'Simulated PDF text extraction'
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX files, extract text
        // In a real implementation, you would use a DOCX parsing library
        text = 'Simulated DOCX text extraction'
      } else if (file.type === 'text/plain') {
        // For plain text files, read directly
        text = await file.text()
      } else {
        throw new Error('Unsupported file type')
      }

      // Use AI to structure the resume content
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

      const result = await model.generateContent(structurePrompt)
      const response = await result.response
      const parsedText = response.text()

      // Extract the JSON from the response
      const jsonMatch = parsedText.match(/```json\n([\s\S]*?)\n```/)
        || parsedText.match(/```\n([\s\S]*?)\n```/)
        || [null, parsedText]

      const jsonContent = jsonMatch[1]

      // Parse the JSON
      return {
        success: true,
        data: JSON.parse(jsonContent) as ResumeContent
      }
    } catch (error: unknown) {
      console.error('Error parsing resume:', error)
      return {
        success: false,
        error
      }
    }
  }

  /**
   * Generate a customized resume based on the original resume and job application
   * @param resumeContent Structured resume content
   * @param application Job application data
   * @returns Customized resume content
   */
  const customizeResume = async (resumeContent: ResumeContent, application: Application) => {
    try {
      const customizePrompt = `
        You are a professional resume customization expert. Your task is to customize a resume for a specific job application.
        
        Original Resume:
        ${JSON.stringify(resumeContent, null, 2)}
        
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

      const result = await model.generateContent(customizePrompt)
      const response = await result.response
      const customizedText = response.text()

      // Extract the JSON from the response
      const jsonMatch = customizedText.match(/```json\n([\s\S]*?)\n```/)
        || customizedText.match(/```\n([\s\S]*?)\n```/)
        || [null, customizedText]

      const jsonContent = jsonMatch[1]

      // Parse the JSON
      return {
        success: true,
        data: JSON.parse(jsonContent) as ResumeContent & { customizations: string[] }
      }
    } catch (error: unknown) {
      console.error('Error customizing resume:', error)
      return {
        success: false,
        error
      }
    }
  }

  /**
   * Generate a PDF from customized resume content
   * @param customizedContent Customized resume content
   * @returns PDF file as Blob
   */
  const generatePdf = async (customizedContent: ResumeContent) => {
    try {
      // In a real implementation, you would use a PDF generation library
      // For now, we'll simulate this with a placeholder

      // Create a simple HTML representation of the resume
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
                ${customizedContent.skills.map(skill => `<div class="skill">${skill}</div>`).join('')}
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
                    ${exp.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
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

      // In a real implementation, you would convert this HTML to PDF
      // For now, we'll just create a Blob with the HTML
      const blob = new Blob([html], { type: 'text/html' })

      return {
        success: true,
        data: blob
      }
    } catch (error: unknown) {
      console.error('Error generating PDF:', error)
      return {
        success: false,
        error
      }
    }
  }

  return {
    parseResume,
    customizeResume,
    generatePdf
  }
}
