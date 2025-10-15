# Testing Guide

## ✅ Domain Layer Tests (Working)

These tests check business logic and entity validation without database.

**Test Files:**
- `tests/domain/user.entity.test.ts` - Tests UserEntity (7 tests)
- `tests/domain/document.entity.test.ts` - Tests DocumentEntity (6 tests)
- `tests/domain/access-policy.entity.test.ts` - Tests AccessPolicyEntity (5 tests)
- `tests/domain/d-version.entity.ts` - Tests DocumentVersionEntity (6 tests)
- `tests/domain/download-token.entity.ts` - Tests DownloadTokenEntity (11 tests)

**Status:** All 35 tests passing ✅

**Commands:**
```bash
# Run all domain tests
bun test tests/domain/

# Run specific domain tests
bun test tests/domain/user.entity.test.ts
bun test tests/domain/document.entity.test.ts
bun test tests/domain/access-policy.entity.test.ts
bun test tests/domain/d-version.entity.ts
bun test tests/domain/download-token.entity.ts

# Run with verbose output
bun test tests/domain/ --verbose

# Run specific test patterns
bun test tests/domain/ --grep "should create"
bun test tests/domain/ --grep "validation"
```

## 🏭 Test Factories (Available)

Test factories provide consistent, valid test data for all domain entities:

**Factory Files:**
- `tests/factories/user.factory.ts` - UserEntity test data generators
- `tests/factories/document.factory.ts` - DocumentEntity test data generators  
- `tests/factories/access-policy.factory.ts` - AccessPolicyEntity test data generators
- `tests/factories/d-version.factory.ts` - DocumentVersionEntity test data generators
- `tests/factories/download-token.factory.ts` - DownloadTokenEntity test data generators

**Features:**
- ✅ **Effect-based**: All factories return Effect types for proper error handling
- ✅ **Faker integration**: Realistic test data using @faker-js/faker
- ✅ **Fast-check support**: Property-based testing with arbitrary generators
- ✅ **Branded types**: Proper handling of domain ID types (UserId, DocumentId, etc.)
- ✅ **Schema validation**: All generated data passes domain schema validation

**Usage Examples:**
```typescript
// Generate single entity
const user = await runEffect(createTestUserEntity())
const doc = await runEffect(createTestDocumentEntity())

// Generate with overrides
const adminUser = await runEffect(createTestUserEntity({ role: "admin" }))
const largeDoc = await runEffect(createTestDocumentEntity({ size: 1024 * 1024 }))

// Generate multiple entities
const users = generateTestUsers(5)
const docs = generateTestDocuments(3)
```

## ⚠️ Infrastructure Layer Tests (Mixed Status)

These tests check database operations and repository implementations.

**Test Files:**
- `tests/integration/user.repository.integration.test.ts` - Tests UserRepository
- `tests/integration/document.e2e.test.ts` - Tests DocumentRepository and DocumentVersionRepository
- `tests/integration/user-profile.integration.test.ts` - Tests User profile methods
- `tests/integration/performance.test.ts` - Tests database performance

Integration Tests
    ↓
@testcontainers/postgresql (^11.7.1)
    ↓
testcontainers (^11.7.1)
    ↓
dockerode (^4.0.8) + ssh-remote-port-forward (^1.0.4)
    ↓
docker-modem (^5.0.6) + ssh2 (^1.4.0)
    ↓
ssh2 (^1.17.0) ← **Crash occurs**

The ssh2 module is essential for testcontainers' advanced features like remote Docker connections and SSH tunneling, but it's causing compatibility issues with Bun's incomplete libuv implementation.


**Status:** 
- ❌ **All integration tests use `bun:test`** - Cannot run with Node.js/tsx
- ❌ **Bun crashes** - libuv compatibility issue with ssh2 module
- ❌ **Jest fails** - TypeScript/ES module parsing issues

**Current Limitation:**
Integration tests are written for Bun's test framework (`bun:test`) but Bun crashes due to ssh2/libuv compatibility issues. This creates a **catch-22 situation**:

- **Bun tests crash** due to ssh2 module
- **Node.js/tsx can't run** `bun:test` imports
- **Jest has parsing issues** with TypeScript

**Non-working Commands:**
```bash
# ❌ Bun crashes with ssh2 module
bun test tests/integration/

# ❌ Node.js can't import bun:test
npx tsx tests/integration/user.repository.integration.test.ts

# ❌ Jest has TypeScript parsing issues
npx jest tests/integration/
```

## Summary

**✅ What Works:**
- **Domain Tests**: All 35 tests passing with Bun (35/35)

**❌ What Doesn't Work:**
- **Integration Tests**: Cannot run due to bun:test + ssh2 compatibility issues
- **Bun + Integration Tests**: Crashes due to ssh2/libuv issue
- **Node.js + Integration Tests**: Cannot import `bun:test`
- **Jest + Integration Tests**: TypeScript parsing issues

**Current Situation:**
Integration tests are **completely blocked** due to a combination of:
1. **Bun compatibility issue** with ssh2 module (testcontainers dependency)
2. **bun:test framework** that only works with Bun
3. **No working alternative** test runner

**Recommended Workflow:**
```bash
# ✅ ONLY working option: Run domain tests
bun test tests/domain/

# ❌ Integration tests are currently unusable
# Wait for Bun to fix libuv compatibility or rewrite tests for Jest
```

**Next Steps:**
1. **Focus on domain tests** for development
2. **Wait for Bun libuv fix** (GitHub issue #18546)
3. **Consider rewriting integration tests** for Jest if needed urgently
