/**
 * Comprehensive Test Runner for Bun
 * Runs all test suites and generates detailed reports
 */

import { spawn } from "bun";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details?: string;
  tests?: number;
  failures?: number;
}

class BunTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Test Suite\n');
    console.log('=====================================\n');

    try {
      // Run each test suite
      await this.runTestSuite('Setup Tests', 'tests/setup.test.ts');
      await this.runTestSuite('Authentication Tests', 'tests/auth.test.ts');
      await this.runTestSuite('Document Management Tests', 'tests/documents.test.ts');
      await this.runTestSuite('Storage Tests', 'tests/storage.test.ts');
      await this.runTestSuite('Repository Tests', 'tests/repositories.test.ts');
      await this.runTestSuite('API Integration Tests', 'tests/api.test.ts');
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(name: string, testFile: string): Promise<void> {
    console.log(`🔍 Running ${name}...`);
    const startTime = Date.now();

    try {
      // Check if test file exists
      if (!existsSync(testFile)) {
        this.results.push({
          name,
          status: 'SKIP',
          duration: 0,
          details: 'Test file not found',
        });
        console.log(`⏭️  ${name}: SKIPPED (file not found)\n`);
        return;
      }

      // Run the test using Bun test
      const proc = spawn({
        cmd: ['bun', 'test', testFile, '--reporter', 'json'],
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const errorOutput = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const duration = Date.now() - startTime;

      if (exitCode === 0) {
        // Parse JSON output if available
        let testDetails = '';
        try {
          const jsonOutput = JSON.parse(output);
          testDetails = `Tests: ${jsonOutput.tests || 'N/A'}, Failures: ${jsonOutput.failures || 0}`;
        } catch {
          testDetails = 'Completed successfully';
        }

        this.results.push({
          name,
          status: 'PASS',
          duration,
          details: testDetails,
        });
        console.log(`✅ ${name}: PASSED (${duration}ms)`);
      } else {
        this.results.push({
          name,
          status: 'FAIL',
          duration,
          details: errorOutput || 'Test failed',
        });
        console.log(`❌ ${name}: FAILED (${duration}ms)`);
        if (errorOutput) {
          console.log(`   Error: ${errorOutput.slice(0, 200)}...`);
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'FAIL',
        duration,
        details: `Execution error: ${error}`,
      });
      console.log(`❌ ${name}: FAILED (${duration}ms) - ${error}`);
    }

    console.log(''); // Empty line for readability
  }

  /**
   * Generate comprehensive test report
   */
  private async generateReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log('📊 Test Results Summary');
    console.log('========================\n');

    // Print individual results
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      const duration = result.duration > 0 ? `(${result.duration}ms)` : '';
      console.log(`${icon} ${result.name}: ${result.status} ${duration}`);
      if (result.details && result.status !== 'PASS') {
        console.log(`   ${result.details}`);
      }
    });

    console.log('\n📈 Summary Statistics');
    console.log('=====================');
    console.log(`Total Test Suites: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);

    // Generate detailed report
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalDuration,
        total,
        passed,
        failed,
        skipped,
        successRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      },
      testSuites: this.results,
      environment: {
        runtime: 'bun',
        nodeEnv: process.env.NODE_ENV || 'test',
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Save JSON report
    const reportPath = join(process.cwd(), 'test-results.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate HTML report
    await this.generateHtmlReport(report);

    // Final status
    if (failed > 0) {
      console.log('\n❌ Some test suites failed. Check the details above.');
      process.exit(1);
    } else if (passed === 0) {
      console.log('\n⚠️  No tests were executed successfully.');
      process.exit(1);
    } else {
      console.log('\n🎉 All test suites passed successfully!');
    }
  }

  /**
   * Generate HTML test report
   */
  private async generateHtmlReport(report: any): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Results - Document Management System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .test-suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
        .test-header { padding: 15px; background: #f8f9fa; font-weight: bold; }
        .test-body { padding: 15px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-skip { color: #ffc107; }
        .duration { color: #666; font-size: 0.9em; }
        .details { margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Results Report</h1>
            <p>Document Management System - ${new Date(report.summary.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${report.summary.total}</div>
                <div class="stat-label">Total Suites</div>
            </div>
            <div class="stat-card">
                <div class="stat-value status-pass">${report.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value status-fail">${report.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${report.summary.successRate}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${report.summary.totalDuration}ms</div>
                <div class="stat-label">Total Duration</div>
            </div>
        </div>
        
        <h2>Test Suite Results</h2>
        ${report.testSuites.map((suite: any) => `
            <div class="test-suite">
                <div class="test-header">
                    <span class="status-${suite.status.toLowerCase()}">${suite.status === 'PASS' ? '✅' : suite.status === 'FAIL' ? '❌' : '⏭️'}</span>
                    ${suite.name}
                    <span class="duration">(${suite.duration}ms)</span>
                </div>
                ${suite.details && suite.status !== 'PASS' ? `
                    <div class="test-body">
                        <div class="details">${suite.details}</div>
                    </div>
                ` : ''}
            </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; text-align: center;">
            Generated by Bun Test Runner • Environment: ${report.environment.nodeEnv} • Platform: ${report.environment.platform}
        </div>
    </div>
</body>
</html>`;

    const htmlPath = join(process.cwd(), 'test-results.html');
    writeFileSync(htmlPath, html);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  const runner = new BunTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default BunTestRunner;
