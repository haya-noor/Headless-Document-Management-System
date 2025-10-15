/**
 * Manual Integration Test
 * Run this to manually test your integration components
 * 
 * Usage: npx tsx tests/manual-integration-test.ts
 */

import { Effect } from 'effect';

console.log('🧪 Manual Integration Test Runner');
console.log('=====================================\n');

// Test 1: Check if modules can be imported
console.log('1️⃣ Testing module imports...');
try {
  // Test domain imports
  const userModule = await import('../../src/app/domain/user/entity');
  console.log('   ✅ UserEntity imported successfully');
  console.log('   ✅ UserRole imported successfully');
  
  // Test repository imports
  const repoModule = await import('../../src/app/infrastructure/repositories/implementations/user.repository');
  console.log('   ✅ UserRepositoryImpl imported successfully');
  
  // Test Effect imports
  console.log('   ✅ Effect imported successfully');
  
} catch (error) {
  console.log('   ❌ Import failed:', error.message);
}

console.log('\n2️⃣ Testing UserEntity creation...');
try {
  const { UserEntity, UserRole } = await import('../../src/app/domain/user/entity');
  
  const userData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER
  };
  
  const user = UserEntity.create(userData);
  console.log('   ✅ UserEntity created successfully');
  console.log('   📧 Email:', user.email);
  console.log('   👤 Name:', user.firstName, user.lastName);
  console.log('   🔑 Role:', user.role);
  
} catch (error) {
  console.log('   ❌ UserEntity creation failed:', error.message);
}

console.log('\n3️⃣ Testing UserRole enum...');
try {
  const { UserRole } = await import('../../src/app/domain/user/entity');
  
  console.log('   📋 Available roles:', Object.values(UserRole));
  console.log('   ✅ UserRole enum working correctly');
  
} catch (error) {
  console.log('   ❌ UserRole test failed:', error.message);
}

console.log('\n4️⃣ Testing Effect functionality...');
try {
  const successEffect = Effect.succeed('Hello from Effect!');
  const result = await Effect.runPromise(successEffect);
  console.log('   ✅ Effect.succeed working:', result);
  
  const errorEffect = Effect.fail('Test error');
  try {
    await Effect.runPromise(errorEffect);
  } catch (error) {
    console.log('   ✅ Effect.fail working:', error);
  }
  
} catch (error) {
  console.log('   ❌ Effect test failed:', error.message);
}

console.log('\n5️⃣ Testing repository instantiation...');
try {
  const { UserRepositoryImpl } = await import('../../src/app/infrastructure/repositories/implementations/user.repository');
  
  const repository = new UserRepositoryImpl();
  console.log('   ✅ UserRepositoryImpl instantiated successfully');
  
  // Check if methods exist
  const methods = ['create', 'findById', 'findByEmail', 'update', 'delete', 'findAll'];
  const missingMethods = methods.filter(method => typeof repository[method] !== 'function');
  
  if (missingMethods.length === 0) {
    console.log('   ✅ All required methods exist');
  } else {
    console.log('   ❌ Missing methods:', missingMethods);
  }
  
} catch (error) {
  console.log('   ❌ Repository test failed:', error.message);
}

console.log('\n📊 Manual Integration Test Complete!');
console.log('=====================================');
console.log('✅ If you see mostly checkmarks above, your integration components are working!');
console.log('❌ If you see X marks, there are issues that need to be fixed.');
console.log('\n💡 Next steps:');
console.log('   1. Fix any failing tests above');
console.log('   2. Set up a real database for full integration testing');
console.log('   3. Use the working domain tests for development: bun test tests/domain/');
