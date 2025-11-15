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
 * Convert photo buffer to base64 string
 */
export declare function photoToBase64(photo: PhotoData): ConvertedPhoto;
/**
 * Create data URL from photo (for HTML img src)
 */
export declare function photoToDataUrl(photo: PhotoData): string;
/**
 * Convert base64 back to buffer
 */
export declare function base64ToBuffer(base64String: string): Buffer;
/**
 * Get photo dimensions (simplified - checks common sizes)
 */
export declare function estimatePhotoDimensions(buffer: Buffer): {
    width: number;
    height: number;
} | null;
/**
 * Compress photo quality indicator (returns estimated compression ratio)
 */
export declare function analyzePhotoQuality(buffer: Buffer): {
    sizeKB: number;
    estimatedQuality: 'low' | 'medium' | 'high';
    format: string;
};
/**
 * Export photo in different formats (simulation)
 */
export declare function exportPhotoFormats(buffer: Buffer, name: string): Record<string, string | number>;
export {};
//# sourceMappingURL=photoConverter.d.ts.map