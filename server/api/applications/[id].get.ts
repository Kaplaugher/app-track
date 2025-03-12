import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { applications } from '../../../db/schema'

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

    // Get the application ID from the route params
    const id = parseInt(event.context.params?.id || '0')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Invalid application ID'
      })
    }

    // Fetch the application data
    const applicationData = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1)

    if (!applicationData.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Application not found'
      })
    }

    // Verify that the application belongs to the authenticated user
    const application = applicationData[0]

    if (!application) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Application not found'
      })
    }

    if (application.userId !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: You do not have permission to access this application'
      })
    }

    return {
      success: true,
      data: {
        application
      }
    }
  } catch (error) {
    console.error('Error fetching application:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
