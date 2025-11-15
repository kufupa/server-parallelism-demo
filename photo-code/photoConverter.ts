/**
 * Photo Converter Utilities
 * Convert photo data between different formats for storage and transmission
 */

interface PhotoData {
  id: number;
  name: string;
  buffer: Buffer;
  sizeKB: number;
}

interface ConvertedPhoto {
  id: number;
  name: string;
  base64: string;
  sizeKB: number;
  mimeType: string;
}

/**
 * Detect image MIME type from buffer
 */
function detectMimeType(buffer: Buffer): string {
  // Check magic bytes for common image formats
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'image/bmp';
  }
  // Default to JPEG if cannot determine
  return 'image/jpeg';
}

/**
 * Convert photo buffer to base64 string
 */
export function photoToBase64(photo: PhotoData): ConvertedPhoto {
  const base64 = photo.buffer.toString('base64');
  const mimeType = detectMimeType(photo.buffer);

  return {
    id: photo.id,
    name: photo.name,
    base64: base64,
    sizeKB: photo.sizeKB,
    mimeType: mimeType,
  };
}

/**
 * Create data URL from photo (for HTML img src)
 */
export function photoToDataUrl(photo: PhotoData): string {
  const mimeType = detectMimeType(photo.buffer);
  const base64 = photo.buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert base64 back to buffer
 */
export function base64ToBuffer(base64String: string): Buffer {
  return Buffer.from(base64String, 'base64');
}

/**
 * Get photo dimensions (simplified - checks common sizes)
 */
export function estimatePhotoDimensions(buffer: Buffer): { width: number; height: number } | null {
  // Check for JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    // JPEG detection would require more complex parsing
    // Returning common product photo dimensions as estimate
    return { width: 800, height: 600 };
  }
  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) {
    // PNG dimensions are at bytes 16-24
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  return null;
}

/**
 * Compress photo quality indicator (returns estimated compression ratio)
 */
export function analyzePhotoQuality(buffer: Buffer): {
  sizeKB: number;
  estimatedQuality: 'low' | 'medium' | 'high';
  format: string;
} {
  const sizeKB = buffer.length / 1024;
  let format = 'unknown';
  let estimatedQuality: 'low' | 'medium' | 'high' = 'medium';

  // Detect format
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    format = 'JPEG';
  } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) {
    format = 'PNG';
  } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    format = 'GIF';
  }

  // Estimate quality based on size (rough estimate)
  if (sizeKB < 50) {
    estimatedQuality = 'low';
  } else if (sizeKB < 200) {
    estimatedQuality = 'medium';
  } else {
    estimatedQuality = 'high';
  }

  return {
    sizeKB,
    estimatedQuality,
    format,
  };
}

/**
 * Export photo in different formats (simulation)
 */
export function exportPhotoFormats(
  buffer: Buffer,
  name: string
): Record<string, string | number> {
  const mimeType = detectMimeType(buffer);
  const base64 = buffer.toString('base64');
  const quality = analyzePhotoQuality(buffer);

  return {
    filename: name,
    format: quality.format,
    mimeType: mimeType,
    base64Truncated: `${base64.substring(0, 50)}...`,
    sizeKB: quality.sizeKB,
    estimatedQuality: quality.estimatedQuality,
    dataUrl: `data:${mimeType};base64,${base64.substring(0, 30)}...`,
  };
}
