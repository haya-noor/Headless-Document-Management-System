## Setup

1. Start the Database
docker-compose up -d

2. Run Migrations
npm run db:migrate

3. Start the Server
npm run dev


4. Run all tests
npm run test:all


5. Domain tests 
npm test tests/domain/user.entity.test.ts
npm test tests/domain/access-policy.entity.test.ts
npm test tests/domain/d-version.entity.test.ts
npm test tests/domain/document.entity.test.ts
npm test tests/domain/download-token.entity.test.ts

OR

# Run all domain tests
npm test -- tests/domain/

# Test specific domain entity
npm test -- tests/domain/document.entity.test.ts
npm test -- tests/domain/access-policy.entity.test.ts
npm test -- tests/domain/user.entity.test.ts


6. Repository Tests (Infrastructure Layer)
npm test tests/infra/user-repo.test.ts
npm test tests/infra/d-repo.test.ts
npm test tests/infra/d-version-repo.test.ts
npm test tests/infra/storage.test.ts
npm test tests/infra/d-token-repo.test.ts
npm test tests/infra/access-policy-repo.test.ts

OR

# Run all repository tests
npm test -- tests/infra/

# Test specific repository
npm test -- tests/infra/d-repo.test.ts
npm test -- tests/infra/user-repo.test.ts
npm test -- tests/infra/access-policy-repo.test.ts


7. Integration Tests (Workflow Layer)
# Run Document workflow test (document create -> upload -> publish -> grant access 
-> validate if published  -> token generation -> download)


npm test ./tests/integration/doc.workflow.test.ts

npm test ./tests/integration/document.e2e.test.ts

npm test ./tests/integration/performance.test.ts

OR

# Test document workflow
npm test -- tests/integration/doc.workflow.test.ts

# Test E2E document operations
npm test -- tests/integration/document.e2e.test.ts

# Performance tests
npm test -- tests/integration/performance.test.ts



