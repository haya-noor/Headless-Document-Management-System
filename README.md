# 🚀 Headless Document Management System

A comprehensive backend training project demonstrating **Clean Architecture**, **Domain-Driven Design**, and **modern TypeScript development** through building an enterprise-grade document management system.

## ✨ Features & Capabilities

### ✅ **Implemented Core Features**
- 🔐 **JWT Authentication** with role-based access control (Admin/User)
- 👥 **User Management** - registration, login, profile management
- 🗄️ **Database Schema** - users, documents, permissions, versions, audit logs
- 🏗️ **Clean Architecture** - repository pattern, service layer, dependency injection
- ✅ **Input Validation** - comprehensive Zod schema validation
- 🛡️ **Security Middleware** - authentication, authorization, CORS, security headers
- 📝 **Audit Logging** - complete audit trail for compliance
- 🔧 **Configuration Management** - environment-based configuration
- 📊 **Health Monitoring** - system health and metrics endpoints
- 🚦 **Error Handling** - centralized error handling with standardized responses
- 📁 **Local File Storage** - secure file storage with scalable architecture

### 🚧 **Ready for Implementation**
- 📄 **Document Upload & Management** - complete file upload API with metadata
- 🔍 **Advanced Search** - filter by tags, metadata, filename, content-type
- 📚 **Document Versioning** - immutable file versions with audit trail
- 🔐 **Granular Permissions** - user-based document access control
- ☁️ **Cloud Storage** - S3/MinIO/GCS integration ready

## 🚀 **Quick Start Workflow**

### **1. Prerequisites**
```bash
# Required
- Node.js 18+ 
- PostgreSQL database
- Git

# Optional (for Docker setup)
- Docker & Docker Compose
```

### **2. Installation & Setup**
```bash
# Clone repository
git clone <repository-url>
cd Headless-Document-Management-System

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your database credentials and JWT secret
```

### **3. Database Setup**

**Option A: Docker (Recommended)**
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Generate and run migrations
npm run db:generate
npm run db:migrate
```

**Option B: Local PostgreSQL**
```bash
# Ensure PostgreSQL is running locally
# Update DATABASE_URL in .env

# Generate and run migrations
npm run db:generate
npm run db:migrate
```

### **4. Start Development Server**
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

Server will be available at **http://localhost:3000**

## 🧪 **Testing Workflow**

### **API Health Check**
```bash
curl http://localhost:3000/health
```

### **User Registration & Authentication**
```bash
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login user
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### **Automated Testing**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only

# Test with coverage
npm run test:coverage
```

### **Manual API Testing**
For comprehensive API testing examples, see the included PowerShell scripts:
```powershell
# See examples in tests/manual-test.ts for complete workflows
```

## 📚 **API Endpoints**

### **Authentication**
```
POST   /api/v1/auth/register     # User registration
POST   /api/v1/auth/login        # User login
POST   /api/v1/auth/logout       # User logout
GET    /api/v1/auth/me           # Get current user
PUT    /api/v1/auth/profile      # Update profile
PUT    /api/v1/auth/password     # Change password
```

### **Document Management** (Ready for Implementation)
```
GET    /api/v1/documents         # List user documents
POST   /api/v1/documents         # Upload document
GET    /api/v1/documents/:id     # Get document details
PUT    /api/v1/documents/:id     # Update document
DELETE /api/v1/documents/:id     # Delete document
GET    /api/v1/documents/:id/download  # Download document
```

### **Admin Endpoints**
```
GET    /api/v1/admin/users       # List all users
GET    /api/v1/admin/stats       # System statistics
GET    /api/v1/admin/audit-logs  # Audit trail
```

### **System Endpoints**
```
GET    /health                   # Health check
GET    /api                      # API documentation
```

## 🏗️ **Development Workflow**

### **Project Structure**
```
src/
├── controllers/        # HTTP request handlers
├── services/          # Business logic layer
├── repositories/      # Data access layer
├── middleware/        # Cross-cutting concerns
├── models/           # Database schemas
├── types/            # TypeScript type definitions
├── utils/            # Shared utilities
└── config/           # Configuration management
```

### **Adding New Features**

1. **Define Types** (`src/types/`)
2. **Create Repository Interface** (`src/repositories/interfaces/`)
3. **Implement Repository** (`src/repositories/implementations/`)
4. **Create Service** (`src/services/`)
5. **Add Controller** (`src/controllers/`)
6. **Define Routes** (`src/index.ts`)
7. **Add Tests** (`tests/`)

### **Code Quality**
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build

# Full quality check
npm run test && npm run build
```

## 🔧 **Configuration**

### **Environment Variables**
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/docdb

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Storage
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

### **Database Configuration**
The system uses **Drizzle ORM** with PostgreSQL:
- Automatic migration generation
- Type-safe database queries
- Connection pooling
- Transaction support

## 📊 **Monitoring & Health**

### **Health Endpoints**
- **`/health`** - Basic health check
- **`/api`** - API documentation and status

### **Logging**
- Structured JSON logging
- Request/response logging
- Error tracking
- Audit trail logging

### **Error Handling**
- Centralized error handling
- Standardized API responses
- Proper HTTP status codes
- Detailed error messages in development

## 🚀 **Deployment**

### **Docker Deployment**
```bash
# Build and run with Docker
docker-compose up -d

# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### **Manual Deployment**
```bash
# Build for production
npm run build

# Start production server
npm start

# Or with PM2
pm2 start dist/index.js --name "doc-management"
```

## 📖 **Documentation**

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture and design patterns
- **[API Examples](./tests/manual-test.ts)** - Complete API usage examples
- **[Environment Setup](./env.example)** - Configuration reference

## 🤝 **Contributing**

1. Follow the established architecture patterns
2. Add tests for new features
3. Update documentation
4. Ensure type safety
5. Follow the coding standards

## 📄 **License**

This project is for educational purposes and demonstrates modern backend development practices.

---

🎯 **Goal**: Master clean architecture, domain-driven design, and TypeScript development through hands-on experience building a production-ready document management system.