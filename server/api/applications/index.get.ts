import { db } from '~/server/database';
import { applications } from '~/server/database/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    // Fetch all applications from the database
    const result = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching applications:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: 'Failed to fetch applications',
    };
  }
});
