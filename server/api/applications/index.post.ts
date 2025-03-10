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

    // Insert the application into the database with the user ID
    const result = await db
      .insert(applications)
      .values({
        userId, // Add the user ID to associate the application with the user
        companyName: body.companyName,
        jobTitle: body.jobTitle,
        email: body.email,
        status: body.status || 'pending',
        amount: body.amount,
        notes: body.notes || null,
        favorite: body.favorite || false
      })
      .returning()

    return {
      success: true,
      data: result[0]
    }
  } catch (error) {
    console.error('Error creating application:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      error: 'Failed to create application'
    }
  }
})
