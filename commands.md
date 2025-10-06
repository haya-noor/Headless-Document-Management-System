Commands

bun run src/index.t


Domain Tests (Separated by Functionality)

Test User Entity 
bun test tests/user-entity.test.ts

Test AccessPolicy Entity 
bun test tests/access-policy-entity.test.ts

Test DocumentAccessService 
bun test tests/document-access-service.test.ts

Test Value Objects - UserIdVO, PolicyIdVO 
bun test tests/value-objects.test.ts


Other Tests
Test Document Entities & Original VOs
bun test tests/effect-integration.test.ts

Test Repositories
bun test tests/repositories.test.ts

Test Documents API
bun test tests/documents.test.ts


Run All Tests
bun test



