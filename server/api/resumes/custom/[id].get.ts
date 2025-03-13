import { and, eq } from 'drizzle-orm'
import { db } from '../../../../db'
import { customResumes } from '../../../../db/schema'

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
    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing resume ID'
      })
    }

    // Fetch the custom resume
    const result = await db
      .select()
      .from(customResumes)
      .where(
        and(
          eq(customResumes.id, parseInt(id)),
          eq(customResumes.userId, userId)
        )
      )
      .limit(1)

    // Check if any rows were found
    if (!result.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Resume not found or you do not have permission to access it'
      })
    }

    return {
      success: true,
      data: result[0]
    }
  } catch (error) {
    console.error('Error fetching custom resume:', error)

    let errorMessage = 'Unknown error occurred while fetching custom resume'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
})
