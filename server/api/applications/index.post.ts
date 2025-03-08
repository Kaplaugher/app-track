import { db } from '../../../db'
import { applications } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Insert the application into the database
    const result = await db
      .insert(applications)
      .values({
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
