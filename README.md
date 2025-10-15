# Headless Document Management System

A backend document management system built with Bun, Elysia, and TypeScript. Features clean architecture, JWT authentication, file storage, document versioning, and granular permissions.

## Features

### Authentication & User Management
- User registration and login with JWT tokens
- Password strength validation
- User profile management
- Account deactivation

### File Management
- Local file storage with organized directory structure
- File upload with metadata support
- File listing with filtering and pagination
- Direct file serving and download
- File metadata retrieval
- File deletion

### Document Management
- Document upload with tags and metadata
- Document search with advanced filters
- Document versioning system
- Document permissions management
- Document metadata and tags management
- Document download with secure links

### Security & Permissions
- JWT-based authentication
- Role-based access control
- Granular document permissions (read, write, delete)
- Audit logging for compliance
- Input validation with Zod schemas

### Architecture
- Clean Architecture with separation of concerns
- Repository pattern for data access
- Workflow layer for business orchestration
- Controller layer for HTTP handling
- Infrastructure layer for external concerns
- Middleware for cross-cutting concerns

## Quick Start

### Prerequisites
- Bun 1.0+
- PostgreSQL database
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Headless-Document-Management-System

# Install dependencies
bun install

# Setup environment
cp env.example .env
# Edit .env with your database credentials and JWT secret
```

### Database Setup

```bash
# Generate and run migrations
bun run db:generate
bun run db:migrate
```

### Start Development Server

```bash
# Development mode with hot reload
bun run dev

# Production build
bun run build
bun run start
```

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register        # User registration
POST   /api/v1/auth/login           # User login
POST   /api/v1/auth/logout          # User logout
GET    /api/v1/auth/profile         # Get user profile
PUT    /api/v1/auth/profile         # Update user profile
POST   /api/v1/auth/change-password # Change password
DELETE /api/v1/auth/account         # Delete account
```

### File Management
```
GET    /api/v1/files/:key           # Serve file directly
POST   /api/v1/files/upload         # Upload file
POST   /api/v1/files/download       # Generate download link
DELETE /api/v1/files/:key           # Delete file
GET    /api/v1/files/:key/metadata  # Get file metadata
GET    /api/v1/files                # List files (with prefix/limit)
GET    /api/v1/files/download/:key  # Download file directly
GET    /api/v1/files/info/:key      # Get file info
```

### Document Management
```
POST   /api/v1/documents            # Upload document
GET    /api/v1/documents/:id        # Get document details
GET    /api/v1/documents            # Search documents
PUT    /api/v1/documents/:id        # Update document
DELETE /api/v1/documents/:id        # Delete document
POST   /api/v1/documents/:id/download # Generate download link
PUT    /api/v1/documents/:id/permissions # Update permissions
PUT    /api/v1/documents/:id/metadata   # Update metadata
PUT    /api/v1/documents/:id/tags       # Update tags
```

### System
```
GET    /health                      # Health check
GET    /api                         # API documentation
```

## Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun test tests/auth.test.ts         # Authentication tests
bun test tests/documents.test.ts    # Document tests
bun test tests/storage.test.ts      # Storage tests
bun test tests/repositories.test.ts # Repository tests
bun test tests/api.test.ts          # API tests

# Test with coverage
bun test --coverage
```

## Project Structure

```
src/
├── application/         # Application layer
│   ├── workflow/       # Business workflow orchestration
│   │   ├── user.service.ts
│   │   ├── document.service.ts
│   │   ├── access-policy.service.ts
│   │   ├── password.service.ts
│   │   ├── database.service.ts
│   │   └── index.ts
│   ├── interfaces/     # Application interfaces
│   │   ├── auth.interface.ts
│   │   ├── document.interface.ts
│   │   ├── storage.interface.ts
│   │   ├── file.interface.ts
│   │   └── index.ts
│   ├── types/          # TypeScript type definitions
│   └── index.ts
├── domain/             # Domain layer (business logic)
│   ├── entities/       # Domain entities
│   ├── value-objects/  # Value objects
│   ├── services/       # Domain services
│   ├── guards/         # Domain guards
│   ├── errors/         # Domain errors
│   └── index.ts
├── infrastructure/     # Infrastructure layer
│   ├── storage/        # Storage implementations
│   │   ├── local-storage.ts
│   │   └── storage.factory.ts
│   ├── database/       # Database models and schemas
│   ├── repositories/   # Repository implementations
│   └── index.ts
├── presentation/       # Presentation layer
│   ├── http/          # HTTP controllers and routes
│   │   ├── routes/
│   │   └── middleware/
│   ├── dtos/          # Data Transfer Objects
│   └── index.ts
├── config/            # Configuration management
├── utils/             # Shared utilities
└── index.ts           # Application entry point

# Data directories
local-storage/         # Local file storage (ignored by git)
├── documents/         # Uploaded documents
└── ...

# Configuration files
.env                   # Environment variables
.gitignore            # Git ignore rules
docker-compose.yml    # Docker configuration
```

## Configuration

### Environment Variables
```env
# Server
PORT=3002
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/docdb

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Storage
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./local-storage

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

## Database Schema

The system uses **Drizzle ORM** with PostgreSQL and includes the following tables:

- **users** - User accounts and profiles
- **documents** - Document metadata and information
- **document_versions** - Version history for documents
- **document_permissions** - User permissions for documents
- **audit_logs** - System audit trail

## Architecture Overview

This project follows **Clean Architecture** principles with clear separation of concerns:

### Layers

1. **Domain Layer** (`src/domain/`)
   - Pure business logic and rules
   - No external dependencies
   - Contains entities, value objects, and domain services

2. **Application Layer** (`src/application/`)
   - Workflow orchestration and use cases
   - Application interfaces and types
   - Coordinates between domain and infrastructure

3. **Infrastructure Layer** (`src/infrastructure/`)
   - External concerns (database, storage, etc.)
   - Repository implementations
   - Storage service implementations

4. **Presentation Layer** (`src/presentation/`)
   - HTTP controllers and routes
   - Request/response handling
   - Middleware and DTOs

### Key Patterns

- **Repository Pattern**: Abstracts data access
- **Service Layer**: Business logic orchestration
- **Factory Pattern**: Service creation and configuration
- **Dependency Injection**: Loose coupling between layers

## Deployment

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d
```

### Manual Deployment
```bash
# Build the application
bun run build

# Start the production server
bun run start
```

## Development

### Code Organization

- **Workflow Services**: Business process orchestration
- **Domain Services**: Pure business logic
- **Repository Implementations**: Data access
- **Infrastructure Services**: External system integration

### File Storage

- **Local Storage**: Files stored in `local-storage/` directory
- **Storage Abstraction**: Easy to switch to cloud storage (S3, GCS, Azure)
- **File Organization**: Organized by user and document structure

## License

This project is for educational purposes and demonstrates modern backend development practices.

---

Built with Bun, Elysia, TypeScript, and PostgreSQL