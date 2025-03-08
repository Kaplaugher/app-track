import { inArray } from 'drizzle-orm/expressions'
import { db } from '../../../db'
import { applications } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  try {
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

    // Delete the applications from the database
    const result = await db
      .delete(applications)
      .where(inArray(applications.id, ids))
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
