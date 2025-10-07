/**
 * File-related interfaces
 * Defines types for file upload and download operations
 */

/**
 * File upload interface
 * Represents a file being uploaded to the system
 */
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

/**
 * Pre-signed URL response interface
 * Response for generating download URLs
 */
export interface PreSignedUrlResponse {
  url: string;
  expiresIn: number;
  expiresAt: Date;
}
