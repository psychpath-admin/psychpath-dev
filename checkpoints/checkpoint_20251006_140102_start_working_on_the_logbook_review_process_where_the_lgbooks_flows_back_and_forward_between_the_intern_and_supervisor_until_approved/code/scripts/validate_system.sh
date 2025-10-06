#!/bin/bash

# PsychPATH System Validation Script
# This script validates that the system is working correctly

set -e

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

# Test functions
test_pass() {
    echo -e "${GREEN}✅ PASS${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC} $1"
    ((FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC} $1"
}

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log "Starting PsychPATH system validation..."

# 1. Check if services are running
log "Checking services..."

if pgrep -f "manage.py runserver" > /dev/null; then
    test_pass "Backend server is running"
else
    test_fail "Backend server is not running"
fi

if pgrep -f "npm run dev" > /dev/null; then
    test_pass "Frontend server is running"
else
    test_fail "Frontend server is not running"
fi

# 2. Check database connection
log "Checking database connection..."

cd "$PROJECT_ROOT/backend"
if python manage.py check --database default > /dev/null 2>&1; then
    test_pass "Database connection successful"
else
    test_fail "Database connection failed"
fi

# 3. Check API endpoints
log "Checking API endpoints..."

# Test /api/me/ endpoint
if curl -s http://localhost:8000/api/me/ > /dev/null 2>&1; then
    test_pass "API /api/me/ endpoint responding"
else
    test_fail "API /api/me/ endpoint not responding"
fi

# Test /api/auth/token/ endpoint
if curl -s http://localhost:8000/api/auth/token/ > /dev/null 2>&1; then
    test_pass "API /api/auth/token/ endpoint responding"
else
    test_fail "API /api/auth/token/ endpoint not responding"
fi

# 4. Check database content
log "Checking database content..."

# Check user profiles
USER_COUNT=$(psql -h localhost -U psychpath_user -d psychpath_db -t -c "SELECT COUNT(*) FROM api_userprofile;" 2>/dev/null | xargs)
if [ "$USER_COUNT" -gt 0 ]; then
    test_pass "User profiles found: $USER_COUNT"
else
    test_fail "No user profiles found"
fi

# Check logbook entries
LOGBOOK_COUNT=$(psql -h localhost -U psychpath_user -d psychpath_db -t -c "SELECT COUNT(*) FROM logbook_app_weeklylogbook;" 2>/dev/null | xargs)
if [ "$LOGBOOK_COUNT" -gt 0 ]; then
    test_pass "Logbook entries found: $LOGBOOK_COUNT"
else
    test_warn "No logbook entries found"
fi

# Check supervision records
SUPERVISION_COUNT=$(psql -h localhost -U psychpath_user -d psychpath_db -t -c "SELECT COUNT(*) FROM api_supervision;" 2>/dev/null | xargs)
if [ "$SUPERVISION_COUNT" -gt 0 ]; then
    test_pass "Supervision records found: $SUPERVISION_COUNT"
else
    test_warn "No supervision records found"
fi

# 5. Check frontend accessibility
log "Checking frontend accessibility..."

if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    test_pass "Frontend accessible at http://localhost:5173"
else
    test_fail "Frontend not accessible at http://localhost:5173"
fi

# 6. Check for common issues
log "Checking for common issues..."

# Check for port conflicts
if lsof -i :8000 > /dev/null 2>&1; then
    test_pass "Port 8000 is in use (backend)"
else
    test_fail "Port 8000 is not in use (backend not running)"
fi

if lsof -i :5173 > /dev/null 2>&1; then
    test_pass "Port 5173 is in use (frontend)"
else
    test_fail "Port 5173 is not in use (frontend not running)"
fi

# 7. Check log files for errors
log "Checking log files for errors..."

if [ -f "$PROJECT_ROOT/logs/backend.log" ]; then
    ERROR_COUNT=$(grep -i "error\|exception\|traceback" "$PROJECT_ROOT/logs/backend.log" | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        test_pass "No errors in backend log"
    else
        test_warn "Found $ERROR_COUNT errors in backend log"
    fi
else
    test_warn "Backend log file not found"
fi

if [ -f "$PROJECT_ROOT/logs/frontend.log" ]; then
    ERROR_COUNT=$(grep -i "error\|exception\|traceback" "$PROJECT_ROOT/logs/frontend.log" | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        test_pass "No errors in frontend log"
    else
        test_warn "Found $ERROR_COUNT errors in frontend log"
    fi
else
    test_warn "Frontend log file not found"
fi

# 8. Summary
log "Validation complete!"

echo ""
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed! System is healthy.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some validations failed. Please check the issues above.${NC}"
    exit 1
fi
