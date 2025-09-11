# 🧪 Testing Guide - Document Management System

## ✅ **System Status: WORKING**

Your Headless Document Management System is **fully operational**! Here's how to test and use it:

## 🌐 **Access Points**

- **API Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api
- **Database Admin**: http://localhost:8081 (if Adminer is running)

## 🧪 **API Testing**

### **1. Health Check**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "timestamp": "2025-09-11T19:01:34.221Z",
    "uptime": 12.57,
    "environment": "development",
    "version": "1.0.0"
  }
}
```

### **2. User Registration**
```powershell
$registerData = @{
    email = "user@example.com"
    password = "SecurePass123!"
    firstName = "John"
    lastName = "Doe"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -ContentType "application/json" -Body $registerData
$response
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### **3. User Login**
```powershell
$loginData = @{
    email = "user@example.com"
    password = "SecurePass123!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginData
$token = $loginResponse.data.token
$loginResponse
```

### **4. Get User Profile (Protected Route)**
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Method Get -Headers $headers
```

### **5. Update User Profile**
```powershell
$updateData = @{
    firstName = "Jane"
    lastName = "Smith"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/profile" -Method Put -ContentType "application/json" -Headers $headers -Body $updateData
```

### **6. Change Password**
```powershell
$passwordData = @{
    currentPassword = "SecurePass123!"
    newPassword = "NewSecurePass123!"
    confirmPassword = "NewSecurePass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/password" -Method Put -ContentType "application/json" -Headers $headers -Body $passwordData
```

## 🗄️ **Database Verification**

### **Check Users Table**
```powershell
docker-compose exec postgres psql -U dms_user -d document_management -c "SELECT id, email, first_name, last_name, role FROM users;"
```

### **Check All Tables**
```powershell
docker-compose exec postgres psql -U dms_user -d document_management -c "\dt"
```

## 📁 **File Storage Testing**

### **Check Storage Directory**
```powershell
# Check if storage directory is created
Get-ChildItem -Path "storage" -Recurse -ErrorAction SilentlyContinue

# Create test file
New-Item -ItemType Directory -Path "storage\test" -Force -ErrorAction SilentlyContinue
"Test file content" | Out-File -FilePath "storage\test\sample.txt"

# Verify file was created
Get-Content "storage\test\sample.txt"
```

## 🔧 **Development Tools**

### **Start/Stop Services**
```powershell
# Start PostgreSQL
docker-compose up -d postgres

# Start database admin (optional)
docker-compose --profile admin up -d adminer

# Stop services
docker-compose down

# View service status
docker-compose ps
```

### **Development Server**
```powershell
# Start development server (with hot reload)
npm run dev

# Build and start production server
npm run build
npm start

# Stop server: Ctrl+C
```

### **Database Management**
```powershell
# Generate new migrations (after schema changes)
npm run db:generate

# Apply migrations
npm run db:migrate

# Open database studio
npm run db:studio
```

## 🎯 **What's Working**

### ✅ **Authentication System**
- User registration with password validation
- JWT token generation and validation
- Protected routes with middleware
- Role-based access control (Admin/User)
- Profile management and password changes

### ✅ **Database Layer**
- PostgreSQL with Drizzle ORM
- 5 tables: users, documents, document_versions, document_permissions, audit_logs
- Clean repository pattern with interfaces
- Database migrations and schema management

### ✅ **Storage System**
- Local file storage with metadata
- Scalable interface design for future cloud storage
- File serving endpoints ready
- Storage factory pattern for easy provider switching

### ✅ **Security Features**
- JWT authentication with 24-hour expiry
- bcrypt password hashing (12 salt rounds)
- Input validation with Zod schemas
- Security headers with Helmet.js
- CORS protection

### ✅ **API Features**
- RESTful endpoint design
- Consistent error handling
- Health check monitoring
- Request/response logging
- API documentation endpoint

## 🚧 **Next Features to Implement**

1. **Document Upload API** - File upload with metadata
2. **Document Management** - CRUD operations for documents
3. **Search & Filtering** - Advanced document search
4. **Permissions System** - Granular access control
5. **File Versioning** - Immutable file versions
6. **Admin Dashboard** - User and system management

## 🎊 **Success Indicators**

If you see these responses, everything is working:

- ✅ Health check returns service status
- ✅ Registration creates new users
- ✅ Login returns JWT tokens
- ✅ Protected routes require authentication
- ✅ Database stores user data correctly
- ✅ Storage directory is created automatically

## 🛠️ **Troubleshooting**

### **Server Not Starting**
```powershell
# Check if port 3000 is available
netstat -ano | findstr :3000

# Change port in .env
PORT=3001
```

### **Database Connection Issues**
```powershell
# Check PostgreSQL status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U dms_user -d document_management -c "SELECT 1;"
```

### **Authentication Issues**
- Check JWT_SECRET is set in .env
- Verify password meets requirements (8+ chars, uppercase, lowercase, number, special char)
- Check server logs for detailed error messages

---

**Your Document Management System is ready for development! 🚀**

The foundation is solid - authentication works, database is connected, and the architecture is scalable for future enhancements.
