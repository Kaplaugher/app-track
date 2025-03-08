import { applications } from '../../../db/schema'
import { db } from '../../../db'

export default defineEventHandler(async (_event) => {
  try {
    const result = await db.select().from(applications)
    return result
  } catch (error) {
    console.error('Error fetching applications:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch applications'
    })
  }
})
