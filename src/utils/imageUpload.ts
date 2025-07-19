import { supabase } from '@/integrations/supabase/client';

/**
 * Processes and uploads an image to Supabase storage
 * @param file Image file to upload
 * @param bucket Supabase storage bucket name
 * @param folder Folder path within the bucket
 * @param fileName Optional custom file name (without extension)
 * @returns URL of the uploaded image or null if upload failed
 */
export async function uploadImage(
  file: File,
  bucket: string,
  folder: string,
  fileName?: string
): Promise<string | null> {
  try {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    // Check file size (max 2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Image file size must be less than 2MB');
    }
    
    // Validate supported image formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!supportedFormats.includes(file.type)) {
      throw new Error('Unsupported image format. Please use JPEG, PNG, WebP, GIF, or SVG');
    }
    
    // Use the existing 'photos' bucket
    bucket = 'photos'; // Override with the existing bucket name

    // Generate file name if not provided
    const fileNameToUse = fileName || `${Date.now()}`;
    const fileExt = 'webp';
    const fullFileName = `${fileNameToUse}.${fileExt}`;
    
    // Get current session to include user-specific path
    const { data: { session } } = await supabase.auth.getSession();
    
    // Create path based on authentication status
    let filePath: string;
    if (session?.user?.id) {
      // Authenticated user path
      filePath = `${session.user.id}/${folder ? folder + '/' : ''}${fullFileName}`;
    } else {
      // Public path as fallback
      filePath = `public/${folder ? folder + '/' : ''}${fullFileName}`;
    }

    // Process image: resize and convert to webp
    const processedImageBlob = await resizeAndConvertImage(file, 600, 600);
    
    // Debug information
    // console.log(`Attempting to upload to: ${bucket}/${filePath}`);
    // console.log(`File type: ${processedImageBlob.type}`);
    
    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedImageBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      // Detailed error logging
      console.error(`Upload error details:`, {
        errorMessage: uploadError.message,
        path: filePath,
        bucket,
        error: uploadError
      });
      
      // Check if it's an RLS policy error
      if (uploadError.message?.includes('row-level security') || 
          uploadError.message?.includes('Unauthorized')) {
        throw new Error(`Permission denied: Unable to upload to ${bucket}/${filePath}. Please check your Supabase RLS policies.`);
      }
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

/**
 * Resizes an image and converts it to WebP format
 * @param file Original image file
 * @param maxWidth Maximum width of the resized image
 * @param maxHeight Maximum height of the resized image
 * @returns Blob of the processed image in WebP format
 */
export async function resizeAndConvertImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw and convert to webp
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to webp with quality to keep file size under 100KB
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        }, 'image/webp', 0.8); // 80% quality
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}
