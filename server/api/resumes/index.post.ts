import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { resumes } from '../../../db/schema'

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

    // Get the form data with the file
    const formData = await readMultipartFormData(event)

    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: No form data provided'
      })
    }

    // Extract file and metadata
    const fileEntry = formData.find(entry => entry.name === 'file')
    const titleEntry = formData.find(entry => entry.name === 'title')
    const descriptionEntry = formData.find(entry => entry.name === 'description')
    const isDefaultEntry = formData.find(entry => entry.name === 'isDefault')

    if (!fileEntry || !titleEntry) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing required fields'
      })
    }

    const file = fileEntry.data
    const title = titleEntry.data.toString()
    const description = descriptionEntry ? descriptionEntry.data.toString() : null
    const isDefault = isDefaultEntry ? isDefaultEntry.data.toString() === 'true' : false

    // Determine file type
    const filename = fileEntry.filename || 'resume'
    const fileExtension = filename.split('.').pop()?.toLowerCase() || ''
    let fileType = ''

    if (fileExtension === 'pdf') {
      fileType = 'application/pdf'
    } else if (fileExtension === 'docx') {
      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } else if (fileExtension === 'doc') {
      fileType = 'application/msword'
    } else if (fileExtension === 'txt') {
      fileType = 'text/plain'
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Unsupported file type'
      })
    }

    // Initialize Supabase client
    const config = useRuntimeConfig()
    const supabase = createClient(
      config.public.supabaseUrl as string,
      config.supabaseServiceKey as string
    )

    // Upload file to Supabase Storage
    const storagePath = `resumes/${userId}/${Date.now()}_${filename}`
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, file, {
        contentType: fileType,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to upload resume'
      })
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(storagePath)

    // If this is set as default, update any existing default resumes
    if (isDefault) {
      await db
        .update(resumes)
        .set({ isDefault: false })
        .where(eq(resumes.userId, userId))
    }

    // Insert the resume record into the database
    const result = await db
      .insert(resumes)
      .values({
        userId,
        title,
        description,
        fileUrl: urlData.publicUrl,
        fileType,
        isDefault,
        // We'll parse the content later in a separate process
        parsedContent: null
      })
      .returning()

    return {
      success: true,
      data: result[0]
    }
  } catch (error) {
    console.error('Error uploading resume:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})
