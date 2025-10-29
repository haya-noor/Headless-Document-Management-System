

## Testing Authentication & Access Control

### 1. **JWT Authentication Test**

Create a test JWT token (you'll need to implement a token generator):

```bash
# Example: Generate JWT with these claims:
{
  "userId": "user123",
  "workspaceId": "workspace456",
  "roles": ["admin", "user"]
}
```

### 2. **Test JWT Validation**

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-workspace-id: workspace456" \
  -d '{
    "method": "createDocument",
    "params": {
      "title": "Test Document",
      "description": "Testing auth"
    }
  }'
```

### 3. **Test Access Control (403 Forbidden)**

Try to access a resource without proper permissions:

```bash
# Should return 403 if user doesn't have 'publish' permission
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer VIEWER_TOKEN" \
  -d '{
    "method": "publishDocument",
    "params": { "documentId": "doc123" }
  }'
```

## Testing Audit Logging

### 1. **Check Audit Logs**
Audit logs are automatically captured for all operations. Check console output for structured logs:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Audit log: Document operation",
  "correlationId": "uuid-here",
  "userId": "user123",
  "workspaceId": "workspace456",
  "eventType": "document_created",
  "resource": "document",
  "action": "create",
  "outcome": "success"
}
```

### 2. **Test Document Operations**
```bash
# Create a document
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer TOKEN" \
  -d '{"method": "createDocument", "params": {...}}'

# Check logs for audit entries
```

### 3. **Test Access Control Changes**
```bash
# Grant access
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer TOKEN" \
  -d '{"method": "grantAccess", "params": {...}}'

# Should see log entry with eventType: "access_policy_granted"
```

## Testing Observability

### 1. **Performance Metrics**
All operations are automatically timed. Check logs for `durationMs`:

```json
{
  "operation": "Document:createDocument",
  "durationMs": 245,
  "correlationId": "uuid",
  "userId": "user123"
}
```

### 2. **Correlation Tracking**
Every request gets a correlation ID in the logs. Trace a request through:
- RPC handler
- Workflow
- Audit logger
- Error handler

All will show the same `correlationId`.

## Testing Error Handling

### 1. **Test 401 Unauthorized**
```bash
curl http://localhost:3000/rpc
# Should return 401 without Authorization header
```

### 2. **Test 403 Forbidden**
```bash
# Try to publish without permission
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer VIEWER_TOKEN" \
  -d '{"method": "publishDocument", "params": {...}}'
# Should return 403
```

### 3. **Test 400 Bad Request**
```bash
# Send invalid data
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer TOKEN" \
  -d '{"method": "createDocument", "params": {}}'
# Should return 400 with validation errors
```

#