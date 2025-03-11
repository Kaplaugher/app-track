import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db'
import { resumes } from '../../../../db/schema'

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

    // Get the resume ID from the URL
    const resumeId = parseInt(event.context.params?.id || '0')
    
    if (!resumeId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Invalid resume ID'
      })
    }

    // Check if the resume exists and belongs to the user
    const resumeData = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .where(eq(resumes.userId, userId))
      .limit(1)

    if (!resumeData.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found: Resume not found'
      })
    }

    const resume = resumeData[0]

    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceKey as string
    )

    // Extract the file path from the URL
    const fileUrl = new URL(resume.fileUrl)
    const path = fileUrl.pathname.split('/').slice(-2).join('/')

    // Delete the file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('resumes')
      .remove([path])

    if (deleteError) {
      console.error('Error deleting file from storage:', deleteError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the resume from the database
    await db
      .delete(resumes)
      .where(eq(resumes.id, resumeId))

    // Fetch all remaining resumes for the user
    const result = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(resumes.isDefault, 'desc')
      .orderBy(resumes.createdAt, 'desc')

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error deleting resume:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}) 