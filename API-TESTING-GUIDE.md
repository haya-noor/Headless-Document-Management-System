# 🧪 API Testing Guide

Complete guide for testing the Document Management System APIs on port 3002.


## 🚀 Quick Start

### 1. **Run All Tests**
```bash
# Comprehensive test suite with reports
bun run test:all
```

### 2. **Development Testing**
```bash
# Watch mode for active development
bun run test:watch

# Run specific test suite
bun run test:auth
bun run test:documents
bun run test:storage
```

### 3. **Real API Testing**
```bash
# Start the server first
export PORT=3002
export DATABASE_URL="postgresql://user:pass@localhost:5432/testdb"
export JWT_SECRET="your-secret-key"
bun run dev

# Then run real API tests (in another terminal)
bun run test:api-real
```

## 🎯 Test Commands

### Individual Test Suites
```bash
bun run test:auth         # Authentication system
bun run test:documents    # Document management
bun run test:storage      # Storage services
bun run test:repositories # Database repositories
bun run test:api          # Mock API tests
bun run test:api-real     # Real API tests
```

### Comprehensive Testing
```bash
bun run test:all          # All tests with detailed reports
bun run test              # Simple test run
bun run test:coverage     # Test coverage analysis
```

## 🌐 API Testing Methods

### Method 1: Mock Tests (No Server Required)
```bash
bun run test:api
```
- Tests API logic without HTTP
- Uses mocked services and responses

### Method 2: Real API Tests (Server Required)
```bash
# Terminal 1: Start server
export PORT=3002
bun run dev

# Terminal 2: Run tests
bun run test:api-real
```
- Tests actual HTTP endpoints
- Requires running server
- Tests complete request/response cycle

### Method 3: Manual Testing with curl
See detailed curl examples in the "Manual API Testing" section below.

### Method 4: Script-Based Testing
```bash
# Use the included test scripts
./tests/test-demo.sh all        # Interactive test demo
./tests/test-apis.sh           # Comprehensive API testing script
./tests/quick-test.sh          # Quick connectivity test
```

## 📊 Test Reports

The comprehensive test runner generates:

### JSON Report (`test-results.json`)
```json
{
  "summary": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "total": 6,
    "passed": 5,
    "failed": 1,
    "successRate": 83
  },
  "testSuites": [...],
  "environment": {...}
}
```

## 🔧 Environment Setup

### Required Environment Variables
```bash
# Core configuration
PORT=3002
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-here

# Database (optional for mock tests)
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Storage (auto-configured for local)
STORAGE_PROVIDER=local
```

### Database Setup (Optional)
```bash
# For full functionality tests
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=testdb \
  -p 5432:5432 -d postgres

# Run migrations
bun run db:migrate
```

## 🔍 Debugging Tests

### View Test Output
```bash
# Verbose output
bun test tests/ --reporter=verbose

# Watch specific file
bun test tests/auth.test.ts --watch

# Debug single test
bun test tests/auth.test.ts --grep="should validate password"
```

## 🎬 Interactive Demo

```bash
# Quick demo of all test types
./tests/test-demo.sh demo

# Run specific test category
./tests/test-demo.sh auth
./tests/test-demo.sh integration
./tests/test-demo.sh all
```

## 🔧 Manual API Testing with curl

### Step 1: Check Server Health
```bash
# Check if server is running
curl http://localhost:3002/health

# Expected response:
# {
#   "success": true,
#   "message": "Service is healthy",
#   "data": {
#     "timestamp": "2024-01-01T12:00:00.000Z",
#     "uptime": 1.234,
#     "environment": "development",
#     "version": "1.0.0"
#   }
# }
```

### Step 2: Authentication Flow
```bash
# Register a new user
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login and get token
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Save the token from response for next commands
# Example: TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get user profile
curl -X GET http://localhost:3002/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 3: Document Management
```bash
# Create a test file
echo "This is a test document" > test-file.txt

# Upload document
curl -X POST http://localhost:3002/api/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test-file.txt" \
  -F 'tags=["test", "important"]' \
  -F 'metadata={"category": "test", "description": "Test document"}'

# List documents
curl -X GET http://localhost:3002/api/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# List with pagination and filters
curl -X GET "http://localhost:3002/api/v1/documents?page=1&limit=10&tags=test&mimeType=text/plain" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get document by ID (replace DOCUMENT_ID)
curl -X GET http://localhost:3002/api/v1/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Update document metadata
curl -X PUT http://localhost:3002/api/v1/documents/DOCUMENT_ID/metadata \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "category": "important",
      "description": "Updated description",
      "author": "Test User"
    }
  }'

# Update document tags
curl -X PUT http://localhost:3002/api/v1/documents/DOCUMENT_ID/tags \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["new-tag", "updated", "important"]
  }'

# Generate download link
curl -X POST http://localhost:3002/api/v1/documents/DOCUMENT_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresIn": 3600,
    "filename": "custom-filename.txt"
  }'

# Update document permissions
curl -X PUT http://localhost:3002/api/v1/documents/DOCUMENT_ID/permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {
        "userId": "USER_ID_HERE",
        "permission": "read"
      }
    ]
  }'

# Delete document
curl -X DELETE http://localhost:3002/api/v1/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 4: File Operations
```bash
# Serve file (replace FILE_KEY with actual key)
curl http://localhost:3002/api/v1/files/FILE_KEY

# Download file with custom filename
curl http://localhost:3002/api/v1/files/download/FILE_KEY?filename=custom-name.txt

# Get file info
curl -X GET http://localhost:3002/api/v1/files/FILE_KEY/info \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 5: API Information
```bash
# Get API documentation
curl http://localhost:3002/api

# Access Swagger UI (open in browser)
# http://localhost:3002/swagger
```

### API Documentation
- Interactive docs: `http://localhost:3002/swagger`
- API info: `http://localhost:3002/api`
- Health check: `http://localhost:3002/health`

### Scripts
- `./tests/test-demo.sh` - Interactive test demonstration
- `./tests/test-apis.sh` - Comprehensive API testing
- `./tests/quick-test.sh` - Quick connectivity check

---


