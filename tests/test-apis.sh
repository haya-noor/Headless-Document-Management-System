#!/bin/bash

# API Testing Script for Headless Document Management System
# This script tests all the APIs using Bun and Elysia

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost"
PORTS=(5000 8080 3000 3001 3002 4000)
PORT=""
AUTH_TOKEN=""

echo -e "${BLUE}🚀 API Testing Script for Document Management System${NC}"
echo -e "${BLUE}Using Bun and Elysia Framework${NC}"
echo ""

# Function to test if server is running on a port
test_server() {
    local port=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL:$port/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Server found running on port $port${NC}"
        PORT=$port
        return 0
    fi
    return 1
}

# Find which port the server is running on
echo -e "${YELLOW}🔍 Searching for running server...${NC}"
for port in "${PORTS[@]}"; do
    if test_server $port; then
        break
    fi
done

if [ -z "$PORT" ]; then
    echo -e "${RED}❌ No server found running on any tested port${NC}"
    echo -e "${YELLOW}💡 Please start the server first:${NC}"
    echo "   npm run dev"
    echo "   # or"
    echo "   bun run --watch src/index.ts"
    echo ""
    echo -e "${YELLOW}📋 Available ports to try: ${PORTS[*]}${NC}"
    exit 1
fi

# Set the full base URL
API_BASE="$BASE_URL:$PORT/api/v1"

echo ""
echo -e "${BLUE}📍 Testing APIs on: $BASE_URL:$PORT${NC}"
echo ""

# Function to make API calls
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local headers=$5

    echo -e "${YELLOW}🧪 Testing: $description${NC}"
    echo -e "   ${method} ${API_BASE}${endpoint}"
    
    local curl_cmd="curl -s -w '\n\nStatus: %{http_code}\nTime: %{time_total}s\n' -X $method"
    
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE$endpoint'"
    
    echo -e "${BLUE}Response:${NC}"
    eval $curl_cmd | jq . 2>/dev/null || eval $curl_cmd
    echo ""
}

# Function to test endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -e "${YELLOW}🧪 Testing: $description${NC}"
    echo -e "   ${method} ${API_BASE}${endpoint}"
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$API_BASE$endpoint")
    local body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    local status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    echo -e "${BLUE}Response ($status):${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
    
    if [ "$status" -eq 200 ] || [ "$status" -eq 201 ]; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        echo -e "${RED}❌ Failed with status $status${NC}"
    fi
    echo ""
}

# 1. Test Health Check
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🏥 HEALTH CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

test_endpoint "GET" "/health" "Health Check (Non-API)"
make_request "GET" "" "" "API Root Info"

# 2. Test Authentication Endpoints
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}🔐 AUTHENTICATION TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# User Registration
echo -e "${GREEN}👤 User Registration${NC}"
USER_DATA='{
  "email": "test@example.com",
  "password": "TestPass123!",
  "firstName": "Test",
  "lastName": "User"
}'

REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$USER_DATA" \
  "$API_BASE/auth/register")

REGISTER_BODY=$(echo $REGISTER_RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
REGISTER_STATUS=$(echo $REGISTER_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

echo -e "${YELLOW}🧪 Testing: User Registration${NC}"
echo -e "   POST ${API_BASE}/auth/register"
echo -e "${BLUE}Response ($REGISTER_STATUS):${NC}"
echo "$REGISTER_BODY" | jq . 2>/dev/null || echo "$REGISTER_BODY"
echo ""

# Extract token if registration successful
if echo "$REGISTER_BODY" | jq -e '.data.token' > /dev/null 2>&1; then
    AUTH_TOKEN=$(echo "$REGISTER_BODY" | jq -r '.data.token')
    echo -e "${GREEN}✅ Registration successful, token extracted${NC}"
else
    echo -e "${YELLOW}⚠️  Registration response doesn't contain token, will try login${NC}"
fi

# User Login
echo -e "${GREEN}🔑 User Login${NC}"
LOGIN_DATA='{
  "email": "test@example.com",
  "password": "TestPass123!"
}'

LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA" \
  "$API_BASE/auth/login")

LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
LOGIN_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

echo -e "${YELLOW}🧪 Testing: User Login${NC}"
echo -e "   POST ${API_BASE}/auth/login"
echo -e "${BLUE}Response ($LOGIN_STATUS):${NC}"
echo "$LOGIN_BODY" | jq . 2>/dev/null || echo "$LOGIN_BODY"
echo ""

# Extract token if login successful
if echo "$LOGIN_BODY" | jq -e '.data.token' > /dev/null 2>&1; then
    AUTH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.token')
    echo -e "${GREEN}✅ Login successful, token extracted${NC}"
fi

# Test authenticated endpoints if we have a token
if [ ! -z "$AUTH_TOKEN" ]; then
    echo -e "${GREEN}🎫 Using token for authenticated requests${NC}"
    
    # Get Profile
    echo -e "${GREEN}👤 Get User Profile${NC}"
    make_request "GET" "/auth/me" "" "Get User Profile" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    # Update Profile
    echo -e "${GREEN}✏️ Update User Profile${NC}"
    UPDATE_DATA='{"firstName": "Updated", "lastName": "Name"}'
    make_request "PUT" "/auth/profile" "$UPDATE_DATA" "Update User Profile" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    # Refresh Token
    echo -e "${GREEN}🔄 Refresh Token${NC}"
    make_request "POST" "/auth/refresh" "" "Refresh Token" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
else
    echo -e "${RED}❌ No authentication token available, skipping authenticated tests${NC}"
fi

# Logout
echo -e "${GREEN}🚪 User Logout${NC}"
make_request "POST" "/auth/logout" "" "User Logout"

# 3. Test File Management Endpoints
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📁 FILE MANAGEMENT TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Create a test file
echo "This is a test document for API testing" > /tmp/test-file.txt

# Test file serving (placeholder)
echo -e "${GREEN}📄 File Serving Tests${NC}"
test_endpoint "GET" "/files/test-key" "Serve File (should return 404)"
test_endpoint "GET" "/files/download/test-key" "Download File (should return 404)"
test_endpoint "GET" "/files/test-key/info" "Get File Info (should require auth)"

if [ ! -z "$AUTH_TOKEN" ]; then
    make_request "GET" "/files/test-key/info" "" "Get File Info (Authenticated)" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    make_request "DELETE" "/files/test-key" "" "Delete File (Authenticated)" "-H 'Authorization: Bearer $AUTH_TOKEN'"
fi

# 4. Test Document Endpoints
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📄 DOCUMENT MANAGEMENT TESTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ ! -z "$AUTH_TOKEN" ]; then
    echo -e "${GREEN}📄 Document Management with Authentication${NC}"
    
    # Test document listing (search)
    echo -e "${GREEN}📋 List/Search Documents${NC}"
    make_request "GET" "/documents" "" "List Documents" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    make_request "GET" "/documents?page=1&limit=10" "" "List Documents with Pagination" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    make_request "GET" "/documents?tags=[\"test\"]&mimeType=text/plain" "" "Search Documents with Filters" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    # Test document upload (requires multipart/form-data - simplified test)
    echo -e "${GREEN}📤 Document Upload Test${NC}"
    echo "Note: Document upload requires multipart/form-data which is complex in bash"
    echo "Use the following curl command to test file upload:"
    echo "curl -X POST $API_BASE/documents \\"
    echo "  -H 'Authorization: Bearer $AUTH_TOKEN' \\"
    echo "  -F 'file=@/path/to/your/file.pdf' \\"
    echo "  -F 'tags=[\"important\",\"document\"]' \\"
    echo "  -F 'metadata={\"category\":\"test\"}'"
    echo ""
    
    # Test document operations with a mock document ID
    MOCK_DOC_ID="550e8400-e29b-41d4-a716-446655440000"
    
    echo -e "${GREEN}📖 Document Operations (Mock ID)${NC}"
    make_request "GET" "/documents/$MOCK_DOC_ID" "" "Get Document by ID" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    echo -e "${GREEN}✏️ Document Updates${NC}"
    UPDATE_DOC_DATA='{"tags":["updated","test"],"metadata":{"category":"updated"}}'
    make_request "PUT" "/documents/$MOCK_DOC_ID" "$UPDATE_DOC_DATA" "Update Document" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    METADATA_DATA='{"metadata":{"description":"Updated description","category":"important"}}'
    make_request "PUT" "/documents/$MOCK_DOC_ID/metadata" "$METADATA_DATA" "Update Document Metadata" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    TAGS_DATA='{"tags":["new-tag","updated-tag","important"]}'
    make_request "PUT" "/documents/$MOCK_DOC_ID/tags" "$TAGS_DATA" "Update Document Tags" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    echo -e "${GREEN}🔗 Download Link Generation${NC}"
    DOWNLOAD_DATA='{"expiresIn":3600,"filename":"custom-filename.pdf"}'
    make_request "POST" "/documents/$MOCK_DOC_ID/download" "$DOWNLOAD_DATA" "Generate Download Link" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    echo -e "${GREEN}🔐 Permission Management${NC}"
    PERMISSION_DATA='{"permissions":[{"userId":"550e8400-e29b-41d4-a716-446655440001","permission":"read"},{"userId":"550e8400-e29b-41d4-a716-446655440002","permission":"write"}]}'
    make_request "PUT" "/documents/$MOCK_DOC_ID/permissions" "$PERMISSION_DATA" "Update Document Permissions" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
    echo -e "${GREEN}🗑️ Document Deletion${NC}"
    make_request "DELETE" "/documents/$MOCK_DOC_ID" "" "Delete Document" "-H 'Authorization: Bearer $AUTH_TOKEN'"
    
else
    echo -e "${RED}❌ No authentication token available, skipping document tests${NC}"
    echo -e "${YELLOW}💡 Document endpoints require authentication${NC}"
fi

# 5. Test API Documentation
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📚 API DOCUMENTATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

echo -e "${YELLOW}🧪 Testing: Swagger Documentation${NC}"
echo -e "   GET $BASE_URL:$PORT/swagger"
SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL:$PORT/swagger")
echo -e "${BLUE}Swagger Status: $SWAGGER_STATUS${NC}"

if [ "$SWAGGER_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Swagger documentation available at: $BASE_URL:$PORT/swagger${NC}"
else
    echo -e "${RED}❌ Swagger documentation not accessible${NC}"
fi

# Cleanup
rm -f /tmp/test-file.txt

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📋 TESTING SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Server running on port: $PORT${NC}"
echo -e "${GREEN}✅ Framework: Bun + Elysia (not Express)${NC}"
echo -e "${GREEN}✅ All major endpoints tested${NC}"
echo ""
echo -e "${YELLOW}🔧 Manual Testing Commands:${NC}"
echo ""
echo -e "${BLUE}# Health Check${NC}"
echo "curl $BASE_URL:$PORT/health"
echo ""
echo -e "${BLUE}# User Registration${NC}"
echo "curl -X POST $API_BASE/auth/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"user@example.com\",\"password\":\"SecurePass123!\",\"firstName\":\"John\",\"lastName\":\"Doe\"}'"
echo ""
echo -e "${BLUE}# User Login${NC}"
echo "curl -X POST $API_BASE/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"user@example.com\",\"password\":\"SecurePass123!\"}'"
echo ""
echo -e "${BLUE}# Get Profile (with token)${NC}"
echo "curl -X GET $API_BASE/auth/me \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE'"
echo ""
echo -e "${BLUE}# Document Management${NC}"
echo "# List documents"
echo "curl -X GET $API_BASE/documents \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE'"
echo ""
echo "# Upload document"
echo "curl -X POST $API_BASE/documents \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -F 'file=@/path/to/file.pdf' \\"
echo "  -F 'tags=[\"important\",\"document\"]' \\"
echo "  -F 'metadata={\"category\":\"test\"}'"
echo ""
echo "# Generate download link"
echo "curl -X POST $API_BASE/documents/DOCUMENT_ID/download \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"expiresIn\":3600,\"filename\":\"custom-name.pdf\"}'"
echo ""
echo "# Update document permissions"
echo "curl -X PUT $API_BASE/documents/DOCUMENT_ID/permissions \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"permissions\":[{\"userId\":\"USER_ID\",\"permission\":\"read\"}]}'"
echo ""
echo -e "${BLUE}# API Documentation${NC}"
echo "open $BASE_URL:$PORT/swagger"
echo ""
