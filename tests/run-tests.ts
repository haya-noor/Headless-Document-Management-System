/**
 * Test runner script
 * Comprehensive testing of the Document Management System
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Test runner class
 * Orchestrates different types of tests
 */
class TestRunner {
  private testResults: Array<{ name: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Document Management System Tests\n');

    try {
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runAPITests();
      await this.runStorageTests();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...');
    
    try {
      const result = execSync('npm test -- --testPathPattern=utils.test.ts --silent', { 
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      
      this.testResults.push({ name: 'Unit Tests', status: 'PASS' });
      console.log('✅ Unit tests passed\n');
    } catch (error) {
      this.testResults.push({ 
        name: 'Unit Tests', 
        status: 'FAIL', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Unit tests failed\n');
    }
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');
    
    try {
      const result = execSync('npm test -- --testPathPattern=database.test.ts --silent', { 
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      
      this.testResults.push({ name: 'Integration Tests', status: 'PASS' });
      console.log('✅ Integration tests passed\n');
    } catch (error) {
      this.testResults.push({ 
        name: 'Integration Tests', 
        status: 'FAIL', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Integration tests failed\n');
    }
  }

  /**
   * Run API tests
   */
  private async runAPITests(): Promise<void> {
    console.log('🌐 Running API Tests...');
    
    try {
      const result = execSync('npm test -- --testPathPattern=api.test.ts --silent', { 
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      
      this.testResults.push({ name: 'API Tests', status: 'PASS' });
      console.log('✅ API tests passed\n');
    } catch (error) {
      this.testResults.push({ 
        name: 'API Tests', 
        status: 'FAIL', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ API tests failed\n');
    }
  }

  /**
   * Run storage tests
   */
  private async runStorageTests(): Promise<void> {
    console.log('📁 Running Storage Tests...');
    
    try {
      const result = execSync('npm test -- --testPathPattern=storage.test.ts --silent', { 
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      
      this.testResults.push({ name: 'Storage Tests', status: 'PASS' });
      console.log('✅ Storage tests passed\n');
    } catch (error) {
      this.testResults.push({ 
        name: 'Storage Tests', 
        status: 'FAIL', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Storage tests failed\n');
    }
  }

  /**
   * Generate test report
   */
  private async generateReport(): Promise<void> {
    console.log('📊 Test Results Summary');
    console.log('========================\n');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, total: this.testResults.length },
      results: this.testResults,
    };

    await fs.writeFile(
      join(process.cwd(), 'test-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📄 Test report saved to test-report.json\n');

    if (failed > 0) {
      console.log('❌ Some tests failed. Check the details above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed successfully!');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default TestRunner;
