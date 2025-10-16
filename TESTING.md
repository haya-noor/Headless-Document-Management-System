# Testing Guide

## Domain Layer Tests (Working)

These tests check business logic and entity validation without database.

**Test Files:**
- `tests/domain/user.entity.test.ts` - Tests UserEntity (7 tests)
- `tests/domain/document.entity.test.ts` - Tests DocumentEntity (6 tests)
- `tests/domain/access-policy.entity.test.ts` - Tests AccessPolicyEntity (5 tests)
- `tests/domain/d-version.entity.ts` - Tests DocumentVersionEntity (6 tests)
- `tests/domain/download-token.entity.ts` - Tests DownloadTokenEntity (11 tests)


**Commands:**
```bash
# Run all domain tests
bun test tests/domain/

# Run specific domain tests
bun test tests/domain/user.entity.test.ts
bun test tests/domain/access-policy.entity.test.ts
bun test tests/domain/d-version.entity.test.ts
bun test tests/domain/download-token.entity.ts

# Run with verbose output
bun test tests/domain/ --verbose

# Run specific test patterns
bun test tests/domain/ --grep "should create"
bun test tests/domain/ --grep "validation"
```

##  Test Factories 

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



