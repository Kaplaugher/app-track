import { eq } from 'drizzle-orm'
import { db } from '../../../../db'
import { customResumes, applications } from '../../../../db/schema'

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

    // Fetch all custom resumes for the user with application details
    const result = await db
      .select({
        id: customResumes.id,
        userId: customResumes.userId,
        originalResumeId: customResumes.originalResumeId,
        applicationId: customResumes.applicationId,
        title: customResumes.title,
        fileUrl: customResumes.fileUrl,
        customizations: customResumes.customizations,
        createdAt: customResumes.createdAt,
        updatedAt: customResumes.updatedAt,
        application: {
          companyName: applications.companyName,
          jobTitle: applications.jobTitle
        }
      })
      .from(customResumes)
      .leftJoin(applications, eq(customResumes.applicationId, applications.id))
      .where(eq(customResumes.userId, userId))
      .orderBy(customResumes.createdAt)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error fetching custom resumes:', error)

    let errorMessage = 'Unknown error occurred while fetching custom resumes'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
})
