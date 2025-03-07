import { db } from '~/server/database';
import { applications } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    // Get the application ID from the route params
    const id = getRouterParam(event, 'id');

    if (!id || isNaN(Number(id))) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: 'Invalid application ID',
      };
    }

    // Delete the application from the database
    const result = await db
      .delete(applications)
      .where(eq(applications.id, Number(id)))
      .returning();

    // Check if any application was deleted
    if (!result.length) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: 'Application not found',
      };
    }

    // Return success response
    return {
      success: true,
      message: 'Application deleted successfully',
      data: result[0],
    };
  } catch (error) {
    console.error('Error deleting application:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: 'Failed to delete application',
    };
  }
});
