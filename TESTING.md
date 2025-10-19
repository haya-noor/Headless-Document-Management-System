# Testing Guide

**Test Files:**
- `tests/domain/user.entity.test.ts` - Tests UserEntity (7 tests)
- `tests/domain/document.entity.test.ts` - Tests DocumentEntity (6 tests)
- `tests/domain/access-policy.entity.test.ts` - Tests AccessPolicyEntity (5 tests)
- `tests/domain/d-version.entity.ts` - Tests DocumentVersionEntity (6 tests)
- `tests/domain/download-token.entity.ts` - Tests DownloadTokenEntity (11 tests)


# Run specific domain tests
bun test tests/domain/user.entity.test.ts
bun test tests/domain/document.entity.test.ts
bun test tests/domain/access-policy.entity.test.ts
bun test tests/domain/d-version.entity.test.ts
bun test tests/domain/download-token.entity.ts



tests/infra/
bun test tests/infra/user-repo.test.ts


# Run E2E tests only
npm test -- document.e2e.test.ts

# Run Performance tests only
npm test -- performance.test.ts

# Run both
npm test -- document.e2e.test.ts performance.test.ts

