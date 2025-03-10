import { eq, and } from 'drizzle-orm'
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

    const id = parseInt(event.context.params?.id || '0')
    if (!id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid application ID'
      }
    }

    // First, check if the application exists and belongs to the user
    const existingApplication = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, id),
          eq(applications.userId, userId)
        )
      )
      .limit(1)

    if (!existingApplication.length) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Application not found or you do not have permission to update it'
      }
    }

    const body = await readBody(event)

    // Update the application in the database
    const result = await db
      .update(applications)
      .set({
        companyName: body.companyName,
        jobTitle: body.jobTitle,
        email: body.email,
        status: body.status || 'pending',
        amount: body.amount,
        notes: body.notes || null,
        favorite: body.favorite || false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(applications.id, id),
          eq(applications.userId, userId) // Ensure the user can only update their own applications
        )
      )
      .returning()

    return {
      success: true,
      data: result[0]
    }
  } catch (error) {
    console.error('Error updating application:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to update application'
    }
  }
})
