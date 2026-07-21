import { supabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// Local TypeScript definitions for Express files
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MAX_BUCKET_SIZES: Record<string, number> = {
  'device-photos': 5 * 1024 * 1024,   // 5MB
  'customer-photos': 2 * 1024 * 1024, // 2MB
  'shop-logos': 1 * 1024 * 1024,      // 1MB
  'delivery-photos': 5 * 1024 * 1024, // 5MB
  'rate-card-images': 2 * 1024 * 1024, // 2MB
  'carousel-images': 5 * 1024 * 1024,  // 5MB
  'owner-photos': 2 * 1024 * 1024     // 2MB
};

/**
 * Compresses an image buffer using Sharp:
 * - Resizes to max 1600x1600 (preserving aspect ratio, never upscaling)
 * - Converts to WebP at 80% quality
 * - Typically reduces file size by 70–90%
 */
async function compressImageBuffer(
  inputBuffer: Buffer,
  originalMimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    // Skip tiny files already under 50 KB — no need to re-compress
    if (inputBuffer.length < 50 * 1024) {
      return { buffer: inputBuffer, mimeType: originalMimeType };
    }

    const compressedBuffer = await sharp(inputBuffer)
      .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    const savedBytes = inputBuffer.length - compressedBuffer.length;
    const savedPct = ((savedBytes / inputBuffer.length) * 100).toFixed(1);
    console.log(`[ImageCompressor] ${(inputBuffer.length / 1024).toFixed(0)} KB → ${(compressedBuffer.length / 1024).toFixed(0)} KB (saved ${savedPct}%)`);

    return { buffer: compressedBuffer, mimeType: 'image/webp' };
  } catch (err) {
    console.warn('[ImageCompressor] Sharp compression failed, using original:', err);
    return { buffer: inputBuffer, mimeType: originalMimeType };
  }
}

export async function uploadPhoto(
  file: Express.Multer.File,
  bucket: 'device-photos' | 'customer-photos' | 'shop-logos' | 'delivery-photos' | 'rate-card-images' | 'carousel-images' | 'owner-photos'
): Promise<string> {
  // 1. Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type. Allowed types: JPEG, PNG, WEBP');
  }

  // 2. Validate original file size before compression
  const maxLimit = MAX_BUCKET_SIZES[bucket] || 5 * 1024 * 1024;
  if (file.size > maxLimit) {
    throw new Error(`File too large. Max size allowed: ${maxLimit / (1024 * 1024)}MB`);
  }

  // 3. Compress image with Sharp → WebP at 80% quality, max 1600px
  const { buffer: compressedBuffer, mimeType: uploadMimeType } = await compressImageBuffer(
    file.buffer,
    file.mimetype
  );

  // 4. Generate filename — always .webp since Sharp outputs WebP
  const fileExt = uploadMimeType === 'image/webp' ? '.webp' : '.jpg';
  const fileName = `${uuidv4()}${fileExt}`;
  const filePath = fileName;

  // 5. Upload compressed buffer to Supabase Cloud Storage
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, compressedBuffer, {
      contentType: uploadMimeType,
      duplex: 'half'
    });

  if (error || !data) {
    throw new Error(`Cloud storage upload failed: ${error?.message || 'Unknown error'}`);
  }

  // 6. Return public or signed URL
  if (bucket === 'shop-logos' || bucket === 'rate-card-images' || bucket === 'carousel-images' || bucket === 'owner-photos') {
    // Public buckets
    const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return publicUrl;
  } else {
    // Private buckets — signed URL valid for 10 years
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

    if (signError || !signedData) {
      throw new Error(`Failed to sign storage path: ${signError?.message || 'Unknown error'}`);
    }

    return signedData.signedUrl;
  }
}
