import type { SupabaseClient } from '@supabase/supabase-js'

// Accept the Supabase client as a parameter with proper typing
export function useSupabaseStorage(supabase: SupabaseClient) {
  // Remove the initialization since we're receiving the client as a parameter
  // const supabase = useSupabaseClient()

  /**
   * Upload a file to Supabase Storage
   * @param bucket The storage bucket name
   * @param path The path within the bucket
   * @param file The file to upload
   * @param options Upload options
   */
  const uploadFile = async (
    bucket: string,
    path: string,
    file: File,
    options?: { contentType?: string }
  ) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: options?.contentType || file.type
        })

      if (error) throw error

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return {
        success: true,
        data: {
          path: data.path,
          publicUrl: urlData.publicUrl
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      return {
        success: false,
        error
      }
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param bucket The storage bucket name
   * @param path The path of the file to delete
   */
  const deleteFile = async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error

      return {
        success: true
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      return {
        success: false,
        error
      }
    }
  }

  /**
   * Download a file from Supabase Storage
   * @param bucket The storage bucket name
   * @param path The path of the file to download
   */
  const downloadFile = async (bucket: string, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) throw error

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      return {
        success: false,
        error
      }
    }
  }

  return {
    uploadFile,
    deleteFile,
    downloadFile
  }
}
