# 🏗️ Architecture & Design Guide

## 🎯 **Project Vision & Principles**

This Headless Document Management System demonstrates **enterprise-grade backend architecture** using:
- **Clean Architecture** with perfect layer separation
- **Domain-Driven Design** (DDD) principles  
- **Modern TypeScript** with advanced type safety
- **Independent, testable, and scalable** design patterns

### **Core Principles**

**Architecture Independence:**
- **Framework Independent**: Express.js is a tool, not the architecture
- **Database Independent**: Swap PostgreSQL for MongoDB without changing business logic
- **UI Independent**: Headless API supports any frontend (Web, Mobile, Desktop)
- **External Service Independent**: Business rules don't depend on 3rd party APIs

**Quality Attributes:**
- **Testable**: Business logic tested without UI, Database, or Web Server
- **Scalable**: Stateless, distributed-system friendly from day one
- **Resilient**: Graceful failure handling and recovery
- **Maintainable**: Clear separation of concerns and readable code

## 🏗️ **Clean Architecture Implementation**

### **Layer Structure**

```
┌─────────────────────────────────────────────────────────────┐
│                    CLEAN ARCHITECTURE                       │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Controllers   │  │   Middleware    │  │   External   │ │
│  │   (Interface)   │  │   (Interface)   │  │  (Framework) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                    │      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    Services     │  │   Repositories  │  │   Database   │ │
│  │ (Business Logic)│  │  (Data Access)  │  │   (External) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                    │      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │    Entities     │  │   Interfaces    │  │   Storage    │ │
│  │   (Core Logic)  │  │  (Contracts)    │  │  (External)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Directory Structure & Responsibilities**

#### **1. Controllers Layer (Interface Adapters)**
```
src/controllers/           # HTTP request/response handling
├── auth.controller.ts     # Authentication endpoints
└── file.controller.ts     # File management endpoints

Responsibilities:
✅ Handle HTTP requests/responses
✅ Input validation via middleware
✅ Route to appropriate services
✅ Return standardized API responses
❌ NO business logic
❌ NO direct database access
```

#### **2. Services Layer (Business Logic)**
```
src/services/              # Core business logic
├── user.service.ts        # User management use cases
├── local-storage.service.ts # File operations
└── storage.factory.ts     # Storage provider abstraction

Responsibilities:
✅ Implement use cases and business rules
✅ Orchestrate repository calls
✅ Handle business validation
✅ Manage transactions
❌ NO HTTP concerns
❌ NO direct database queries
```

#### **3. Repository Layer (Data Access)**
```
src/repositories/
├── interfaces/            # Repository contracts
│   ├── user.repository.ts
│   ├── document.repository.ts
│   └── audit-log.repository.ts
└── implementations/       # Concrete implementations
    └── user.repository.ts

Responsibilities:
✅ Data access and persistence
✅ Query building and execution
✅ Data mapping and transformation
✅ Cache management
❌ NO business logic
❌ NO HTTP concerns
```

#### **4. Domain Layer (Entities & Types)**
```
src/types/                 # Domain entities and types
├── index.ts              # Core domain types
src/models/               # Database schemas
└── schema.ts             # Drizzle ORM schemas

Responsibilities:
✅ Define domain entities
✅ Business rules and invariants
✅ Type definitions
✅ Domain interfaces
❌ NO external dependencies
```

#### **5. Infrastructure Layer**
```
src/config/               # Configuration management
src/middleware/           # Cross-cutting concerns
├── auth.ts              # Authentication middleware
├── validation.ts        # Input validation
├── logging.ts           # Structured logging
└── error.ts             # Error handling

src/utils/                # Shared utilities
├── jwt.ts               # JWT operations
├── password.ts          # Password hashing
└── uuid.ts              # ID generation
```

## 🎯 **Architecture Patterns Applied**

### **1. Repository Pattern**
**Purpose**: Abstracts data access logic and provides a uniform interface

```typescript
// Interface (Domain Layer)
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(userData: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User | null>;
}

// Implementation (Infrastructure Layer)
class UserRepository implements IUserRepository {
  // Drizzle ORM implementation
}

// Usage (Service Layer)
class UserService {
  constructor(private userRepo: IUserRepository) {}
  // Business logic using repository abstraction
}
```

### **2. Dependency Injection**
**Purpose**: Loose coupling and testability

```typescript
// Services depend on interfaces, not implementations
class UserService {
  constructor(
    private userRepository: IUserRepository // Interface, not concrete class
  ) {}
}

// Easy testing with mocks
const mockRepo = createMock<IUserRepository>();
const userService = new UserService(mockRepo);
```

### **3. Factory Pattern**
**Purpose**: Abstract object creation and provider selection

```typescript
class StorageServiceFactory {
  static createStorageService(provider: string): IStorageService {
    switch (provider) {
      case 'local': return new LocalStorageService();
      case 's3': return new S3StorageService();
      case 'gcs': return new GCSStorageService();
    }
  }
}
```

### **4. Middleware Pattern**
**Purpose**: Cross-cutting concerns and request processing pipeline

```typescript
// Authentication middleware
app.use('/api/v1/admin', authenticate, adminOnly);

// Validation middleware
app.post('/register', validateRequest({ body: registerSchema }));

// Error handling middleware
app.use(globalErrorHandler);
```

## 🔐 **Security Architecture**

### **Authentication & Authorization**
```typescript
// JWT-based authentication
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Role-based access control (RBAC)
enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

// Middleware enforcement
const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user.role !== UserRole.ADMIN) {
    throw new AppError('Insufficient permissions', 403);
  }
  next();
};
```

### **Input Validation**
```typescript
// Zod schema validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Middleware integration
app.post('/register', validateRequest({ body: registerSchema }));
```

## 📁 **Storage Architecture**

### **Provider Abstraction**
```typescript
interface IStorageService {
  uploadFile(file: FileUpload, key: string): Promise<{key: string; checksum: string}>;
  generateDownloadUrl(key: string): Promise<PreSignedUrlResponse>;
  deleteFile(key: string): Promise<boolean>;
}

// Multiple implementations
class LocalStorageService implements IStorageService { /* ... */ }
class S3StorageService implements IStorageService { /* ... */ }
class GCSStorageService implements IStorageService { /* ... */ }
```

### **File Organization**
```
storage/
└── documents/
    └── users/
        └── {userId}/
            └── documents/
                └── {documentId}/
                    ├── {timestamp}_{filename}
                    ├── versions/
                    │   ├── {filename}_v1
                    │   └── {filename}_v2
                    └── metadata.json
```

## 🗄️ **Database Architecture**

### **Schema Design**
```sql
-- Core entities with proper relationships
Users (id, email, password_hash, role, created_at)
Documents (id, user_id, filename, file_path, checksum)
DocumentVersions (id, document_id, version, file_path)
DocumentPermissions (id, document_id, user_id, permission_type)
AuditLogs (id, user_id, action, resource_type, resource_id)
```

### **Data Access Pattern**
```typescript
// Type-safe queries with Drizzle ORM
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);

// Transaction support
await db.transaction(async (tx) => {
  const user = await tx.insert(usersTable).values(userData);
  await tx.insert(auditLogsTable).values(auditData);
});
```

## 🧪 **Testing Architecture**

### **Testing Pyramid**
```
                ┌─────────────┐
                │ Integration │  ← API endpoints, database
                │    Tests    │
                ├─────────────┤
                │   Service   │  ← Business logic, use cases
                │    Tests    │
                ├─────────────┤
                │    Unit     │  ← Pure functions, utilities
                │   Tests     │
                └─────────────┘
```

### **Test Organization**
```
tests/
├── unit-functions.test.ts     # Pure unit tests
├── utils.test.ts             # Utility function tests
├── auth.test.ts              # Authentication tests
├── storage.test.ts           # Storage service tests
├── api.test.ts               # API endpoint tests
└── integration-full.test.ts  # End-to-end tests
```

## 📊 **Error Handling Architecture**

### **Centralized Error Handling**
```typescript
// Custom error types
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string
  ) { super(message); }
}

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  // Standardized error responses
  const response: ApiResponse = {
    success: false,
    message: error.message,
    error: error.errorCode || 'INTERNAL_ERROR'
  };
  res.status(statusCode).json(response);
});
```

### **Standardized API Responses**
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Consistent across all endpoints
res.json({
  success: true,
  message: 'User registered successfully',
  data: { user, token }
});
```

## 🚀 **Deployment Architecture**

### **Container Strategy**
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

### **Environment Configuration**
```typescript
// Environment-based configuration
const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
  }
};
```

## 🔄 **Future Scalability**

### **Horizontal Scaling**
- **Stateless Design**: No server-side sessions
- **Database Connection Pooling**: Efficient resource usage
- **File Storage Abstraction**: Easy migration to CDN/S3
- **API Rate Limiting**: Prevent abuse

### **Microservices Migration Path**
```
Current Monolith → Domain Services:
├── User Service (Authentication & User Management)
├── Document Service (File Management & Metadata)
├── Permission Service (Access Control)
└── Audit Service (Compliance & Logging)
```

### **Performance Optimization**
- **Database Indexing**: Query optimization
- **Caching Strategy**: Redis integration ready
- **File Streaming**: Large file handling
- **Compression**: Response payload optimization

---

This architecture provides a **solid foundation** for enterprise-grade document management while maintaining **flexibility** for future requirements and **scalability** for growth.
