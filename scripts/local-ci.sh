#!/bin/bash

# CleanCue Local CI Pipeline
# Runs the same checks as GitHub Actions locally

set -e

echo "🚀 CleanCue Local CI Pipeline"
echo "============================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STAGE=0
TOTAL_STAGES=6

stage() {
    STAGE=$((STAGE + 1))
    echo
    echo -e "${BLUE}[$STAGE/$TOTAL_STAGES] $1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Stage 1: Environment Check
stage "Environment Check"
echo "Checking Node.js version..."
node --version || error "Node.js not found"

echo "Checking pnpm version..."
pnpm --version || error "pnpm not found"

echo "Checking Python version..."
python --version || python3 --version || error "Python not found"

success "Environment ready"

# Stage 2: Dependencies
stage "Installing Dependencies"
echo "Installing Node.js dependencies..."
pnpm install || error "Failed to install dependencies"

echo "Setting up Python environment..."
if [ ! -d "packages/workers/venv" ]; then
    cd packages/workers
    python -m venv venv || python3 -m venv venv
    cd ../..
fi

if [ -f "packages/workers/venv/bin/activate" ]; then
    source packages/workers/venv/bin/activate
    pip install numpy scipy librosa
else
    warning "Python virtual environment not found"
fi

success "Dependencies installed"

# Stage 3: Health Check
stage "Health Check"
pnpm run test:health || error "Health check failed"
success "Health check passed"

# Stage 4: Unit Tests
stage "Unit Tests"
pnpm run test:unit || error "Unit tests failed"
success "Unit tests passed"

# Stage 5: Build & Validation
stage "Build & Validation"
echo "Building application..."
pnpm run build || error "Build failed"

echo "Running build validation..."
pnpm run test:build || warning "Build validation found issues"
success "Build completed"

# Stage 6: Security Check
stage "Security Check"
echo "Running security audit..."
pnpm audit --audit-level moderate || warning "Security audit found issues"

echo "Checking for potential secrets..."
if grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.ts" --include="*.js" --include="*.json" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=venv 2>/dev/null; then
    warning "Potential secrets found in code"
else
    success "No obvious secrets found"
fi

success "Security check completed"

# Final Summary
echo
echo -e "${GREEN}🎉 Local CI Pipeline Completed Successfully!${NC}"
echo
echo "Available artifacts:"
if [ -f "apps/desktop/release/CleanCue-0.2.0.dmg" ]; then
    echo "- macOS x64 DMG: apps/desktop/release/CleanCue-0.2.0.dmg"
fi
if [ -f "apps/desktop/release/CleanCue-0.2.0-arm64.dmg" ]; then
    echo "- macOS ARM64 DMG: apps/desktop/release/CleanCue-0.2.0-arm64.dmg"
fi
if [ -d "apps/desktop/release/mac/CleanCue.app" ]; then
    echo "- macOS App: apps/desktop/release/mac/CleanCue.app"
fi
if [ -d "packages/ui/dist" ]; then
    echo "- UI Bundle: packages/ui/dist/"
fi

echo
echo "Ready for deployment! 🚀"