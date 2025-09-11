# 🐳 Docker Setup Guide

Get your Document Management System up and running with Docker in minutes!

## 🚀 Quick Start (Recommended)

### Prerequisites
- Docker Desktop running
- Git (to clone the repository)

### 1. Start the Complete Stack

```bash
# Start PostgreSQL, MinIO, and the application
docker-compose up -d

# Wait for services to be ready (about 30-60 seconds)
docker-compose logs -f app
```

### 2. Run Database Migrations

```bash
# Run migrations to create database tables
docker-compose --profile migration up migrate
```

### 3. Setup MinIO Storage

```bash
# For Windows PowerShell
.\scripts\setup-minio.ps1

# For Linux/macOS/WSL
chmod +x scripts/setup-minio.sh
./scripts/setup-minio.sh
```

### 4. Test the Application

```bash
# Health check
curl http://localhost:3000/health

# Register a test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## 🔧 Development Mode

For active development with hot reload:

```bash
# Start in development mode with hot reload
docker-compose --profile development up -d

# View logs
docker-compose logs -f dev
```

## 📊 Access Services

Once running, you can access:

- **API Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **Database Admin**: http://localhost:8080 (when using dev mode)

## 🗄️ Database Access

### Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: document_management
- **Username**: dms_user
- **Password**: dms_password

### Using Database Admin (Adminer)
1. Start development mode: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
2. Open http://localhost:8080
3. Login with PostgreSQL credentials above

### Direct Database Access
```bash
# Connect to PostgreSQL container
docker exec -it dms-postgres psql -U dms_user -d document_management

# List tables
\dt

# Exit
\q
```

## 📦 Storage (MinIO)

### MinIO Console Access
1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin123`
3. Browse the `documents` bucket

### MinIO Client Commands
```bash
# List buckets
docker exec -it dms-minio mc ls local

# Upload test file
echo "Test content" > test.txt
docker exec -i dms-minio mc cp - local/documents/test.txt < test.txt

# List files in bucket
docker exec -it dms-minio mc ls local/documents
```

## 🛠️ Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Rebuild application
docker-compose build app
docker-compose up -d app
```

### Database Operations
```bash
# Run migrations
docker-compose --profile migration up migrate

# Reset database (CAUTION: Deletes all data)
docker-compose down -v
docker-compose up -d postgres
docker-compose --profile migration up migrate
```

### Development Commands
```bash
# Development mode with hot reload
docker-compose --profile development up -d

# Install new npm packages
docker-compose exec dev npm install [package-name]

# Run linting
docker-compose exec dev npm run lint

# Run tests (when implemented)
docker-compose exec dev npm test
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID [PID] /F

# Or change the port in docker-compose.yml
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### 3. MinIO Not Accessible
```bash
# Check MinIO status
docker-compose ps minio

# Restart MinIO
docker-compose restart minio

# Re-run setup script
.\scripts\setup-minio.ps1
```

#### 4. Application Won't Start
```bash
# Check application logs
docker-compose logs app

# Rebuild application
docker-compose build app --no-cache
docker-compose up -d app
```

### Health Checks
```bash
# Check all service status
docker-compose ps

# Test database connection
docker exec dms-postgres pg_isready -U dms_user

# Test MinIO connection
curl http://localhost:9000/minio/health/live

# Test application
curl http://localhost:3000/health
```

## 📝 Environment Variables

The Docker setup includes all necessary environment variables. To customize:

1. **Edit docker-compose.yml** - Modify environment variables directly
2. **Use .env file** - Create `.env` file in project root (will override compose file)
3. **Environment-specific compose** - Use docker-compose.override.yml

### Example .env file:
```env
# Override default values
JWT_SECRET=your-custom-jwt-secret
MAX_FILE_SIZE=52428800
AWS_S3_BUCKET=my-custom-bucket
```

## 🚀 Production Deployment

For production deployment:

1. **Use production docker-compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Set production environment variables**
3. **Use external database and storage**
4. **Enable HTTPS**
5. **Set up monitoring and logging**

## 🧹 Cleanup

### Remove Everything
```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove images
docker rmi $(docker images -q "headless-document-management-system*")
```

### Keep Data, Remove Containers
```bash
# Stop and remove containers but keep volumes
docker-compose down
```

## 📋 Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   PostgreSQL    │    │     MinIO       │
│   (Node.js)     │◄──►│   Database      │    │   (S3 Storage)  │
│   Port: 3000    │    │   Port: 5432    │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Docker        │
                    │   Network       │
                    │   (dms-network) │
                    └─────────────────┘
```

## 🎯 Next Steps

1. **Test API Endpoints** - Use Postman or curl to test authentication
2. **Implement Document Features** - Add document upload/download functionality
3. **Add Tests** - Create unit and integration tests
4. **Monitor Performance** - Add logging and monitoring
5. **Deploy to Production** - Set up CI/CD pipeline

---

**Your Docker environment is ready! 🎉**

Start with: `docker-compose up -d` and then run the migration and MinIO setup scripts.
