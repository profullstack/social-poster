/**
 * Media Upload Service
 * Handles file validation and preparation for social media uploads
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Supported file types and their MIME types
 */
const SUPPORTED_TYPES = {
  // Images
  jpg: { type: 'image', mimeType: 'image/jpeg' },
  jpeg: { type: 'image', mimeType: 'image/jpeg' },
  png: { type: 'image', mimeType: 'image/png' },
  gif: { type: 'image', mimeType: 'image/gif' },
  webp: { type: 'image', mimeType: 'image/webp' },
  
  // Videos
  mp4: { type: 'video', mimeType: 'video/mp4' },
  mov: { type: 'video', mimeType: 'video/quicktime' },
  avi: { type: 'video', mimeType: 'video/x-msvideo' },
  webm: { type: 'video', mimeType: 'video/webm' },
};

/**
 * Default size limits (in bytes)
 */
const DEFAULT_LIMITS = {
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 50 * 1024 * 1024, // 50MB
};

/**
 * Validate media file type and extension
 * @param {string} filePath - Path to the file
 * @returns {Object} Validation result
 */
export function validateMediaFile(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  
  if (!ext) {
    return {
      valid: false,
      error: 'File must have an extension',
    };
  }
  
  const typeInfo = SUPPORTED_TYPES[ext];
  if (!typeInfo) {
    return {
      valid: false,
      error: `Unsupported file type: .${ext}. Supported types: ${Object.keys(SUPPORTED_TYPES).join(', ')}`,
    };
  }
  
  return {
    valid: true,
    type: typeInfo.type,
    mimeType: typeInfo.mimeType,
    extension: ext,
  };
}

/**
 * Check if file exists
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} True if file exists
 */
export async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 * @param {string} filePath - Path to the file
 * @returns {Promise<number>} File size in bytes
 */
export async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Validate file size against limits
 * @param {number} size - File size in bytes
 * @param {string} type - File type ('image' or 'video')
 * @param {Object} limits - Size limits
 * @returns {Object} Validation result
 */
export function validateFileSize(size, type, limits = DEFAULT_LIMITS) {
  const maxSize = type === 'image' ? limits.maxImageSize : limits.maxVideoSize;
  
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const actualSizeMB = Math.round(size / (1024 * 1024));
    
    return {
      valid: false,
      error: `${type === 'image' ? 'Image' : 'Video'} file too large: ${actualSizeMB}MB (max: ${maxSizeMB}MB)`,
    };
  }
  
  return { valid: true };
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Media Uploader Class
 * Handles file validation and preparation for upload
 */
export class MediaUploader {
  constructor(options = {}) {
    this.maxImageSize = options.maxImageSize || DEFAULT_LIMITS.maxImageSize;
    this.maxVideoSize = options.maxVideoSize || DEFAULT_LIMITS.maxVideoSize;
    this.supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    this.supportedVideoTypes = ['mp4', 'mov', 'avi', 'webm'];
  }

  /**
   * Get size limits for this uploader
   * @returns {Object} Size limits
   */
  getSizeLimits() {
    return {
      maxImageSize: this.maxImageSize,
      maxVideoSize: this.maxVideoSize,
    };
  }

  /**
   * Validate a file completely
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(filePath) {
    try {
      // Check if file exists
      const exists = await checkFileExists(filePath);
      if (!exists) {
        return {
          valid: false,
          error: 'File does not exist',
        };
      }

      // Validate file type
      const typeValidation = validateMediaFile(filePath);
      if (!typeValidation.valid) {
        return typeValidation;
      }

      // Get file size
      const size = await getFileSize(filePath);

      // Validate file size
      const sizeValidation = validateFileSize(size, typeValidation.type, this.getSizeLimits());
      if (!sizeValidation.valid) {
        return sizeValidation;
      }

      return {
        valid: true,
        type: typeValidation.type,
        mimeType: typeValidation.mimeType,
        extension: typeValidation.extension,
        size,
        formattedSize: formatFileSize(size),
      };

    } catch (error) {
      return {
        valid: false,
        error: `File validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Prepare file for upload by reading it into memory
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Upload preparation result
   */
  async prepareUpload(filePath) {
    try {
      // First validate the file
      const validation = await this.validateFile(filePath);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Read file into buffer
      const buffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      return {
        success: true,
        file: {
          path: filePath,
          name: fileName,
          type: validation.type,
          mimeType: validation.mimeType,
          extension: validation.extension,
          size: validation.size,
          formattedSize: validation.formattedSize,
          buffer,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to prepare file for upload: ${error.message}`,
      };
    }
  }

  /**
   * Get supported file types
   * @returns {Object} Supported types by category
   */
  getSupportedTypes() {
    return {
      images: this.supportedImageTypes,
      videos: this.supportedVideoTypes,
      all: [...this.supportedImageTypes, ...this.supportedVideoTypes],
    };
  }

  /**
   * Check if a file type is supported
   * @param {string} filePath - Path to the file
   * @returns {boolean} True if supported
   */
  isSupported(filePath) {
    const validation = validateMediaFile(filePath);
    return validation.valid;
  }
}

export default MediaUploader;