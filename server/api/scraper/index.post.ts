import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../../../db'
import { applications, type NewApplication } from '../../../db/schema'

// Define types for the request body
interface ScrapeRequest {
  url: string
  title: string
  html: string
}

export default defineEventHandler(async (event) => {
  try {
    // Get the authenticated user ID from the Clerk context
    const { userId } = event.context.auth

    // If no user is authenticated, return an error
    if (!userId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized: User not signed in'
      })
    }

    // Get the request body
    const body = await readBody(event) as ScrapeRequest

    // Validate the input
    if (!body.url || !body.html) {
      throw createError({
        statusCode: 400,
        message: 'URL and HTML content are required'
      })
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

    // Create a prompt for Gemini to extract application information
    // Check if the URL is from LinkedIn
    const isLinkedInJob = body.url.includes('linkedin.com/jobs/')
      || body.url.includes('linkedin.com/job/')
      || (body.url.includes('linkedin.com') && body.url.includes('/view/'))

    // Only include LinkedIn instructions if it's a LinkedIn job URL
    let promptContent = ''

    if (isLinkedInJob) {
      promptContent = `
      IMPORTANT: This is a LinkedIn job page. 
      
      1. Focus ONLY on the main job content found within elements with class="job-view-layout jobs-details". 
      2. Ignore any sidebar job recommendations or other LinkedIn content outside this main panel.
      3. For LinkedIn jobs:
         - The company name is typically found in the "company-name" or "topcard__org-name-link" elements
         - The job title is usually in the "top-card-layout__title" element
         - Salary/compensation may be in elements with "compensation" or "salary" in their class names
         - Look for contact information in the job description section
         - Pay special attention to the "skills" section and any bullet points in the job description that list requirements
         - Look for sections titled "Requirements", "Qualifications", "Skills", or "What You'll Need"
      `
    }

    // Add the standard extraction instructions
    promptContent += `
    Extract the following information from this HTML content:
    1. Company Name
    2. Email Address
    3. Job Title
    4. Amount - this would be salary, compensation, or pay (as a positive number)
    5. Keywords and Skills - Extract important keywords, technologies, skills, and qualifications mentioned in the job description that would be valuable for customizing a resume. Focus on technical skills, soft skills, experience requirements, and any specific qualifications mentioned.

    Format the response as a JSON object with these fields:
    {
      "companyName": string,
      "email": string,
      "jobTitle": string,
      "amount": number,
      "keywords": string[],
      "notes": string
    }

    For the "keywords" field, provide an array of specific skills, technologies, and qualifications mentioned in the job.
    
    For the "notes" field, provide strategic advice on how to customize a resume for this specific job based on the keywords and requirements identified. Include:
    1. Which skills and experiences to emphasize
    2. How to align past achievements with the job requirements
    3. Any specific certifications or qualifications that should be highlighted
    4. Suggestions for resume sections that would be particularly relevant
    5. Industry-specific terminology that should be incorporated

    If you can't find some information, make a reasonable guess based on the context or put unknown.


    Here's the HTML content:
    ${body.html}
    `

    // Generate content with Gemini
    const result = await model.generateContent(promptContent)
    const generatedText = result.response.text()

    console.log('Gemini response:', generatedText)

    // Parse the JSON response from Gemini
    let extractedData
    try {
      // Find JSON in the response (in case there's additional text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
        console.log('Extracted data:', extractedData)
      } else {
        throw new Error('No valid JSON found in the response')
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      throw createError({
        statusCode: 500,
        message: 'Failed to parse the AI-generated data'
      })
    }

    // Validate the extracted data
    if (
      !extractedData.companyName
      || !extractedData.email
      || !extractedData.amount
    ) {
      throw createError({
        statusCode: 500,
        message: 'AI could not extract all required fields'
      })
    }

    // Ensure keywords is an array
    if (!extractedData.keywords || !Array.isArray(extractedData.keywords)) {
      extractedData.keywords = []
    }

    // Create a new application with the extracted data
    const sourceInfo = `Source: ${body.title} (${body.url})`

    // Format keywords as a bulleted list if available
    let keywordsText = ''
    if (extractedData.keywords && Array.isArray(extractedData.keywords) && extractedData.keywords.length > 0) {
      keywordsText = '\n\n## Key Skills/Technologies:\n• ' + extractedData.keywords.join('\n• ')
    }

    // Format the notes with clear sections
    const resumeAdvice = extractedData.notes ? `\n\n## Resume Customization Advice:\n${extractedData.notes}` : ''

    const combinedNotes = `# Job Application Notes\n\n${resumeAdvice}${keywordsText}\n\n## Source Information:\n${sourceInfo}`

    const newApplication: NewApplication = {
      userId, // Add the user ID to associate the application with the user
      companyName: extractedData.companyName,
      email: extractedData.email,
      status: 'pending',
      amount: extractedData.amount,
      notes: combinedNotes,
      jobTitle: extractedData.jobTitle || null
    }

    // Insert the application into the database
    const applicationResult = await db
      .insert(applications)
      .values(newApplication)
      .returning()

    // Return the extracted data and the created application
    return {
      success: true,
      extractedData: extractedData,
      createdApplication: applicationResult[0]
    }
  } catch (error: unknown) {
    // Handle errors
    console.error('Scraper error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to process the URL'
    const statusCode = error instanceof Error && 'statusCode' in error
      ? (error as { statusCode: number }).statusCode
      : 500

    throw createError({
      statusCode,
      message: errorMessage
    })
  }
})
