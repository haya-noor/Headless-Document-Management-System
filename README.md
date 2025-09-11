# Headless Document Management System

A comprehensive backend training project that teaches clean architecture, domain-driven design, and modern TypeScript development through building a document management system.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Configure your environment variables in .env

# Generate and run database migrations
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

Server will be available at `http://localhost:3000`

## 📋 Features

### ✅ Implemented Core Features

- **🔐 JWT Authentication**: Secure user authentication with role-based access control
- **👥 User Management**: Registration, login, profile management, password change
- **🗂️ Database Schema**: Complete schema with users, documents, permissions, versions, and audit logs
- **🏗️ Clean Architecture**: Repository pattern, service layer, and dependency injection
- **✅ Input Validation**: Comprehensive Zod schema validation
- **🛡️ Security Middleware**: Authentication, authorization, CORS, helmet security headers
- **📝 Audit Logging**: Complete audit trail for compliance and security
- **🔧 Configuration Management**: Environment-based configuration with validation
- **📊 Health Checks**: System health monitoring endpoints
- **🚦 Error Handling**: Centralized error handling with consistent API responses
- **📚 API Documentation**: Comprehensive documentation with examples

### 🚧 To Be Implemented

- **📁 Document Upload & Storage**: S3-compatible file upload with metadata
- **🔍 Advanced Search**: Filter by tags, metadata, filename, content-type
- **📄 Document Versioning**: Immutable file versions with audit trail
- **🔒 Document Permissions**: Granular read/write/delete permissions
- **🔗 Pre-signed URLs**: Secure, time-limited download links
- **📊 Pagination**: Efficient data retrieval with sorting

## 🏗️ Architecture

### Clean Architecture Structure

```
src/
├── config/           # Configuration and database setup
├── controllers/      # Thin controllers (validate input, call services)
├── services/         # Business logic layer
├── repositories/     # Data access layer
│   ├── interfaces/   # Repository contracts
│   └── implementations/ # Concrete implementations
├── middleware/       # Express middleware
├── models/          # Database schema definitions
├── schemas/         # Zod validation schemas
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Key Design Patterns

- **Repository Pattern**: Clean data access abstraction
- **Service Layer**: Business logic separation
- **Dependency Injection**: Loose coupling between components
- **Factory Pattern**: Instance creation management
- **Singleton Pattern**: Database connection management

## 🛠️ Technology Stack

- **Runtime**: Node.js / Bun.js
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: S3-compatible (AWS S3, MinIO, GCS)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod schemas
- **Security**: Helmet.js, CORS, rate limiting
- **Development**: tsx for hot reloading

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/password` - Change password
- `POST /api/v1/auth/logout` - User logout

### Documents (Planned)
- `GET /api/v1/documents` - List documents with pagination
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents/:id` - Get document details
- `PUT /api/v1/documents/:id` - Update document metadata
- `DELETE /api/v1/documents/:id` - Delete document
- `GET /api/v1/documents/:id/download` - Download document

### System
- `GET /health` - Health check endpoint
- `GET /api` - API documentation endpoint

## 🔧 Environment Configuration

Copy `env.example` to `.env` and configure:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/document_management

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_S3_ENDPOINT=http://localhost:9000  # For MinIO

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Pagination
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

## 🗄️ Database Setup

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

## 🔐 Security Features

- **JWT Authentication**: Stateless authentication with configurable expiry
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Input Validation**: Comprehensive Zod schema validation
- **RBAC**: Role-based access control (Admin, User)
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable cross-origin requests
- **Request Timeout**: Protection against hanging requests
- **Audit Logging**: Complete audit trail for security events

## 📊 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Apply database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run test         # Run tests (when implemented)
npm run lint         # Lint TypeScript code
npm run lint:fix     # Fix linting issues automatically
```

## 🧪 Testing the API

### Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Get user profile (with token)
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Health check
```bash
curl http://localhost:3000/health
```

## 📖 Learning Objectives

This project teaches:

### TypeScript & Node.js
- Advanced TypeScript features (generics, utility types, decorators)
- Node.js concurrency and event loop understanding
- File and stream handling
- Error handling and debugging

### Clean Architecture
- Separation of concerns
- Dependency inversion principle
- Repository and service patterns
- Domain-driven design principles

### Database & ORM
- PostgreSQL database design
- Drizzle ORM usage and migrations
- Database relationships and constraints
- Query optimization

### Security
- JWT authentication implementation
- Password hashing and validation
- Input validation and sanitization
- Security headers and CORS

### API Design
- RESTful API principles
- Request/response patterns
- Error handling standards
- API documentation

### DevOps & Deployment
- Environment configuration
- Database migrations
- Production deployment considerations
- Monitoring and logging

## 🚀 Next Steps

1. **Implement Document Upload**: Add file upload functionality with S3 storage
2. **Add Document Search**: Implement advanced filtering and search
3. **Document Permissions**: Add granular permission system
4. **File Versioning**: Implement immutable file versions
5. **Pre-signed URLs**: Add secure download links
6. **Admin Dashboard**: Create admin management endpoints
7. **Testing Suite**: Add comprehensive test coverage
8. **API Rate Limiting**: Implement request rate limiting
9. **Caching Layer**: Add Redis caching for performance
10. **Monitoring**: Add metrics and monitoring

## 📝 Prerequisites Knowledge

- **TypeScript**: Custom types, interfaces, generics, utility types
- **Node.js**: Event loop, concurrency, file/stream handling
- **Functional Programming**: Composition, currying, higher-order functions
- **12 Factor App**: Configuration, dependencies, processes
- **Database Design**: Normalization, relationships, indexing
- **HTTP/REST**: Status codes, headers, methods, authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Architecture Guide](./docs/architecture.md) - System architecture details
- [Deployment Guide](./docs/deployment.md) - Production deployment guide

## 📞 Support

- 📧 Create an issue for bugs or feature requests
- 💬 Join discussions for questions and help
- 📖 Check the documentation for detailed guides

---

**Built with ❤️ for learning Clean Architecture and Modern TypeScript Development**