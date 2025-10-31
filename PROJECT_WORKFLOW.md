# Project Workflow & Request Flow

## 🏗️ Architecture Overview

This is a **Clean Architecture + DDD** project with strict layer separation:
- **Presentation Layer** → HTTP/RPC endpoints
- **Application Layer** → Workflows (use cases)
- **Domain Layer** → Entities, Value Objects, Business Rules
- **Infrastructure Layer** → Database, Storage, External Services

---

## 📥 Complete Request Flow

### 1. **HTTP Request Entry Point**
```
Client Request
    ↓
elysia-rpc-server.ts (POST /rpc)
    ↓
Extracts headers, parses JSON body
```

**File:** `src/presentation/http/elysia-rpc-server.ts`

---

### 2. **Authentication & Context Creation**
```
headers
    ↓
createContext() in auth.ts
    ↓
├─ Extract JWT token from Authorization header
├─ Verify JWT signature
├─ Decode JWT payload
├─ Extract userId, workspaceId, roles
└─ Generate correlationId for observability
    ↓
RPCContext (Presentation Layer)
```

**Files:**
- `src/presentation/http/orpc/auth.ts`
  - `createContext()` → Returns `RPCContext`
  - `toUserContext()` → Converts `RPCContext` → `UserContext`

**RPCContext vs UserContext:**
- **RPCContext**: Used at HTTP boundary (has `Option<WorkspaceId>`, `rawPayload`)
- **UserContext**: Used in workflows (guaranteed `WorkspaceId`, simplified)

---

### 3. **RPC Handler Resolution**
```
/rpc endpoint
    ↓
app-rpc.ts (registers all RPC groups)
    ↓
├─ DocumentRPC → documentHandlers
├─ UploadRPC → uploadHandlers
├─ AccessPolicyRPC → accessPolicyHandlers
└─ DownloadTokenRPC → downloadTokenHandlers
```

**Files:**
- `src/presentation/http/orpc/orpc-procedures/app-rpc.ts` (main registry)
- `src/presentation/http/orpc/orpc-procedures/document.rpc.ts`
- `src/presentation/http/orpc/orpc-procedures/upload.rpc.ts`
- `src/presentation/http/orpc/orpc-procedures/access-policy.rpc.ts`
- `src/presentation/http/orpc/orpc-procedures/download-token.rpc.ts`

---

### 4. **RPC Handler Processing**
```
RPC Handler (e.g., createDocument)
    ↓
createAuthenticatedContext(headers)
    ├─ Calls createContext() from auth.ts
    ├─ Returns RPCContext
    └─ Converts to UserContext
    ↓
enrichDTOWithContext(payload, userContext)
    ├─ Adds userId, workspaceId to DTO
    └─ Returns enriched DTO
    ↓
Resolve workflow from DI container
    ↓
Call workflow method (e.g., workflow.createDocument())
```

**Files:**
- `src/presentation/http/orpc/orpc-procedures/shared.ts`
  - `createAuthenticatedContext()` → Gets `UserContext`
  - `enrichDTOWithContext()` → Adds user context to DTO
  - `runEffect()` → Executes Effect and maps errors

**Example Handler:**
```typescript
// document.rpc.ts
createDocument: async (payload, options) => {
  const user = await createAuthenticatedContext(options.headers)
  const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
  const effect = await workflow.createDocument(enrichDTOWithContext(payload, user), user)
  const result = await runEffect(effect)
  const serialized = await runEffect(result.serialized())
  return normalizeDocumentResponse(serialized)
}
```

---

### 5. **Application Layer (Workflows)**
```
Workflow (e.g., DocumentWorkflow.createDocument)
    ↓
1. DTO Validation (Effect Schema)
    ↓
2. Access Control Check
    ├─ accessControlService.enforceAccess(user, "document", "create")
    └─ Returns 403 if unauthorized
    ↓
3. Business Logic
    ├─ Create entity (DocumentSchemaEntity.create())
    ├─ Apply business rules
    └─ Save via repository
    ↓
4. Audit Logging
    ├─ auditLogger.logDocumentOperation("document_created", ...)
    └─ Includes correlationId, userId, workspaceId
    ↓
5. Performance Timing
    └─ withTiming() wrapper logs execution time
    ↓
Returns Effect<DocumentEntity>
```

**Files:**
- `src/app/application/workflows/doc.workflow.ts`
- `src/app/application/workflows/upload.workflow.ts`
- `src/app/application/workflows/access-policy.workflow.ts`
- `src/app/application/workflows/download-token.workflow.ts`

**Services Used:**
- `src/app/application/services/access-control.service.ts` (RBAC)
- `src/app/application/services/audit-logger.service.ts` (Audit trail)
- `src/app/application/utils/timed-logger.ts` (Performance metrics)

---

### 6. **Domain Layer (Entities & Business Rules)**
```
Workflow calls entity factory
    ↓
Entity.create(input)
    ├─ Validates input with Effect Schema
    ├─ Applies domain invariants
    └─ Returns Effect<Entity, ValidationError>
    ↓
Entity methods
    ├─ Business rule enforcement
    └─ State mutations
    ↓
Entity.serialized()
    ├─ Converts Option<T> → T | undefined
    ├─ Converts Date → ISO string
    └─ Returns Effect<SerializedEntity>
```

**Files:**
- `src/app/domain/document/entity.ts`
- `src/app/domain/user/entity.ts`
- `src/app/domain/download-token/entity.ts`
- `src/app/domain/access-policy/entity.ts`
- `src/app/domain/d-version/entity.ts`

---

### 7. **Infrastructure Layer (Repository)**
```
Workflow calls repository.save(entity)
    ↓
Repository Implementation
    ├─ Convert entity → database row
    ├─ Execute SQL via Drizzle ORM
    ├─ Handle transactions
    └─ Return Effect<Entity, DatabaseError>
    ↓
Database (PostgreSQL)
```

**Files:**
- `src/app/infrastructure/repositories/implementations/d.repository.ts`
- `src/app/infrastructure/repositories/implementations/user.repository.ts`
- `src/app/infrastructure/repositories/implementations/access-policy.repository.ts`
- `src/app/infrastructure/repositories/implementations/d-token.repository.ts`
- `src/app/infrastructure/repositories/implementations/d-version.repository.ts`

---

### 8. **Response Normalization**
```
Entity.serialized() result
    ↓
normalizeDocumentResponse() / normalizeDownloadTokenResponse()
    ├─ Converts Option<T> → T | undefined
    ├─ Converts readonly arrays → mutable arrays
    ├─ Converts Date → ISO string
    └─ Handles null/undefined consistency
    ↓
Clean JSON response
```

**Files:**
- `src/presentation/http/orpc/normalize.ts`
  - `normalizeDocumentResponse()`
  - `normalizeDownloadTokenResponse()`
  - `normalizeUserResponse()`
  - `normalizePaginatedResponse()`

---

### 9. **Error Handling**
```
Any error in the chain
    ↓
runEffect() catches error
    ↓
mapError() in error-mapping.ts
    ├─ Maps DomainError → ORPCError
    ├─ Maps BusinessRuleViolationError → 403/400
    ├─ Maps ValidationError → 400
    ├─ Maps DatabaseError → 500
    └─ Maps NotFoundError → 404
    ↓
ORPCError with proper HTTP status
    ↓
JSON error response
```

**Files:**
- `src/presentation/http/orpc/error-mapping.ts`
- `src/presentation/http/orpc/shared.ts` (runEffect)

---

### 10. **Response Return**
```
Normalized JSON
    ↓
RPC Handler returns
    ↓
elysia-rpc-server.ts formats response
    ↓
HTTP 200 OK with JSON body
    ↓
Client
```

---

## 📋 Request Flow Example: Create Document

```
1. Client → POST /rpc
   Body: { "method": "createDocument", "params": { "title": "Test" } }
   Headers: { "Authorization": "Bearer JWT_TOKEN" }

2. elysia-rpc-server.ts
   - Receives request at /rpc endpoint
   - Extracts headers, parses JSON

3. auth.ts → createContext(headers)
   - Extracts JWT: "Bearer JWT_TOKEN"
   - Verifies JWT signature
   - Decodes payload: { userId, workspaceId, roles }
   - Returns RPCContext

4. shared.ts → createAuthenticatedContext()
   - Converts RPCContext → UserContext

5. document.rpc.ts → createDocument handler
   - Calls createAuthenticatedContext()
   - Calls enrichDTOWithContext(payload, user)
     → Adds { userId, workspaceId } to payload
   - Resolves DocumentWorkflow from DI container

6. doc.workflow.ts → createDocument()
   - Validates DTO with Effect Schema
   - Checks access: accessControlService.enforceAccess(user, "document", "create")
   - Creates entity: DocumentSchemaEntity.create(enrichedDTO)
   - Saves: documentRepository.save(entity)
   - Logs audit: auditLogger.logDocumentOperation(...)
   - Returns Effect<DocumentEntity>

7. document.rpc.ts → runEffect()
   - Executes Effect
   - Calls entity.serialized()
   - Gets serialized data

8. normalize.ts → normalizeDocumentResponse()
   - Converts Option types to undefined
   - Converts readonly arrays to mutable
   - Returns clean JSON

9. Response → Client
   {
     "id": "...",
     "title": "Test",
     "description": undefined,
     "tags": [],
     "createdAt": "2024-..."
   }
```

---

## 🔍 Key Files by Layer

### **Presentation Layer**
```
src/presentation/http/
├── elysia-rpc-server.ts      # HTTP server entry point
└── orpc/
    ├── auth.ts                # JWT auth, context creation
    ├── error-mapping.ts       # Error → HTTP status mapping
    ├── normalize.ts           # Response normalization
    └── orpc-procedures/
        ├── app-rpc.ts         # RPC registry
        ├── shared.ts          # Auth helpers, runEffect
        ├── document.rpc.ts    # Document handlers
        ├── upload.rpc.ts      # Upload handlers
        ├── access-policy.rpc.ts
        └── download-token.rpc.ts
```

### **Application Layer**
```
src/app/application/
├── workflows/
│   ├── doc.workflow.ts        # Document operations
│   ├── upload.workflow.ts     # File upload
│   ├── access-policy.workflow.ts
│   └── download-token.workflow.ts
├── services/
│   ├── access-control.service.ts  # RBAC enforcement
│   └── audit-logger.service.ts   # Audit logging
└── utils/
    ├── logger.ts              # Structured logging
    └── timed-logger.ts        # Performance timing
```

### **Domain Layer**
```
src/app/domain/
├── document/
│   ├── entity.ts              # DocumentSchemaEntity
│   ├── schema.ts              # Effect Schema
│   └── errors.ts              # Domain errors
├── user/
├── download-token/
├── access-policy/
└── shared/
    ├── base.entity.ts
    └── base.errors.ts
```

### **Infrastructure Layer**
```
src/app/infrastructure/
├── repositories/implementations/
│   ├── d.repository.ts        # Document repository
│   ├── user.repository.ts
│   └── ...
└── storage/
    └── storage.factory.ts
```





