/**
 * Manual testing script using actual test files
 * Tests all functionalities with real file operations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { LocalStorageService } from '../src/services/local-storage.service';
import { StorageServiceFactory } from '../src/services/storage.factory';
import { generateId } from '../src/utils/uuid';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/utils/password';
import { generateToken, verifyToken, extractTokenFromHeader } from '../src/utils/jwt';
import { UserRole, FileUpload } from '../src/types';

/**
 * Manual test runner for all functionalities
 */
class ManualTestRunner {
  private storageService: LocalStorageService;
  private testResults: Array<{ test: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

  constructor() {
    this.storageService = new LocalStorageService();
  }

  /**
   * Run all manual tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Manual Testing - All Functionalities');
    console.log('=========================================\n');

    try {
      await this.testUtilityFunctions();
      await this.testFileOperations();
      await this.testStorageOperations();
      await this.testAuthenticationFunctions();
      this.printResults();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }

  /**
   * Test utility functions
   */
  private async testUtilityFunctions(): Promise<void> {
    console.log('1. 🔧 Testing Utility Functions:');

    try {
      // Test UUID generation
      const uuid = generateId();
      this.addResult('UUID Generation', uuid && uuid.length === 36 ? 'PASS' : 'FAIL');
      console.log(`   ✅ UUID Generated: ${uuid}`);

      // Test password validation
      const strongResult = validatePasswordStrength('StrongPass123!');
      const weakResult = validatePasswordStrength('weak');
      this.addResult('Password Validation', strongResult.isValid && !weakResult.isValid ? 'PASS' : 'FAIL');
      console.log(`   ✅ Strong Password Valid: ${strongResult.isValid}`);
      console.log(`   ✅ Weak Password Invalid: ${!weakResult.isValid}`);

      // Test password hashing
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      this.addResult('Password Hashing', isValid ? 'PASS' : 'FAIL');
      console.log(`   ✅ Password Hashed and Verified: ${isValid}`);

      // Test JWT functions
      const payload = { userId: 'test-123', email: 'test@example.com', role: UserRole.USER };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      const extracted = extractTokenFromHeader(`Bearer ${token}`);
      this.addResult('JWT Functions', decoded.userId === payload.userId && extracted === token ? 'PASS' : 'FAIL');
      console.log(`   ✅ JWT Token Generated and Verified: ${decoded.userId === payload.userId}`);

    } catch (error) {
      this.addResult('Utility Functions', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
      console.log(`   ❌ Utility Functions Error: ${error}`);
    }

    console.log('');
  }

  /**
   * Test file operations using the actual test-document.txt
   */
  private async testFileOperations(): Promise<void> {
    console.log('2. 📁 Testing File Operations with test-document.txt:');

    try {
      // Read the actual test document
      const testDocPath = join(__dirname, 'test-document.txt');
      const fileBuffer = await fs.readFile(testDocPath);
      const fileStats = await fs.stat(testDocPath);

      console.log(`   📄 Test Document Size: ${fileStats.size} bytes`);
      console.log(`   📄 Test Document Content: "${fileBuffer.toString().substring(0, 50)}..."`);

      // Create FileUpload object from actual file
      const testFile: FileUpload = {
        buffer: fileBuffer,
        originalname: 'test-document.txt',
        mimetype: 'text/plain',
        size: fileStats.size,
      };

      // Test file key generation
      const userId = generateId();
      const documentId = generateId();
      const fileKey = this.storageService.generateFileKey(userId, 'test-document.txt', documentId);
      this.addResult('File Key Generation', fileKey.includes(userId) && fileKey.includes(documentId) ? 'PASS' : 'FAIL');
      console.log(`   ✅ Generated File Key: ${fileKey}`);

      // Test file upload
      const uploadResult = await this.storageService.uploadFile(testFile, fileKey);
      this.addResult('File Upload', uploadResult.key === fileKey && uploadResult.checksum ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Uploaded: ${uploadResult.key}`);
      console.log(`   ✅ File Checksum: ${uploadResult.checksum}`);

      // Test file existence
      const exists = await this.storageService.fileExists(fileKey);
      this.addResult('File Existence Check', exists ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Exists: ${exists}`);

      // Test file metadata
      const metadata = await this.storageService.getFileMetadata(fileKey);
      this.addResult('File Metadata', metadata.size > 0 && metadata.contentType ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Metadata - Size: ${metadata.size}, Type: ${metadata.contentType}`);

      // Test file reading
      const readContent = await this.storageService.readFile(fileKey);
      const contentMatches = readContent.equals(fileBuffer);
      this.addResult('File Reading', contentMatches ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Content Matches: ${contentMatches}`);

      // Test download URL generation
      const downloadUrl = await this.storageService.generateDownloadUrl(fileKey, 3600, 'my-test-doc.txt');
      this.addResult('Download URL Generation', downloadUrl.url && downloadUrl.expiresIn ? 'PASS' : 'FAIL');
      console.log(`   ✅ Download URL: ${downloadUrl.url.substring(0, 60)}...`);

      // Test file copy
      const copyKey = fileKey.replace(documentId, generateId());
      const copySuccess = await this.storageService.copyFile(fileKey, copyKey);
      this.addResult('File Copy', copySuccess ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Copied: ${copySuccess}`);

      // Test version key generation
      const versionKey = this.storageService.generateVersionKey(fileKey, 2);
      this.addResult('Version Key Generation', versionKey.includes('_v2') ? 'PASS' : 'FAIL');
      console.log(`   ✅ Version Key: ${versionKey}`);

      // Test file deletion
      const deleteSuccess = await this.storageService.deleteFile(fileKey);
      const stillExists = await this.storageService.fileExists(fileKey);
      this.addResult('File Deletion', deleteSuccess && !stillExists ? 'PASS' : 'FAIL');
      console.log(`   ✅ File Deleted: ${deleteSuccess}, Still Exists: ${stillExists}`);

    } catch (error) {
      this.addResult('File Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
      console.log(`   ❌ File Operations Error: ${error}`);
    }

    console.log('');
  }

  /**
   * Test storage operations and statistics
   */
  private async testStorageOperations(): Promise<void> {
    console.log('3. 📊 Testing Storage Operations:');

    try {
      // Upload multiple test files
      const testFiles = [
        { name: 'file1.txt', content: 'Test content 1' },
        { name: 'file2.txt', content: 'Test content 2' },
        { name: 'file3.txt', content: 'Test content 3' },
      ];

      for (const file of testFiles) {
        const testFile: FileUpload = {
          buffer: Buffer.from(file.content),
          originalname: file.name,
          mimetype: 'text/plain',
          size: file.content.length,
        };

        const key = `test/batch/${file.name}`;
        await this.storageService.uploadFile(testFile, key);
      }

      // Test storage statistics
      const stats = await this.storageService.getStorageStats();
      this.addResult('Storage Statistics', stats.totalFiles >= 3 && stats.totalSize > 0 ? 'PASS' : 'FAIL');
      console.log(`   ✅ Storage Stats - Files: ${stats.totalFiles}, Size: ${stats.totalSize} bytes`);
      console.log(`   ✅ Storage Location: ${stats.storageLocation}`);

      // Test storage factory
      const factoryService = StorageServiceFactory.getInstance();
      this.addResult('Storage Factory', factoryService ? 'PASS' : 'FAIL');
      console.log(`   ✅ Storage Factory Working: ${factoryService ? 'Yes' : 'No'}`);

    } catch (error) {
      this.addResult('Storage Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
      console.log(`   ❌ Storage Operations Error: ${error}`);
    }

    console.log('');
  }

  /**
   * Test authentication functions
   */
  private async testAuthenticationFunctions(): Promise<void> {
    console.log('4. 🔐 Testing Authentication Functions:');

    try {
      // Test user data validation
      const validUser = {
        email: 'valid@example.com',
        password: 'ValidPass123!',
        firstName: 'Valid',
        lastName: 'User',
      };

      const { registerSchema } = await import('../src/schemas/auth.schemas');
      const validationResult = registerSchema.safeParse(validUser);
      this.addResult('Schema Validation', validationResult.success ? 'PASS' : 'FAIL');
      console.log(`   ✅ Schema Validation: ${validationResult.success}`);

      // Test JWT token lifecycle
      const payload = { userId: generateId(), email: 'auth@example.com', role: UserRole.USER };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      const headerExtraction = extractTokenFromHeader(`Bearer ${token}`);
      
      this.addResult('JWT Lifecycle', 
        decoded.userId === payload.userId && headerExtraction === token ? 'PASS' : 'FAIL');
      console.log(`   ✅ JWT Lifecycle Complete: Token generated, verified, extracted`);

      // Test password security
      const securePassword = 'SecureTestPass123!';
      const weakPassword = 'weak';
      const secureValidation = validatePasswordStrength(securePassword);
      const weakValidation = validatePasswordStrength(weakPassword);
      
      this.addResult('Password Security', 
        secureValidation.isValid && !weakValidation.isValid ? 'PASS' : 'FAIL');
      console.log(`   ✅ Password Security: Strong accepted, weak rejected`);

    } catch (error) {
      this.addResult('Authentication Functions', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
      console.log(`   ❌ Authentication Error: ${error}`);
    }

    console.log('');
  }

  /**
   * Add test result
   */
  private addResult(test: string, status: 'PASS' | 'FAIL', details?: string): void {
    this.testResults.push({ test, status, details });
  }

  /**
   * Print final results
   */
  private printResults(): void {
    console.log('📊 Test Results Summary:');
    console.log('========================');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    console.log(`\n🎯 Final Score: ${passed}/${passed + failed} tests passed (${Math.round((passed / (passed + failed)) * 100)}%)`);

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Your system is working perfectly!');
    } else {
      console.log(`⚠️ ${failed} tests failed. Check details above.`);
    }
  }
}

/**
 * Run manual tests
 */
async function runManualTests(): Promise<void> {
  const runner = new ManualTestRunner();
  await runner.runAllTests();
}

// Export for use
export { ManualTestRunner };

// Run if called directly
if (require.main === module) {
  runManualTests().catch(console.error);
}
