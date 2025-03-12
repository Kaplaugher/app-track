import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes } from '../../../db/schema'

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

    // Fetch all resumes for the user
    const result = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))

    // Sort the results in memory (default resumes first, then by creation date)
    const sortedResult = [...result].sort((a, b) => {
      // First sort by isDefault (true comes first)
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1

      // Then sort by createdAt (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    console.log('Fetched resumes:', sortedResult.length, 'resumes for user', userId)
    return {
      success: true,
      data: sortedResult
    }
  } catch (error) {
    console.error('Error fetching resumes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
