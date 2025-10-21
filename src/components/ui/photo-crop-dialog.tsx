import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import * as faceapi from 'face-api.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Upload } from 'lucide-react';

interface PhotoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedImageBlob: Blob) => Promise<void>;
  title?: string;
  description?: string;
}

export const PhotoCropDialog = ({
  open,
  onOpenChange,
  onCropComplete,
  title = "Crop Photo",
  description = "Adjust the photo to fit the square frame. Face detection will auto-center your face."
}: PhotoCropDialogProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load face-api.js models once when component mounts
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face detection models:', err);
        // Continue without face detection if models fail to load
        setModelsLoaded(false);
      }
    };

    loadModels();
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        detectAndCenterFace(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const detectAndCenterFace = async (imageDataUrl: string) => {
    if (!modelsLoaded) {
      console.log('Face detection models not loaded, skipping face detection');
      return;
    }

    setIsDetecting(true);
    setFaceDetected(false);

    try {
      // Create image element from data URL
      const img = await faceapi.fetchImage(imageDataUrl);

      // Detect face with landmarks
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks();

      if (detection) {
        setFaceDetected(true);

        // Get face bounding box
        const box = detection.detection.box;
        const imgWidth = img.width;
        const imgHeight = img.height;

        // Calculate center of face
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;

        // Convert to crop position (center the face in the crop area)
        // Crop position is relative to image center
        const cropX = ((faceCenterX - imgWidth / 2) / imgWidth) * 100;
        const cropY = ((faceCenterY - imgHeight / 2) / imgHeight) * 100;

        // Calculate zoom to fit face nicely
        // Make the crop area slightly larger than the face
        const faceSize = Math.max(box.width, box.height);
        const cropSize = Math.min(imgWidth, imgHeight);
        const suggestedZoom = (faceSize * 1.8) / cropSize;

        setCrop({ x: cropX, y: cropY });
        setZoom(Math.max(1, Math.min(3, suggestedZoom)));
      }
    } catch (err) {
      console.error('Face detection failed:', err);
      // Continue with default center crop if detection fails
    } finally {
      setIsDetecting(false);
    }
  };

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number[]) => {
    setZoom(newZoom[0]);
  }, []);

  const onCropAreaChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (): Promise<Blob> => {
    if (!imageSrc || !croppedAreaPixels) {
      throw new Error('No image to crop');
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set canvas size to 500x500 (fixed output size)
        canvas.width = 500;
        canvas.height = 500;

        // Draw the cropped area onto the canvas
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          500,
          500
        );

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      };
      image.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    });
  };

  const handleCropAndUpload = async () => {
    try {
      setIsUploading(true);
      setError(null);

      const croppedBlob = await createCroppedImage();
      await onCropComplete(croppedBlob);

      // Reset state after successful upload
      handleReset();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Crop and upload failed:', err);
      setError(err.message || 'Failed to crop and upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setFaceDetected(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />

          {/* Upload Button or Cropper */}
          {!imageSrc ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={triggerFileInput}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm">Choose Photo</span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG up to 5MB
                  </span>
                </div>
              </Button>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Face Detection Status */}
              {isDetecting && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Detecting face...</AlertDescription>
                </Alert>
              )}
              {faceDetected && !isDetecting && (
                <Alert className="border-green-500 bg-green-500/10">
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    ✓ Face detected and centered
                  </AlertDescription>
                </Alert>
              )}

              {/* Cropper */}
              <div className="relative h-96 w-full bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={onCropChange}
                  onZoomChange={setZoom}
                  onCropComplete={onCropAreaChange}
                />
              </div>

              {/* Zoom Slider */}
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={onZoomChange}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {imageSrc ? (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isUploading}>
                Reset
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleCropAndUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Crop & Upload'
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
