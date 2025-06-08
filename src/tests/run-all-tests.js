#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Blog Platform Frontend
 * This script runs all authentication and routing tests
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Blog Platform Frontend Test Suite\n');
console.log('='.repeat(60));
console.log('📋 Test Coverage:');
console.log('   ✅ Authentication Flow (Login/Register)');
console.log('   ✅ Route Guards and Navigation');
console.log('   ✅ User Data Consistency');
console.log('   ✅ Session Management');
console.log('   ✅ Error Handling');
console.log('   ✅ Integration Tests');
console.log('='.repeat(60));
console.log('');

const testFiles = [
  'auth-routing.spec.ts',
  'registration.spec.ts', 
  'routing-guards.spec.ts',
  'user-flow-integration.spec.ts'
];

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`🧪 Running ${testFile}...`);
    
    const testProcess = spawn('ng', ['test', '--watch=false', '--browsers=ChromeHeadless', `--include=src/tests/${testFile}`], {
      stdio: 'inherit',
      shell: true
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} passed\n`);
        resolve();
      } else {
        console.log(`❌ ${testFile} failed\n`);
        reject(new Error(`Test ${testFile} failed with code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      console.log(`❌ Error running ${testFile}: ${error.message}\n`);
      reject(error);
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testFile of testFiles) {
    try {
      await runTest(testFile);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Test failed: ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total Time: ${duration}s`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📝 Total: ${testFiles.length}`);
  
  if (failedTests === 0) {
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Authentication system is working correctly');
    console.log('✅ Route guards are functioning properly');
    console.log('✅ User data flows are consistent');
    console.log('✅ Session management is working');
    console.log('✅ Error handling is robust');
    console.log('');
    console.log('🚀 Your blog platform frontend is ready for deployment!');
  } else {
    console.log('');
    console.log('❌ Some tests failed. Please review and fix the issues.');
    process.exit(1);
  }
}

// Run manual tests for demonstration
function runManualTests() {
  console.log('🔧 Running Manual Test Simulations...');
  console.log('');
  
  // Load and run existing test files
  const registrationFlowTest = require('../../test-registration-login-flow.js');
  const backendConnectionTest = require('../../test-backend-connection.js');
  
  console.log('✅ Manual tests completed');
  console.log('');
}

// Check if we should run Angular tests or manual tests
const args = process.argv.slice(2);
if (args.includes('--manual')) {
  runManualTests();
} else if (args.includes('--angular')) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
} else {
  console.log('📋 Available test modes:');
  console.log('   npm run test:auth --manual    # Run manual test simulations');
  console.log('   npm run test:auth --angular   # Run Angular unit/integration tests');
  console.log('');
  console.log('🔬 Running manual test simulations by default...');
  console.log('');
  runManualTests();
}

module.exports = {
  runAllTests,
  runManualTests,
  testFiles
};

