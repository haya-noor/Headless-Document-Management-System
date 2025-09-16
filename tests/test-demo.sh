#!/bin/bash

# Test Demonstration Script
# Shows how to run different types of tests

echo "🧪 Document Management System - Test Suite Demo"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Available Test Commands:${NC}"
echo "========================="
echo ""
echo -e "${GREEN}📋 Individual Test Suites:${NC}"
echo "  bun run test:auth         # Authentication tests"
echo "  bun run test:documents    # Document management tests"
echo "  bun run test:storage      # Storage service tests"
echo "  bun run test:repositories # Repository layer tests"
echo "  bun run test:api          # Mock API tests"
echo "  bun run test:api-real     # Real HTTP API tests"
echo ""
echo -e "${GREEN}🔄 Test Categories:${NC}"
echo "  bun run test:unit         # Unit tests (auth, storage, repositories)"
echo "  bun run test:integration  # Integration tests (documents, api)"
echo ""
echo -e "${GREEN}🚀 Comprehensive Testing:${NC}"
echo "  bun run test:all          # Run all tests with detailed report"
echo "  bun run test              # Run all tests (simple)"
echo "  bun run test:watch        # Watch mode for development"
echo "  bun run test:coverage     # Test coverage report"
echo ""

# Function to run a test with timing and status
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}🔍 Running: $test_name${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    start_time=$(date +%s%N)
    
    if eval $test_command; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 ))
        echo -e "${GREEN}✅ $test_name: PASSED (${duration}ms)${NC}"
    else
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 ))
        echo -e "${RED}❌ $test_name: FAILED (${duration}ms)${NC}"
    fi
    echo ""
}

# Check if an argument was provided
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}💡 Usage Examples:${NC}"
    echo "  ./test-demo.sh auth       # Run authentication tests"
    echo "  ./test-demo.sh all        # Run comprehensive test suite"
    echo "  ./test-demo.sh unit       # Run unit tests"
    echo "  ./test-demo.sh demo       # Run demo of different test types"
    echo ""
    exit 0
fi

case $1 in
    "auth")
        run_test "Authentication Tests" "bun run test:auth"
        ;;
    "documents")
        run_test "Document Management Tests" "bun run test:documents"
        ;;
    "storage")
        run_test "Storage Tests" "bun run test:storage"
        ;;
    "repositories")
        run_test "Repository Tests" "bun run test:repositories"
        ;;
    "api")
        run_test "Mock API Tests" "bun run test:api"
        ;;
    "api-real")
        echo -e "${YELLOW}⚠️  Real API tests require a running server!${NC}"
        echo "Start server with: bun run dev"
        run_test "Real API Tests" "bun run test:api-real"
        ;;
    "unit")
        echo -e "${BLUE}🧪 Running Unit Tests${NC}"
        echo "====================="
        run_test "Authentication Tests" "bun run test:auth"
        run_test "Storage Tests" "bun run test:storage"
        run_test "Repository Tests" "bun run test:repositories"
        ;;
    "integration")
        echo -e "${BLUE}🔗 Running Integration Tests${NC}"
        echo "============================="
        run_test "Document Management Tests" "bun run test:documents"
        run_test "API Integration Tests" "bun run test:api"
        ;;
    "all")
        echo -e "${BLUE}🚀 Running Comprehensive Test Suite${NC}"
        echo "===================================="
        run_test "Complete Test Suite" "bun run test:all"
        ;;
    "demo")
        echo -e "${BLUE}🎬 Test Demo - Running Sample Tests${NC}"
        echo "===================================="
        echo ""
        
        echo -e "${YELLOW}Demo 1: Quick Authentication Test${NC}"
        run_test "Auth Sample" "bun test tests/auth.test.ts --reporter=verbose"
        
        echo -e "${YELLOW}Demo 2: Storage Test${NC}"
        run_test "Storage Sample" "bun test tests/storage.test.ts --reporter=verbose"
        
        echo -e "${YELLOW}Demo 3: Simple Test Run${NC}"
        run_test "Basic Tests" "bun test --reporter=verbose"
        ;;
    *)
        echo -e "${RED}❌ Unknown test type: $1${NC}"
        echo ""
        echo -e "${YELLOW}Available options:${NC}"
        echo "  auth, documents, storage, repositories, api, api-real, unit, integration, all, demo"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Test demonstration completed!${NC}"
echo ""
echo -e "${BLUE}📊 For detailed reports, check:${NC}"
echo "  - test-results.json (JSON report)"
echo "  - test-results.html (HTML report)"
echo ""
echo -e "${YELLOW}💡 Pro Tips:${NC}"
echo "  - Use 'bun run test:watch' for development"
echo "  - Use 'bun run test:all' for comprehensive testing"
echo "  - Check test-results.html in browser for visual reports"
