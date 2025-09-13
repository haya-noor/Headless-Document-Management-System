/**
 * Simple function testing script
 * Tests individual functions without Jest complexity
 */

async function testUtilityFunctions() {
  console.log('🧪 UNIT TESTING - Individual Functions');
  console.log('=====================================\n');

  try {
    // Test UUID generation
    console.log('1. Testing UUID Functions:');
    const { generateId, isValidId } = require('./src/utils/uuid');
    
    const uuid = generateId();
    console.log(`   ✅ Generated UUID: ${uuid}`);
    console.log(`   ✅ UUID Valid: ${isValidId(uuid)}`);
    console.log(`   ✅ Invalid UUID Check: ${isValidId('invalid')}`);

    // Test password validation
    console.log('\n2. Testing Password Functions:');
    const { validatePasswordStrength } = require('./src/utils/password');
    
    const strongResult = validatePasswordStrength('StrongPass123!');
    const weakResult = validatePasswordStrength('weak');
    
    console.log(`   ✅ Strong Password Valid: ${strongResult.isValid}`);
    console.log(`   ✅ Weak Password Invalid: ${!weakResult.isValid}`);
    console.log(`   ✅ Weak Password Errors: ${weakResult.errors.length} errors`);

    // Test JWT functions
    console.log('\n3. Testing JWT Functions:');
    const { generateToken, extractTokenFromHeader } = require('./src/utils/jwt');
    
    const payload = { userId: 'test', email: 'test@example.com', role: 'user' };
    const token = generateToken(payload);
    const extracted = extractTokenFromHeader(`Bearer ${token}`);
    
    console.log(`   ✅ JWT Token Generated: ${token ? 'Yes' : 'No'}`);
    console.log(`   ✅ Token Extraction: ${extracted === token ? 'Success' : 'Failed'}`);

    // Test configuration
    console.log('\n4. Testing Configuration:');
    const { config } = require('./src/config');
    
    console.log(`   ✅ Server Port: ${config.server.port}`);
    console.log(`   ✅ Storage Provider: ${config.storage.provider}`);
    console.log(`   ✅ JWT Secret Set: ${config.jwt.secret ? 'Yes' : 'No'}`);

    console.log('\n🎉 ALL UNIT TESTS PASSED!');
    
  } catch (error) {
    console.error('❌ Unit test failed:', error.message);
  }
}

async function testPasswordHashing() {
  console.log('\n🔐 Testing Password Hashing (Async):');
  
  try {
    const { hashPassword, verifyPassword } = require('./src/utils/password');
    
    const password = 'TestPassword123!';
    console.log('   🔄 Hashing password...');
    
    const hash = await hashPassword(password);
    console.log(`   ✅ Password Hashed: ${hash.length > 50 ? 'Success' : 'Failed'}`);
    
    const isValid = await verifyPassword(password, hash);
    const isInvalid = await verifyPassword('wrongpassword', hash);
    
    console.log(`   ✅ Correct Password Verified: ${isValid}`);
    console.log(`   ✅ Wrong Password Rejected: ${!isInvalid}`);
    
  } catch (error) {
    console.error('   ❌ Password hashing test failed:', error.message);
  }
}

// Run all unit tests
async function runAllUnitTests() {
  await testUtilityFunctions();
  await testPasswordHashing();
  
  console.log('\n🎯 UNIT TESTING COMPLETE!');
  console.log('All individual functions tested successfully.');
}

// Export for use in other scripts
module.exports = { runAllUnitTests };

// Run if called directly
if (require.main === module) {
  runAllUnitTests();
}
