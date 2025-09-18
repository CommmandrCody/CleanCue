#!/bin/bash

# CleanCue Build Validation and Testing Script
# Comprehensive testing of the built application

set -e

echo "🚀 CleanCue Build Validation & Testing"
echo "====================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 1. BUILD THE APPLICATION
echo "🔨 Building Application..."
echo "-------------------------"

echo "Installing dependencies..."
if pnpm install; then
    success "Dependencies installed"
else
    error "Failed to install dependencies"
    exit 1
fi

echo "Building application..."
if pnpm run build; then
    success "Application built successfully"
else
    error "Build failed"
    exit 1
fi

# 2. VALIDATE BUILD ARTIFACTS
echo
echo "📋 Validating Build Artifacts..."
echo "-------------------------------"

# Check if main executable exists
if [ -f "apps/desktop/release/mac/CleanCue.app/Contents/MacOS/CleanCue" ]; then
    success "macOS executable found"
else
    error "macOS executable not found"
fi

# Check if DMG files were created
if [ -f "apps/desktop/release/CleanCue-0.2.2.dmg" ]; then
    success "x64 DMG created"
else
    warning "x64 DMG not found"
fi

if [ -f "apps/desktop/release/CleanCue-0.2.2-arm64.dmg" ]; then
    success "ARM64 DMG created"
else
    warning "ARM64 DMG not found"
fi

# Check UI build artifacts
if [ -f "packages/ui/dist/index.html" ]; then
    success "UI build artifacts found"
else
    error "UI build artifacts missing"
fi

# 3. TEST DEPENDENCY RESOLUTION
echo
echo "🔗 Testing Dependency Resolution..."
echo "---------------------------------"

# Test if all node modules are properly bundled
if [ -d "apps/desktop/release/mac/CleanCue.app/Contents/Resources/app.asar" ]; then
    success "App bundle (asar) created"

    # Extract and check for common missing dependencies
    npx asar extract "apps/desktop/release/mac/CleanCue.app/Contents/Resources/app.asar" "/tmp/cleancue-test-extract" 2>/dev/null || true

    if [ -d "/tmp/cleancue-test-extract/node_modules/debug" ]; then
        success "debug module properly bundled"
    else
        error "debug module missing from bundle"
    fi

    if [ -d "/tmp/cleancue-test-extract/node_modules/bindings" ]; then
        success "bindings module properly bundled"
    else
        warning "bindings module missing from bundle"
    fi

    # Cleanup
    rm -rf "/tmp/cleancue-test-extract" 2>/dev/null || true
else
    error "App bundle not found"
fi

# 4. SMOKE TEST THE APPLICATION
echo
echo "💨 Smoke Testing Application..."
echo "-----------------------------"

if [ -f "apps/desktop/release/mac/CleanCue.app/Contents/MacOS/CleanCue" ]; then
    echo "Starting application for smoke test..."

    # Start the app in background and capture PID
    timeout 10s "apps/desktop/release/mac/CleanCue.app/Contents/MacOS/CleanCue" --no-sandbox --disable-gpu &
    APP_PID=$!

    # Wait a moment for startup
    sleep 3

    # Check if process is still running
    if ps -p $APP_PID > /dev/null 2>&1; then
        success "Application started successfully"
        # Kill the app
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    else
        error "Application failed to start or crashed immediately"
    fi
else
    warning "Packaged app not found for smoke test"
fi

# 5. RUN UNIT TESTS (if available)
echo
echo "🧪 Running Unit Tests..."
echo "-----------------------"

if [ -f "package.json" ] && grep -q '"test"' package.json; then
    if pnpm test; then
        success "Unit tests passed"
    else
        error "Unit tests failed"
    fi
else
    warning "No unit tests configured"
fi

# 6. RUN INTEGRATION TESTS (if available)
echo
echo "🔧 Running Integration Tests..."
echo "-----------------------------"

if [ -d "tests" ] && [ -f "tests/app.test.ts" ]; then
    echo "Running Electron integration tests..."
    if npx jest tests/; then
        success "Integration tests passed"
    else
        error "Integration tests failed"
    fi
else
    warning "No integration tests found"
fi

# 7. PERFORMANCE CHECKS
echo
echo "⚡ Performance Checks..."
echo "----------------------"

# Check bundle sizes
UI_BUNDLE_SIZE=$(du -h packages/ui/dist/assets/*.js 2>/dev/null | cut -f1 | head -1)
if [ -n "$UI_BUNDLE_SIZE" ]; then
    info "UI bundle size: $UI_BUNDLE_SIZE"
    # Check if bundle is too large (>5MB)
    BUNDLE_SIZE_BYTES=$(du -b packages/ui/dist/assets/*.js 2>/dev/null | cut -f1 | head -1)
    if [ "$BUNDLE_SIZE_BYTES" -gt 5242880 ]; then
        warning "UI bundle is large (>5MB) - consider code splitting"
    else
        success "UI bundle size is reasonable"
    fi
else
    warning "Could not determine UI bundle size"
fi

# Check app size
if [ -d "apps/desktop/release/mac/CleanCue.app" ]; then
    APP_SIZE=$(du -sh "apps/desktop/release/mac/CleanCue.app" | cut -f1)
    info "App package size: $APP_SIZE"
    success "App package created successfully"
else
    warning "Could not determine app package size"
fi

# 8. SECURITY CHECKS
echo
echo "🔒 Security Checks..."
echo "-------------------"

# Check for node integration (should be disabled)
if grep -q "nodeIntegration.*true" apps/desktop/src/main.ts; then
    warning "Node integration may be enabled - security risk"
else
    success "Node integration appears properly configured"
fi

# Check for context isolation (should be enabled)
if grep -q "contextIsolation.*false" apps/desktop/src/main.ts; then
    warning "Context isolation may be disabled - security risk"
else
    success "Context isolation appears properly configured"
fi

# 9. FINAL SUMMARY
echo
echo "📊 Build Validation Summary"
echo "=========================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "🎉 All tests passed! Build is ready for deployment."
    echo
    info "Available artifacts:"
    info "- macOS app: apps/desktop/release/mac/CleanCue.app"
    info "- x64 DMG: apps/desktop/release/CleanCue-0.2.2.dmg"
    info "- ARM64 DMG: apps/desktop/release/CleanCue-0.2.2-arm64.dmg"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Build completed with $WARNINGS warnings${NC}"
    echo
    echo "🔧 Recommended actions:"
    echo "1. Review warnings above"
    echo "2. Consider addressing performance/security warnings"
    echo "3. Build is functional but could be improved"
    exit 0
else
    echo -e "${RED}💥 Build validation failed with $ERRORS errors and $WARNINGS warnings${NC}"
    echo
    echo "🔧 Required actions:"
    echo "1. Fix all errors before deployment"
    echo "2. Address critical warnings"
    echo "3. Re-run validation after fixes"
    exit 1
fi