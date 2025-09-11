# 🚀 Quick Setup Guide

## Prerequisites

Before running the application, ensure you have:

- **Node.js 18+** installed
- **PostgreSQL** database running
- **S3-compatible storage** (AWS S3 or MinIO for local development)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your actual values
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/document_management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_S3_ENDPOINT=http://localhost:9000  # For MinIO local development

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain

# Pagination Configuration
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

### 3. Database Setup

#### Option A: Local PostgreSQL

1. Install PostgreSQL
2. Create database:
   ```sql
   CREATE DATABASE document_management;
   ```
3. Update `DATABASE_URL` in `.env`

#### Option B: Docker PostgreSQL

```bash
docker run --name postgres-dms \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=username \
  -e POSTGRES_DB=document_management \
  -p 5432:5432 \
  -d postgres:15
```

### 4. Storage Setup

#### Option A: MinIO (Local Development)

```bash
# Start MinIO server
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

Then:
1. Open http://localhost:9001
2. Login with `minioadmin` / `minioadmin`
3. Create a bucket named `documents`
4. Update `.env` with MinIO credentials

#### Option B: AWS S3

1. Create an S3 bucket
2. Create IAM user with S3 permissions
3. Update `.env` with AWS credentials

### 5. Database Migrations

```bash
# Generate migration files
npm run db:generate

# Apply migrations to database
npm run db:migrate
```

### 6. Start the Application

```bash
# Development server with hot reload
npm run dev

# Or build and start production server
npm run build
npm start
```

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
    "environment": "development",
    "version": "1.0.0"
  }
}
```

### API Documentation

Visit: http://localhost:3000/api

### Register a Test User

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

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Ensure database exists

2. **Environment Variable Errors**
   - Ensure .env file exists
   - Check all required variables are set
   - No spaces around = in .env file

3. **Port Already in Use**
   - Change PORT in .env file
   - Kill process using port 3000: `lsof -ti:3000 | xargs kill -9`

4. **S3 Connection Issues**
   - Verify AWS credentials
   - Check bucket exists and permissions
   - For MinIO, ensure it's running and accessible

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Apply database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
```

## 📚 Next Steps

Once the setup is complete:

1. **Explore the API** - Check out the endpoints at http://localhost:3000/api
2. **Read the Documentation** - See `API_DOCUMENTATION.md` for detailed API reference
3. **Implement Features** - Start adding document upload and management features
4. **Test the System** - Try the authentication endpoints with Postman or curl

## 🆘 Need Help?

- Check the main `README.md` for architecture details
- Review `API_DOCUMENTATION.md` for endpoint specifications
- Look at the code examples in the controllers and services
- Create an issue if you encounter problems

---

**The system is now ready for development! 🎉**
