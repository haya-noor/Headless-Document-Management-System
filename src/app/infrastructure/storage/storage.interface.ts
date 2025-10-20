/**
 * Storage Service Interface
 * Defines contract for storage implementations (local, S3, GCS, Azure)
 * 
 * storage.interface.ts → TypeScript types/contracts (what shape things should have)
 */

export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface PreSignedUrlResponse {
  url: string;
  expiresAt: Date;
}

export interface IStorageService {
  uploadFile(
    file: FileUpload,
    key: string,
    options?: {
      metadata?: Record<string, string>;
      tags?: Record<string, string>;
      contentType?: string;
    }
  ): Promise<{ key: string; checksum: string; url?: string }>;

  generateDownloadUrl(
    key: string,
    expiresIn?: number,
    filename?: string
  ): Promise<PreSignedUrlResponse>;

  deleteFile(key: string): Promise<boolean>;

  fileExists(key: string): Promise<boolean>;

  getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
  }>;

  readFile(key: string): Promise<Buffer>;

  copyFile(sourceKey: string, destinationKey: string): Promise<boolean>;

  generateFileKey(userId: string, filename: string, documentId: string): string;

  generateVersionKey(baseKey: string, version: number): string;

  listFiles(prefix?: string, limit?: number): Promise<string[]>;

  getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    storageLocation: string;
  }>;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    storagePath: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };
  azure?: {
    connectionString: string;
    containerName: string;
  };
}

