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

    // Delete the custom resume
    const result = await db
      .delete(customResumes)
      .where(
        and(
          eq(customResumes.id, parseInt(id)),
          eq(customResumes.userId, userId)
        )
      )
      .returning({ id: customResumes.id })

    // Check if any rows were deleted
    if (!result.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Resume not found or you do not have permission to delete it'
      })
    }

    return {
      success: true,
      data: {
        id: result[0]?.id || 0,
        message: 'Custom resume deleted successfully'
      }
    }
  } catch (error) {
    console.error('Error deleting custom resume:', error)

    let errorMessage = 'Unknown error occurred while deleting custom resume'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
})
