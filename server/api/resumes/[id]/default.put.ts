import { db } from '../../../../db'
import { resumes } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

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

    // Get the resume ID from the URL
    const resumeId = parseInt(event.context.params?.id || '0')
    
    if (!resumeId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Invalid resume ID'
      })
    }

    // Check if the resume exists and belongs to the user
    const resumeData = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .where(eq(resumes.userId, userId))
      .limit(1)

    if (!resumeData.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Resume not found'
      })
    }

    // First, unset any existing default resumes
    await db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.userId, userId))
      .where(eq(resumes.isDefault, true))

    // Then, set the selected resume as default
    await db
      .update(resumes)
      .set({ isDefault: true })
      .where(eq(resumes.id, resumeId))

    // Fetch all resumes for the user to return
    const result = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(resumes.isDefault, 'desc')
      .orderBy(resumes.createdAt, 'desc')

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error setting resume as default:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}) 