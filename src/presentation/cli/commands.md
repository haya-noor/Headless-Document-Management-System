# Commands

## Database
```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Tests
```bash
bun test
bun test tests/domain/
bun test tests/domain/user.entity.test.ts
bun test tests/domain/access-policy.entity.test.ts
bun test tests/domain/document-access.service.test.ts
bun test tests/domain/document.entity.test.ts
bun test tests/integration/document.e2e.test.ts
bun test tests/integration/user.repository.integration.test.ts
bun test tests/integration/performance.test.ts
```

## Test Scripts
```bash
bun run test:unit
bun run test:watch
bun run test:coverage
bun run test:integration
```

## Development
```bash
bun run src/index.ts
```
