/**
 * File-related interfaces
 */

/**
 * File upload interface
 */
export interface FileUpload {
  buffer: Buffer;
  originalname?: string;
  filename: string;
  mimetype: string;
  size: number;
}

/**
 * S3 pre-signed URL response
 */
export interface PreSignedUrlResponse {
  url: string;
  expiresIn: number;
  expiresAt: Date;
}
