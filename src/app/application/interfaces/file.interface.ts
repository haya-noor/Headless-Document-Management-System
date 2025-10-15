/**
 * File-related interfaces for application layer
 */

/**
 * File upload interface
 */
export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Pre-signed URL response interface
 */
export interface PreSignedUrlResponse {
  url: string;
  expiresAt: Date;
  filename?: string;
}
