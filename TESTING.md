# Run all tests
npm run test:all

# Run domain tests
npm test tests/domain/user.entity.test.ts
npm test tests/domain/access-policy.entity.test.ts
npm test tests/domain/d-version.entity.test.ts
npm test tests/domain/document.entity.test.ts
npm test tests/domain/download-token.entity.test.ts

# Run infrastructure tests
npm test tests/infra/user-repo.test.ts
npm test tests/infra/d-repo.test.ts
npm test tests/infra/d-version-repo.test.ts
npm test tests/infra/storage.test.ts
npm test tests/infra/d-token-repo.test.ts
npm test tests/infra/access-policy-repo.test.ts

# Run E2E tests
npm test tests/document.e2e.test.ts

# Run performance tests

# Run all domain tests
npm test tests/domain/

# Run all infrastructure tests
npm test tests/infra/

