import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { applications } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || '0')
    if (!id) {
      setResponseStatus(event, 400)
      return {
        success: false,
        error: 'Invalid application ID'
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
      .where(eq(applications.id, id))
      .returning()

    if (!result.length) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: 'Application not found'
      }
    }

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
