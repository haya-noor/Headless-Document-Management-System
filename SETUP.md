# 🚀 Setup Guide - Local Development

## Prerequisites

- **Node.js 18+** installed
- **PostgreSQL** database (local or Docker)
- **Git** for version control

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://dms_user:dms_password@localhost:5432/document_management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h

# Storage Configuration
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# Pagination Configuration
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

### 3. Database Setup

#### Option A: Docker PostgreSQL (Recommended)

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Optional: Start database admin tool
docker-compose --profile admin up -d adminer
# Access at http://localhost:8081 (postgres/dms_user/dms_password)
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database:
   ```sql
   CREATE DATABASE document_management;
   CREATE USER dms_user WITH PASSWORD 'dms_password';
   GRANT ALL PRIVILEGES ON DATABASE document_management TO dms_user;
   ```

### 4. Run Database Migrations

```bash
# Generate migrations (if schema changed)
npm run db:generate

# Apply migrations
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

## 🧪 Testing the Setup

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "timestamp": "2023-01-01T00:00:00.000Z",
    "uptime": 1.234,
    "environment": "development"
  }
}
```

### Register Test User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login Test
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

## 📁 File Storage

Files are stored locally in the `./storage` directory:

```
storage/
└── documents/
    └── users/
        └── {userId}/
            └── documents/
                └── {documentId}/
                    ├── {timestamp}_{filename}.ext
                    └── {timestamp}_{filename}.ext.meta.json
```

## 🗄️ Database Access

### Using Adminer (Web Interface)
1. Start: `docker-compose --profile admin up -d adminer`
2. Open: http://localhost:8081
3. Login:
   - System: PostgreSQL
   - Server: postgres
   - Username: dms_user
   - Password: dms_password
   - Database: document_management

### Using Command Line
```bash
# Connect to database
docker-compose exec postgres psql -U dms_user -d document_management

# List tables
\dt

# Exit
\q
```

## 🛠️ Development Commands

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run start        # Start production build

# Database
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open database studio

# Code Quality
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Storage Issues
```bash
# Check storage directory
ls -la storage/

# Create storage directory manually
mkdir -p storage/documents
```

### Port Issues
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Change port in .env file
PORT=3001
```

## 🚀 Next Steps

1. **Test Authentication**: Try the register/login endpoints
2. **Implement Document Upload**: Add file upload functionality
3. **Add Document Management**: CRUD operations for documents
4. **Implement Search**: Advanced filtering and search
5. **Add Permissions**: Granular access control
6. **Testing**: Add comprehensive test suite

## 🎯 Architecture Benefits

### Current (Local Storage)
- ✅ Simple setup and development
- ✅ No external dependencies
- ✅ Fast local development
- ✅ Complete control over files

### Future (Cloud Storage)
- 🔄 Easy migration to S3/MinIO/GCS
- 🔄 Scalable for production
- 🔄 CDN integration ready
- 🔄 Distributed storage support

The architecture is designed to make this transition seamless when needed!

---

**Your local development environment is ready! 🎉**