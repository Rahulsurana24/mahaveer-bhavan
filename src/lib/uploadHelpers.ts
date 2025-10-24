// File upload helpers for Supabase Storage
import { supabase } from "@/integrations/supabase/client";

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  duration?: number;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadMessageMedia(
  file: File,
  userId: string,
  mediaType: MediaType
): Promise<UploadResult> {
  try {
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error("File size exceeds 50MB limit");
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${mediaType}s/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('message-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-media')
      .getPublicUrl(filePath);

    // For videos, create thumbnail if needed
    let thumbnailUrl: string | undefined;
    if (mediaType === 'video') {
      // TODO: Implement video thumbnail generation
      thumbnailUrl = publicUrl; // Use video URL as placeholder
    }

    // For audio, get duration if available
    let duration: number | undefined;
    if (mediaType === 'audio') {
      duration = await getAudioDuration(file);
    }

    return {
      url: publicUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      thumbnailUrl,
      duration
    };
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Failed to upload file');
  }
}

/**
 * Get audio duration from file
 */
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.floor(audio.duration));
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Record audio using MediaRecorder API
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or not available');
    }
  }

  async stop(): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioFile = new File(
          [audioBlob],
          `voice_${Date.now()}.webm`,
          { type: 'audio/webm' }
        );

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }

        resolve(audioFile);
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.audioChunks = [];
  }
}

/**
 * Compress image before upload
 */
export async function compressImage(file: File, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Determine media type from file
 */
export function getMediaTypeFromFile(file: File): MediaType {
  const mimeType = file.type.toLowerCase();

  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  } else if (mimeType.startsWith('audio/')) {
    return 'audio';
  } else {
    return 'document';
  }
}

/**
 * Validate file type for messaging
 */
export function isValidMessageFile(file: File): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  return allowedTypes.includes(file.type.toLowerCase());
}
