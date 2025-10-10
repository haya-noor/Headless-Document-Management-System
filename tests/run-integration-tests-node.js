#!/usr/bin/env node

/**
 * Node.js Integration Test Runner
 * Runs integration tests using Node.js instead of Bun to avoid compatibility issues
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

/**
 * Test configuration
 */
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes
  retries: 2,
  parallel: false, // Run tests sequentially to avoid resource conflicts
};

/**
 * Test suites to run, runs each test suite in order 
 * 
 * run the suite up to retries times 
 */
const TEST_SUITES = [
  'tests/integration/user.repository.integration.test.ts',
  'tests/integration/user-profile.integration.test.ts',
  'tests/integration/document.e2e.test.ts',
  'tests/integration/performance.test.ts',
];

/**
 * Run a single test suite
 */
async function runTestSuite(testFile) {
  console.log(`\n🧪 Running ${testFile}...`);
  
  return new Promise((resolve) => {
    const testProcess = spawn('npx', ['tsx', '--test', testFile], {
      // inherit = print the output to the console
      stdio: 'inherit',  
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_TIMEOUT: TEST_CONFIG.timeout.toString(),
      },
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} passed`);
        resolve(true);
      } else {
        console.log(`❌ ${testFile} failed with code ${code}`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Error running ${testFile}:`, error);
      resolve(false);
    });
  });
}

/**
 * Check if test file exists
 */
function testFileExists(testFile) {
  return existsSync(join(process.cwd(), testFile));
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests...');
  console.log(`📋 Test Configuration:`);
  console.log(`   - Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`   - Retries: ${TEST_CONFIG.retries}`);
  // parallel is false, because we want to run the tests sequentially to avoid 
  // resource conflicts
  console.log(`   - Parallel: ${TEST_CONFIG.parallel}`);
  
  const startTime = Date.now();
  const results = [];

  // Check if all test files exist
  const missingFiles = TEST_SUITES.filter(testFile => !testFileExists(testFile));
  if (missingFiles.length > 0) {
    console.error('❌ Missing test files:', missingFiles);
    process.exit(1);
  }

  // Run each test suite
  for (const testFile of TEST_SUITES) {
    let passed = false;
    let attempts = 0;

    for (let attempt = 1; attempt <= TEST_CONFIG.retries && !passed; attempt++) {
      attempts = attempt;
      console.log(`\n🔄 Attempt ${attempt}/${TEST_CONFIG.retries} for ${testFile}`);
      
      passed = await runTestSuite(testFile);
      
      if (!passed && attempt < TEST_CONFIG.retries) {
        console.log(`⏳ Waiting 5 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    results.push({ testFile, passed, attempts });
  }

  // Print summary
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  let passedCount = 0;
  let failedCount = 0;

  results.forEach(({ testFile, passed, attempts }) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const attemptsText = attempts > 1 ? ` (${attempts} attempts)` : '';
    console.log(`${status} ${testFile}${attemptsText}`);
    
    if (passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('='.repeat(50));
  console.log(`📈 Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`);

  if (failedCount > 0) {
    console.log('\n💡 Tips for failed tests:');
    console.log('   - Check database connection');
    console.log('   - Verify Testcontainers is running');
    console.log('   - Check for port conflicts');
    console.log('   - Review test logs for specific errors');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  }
}

/**
 * Handle process signals
 * sigint = ctrl + c
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  process.exit(1);
});

// sigterm = kill 
process.on('SIGTERM', () => {
  console.log('\n🛑 Test run terminated');
  process.exit(1);
});

// Run the tests
runIntegrationTests().catch((error) => {
  console.error('💥 Fatal error running integration tests:', error);
  process.exit(1);
});
