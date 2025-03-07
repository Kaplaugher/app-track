import { db } from '~/server/database';
import { applications, type NewApplication } from '~/server/database/schema';
import { z } from 'zod';

// Define validation schema for the request body
const applicationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  amount: z.number().positive('Amount must be a positive number'),
  notes: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate the request body
    const body = await readBody(event);
    const validatedData = applicationSchema.parse(body);

    // Prepare the data for insertion
    const newApplication: NewApplication = {
      companyName: validatedData.companyName,
      email: validatedData.email,
      status: validatedData.status,
      // Convert number to string for decimal field
      amount: String(validatedData.amount),
      notes: validatedData.notes || null,
      // date, createdAt, and updatedAt will use their default values (defaultNow())
    };

    // Insert the application into the database
    const result = await db
      .insert(applications)
      .values(newApplication)
      .returning();

    // Return the created application
    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: 'Validation error',
        details: error.errors,
      };
    }

    // Handle other errors
    console.error('Error creating application:', error);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: 'Failed to create application',
    };
  }
});
