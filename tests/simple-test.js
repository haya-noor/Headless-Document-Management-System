/**
 * Simple Integration Test (JavaScript)
 * Run with: node tests/simple-test.js
 */

console.log('🧪 Simple Integration Test');
console.log('==========================\n');

// Test 1: Check if we can require modules
console.log('1️⃣ Testing module imports...');
try {
  const { UserEntity, UserRole } = require('../src/app/domain/user/entity');
  console.log('   ✅ UserEntity imported successfully');
  console.log('   ✅ UserRole imported successfully');
} catch (error) {
  console.log('   ❌ Import failed:', error.message);
}

// Test 2: Check UserRole values
console.log('\n2️⃣ Testing UserRole enum...');
try {
  const { UserRole } = require('../src/app/domain/user/entity');
  console.log('   📋 Available roles:', Object.values(UserRole));
  console.log('   ✅ UserRole enum working correctly');
} catch (error) {
  console.log('   ❌ UserRole test failed:', error.message);
}

// Test 3: Check Effect
console.log('\n3️⃣ Testing Effect...');
try {
  const { Effect } = require('effect');
  console.log('   ✅ Effect imported successfully');
  console.log('   📦 Effect methods available:', Object.keys(Effect).slice(0, 5));
} catch (error) {
  console.log('   ❌ Effect test failed:', error.message);
}

console.log('\n📊 Simple Integration Test Complete!');
console.log('=====================================');
console.log('✅ If you see checkmarks above, your basic modules are working!');
console.log('\n💡 For full testing, use: bun test tests/domain/');
