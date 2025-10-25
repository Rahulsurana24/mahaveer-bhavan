import { supabase } from '../supabase/client';
import * as FileSystem from 'react-native-fs';

/**
 * Media upload service for Supabase Storage
 * Handles image and video uploads with compression and validation
 */

/**
 * Upload a file to Supabase Storage
 * @param {string} fileUri - Local file URI
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path within bucket
 * @param {Object} options - Upload options
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadMedia = async (fileUri, bucket, path, options = {}) => {
  try {
    // Validate file size
    const fileInfo = await FileSystem.stat(fileUri);
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default

    if (fileInfo.size > maxSize) {
      return {
        url: null,
        error: { message: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = fileUri.split('.').pop();
    const fileName = `${options.userId || 'user'}-${timestamp}.${extension}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    // Read file as base64
    const base64 = await FileSystem.readFile(fileUri, 'base64');

    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: options.contentType || 'image/jpeg' });

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: options.contentType || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      error: null,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      url: null,
      error
    };
  }
};

/**
 * Upload profile photo
 * @param {string} fileUri - Local file URI
 * @param {string} userId - User ID
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadProfilePhoto = async (fileUri, userId) => {
  return uploadMedia(fileUri, 'member-photos', '', {
    userId,
    contentType: 'image/jpeg',
    maxSize: 5 * 1024 * 1024 // 5MB
  });
};

/**
 * Upload gallery media
 * @param {string} fileUri - Local file URI
 * @param {string} userId - User ID
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadGalleryMedia = async (fileUri, userId, mediaType = 'image') => {
  const bucket = 'gallery-posts';
  const path = 'pending';
  const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

  return uploadMedia(fileUri, bucket, path, {
    userId,
    contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    maxSize
  });
};

/**
 * Upload message attachment
 * @param {string} fileUri - Local file URI
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadMessageAttachment = async (fileUri, userId, conversationId) => {
  return uploadMedia(fileUri, 'messaging-attachments', conversationId, {
    userId,
    contentType: 'image/jpeg',
    maxSize: 20 * 1024 * 1024 // 20MB
  });
};

/**
 * Delete a file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path
 * @returns {Promise<{error: any}>}
 */
export const deleteMedia = async (bucket, path) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { error };
  }
};

/**
 * Get signed URL for private files
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiration in seconds
 * @returns {Promise<{url: string, error: any}>}
 */
export const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return {
      url: data.signedUrl,
      error: null
    };
  } catch (error) {
    console.error('Signed URL error:', error);
    return {
      url: null,
      error
    };
  }
};
