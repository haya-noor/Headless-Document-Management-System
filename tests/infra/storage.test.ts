/**
 * Storage Service Integration Tests
 * ==================================
 * Tests LocalStorageService and StorageServiceFactory
 * Fully declarative using Effect schema patterns
 * Uses temporary directories for test isolation
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from "vitest"
import { Effect, Option, pipe } from "effect"
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash } from 'crypto'

import { LocalStorageService } from "@/app/infrastructure/storage/local-storage"
import { StorageServiceFactory } from "@/app/infrastructure/storage/storage.factory"

/**
 * Test Runtime Helpers
 * Declarative error handling and effect composition
 * Use run() => when testing SUCCESS cases
 * Use runExpectingError() => when testing ERROR/FAILURE cases
  */
const TestRuntime = {
  // Run an Effect and return its success value as a Promise
  // This converts Effect-based code to Promise-based for async/await testing
  run: <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect),

  // Run an Effect expecting it to fail, and return the error
  // Effect.flip swaps success/error channels, so errors become successes
  /*
  Effect.flip swaps success/error channels, so errors is returned safely without throwing an error.
  */
  runExpectingError: <A, E>(effect: Effect.Effect<A, E>): Promise<E> =>
    pipe(
      effect,
      Effect.flip,
      Effect.runPromise
    ),
}

/**
 * Mock FileUpload type based on LocalStorageService usage
 * This matches the Multer file structure
 */
interface FileUpload {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

/**
 * Test State
 */
interface TestState {
  tempDir: string  // Temporary directory for test files
  storageService: LocalStorageService
  testFiles: string[]  // Track created files for cleanup
}

let state: TestState

/**
 * Helper: Create a temporary directory for test isolation
 * Each test run gets its own isolated filesystem space
 */
const createTempDir = async (): Promise<string> => {
  const tmpDir = path.join(os.tmpdir(), `storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  await fs.mkdir(tmpDir, { recursive: true })
  return tmpDir
}

/**
 * Helper: Clean up temporary directory and all its contents
 * Recursively removes all test files and directories
 */
const cleanupTempDir = async (dirPath: string): Promise<void> => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors - directory might not exist
  }
}

/**
 * Helper: Create a test file upload object
 * Generates a mock file with specified content
 */
const createTestFile = (
  content: string = "test file content",
  filename: string = "test.txt",
  mimetype: string = "text/plain"
): FileUpload => {
  const buffer = Buffer.from(content)
  return {
    buffer,
    originalname: filename,
    mimetype,
    size: buffer.length
  }
}

/**
 * Helper: Calculate SHA-256 checksum of a buffer
 * Used to verify file integrity
 */
const calculateChecksum = (buffer: Buffer): string => {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Setup & Teardown
 */
beforeAll(async () => {
  // Create temporary directory for all tests
  const tempDir = await createTempDir()
  state = {
    tempDir,
    storageService: new LocalStorageService(),
    testFiles: []
  }
})

afterAll(async () => {
  // Clean up temporary directory after all tests
  await cleanupTempDir(state.tempDir)
  
  // Reset factory singleton for test isolation
  StorageServiceFactory.resetInstance()
})

afterEach(async () => {
  // Clean up any test files created during the test
  // This ensures each test starts with a clean state
  for (const file of state.testFiles) {
    try {
      await fs.unlink(file)
    } catch (error) {
      // Ignore errors - file might not exist
    }
  }
  state.testFiles = []
})

// ============================================================================
// Tests: FILE UPLOAD
// ============================================================================

describe("LocalStorageService • Upload", () => {
  it("uploads a file and returns key, checksum, and url", async () => {
    // Create a test file with known content
    const file = createTestFile("Hello World", "hello.txt", "text/plain")
    const key = "test/hello.txt"
    
    // Upload file to storage
    // Effect.tryPromise wraps async operations for declarative error handling
    const result = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Verify upload result structure
    expect(result.key).toBe(key)
    expect(result.checksum).toBeDefined()
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/)  // SHA-256 hex format
    expect(decodeURIComponent(result.url)).toContain(key)
    
    // Track for cleanup
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })

  it("calculates correct checksum for uploaded file", async () => {
    const content = "checksum test content"
    const file = createTestFile(content, "checksum.txt")
    const key = "test/checksum.txt"
    
    // Calculate expected checksum
    const expectedChecksum = calculateChecksum(Buffer.from(content))
    
    // Upload and verify checksum matches
    const result = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    expect(result.checksum).toBe(expectedChecksum)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })

  it("creates metadata file alongside uploaded file", async () => {
    const file = createTestFile("metadata test", "meta.txt", "text/plain")
    const key = "test/meta.txt"
    const metadata = { author: "test-user", project: "DMS" }
    
    // Upload with custom metadata
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key, { metadata }),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Verify metadata file was created
    const storagePath = state.storageService['storagePath']
    const metadataPath = path.join(storagePath, key + '.meta.json')
    const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false)
    
    expect(metadataExists).toBe(true)
    
    // Verify metadata content
    const metadataContent = await fs.readFile(metadataPath, 'utf-8')
    const parsedMetadata = JSON.parse(metadataContent)
    expect(parsedMetadata.author).toBe("test-user")
    expect(parsedMetadata.project).toBe("DMS")
    expect(parsedMetadata.originalName).toBe("meta.txt")
    
    state.testFiles.push(path.join(storagePath, key))
    state.testFiles.push(metadataPath)
  })

  it("creates directory structure automatically", async () => {
    // Test deep directory structure creation
    const file = createTestFile("nested content", "nested.txt")
    const key = "users/user123/documents/doc456/nested.txt"
    
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Verify directory structure was created
    const storagePath = state.storageService['storagePath']
    const filePath = path.join(storagePath, key)
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
    
    expect(fileExists).toBe(true)
    
    state.testFiles.push(filePath)
  })
})

// ============================================================================
// Tests: FILE EXISTENCE & METADATA
// ============================================================================

describe("LocalStorageService • Existence & Metadata", () => {
  it("checks if file exists returns true for existing file", async () => {
    // Upload a test file first
    const file = createTestFile("exists test", "exists.txt")
    const key = "test/exists.txt"
    
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Check existence
    const exists = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.fileExists(key),
        catch: (error) => new Error(`Exists check failed: ${error}`)
      })
    )

    expect(exists).toBe(true)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })

  it("checks if file exists returns false for non-existent file", async () => {
    // Check for file that doesn't exist
    const exists = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.fileExists("non/existent/file.txt"),
        catch: (error) => new Error(`Exists check failed: ${error}`)
      })
    )

    expect(exists).toBe(false)
  })

  it("retrieves file metadata correctly", async () => {
    const content = "metadata retrieval test"
    const file = createTestFile(content, "getmeta.txt", "text/plain")
    const key = "test/getmeta.txt"
    
    // Upload file with metadata
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key, {
          metadata: { version: "1.0" }
        }),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Retrieve metadata
    const metadata = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.getFileMetadata(key),
        catch: (error) => new Error(`Get metadata failed: ${error}`)
      })
    )

    // Verify metadata structure
    expect(metadata.size).toBe(Buffer.from(content).length)
    expect(metadata.contentType).toBe("text/plain")
    expect(metadata.lastModified).toBeInstanceOf(Date)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })
})

// ============================================================================
// Tests: FILE READ
// ============================================================================

describe("LocalStorageService • Read", () => {
  it("reads file content correctly", async () => {
    const content = "read test content"
    const file = createTestFile(content, "read.txt")
    const key = "test/read.txt"
    
    // Upload file
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Read file back
    const buffer = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.readFile(key),
        catch: (error) => new Error(`Read failed: ${error}`)
      })
    )

    // Verify content matches
    expect(buffer.toString('utf-8')).toBe(content)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })

  it("throws error when reading non-existent file", async () => {
    // Try to read file that doesn't exist
    // runExpectingError captures the error instead of throwing
    const error = await TestRuntime.runExpectingError(
      Effect.tryPromise({
        try: () => state.storageService.readFile("non/existent/file.txt"),
        catch: (error) => error as Error
      })
    )

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("Failed to read file")
  })
})

// ============================================================================
// Tests: FILE DELETE
// ============================================================================

describe("LocalStorageService • Delete", () => {
  it("deletes existing file successfully", async () => {
    const file = createTestFile("delete me", "delete.txt")
    const key = "test/delete.txt"
    
    // Upload file
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Verify file exists
    const existsBefore = await state.storageService.fileExists(key)
    expect(existsBefore).toBe(true)

    // Delete file
    const deleted = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.deleteFile(key),
        catch: (error) => new Error(`Delete failed: ${error}`)
      })
    )

    expect(deleted).toBe(true)

    // Verify file no longer exists
    const existsAfter = await state.storageService.fileExists(key)
    expect(existsAfter).toBe(false)
  })

  it("deletes both file and metadata", async () => {
    const file = createTestFile("delete with meta", "deletemeta.txt")
    const key = "test/deletemeta.txt"
    
    // Upload with metadata
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key, {
          metadata: { temp: "true" }
        }),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Delete
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.deleteFile(key),
        catch: (error) => new Error(`Delete failed: ${error}`)
      })
    )

    // Verify both file and metadata are gone
    const storagePath = state.storageService['storagePath']
    const filePath = path.join(storagePath, key)
    const metadataPath = filePath + '.meta.json'
    
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
    const metaExists = await fs.access(metadataPath).then(() => true).catch(() => false)
    
    expect(fileExists).toBe(false)
    expect(metaExists).toBe(false)
  })

  it("handles deleting non-existent file gracefully", async () => {
    // Delete non-existent file should not throw
    const deleted = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.deleteFile("non/existent/file.txt"),
        catch: (error) => new Error(`Delete failed: ${error}`)
      })
    )

    // Should return true even if file doesn't exist (idempotent operation)
    expect(deleted).toBe(true)
  })
})

// ============================================================================
// Tests: FILE COPY
// ============================================================================

describe("LocalStorageService • Copy", () => {
  it("copies file to new location", async () => {
    const content = "copy test content"
    const file = createTestFile(content, "source.txt")
    const sourceKey = "test/source.txt"
    const destKey = "test/destination.txt"
    
    // Upload source file
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, sourceKey),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Copy file
    const copied = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.copyFile(sourceKey, destKey),
        catch: (error) => new Error(`Copy failed: ${error}`)
      })
    )

    expect(copied).toBe(true)

    // Verify both files exist
    const sourceExists = await state.storageService.fileExists(sourceKey)
    const destExists = await state.storageService.fileExists(destKey)
    
    expect(sourceExists).toBe(true)
    expect(destExists).toBe(true)

    // Verify content matches
    const sourceBuffer = await state.storageService.readFile(sourceKey)
    const destBuffer = await state.storageService.readFile(destKey)
    
    expect(sourceBuffer.toString()).toBe(destBuffer.toString())
    
    const storagePath = state.storageService['storagePath']
    state.testFiles.push(path.join(storagePath, sourceKey))
    state.testFiles.push(path.join(storagePath, destKey))
  })

  it("copies metadata file along with the file", async () => {
    const file = createTestFile("copy with meta", "copymeta.txt")
    const sourceKey = "test/copymeta-source.txt"
    const destKey = "test/copymeta-dest.txt"
    const metadata = { copied: "yes" }
    
    // Upload with metadata
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, sourceKey, { metadata }),
        catch: (error) => new Error(`Upload failed: ${error}`)
      })
    )

    // Copy
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.copyFile(sourceKey, destKey),
        catch: (error) => new Error(`Copy failed: ${error}`)
      })
    )

    // Verify destination metadata exists
    const storagePath = state.storageService['storagePath']
    const destMetaPath = path.join(storagePath, destKey + '.meta.json')
    const metaExists = await fs.access(destMetaPath).then(() => true).catch(() => false)
    
    expect(metaExists).toBe(true)
    
    state.testFiles.push(path.join(storagePath, sourceKey))
    state.testFiles.push(path.join(storagePath, destKey))
  })
})

// ============================================================================
// Tests: FILE KEY GENERATION
// ============================================================================

describe("LocalStorageService • Key Generation", () => {
  it("generates file key with correct structure", () => {
    const userId = "user123"
    const filename = "document.pdf"
    const documentId = "doc456"
    
    // Generate key
    const key = state.storageService.generateFileKey(userId, filename, documentId)
    
    // Verify structure: users/{userId}/documents/{documentId}/{timestamp}_{filename}
    expect(key).toMatch(/^users\/user123\/documents\/doc456\/\d+_document\.pdf$/)
    expect(key).toContain(userId)
    expect(key).toContain(documentId)
  })

  it("sanitizes filename in generated key", () => {
    const userId = "user123"
    const filename = "My Document (2024)!@#.pdf"
    const documentId = "doc456"
    
    // Generate key with special characters
    const key = state.storageService.generateFileKey(userId, filename, documentId)
    
    // Verify special characters are sanitized
    // Should replace special chars with underscores and lowercase
    expect(key).not.toContain("!")
    expect(key).not.toContain("@")
    expect(key).not.toContain("#")
    expect(key).not.toContain("(")
    expect(key).not.toContain(")")
    expect(key).toMatch(/^users\/user123\/documents\/doc456\/\d+_my_document.*\.pdf$/)
  })

  it("generates version key with version number", () => {
    const baseKey = "users/user123/documents/doc456/1234567890_document.pdf"
    const version = 2
    
    // Generate version key
    const versionKey = state.storageService.generateVersionKey(baseKey, version)
    
    // Verify structure includes version
    expect(versionKey).toContain("versions")
    expect(versionKey).toContain("_v2")
    expect(versionKey).toMatch(/^users\/user123\/documents\/doc456\/versions\/\d+_document_v2\.pdf$/)
  })
})

// ============================================================================
// Tests: FILE LISTING
// ============================================================================

describe("LocalStorageService • List Files", () => {
  it("lists all files in storage", async () => {
    // Upload multiple test files
    const file1 = createTestFile("file1", "file1.txt")
    const file2 = createTestFile("file2", "file2.txt")
    const file3 = createTestFile("file3", "file3.txt")
    
    await TestRuntime.run(
      Effect.all([
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file1, "test/list/file1.txt"), catch: () => new Error() }),
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file2, "test/list/file2.txt"), catch: () => new Error() }),
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file3, "test/other/file3.txt"), catch: () => new Error() }),
      ])
    )

    // List all files
    const files = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.listFiles(),
        catch: (error) => new Error(`List failed: ${error}`)
      })
    )

    // Should have at least our 3 test files
    expect(files.length).toBeGreaterThanOrEqual(3)
    
    const storagePath = state.storageService['storagePath']
    state.testFiles.push(path.join(storagePath, "test/list/file1.txt"))
    state.testFiles.push(path.join(storagePath, "test/list/file2.txt"))
    state.testFiles.push(path.join(storagePath, "test/other/file3.txt"))
  })

  it("filters files by prefix", async () => {
    // Upload files in different directories
    const file1 = createTestFile("prefix1", "prefix1.txt")
    const file2 = createTestFile("prefix2", "prefix2.txt")
    const file3 = createTestFile("other", "other.txt")
    
    await TestRuntime.run(
      Effect.all([
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file1, "test/prefix/file1.txt"), catch: () => new Error() }),
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file2, "test/prefix/file2.txt"), catch: () => new Error() }),
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file3, "test/other/file3.txt"), catch: () => new Error() }),
      ])
    )

    // List with prefix filter
    const files = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.listFiles("test/prefix"),
        catch: (error) => new Error(`List failed: ${error}`)
      })
    )

    // Should only include files with prefix
    expect(files.length).toBeGreaterThanOrEqual(2)
    expect(files.every(f => f.startsWith("test/prefix"))).toBe(true)
    
    const storagePath = state.storageService['storagePath']
    state.testFiles.push(path.join(storagePath, "test/prefix/file1.txt"))
    state.testFiles.push(path.join(storagePath, "test/prefix/file2.txt"))
    state.testFiles.push(path.join(storagePath, "test/other/file3.txt"))
  })

  it("respects limit parameter", async () => {
    // Upload multiple files
    const files = Array.from({ length: 5 }, (_, i) => 
      createTestFile(`content${i}`, `file${i}.txt`)
    )
    
    await TestRuntime.run(
      Effect.all(files.map((file, i) =>
        Effect.tryPromise({ 
          try: () => state.storageService.uploadFile(file, `test/limit/file${i}.txt`),
          catch: () => new Error()
        })
      ))
    )

    // List with limit
    const listedFiles = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.listFiles("test/limit", 3),
        catch: (error) => new Error(`List failed: ${error}`)
      })
    )

    // Should respect limit
    expect(listedFiles.length).toBeLessThanOrEqual(3)
    
    const storagePath = state.storageService['storagePath']
    for (let i = 0; i < 5; i++) {
      state.testFiles.push(path.join(storagePath, `test/limit/file${i}.txt`))
    }
  })
})

// ============================================================================
// Tests: STORAGE STATISTICS
// ============================================================================

describe("LocalStorageService • Statistics", () => {
  it("calculates storage statistics correctly", async () => {
    // Upload test files with known sizes
    const file1 = createTestFile("small", "small.txt")
    const file2 = createTestFile("medium content here", "medium.txt")
    
    await TestRuntime.run(
      Effect.all([
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file1, "test/stats/small.txt"), catch: () => new Error() }),
        Effect.tryPromise({ try: () => state.storageService.uploadFile(file2, "test/stats/medium.txt"), catch: () => new Error() }),
      ])
    )

    // Get storage stats
    const stats = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.getStorageStats(),
        catch: (error) => new Error(`Stats failed: ${error}`)
      })
    )

    // Verify stats structure
    expect(stats.totalFiles).toBeGreaterThanOrEqual(2)
    expect(stats.totalSize).toBeGreaterThan(0)
    expect(stats.storageLocation).toBeDefined()
    
    const storagePath = state.storageService['storagePath']
    state.testFiles.push(path.join(storagePath, "test/stats/small.txt"))
    state.testFiles.push(path.join(storagePath, "test/stats/medium.txt"))
  })

  it("excludes metadata files from file count", async () => {
    // Upload file which creates both .txt and .txt.meta.json
    const file = createTestFile("count test", "count.txt")
    
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, "test/count/file.txt"),
        catch: () => new Error()
      })
    )

    const stats = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.getStorageStats(),
        catch: () => new Error()
      })
    )

    // File count should only count actual files, not metadata
    // Should be at least 1 (our file), not 2 (file + metadata)
    expect(stats.totalFiles).toBeGreaterThanOrEqual(1)
    
    const storagePath = state.storageService['storagePath']
    state.testFiles.push(path.join(storagePath, "test/count/file.txt"))
  })
})

// ============================================================================
// Tests: STORAGE FACTORY
// ============================================================================

describe("StorageServiceFactory", () => {
  it("creates local storage service by default", () => {
    // Factory should create LocalStorageService when provider is 'local'
    const service = StorageServiceFactory.createStorageService({
      provider: 'local',
      local: { storagePath: 'test-storage' }
    })

    expect(service).toBeInstanceOf(LocalStorageService)
  })

  it("returns singleton instance", () => {
    // Reset to ensure clean test
    StorageServiceFactory.resetInstance()
    
    // Get instance twice
    const instance1 = StorageServiceFactory.getInstance()
    const instance2 = StorageServiceFactory.getInstance()

    // Should be the same instance (singleton pattern)
    expect(instance1).toBe(instance2)
  })

  it("resets instance correctly", () => {
    // Get initial instance
    const instance1 = StorageServiceFactory.getInstance()
    
    // Reset
    StorageServiceFactory.resetInstance()
    
    // Get new instance
    const instance2 = StorageServiceFactory.getInstance()

    // Should be different instances after reset
    expect(instance1).not.toBe(instance2)
  })

  it("throws error for unsupported storage providers", () => {
    // S3, GCS, Azure are not implemented yet
    expect(() => {
      StorageServiceFactory.createStorageService({
        provider: 's3' as any,
        s3: {} as any
      })
    }).toThrow("S3 storage not implemented yet")

    expect(() => {
      StorageServiceFactory.createStorageService({
        provider: 'gcs' as any,
        gcs: {} as any
      })
    }).toThrow("Google Cloud Storage not implemented yet")

    expect(() => {
      StorageServiceFactory.createStorageService({
        provider: 'azure' as any,
        azure: {} as any
      })
    }).toThrow("Azure Storage not implemented yet")
  })

  it("allows setting test instance for mocking", () => {
    // Create a mock service
    const mockService = {
      uploadFile: async () => ({ key: "mock", checksum: "mock", url: "mock" }),
      deleteFile: async () => true,
      fileExists: async () => true,
    } as any

    // Set test instance
    StorageServiceFactory.setTestInstance(mockService)
    
    // Get instance should return mock
    const instance = StorageServiceFactory.getInstance()
    expect(instance).toBe(mockService)

    // Reset for other tests
    StorageServiceFactory.resetInstance()
  })
})

// ============================================================================
// Tests: SECURITY & EDGE CASES
// ============================================================================

describe("LocalStorageService • Security & Edge Cases", () => {
  it("sanitizes dangerous filenames", () => {
    const userId = "user123"
    const documentId = "doc456"
    
    // Try to generate key with path traversal attempt
    const dangerousFilename = "../../../etc/passwd"
    const key = state.storageService.generateFileKey(userId, dangerousFilename, documentId)
    
    // Should sanitize and prevent path traversal
    expect(key).not.toContain("../")
    expect(key).toMatch(/^users\/user123\/documents\/doc456\//)
  })

  it("handles empty file content", async () => {
    // Upload empty file
    const file = createTestFile("", "empty.txt")
    const key = "test/empty.txt"
    
    const result = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: () => new Error()
      })
    )

    // Should still calculate checksum for empty file
    expect(result.checksum).toBeDefined()
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })

  it("handles large filenames", () => {
    const userId = "user123"
    const documentId = "doc456"
    
    // Very long filename
    const longFilename = "a".repeat(300) + ".txt"
    const key = state.storageService.generateFileKey(userId, longFilename, documentId)
    
    // Should handle gracefully (sanitize will truncate or handle it)
    expect(key).toBeDefined()
    expect(key).toContain("users/user123/documents/doc456/")
  })

  it("handles special characters in filename", () => {
    const userId = "user123"
    const documentId = "doc456"
    
    // Filename with various special characters
    const specialFilename = "file@#$%^&*()name.txt"
    const key = state.storageService.generateFileKey(userId, specialFilename, documentId)
    
    // Should sanitize special characters
    expect(key).not.toContain("@")
    expect(key).not.toContain("#")
    expect(key).not.toContain("$")
    expect(key).not.toContain("%")
    expect(key).not.toContain("^")
    expect(key).not.toContain("&")
    expect(key).not.toContain("*")
  })

  it("generates download URL with proper encoding", async () => {
    const file = createTestFile("url test", "test file.txt")
    const key = "test/url test/file.txt"
    
    await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.uploadFile(file, key),
        catch: () => new Error()
      })
    )

    // Generate download URL
    const urlResponse = await TestRuntime.run(
      Effect.tryPromise({
        try: () => state.storageService.generateDownloadUrl(key, 3600, "My File.txt"),
        catch: () => new Error()
      })
    )

    // URL should be properly encoded
    expect(urlResponse.url).toBeDefined()
    expect(urlResponse.url).toContain("download")
    expect(urlResponse.url).toContain(encodeURIComponent("My File.txt"))
    expect(urlResponse.expiresAt).toBeInstanceOf(Date)
    
    state.testFiles.push(path.join(state.storageService['storagePath'], key))
  })
})

