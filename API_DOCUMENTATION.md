# Headless Document Management System - API Documentation

A comprehensive backend system for document management with clean architecture, domain-driven design, and modern TypeScript development.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Security](#security)
- [Configuration](#configuration)

## Overview

This is a headless document management system built with TypeScript, Express.js, and Drizzle ORM. It provides a RESTful API for document upload, storage, retrieval, and management with advanced features like versioning, permissions, search, and audit logging.

### Key Technologies

- **Runtime**: Node.js / Bun.js
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Storage**: Local filesystem (scalable to S3-compatible storage)
- **Authentication**: JWT with RBAC
- **Validation**: Zod schemas
- **Architecture**: Clean Architecture with Repository Pattern

## Features

### Core Features

- ✅ **Document Upload & Storage**: Secure file upload with S3-compatible storage
- ✅ **User Authentication**: JWT-based auth with role-based access control (RBAC)
- ✅ **Document Permissions**: Granular read/write/delete permissions per document
- ✅ **Document Versioning**: Immutable file versions with audit trail
- ✅ **Advanced Search**: Filter by tags, metadata, filename, content-type
- ✅ **Pagination & Sorting**: Efficient data retrieval with pagination
- ✅ **Pre-signed URLs**: Secure, time-limited download links
- ✅ **Audit Logging**: Complete audit trail for compliance
- ✅ **Metadata Management**: Key-value metadata for documents
- ✅ **Tag System**: Flexible tagging for document organization

### Security Features

- 🔒 **JWT Authentication**: Stateless authentication with configurable expiry
- 🔒 **RBAC**: Role-based access control (Admin, User)
- 🔒 **Input Validation**: Strict validation using Zod schemas
- 🔒 **Pre-signed URLs**: Secure file access without exposing storage credentials
- 🔒 **Password Security**: bcrypt hashing with configurable rounds
- 🔒 **Request Validation**: Comprehensive input sanitization
- 🔒 **Security Headers**: Helmet.js for security headers

## Architecture

The system follows Clean Architecture principles with clear separation of concerns:

```
src/
├── config/           # Configuration and database setup
├── controllers/      # Thin controllers (validate input, call services)
├── services/         # Business logic layer
├── repositories/     # Data access layer with interfaces
│   ├── interfaces/   # Repository contracts
│   └── implementations/ # Concrete implementations
├── middleware/       # Express middleware (auth, validation, error handling)
├── models/          # Database schema definitions
├── schemas/         # Zod validation schemas
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Design Patterns

- **Repository Pattern**: Abstraction layer for data access
- **Service Layer**: Business logic separation
- **Dependency Injection**: Loose coupling between components
- **Factory Pattern**: For creating instances
- **Singleton Pattern**: For database connections

## Getting Started

### Prerequisites

- Node.js 18+ or Bun.js
- PostgreSQL database
- S3-compatible storage (AWS S3, MinIO, etc.)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd headless-document-management-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**:
   ```bash
   cp env.example .env
   ```

4. **Configure environment variables** (see [Configuration](#configuration))

5. **Run database migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or your configured port).

### Health Check

Verify the server is running:
```bash
curl http://localhost:3000/health
```

## Authentication

The system uses JWT (JSON Web Tokens) for authentication with role-based access control.

### User Roles

- **Admin**: Full system access, user management, audit logs
- **User**: Document management within permissions

### Authentication Flow

1. **Register/Login** → Receive JWT token
2. **Include token** in `Authorization: Bearer <token>` header
3. **Token validation** on protected endpoints
4. **Role-based access** control applied

### Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user|admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Get Profile
```http
GET /auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### Change Password
```http
PUT /auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

### Document Endpoints (To Be Implemented)

#### Upload Document
```http
POST /documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [binary data]
tags: ["important", "contract"]
metadata: {"department": "legal", "priority": "high"}
```

#### List Documents
```http
GET /documents?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>
```

#### Get Document
```http
GET /documents/:id
Authorization: Bearer <token>
```

#### Download Document
```http
GET /documents/:id/download
Authorization: Bearer <token>
```

#### Update Document
```http
PUT /documents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "tags": ["updated", "contract"],
  "metadata": {"status": "reviewed"}
}
```

#### Delete Document
```http
DELETE /documents/:id
Authorization: Bearer <token>
```

### Permission Endpoints (To Be Implemented)

#### List Document Permissions
```http
GET /documents/:id/permissions
Authorization: Bearer <token>
```

#### Grant Permission
```http
POST /documents/:id/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "permission": "read|write|delete"
}
```

#### Update Permission
```http
PUT /documents/:id/permissions/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "permission": "write"
}
```

#### Revoke Permission
```http
DELETE /documents/:id/permissions/:userId
Authorization: Bearer <token>
```

### Admin Endpoints (To Be Implemented)

#### List Users
```http
GET /admin/users?page=1&limit=10
Authorization: Bearer <admin-token>
```

#### System Statistics
```http
GET /admin/stats
Authorization: Bearer <admin-token>
```

#### Audit Logs
```http
GET /admin/audit-logs?page=1&limit=10&action=upload
Authorization: Bearer <admin-token>
```

## Data Models

### User
```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique email
  firstName: string;       // First name
  lastName: string;        // Last name
  role: 'admin' | 'user';  // User role
  isActive: boolean;       // Account status
  createdAt: Date;         // Creation timestamp
  updatedAt: Date;         // Last update timestamp
}
```

### Document
```typescript
interface Document {
  id: string;                    // UUID
  filename: string;              // Current filename
  originalName: string;          // Original upload name
  mimeType: string;             // File MIME type
  size: number;                 // File size in bytes
  s3Key: string;                // S3 object key
  s3Bucket: string;             // S3 bucket name
  checksum?: string;            // SHA-256 checksum
  tags: string[];               // Document tags
  metadata: Record<string, any>; // Key-value metadata
  uploadedBy: string;           // User ID who uploaded
  currentVersion: number;       // Current version number
  isDeleted: boolean;           // Soft delete flag
  createdAt: Date;              // Upload timestamp
  updatedAt: Date;              // Last update timestamp
}
```

### DocumentPermission
```typescript
interface DocumentPermission {
  id: string;                        // UUID
  documentId: string;                // Document UUID
  userId: string;                    // User UUID
  permission: 'read' | 'write' | 'delete'; // Permission type
  grantedBy: string;                 // User who granted permission
  createdAt: Date;                   // Grant timestamp
  updatedAt: Date;                   // Last update timestamp
}
```

### AuditLog
```typescript
interface AuditLog {
  id: string;                    // UUID
  documentId?: string;           // Optional document UUID
  userId: string;                // User who performed action
  action: AuditAction;           // Action performed
  details: Record<string, any>;  // Action details
  ipAddress?: string;            // Client IP address
  userAgent?: string;            // Client user agent
  createdAt: Date;               // Action timestamp
}
```

## Error Handling

The API uses consistent error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "data": {
    "validationErrors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      }
    ]
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `INVALID_CREDENTIALS` - Login failed
- `TOKEN_EXPIRED` - JWT token expired
- `INSUFFICIENT_PERMISSIONS` - Access denied
- `USER_NOT_FOUND` - User doesn't exist
- `DOCUMENT_NOT_FOUND` - Document doesn't exist
- `EMAIL_EXISTS` - Email already registered
- `FILE_TOO_LARGE` - File exceeds size limit

## Security

### Authentication Security

- **JWT Tokens**: Stateless authentication with configurable expiry
- **Password Hashing**: bcrypt with 12 salt rounds
- **Password Policy**: Minimum 8 chars, uppercase, lowercase, number, special char
- **Account Lockout**: Protection against brute force attacks

### Authorization Security

- **RBAC**: Role-based access control
- **Resource-level Permissions**: Granular document permissions
- **Principle of Least Privilege**: Users get minimum required access

### Data Security

- **Input Validation**: Comprehensive validation with Zod
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: Input sanitization and CSP headers
- **CSRF Protection**: SameSite cookies and CSRF tokens

### Storage Security

- **Pre-signed URLs**: Time-limited, secure file access
- **File Type Validation**: Allowed MIME types enforcement
- **Virus Scanning**: Integration ready for AV scanning
- **Encryption**: At-rest and in-transit encryption

### Infrastructure Security

- **HTTPS Only**: TLS 1.2+ required in production
- **Security Headers**: Helmet.js security headers
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Complete audit trail

## Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/document_management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_S3_ENDPOINT=http://localhost:9000  # For MinIO

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Pagination Configuration
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

### Database Setup

1. **Install PostgreSQL**
2. **Create database**:
   ```sql
   CREATE DATABASE document_management;
   ```
3. **Run migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

### S3 Storage Setup

#### AWS S3
1. Create S3 bucket
2. Configure IAM user with S3 permissions
3. Set environment variables

#### MinIO (Local Development)
```bash
# Start MinIO server
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use connection pooling
3. **Storage**: Configure CDN for file delivery
4. **Security**: Enable HTTPS, set secure headers
5. **Monitoring**: Add logging and metrics
6. **Scaling**: Use load balancer and multiple instances

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio
npm run test         # Run tests
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- user.service.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Database Management

```bash
# Generate migration after schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Open database studio
npm run db:studio
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Write JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused

### Architecture Guidelines

- Follow Clean Architecture principles
- Use dependency injection
- Keep controllers thin
- Put business logic in services
- Use repository pattern for data access
- Write comprehensive tests

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the code examples

---

**Built with ❤️ using TypeScript, Express.js, and Clean Architecture principles.**
