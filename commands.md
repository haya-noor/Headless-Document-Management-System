npm run test:auth
npm run test:storage
npm run test:repositories
npm run test:api
npm run test:documents
npm run test:api-real


curl -s "http://localhost:3002/api/v1/files/Effect.md/metadata" | jq