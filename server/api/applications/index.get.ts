import { eq } from 'drizzle-orm'
import { applications } from '../../../db/schema'
import { db } from '../../../db'

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

    // Fetch only applications belonging to the authenticated user
    const result = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))

    return result
  } catch (error) {
    console.error('Error fetching applications:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch applications'
    })
  }
})
