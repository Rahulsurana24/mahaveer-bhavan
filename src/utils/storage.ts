import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

/**
 * Upload a file to the gallery storage bucket
 * Gallery bucket is public - anyone can view the files
 */
export async function uploadToGallery(
  file: File,
  folder?: string
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('gallery')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Gallery upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gallery')
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path
    };
  } catch (error: any) {
    console.error('Failed to upload to gallery:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload file'
    };
  }
}

/**
 * Upload a file to the messaging-attachments storage bucket
 * Messaging bucket is private - only sender and receiver can access
 */
export async function uploadToMessaging(
  file: File,
  memberId: string
): Promise<UploadResult> {
  try {
    // Generate unique filename with member ID as folder
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    const filePath = `${memberId}/${fileName}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('messaging-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Messaging upload error:', error);
      throw error;
    }

    // Get signed URL (private bucket)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('messaging-attachments')
      .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 days

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      throw urlError;
    }

    return {
      url: signedUrlData.signedUrl,
      path: data.path
    };
  } catch (error: any) {
    console.error('Failed to upload to messaging:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload file'
    };
  }
}

/**
 * Delete a file from gallery storage
 */
export async function deleteFromGallery(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('gallery')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete from gallery:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete from gallery:', error);
    return false;
  }
}

/**
 * Delete a file from messaging storage
 */
export async function deleteFromMessaging(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('messaging-attachments')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete from messaging:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete from messaging:', error);
    return false;
  }
}

/**
 * Get file type from file
 */
export function getFileType(file: File): 'image' | 'video' | 'audio' | 'document' {
  const type = file.type.toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(file: File, maxSizeMB: number = 50): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  const fileType = file.type.toLowerCase();
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  const isValidType = allowedTypes.some(allowed => {
    if (allowed.includes('*')) {
      // Handle wildcards like 'image/*'
      const category = allowed.split('/')[0];
      return fileType.startsWith(category + '/');
    }
    return fileType === allowed || `.${fileExt}` === allowed;
  });

  if (!isValidType) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}
