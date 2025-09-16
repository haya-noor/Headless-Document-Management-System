#!/bin/bash
# quick-test.sh - Simple API test

echo "🧪 Quick API Test"
echo "================"

# Test if server is running on common ports
echo "1. Testing if server is running..."
SERVER_PORT=""
for port in 3000 3001 3002 8080; do
    if curl -s http://localhost:$port/health >/dev/null 2>&1; then
        echo "✅ Server is running on port $port"
        SERVER_PORT=$port
        break
    fi
done

if [ -z "$SERVER_PORT" ]; then
    echo "❌ Server not running on common ports (3000, 3001, 3002, 8080)"
    echo "💡 Start the server with: bun run dev"
    echo "💡 Set environment variables: PORT=3001 DATABASE_URL=... JWT_SECRET=..."
    exit 1
fi

# Test health endpoint
echo -e "\n2. Testing health endpoint..."
curl -s http://localhost:$SERVER_PORT/health | head -5

echo -e "\n3. Testing API info..."
curl -s http://localhost:$SERVER_PORT/api | head -5

echo -e "\n4. Testing user registration..."
curl -s -X POST http://localhost:$SERVER_PORT/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"quicktest@example.com","password":"TestPass123!","firstName":"Quick","lastName":"Test"}' | head -5

echo -e "\n✅ Quick test completed!"
echo "📖 For full API documentation: http://localhost:$SERVER_PORT/swagger"
echo "🔧 For comprehensive testing, run: ./test-apis.sh"
