/**
 * storage.factory.ts → Factory pattern logic (how to create instances)
 * 
 * Storage service factory (provides selection of storage service based on 
 * configuration)
 * Creates appropriate storage service instance based on configuration
 * Enables easy switching between local storage and cloud storage providers
 */

import { IStorageService, StorageConfig } from './storage.interface';
import { LocalStorageService } from './local-storage';
import { storageConfig as defaultStorageConfig } from '../config/storage.config';

/**
 * Storage service factory class
 * Implements factory pattern for storage service creation
 */
export class StorageServiceFactory {
  private static instance: IStorageService | null = null;

  /**
   * Get storage service instance (singleton)
   * @returns {IStorageService} Storage service instance
   */
  public static getInstance(): IStorageService {
    if (!StorageServiceFactory.instance) {
      StorageServiceFactory.instance = StorageServiceFactory.createStorageService();
    }
    return StorageServiceFactory.instance;
  }

  /**
   * Create storage service based on configuration
   * @param {StorageConfig} storageConfig - Optional storage configuration
   * @returns {IStorageService} Storage service instance
   */
  public static createStorageService(customConfig?: StorageConfig): IStorageService {
    const config = customConfig || defaultStorageConfig;
    const provider = config.provider;

    switch (provider) {
      case 'local':
        return new LocalStorageService();

      case 's3':
        // Future implementation: return new S3StorageService(config.s3);
        throw new Error('S3 storage not implemented yet. Use local storage for now.');

      case 'gcs':
        // Future implementation: return new GCSStorageService(config.gcs);
        throw new Error('Google Cloud Storage not implemented yet. Use local storage for now.');

      case 'azure':
        // Future implementation: return new AzureStorageService(config.azure);
        throw new Error('Azure Storage not implemented yet. Use local storage for now.');

      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    StorageServiceFactory.instance = null;
  }

  /**
   * Create storage service for testing
   * @param {IStorageService} mockService - Mock storage service
   */
  public static setTestInstance(mockService: IStorageService): void {
    StorageServiceFactory.instance = mockService;
  }
}

/**
 * Default storage service instance
 * Use this throughout the application for consistency
 */
export const storageService = StorageServiceFactory.getInstance();
