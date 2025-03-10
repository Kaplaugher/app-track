import { inArray, and, eq } from 'drizzle-orm/expressions'
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

    const body = await readBody(event)

    // Check if we have an array of IDs or a single ID
    const ids = Array.isArray(body.ids) ? body.ids : [body.id]

    if (!ids.length) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'No application IDs provided'
      }
    }

    // Delete the applications from the database, but only if they belong to the authenticated user
    const result = await db
      .delete(applications)
      .where(
        and(
          inArray(applications.id, ids),
          eq(applications.userId, userId) // Ensure the user can only delete their own applications
        )
      )
      .returning({ id: applications.id })

    return {
      success: true,
      data: {
        deleted: result.length,
        ids: result.map(item => item.id)
      }
    }
  } catch (error) {
    console.error('Error deleting applications:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to delete applications'
    }
  }
})
