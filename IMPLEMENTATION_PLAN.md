# Implementation Plan

## Summary of Requested Features

### ✅ 1. Standardize Permissions
**Current State:** Mixed permission formats
- AccessPolicyGuards uses: "read", "write", "delete", "manage"
- AccessControlService uses: "document:create", "document:update", "document:read"
- Need to standardize to: "read", "write"/"update", "delete", "manage"

**Default Permissions:**
- `read`: View/access document
- `write`/`update`: Modify document (standardized as synonyms)
- `delete`: Remove document
- `manage`: Full control (grant/revoke permissions, delete, etc.)

### ✅ 2. Owner Permission Granting
**Feature:** Document owner can grant "update" permission to specific users
**Implementation:** Enhance `AccessPolicyWorkflow.grantAccess()` to:
- Verify owner has permission to grant
- Allow "update" action (currently only "read", "write", "delete", "manage" exist)
- Use builder pattern for grant operation

### ✅ 3. Fix Upload Document Inconsistencies
**Issue:** "upload document" referenced inconsistently
**Need:** Find all references and standardize terminology

### ✅ 4. Effect Schema Composition
**Where:** DTOs with chained validations
**Example:** GrantAccessDTO, UpdateDocumentDTO, etc.

### ✅ 5. Persistent Audit Logging
**Current:** Logs to console via pino
**New:** Store in database table `audit_logs`
**Requires:**
- Database model (✅ created)
- Repository interface and implementation
- Update AuditLoggerService to persist

### ✅ 6. Builder Pattern (Refactoring Guru)
**Target:** Methods with 4+ parameters
**Candidates:**
- `logDocumentOperation()` - 6+ parameters
- `grantAccess()` - can use builder
- `createDocument()` DTO creation

### ✅ 7. Effect Schema Pattern Matching
**Usage:** Replace Option.match with Schema pattern matching where appropriate

