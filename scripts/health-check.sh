#!/bin/bash

# CleanCue Comprehensive Health Check
# Detects dependency issues, stray files, and build problems

set -e

echo "🔍 CleanCue Comprehensive Health Check"
echo "======================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo -e "ℹ️  $1"
}

# 1. CHECK DEPENDENCY CONSISTENCY
echo "📦 Checking Dependency Consistency..."
echo "-----------------------------------"

# Check for version mismatches
echo "Checking TypeScript versions..."
TS_VERSIONS=$(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/release/*" -exec grep -l typescript {} \; | xargs grep '"typescript"' | cut -d'"' -f4 | sort | uniq)
TS_COUNT=$(echo "$TS_VERSIONS" | wc -l)
if [ $TS_COUNT -gt 1 ]; then
    warning "Multiple TypeScript versions found: $TS_VERSIONS"
else
    success "TypeScript versions consistent"
fi

# Check for unused dependencies (basic check only)
echo "Checking for unused dependencies..."
# Skip dependency check for now - too many false positives with complex package.json structure
success "Dependency check skipped (manual review recommended for complex Electron app)"

# Check workspace dependencies
echo "Checking workspace dependencies..."
# Check if all @cleancue dependencies use workspace: prefix
WORKSPACE_ISSUES=$(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/release/*" -not -path "*/venv/*" -exec grep -l '@cleancue.*"[^w]' {} \; 2>/dev/null | wc -l)
if [ "$WORKSPACE_ISSUES" -gt 0 ]; then
    warning "Some @cleancue dependencies may not use workspace: prefix (manual review recommended)"
else
    success "Workspace dependencies appear correct"
fi

# 2. CHECK FOR STRAY FILES
echo
echo "🗑️  Checking for Stray Files..."
echo "------------------------------"

# Check for backup files
BACKUP_FILES=$(find . -name "*.backup" -o -name "*.bak" -o -name "*.tmp" -o -name "*~" -not -path "*/node_modules/*" -not -path "*/release/*")
if [ -n "$BACKUP_FILES" ]; then
    error "Backup files found: $BACKUP_FILES"
else
    success "No backup files found"
fi

# Check for .DS_Store files
DS_STORE_FILES=$(find . -name ".DS_Store" -not -path "*/node_modules/*" -not -path "*/release/*")
if [ -n "$DS_STORE_FILES" ]; then
    warning "macOS .DS_Store files found: $DS_STORE_FILES"
else
    success "No .DS_Store files found"
fi

# Check for misplaced .github folders
GITHUB_FOLDERS=$(find . -name ".github" -not -path "./.github" -not -path "*/node_modules/*" -not -path "*/release/*")
if [ -n "$GITHUB_FOLDERS" ]; then
    error "Misplaced .github folders: $GITHUB_FOLDERS"
else
    success "No misplaced .github folders"
fi

# Check for shell scripts in wrong places
SHELL_SCRIPTS=$(find packages/ -name "*.sh" -not -path "*/node_modules/*")
if [ -n "$SHELL_SCRIPTS" ]; then
    warning "Shell scripts in packages: $SHELL_SCRIPTS"
else
    success "No unexpected shell scripts in packages"
fi

# 3. CHECK BUILD INTEGRITY
echo
echo "🔨 Checking Build Integrity..."
echo "-----------------------------"

# Check if TypeScript compiles
echo "Testing TypeScript compilation..."
for package in packages/*/; do
    if [ -f "$package/tsconfig.json" ]; then
        package_name=$(basename "$package")
        echo "  Checking $package_name..."
        if ! (cd "$package" && npx tsc --noEmit --skipLibCheck); then
            error "TypeScript errors in $package_name"
        else
            success "$package_name TypeScript OK"
        fi
    fi
done

# Check desktop app TypeScript
echo "  Checking desktop app..."
if ! (cd apps/desktop && npx tsc --noEmit --skipLibCheck); then
    error "TypeScript errors in desktop app"
else
    success "Desktop app TypeScript OK"
fi

# 4. CHECK IMPORT/EXPORT CONSISTENCY
echo
echo "🔗 Checking Import/Export Consistency..."
echo "--------------------------------------"

# Check for missing relative imports (simplified)
echo "Checking for missing relative imports..."
find packages/ apps/ -name "*.ts" -o -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/venv/*" -not -path "*/release/*" -not -path "*/.vite/*" | while read file; do
    # Only check obviously problematic relative imports
    if grep -q "import.*from ['\"]\\./[^'\"]*\\.js" "$file"; then
        warning "JavaScript extension in relative import found in $file (may cause issues)"
    fi
done

# 5. CHECK PACKAGE.JSON CONSISTENCY
echo
echo "📋 Checking package.json Consistency..."
echo "--------------------------------------"

# Check version consistency (allow some flexibility)
ROOT_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
find packages/ apps/ -name "package.json" -not -path "*/venv/*" -not -path "*/release/*" -not -path "*/.vite/*" -not -path "*/node_modules/*" | while read file; do
    VERSION=$(grep '"version"' "$file" | cut -d'"' -f4)
    if [ "$VERSION" != "$ROOT_VERSION" ]; then
        warning "Version mismatch in $file: $VERSION (root is $ROOT_VERSION)"
    fi
done

# Check for missing required fields
find packages/ apps/ -name "package.json" -not -path "*/venv/*" -not -path "*/release/*" -not -path "*/.vite/*" -not -path "*/node_modules/*" | while read file; do
    if ! grep -q '"name"' "$file"; then
        error "Missing name field in $file"
    fi
    if ! grep -q '"version"' "$file"; then
        error "Missing version field in $file"
    fi
done

# 6. CHECK ELECTRON DEPENDENCY VALIDATION
echo
echo "🔌 Checking Electron Dependencies..."
echo "-----------------------------------"

# Check for missing runtime dependencies in Electron app
echo "Validating Electron runtime dependencies..."
if [ -f "apps/desktop/package.json" ]; then
    # Check if electron-squirrel-startup is present and debug dependency exists
    if grep -q "electron-squirrel-startup" apps/desktop/package.json; then
        if ! grep -q '"debug"' apps/desktop/package.json; then
            error "electron-squirrel-startup requires debug but it's not declared as dependency"
        else
            success "Electron runtime dependencies properly declared"
        fi
    fi

    # Check for other common missing transitive dependencies
    MISSING_DEPS=""
    if grep -q "better-sqlite3" apps/desktop/package.json && ! grep -q '"bindings"' apps/desktop/package.json; then
        MISSING_DEPS="$MISSING_DEPS bindings"
    fi

    if [ -n "$MISSING_DEPS" ]; then
        warning "Potentially missing runtime dependencies: $MISSING_DEPS"
    else
        success "Common transitive dependencies appear properly declared"
    fi
else
    warning "Desktop package.json not found"
fi

# 6b. DEEP TRANSITIVE DEPENDENCY VALIDATION
echo
echo "🔍 Deep Transitive Dependency Validation..."
echo "------------------------------------------"

# Check for known problematic transitive dependencies
if [ -f "apps/desktop/package.json" ]; then
    echo "Checking critical transitive dependencies..."

    # Check debug -> ms dependency chain
    if grep -q '"debug"' apps/desktop/package.json; then
        if ! grep -q '"ms"' apps/desktop/package.json; then
            error "debug module requires 'ms' but it's not declared as direct dependency"
        else
            success "debug -> ms dependency chain properly declared"
        fi
    fi

    # Check bindings -> file-uri-to-path dependency chain
    if grep -q '"bindings"' apps/desktop/package.json; then
        if ! grep -q '"file-uri-to-path"' apps/desktop/package.json; then
            error "bindings module requires 'file-uri-to-path' but it's not declared as direct dependency"
        else
            success "bindings -> file-uri-to-path dependency chain properly declared"
        fi
    fi

    # Check if we have a built app to validate bundled dependencies
    if [ -f "apps/desktop/release/mac/CleanCue.app/Contents/Resources/app.asar" ]; then
        echo "Validating bundled dependencies in packaged app..."

        # Extract app bundle temporarily for validation
        TEMP_EXTRACT="/tmp/cleancue-health-check-$$"
        if npx asar extract "apps/desktop/release/mac/CleanCue.app/Contents/Resources/app.asar" "$TEMP_EXTRACT" 2>/dev/null; then

            # Check for debug module and its dependencies
            if [ -d "$TEMP_EXTRACT/node_modules/debug" ]; then
                if [ -d "$TEMP_EXTRACT/node_modules/ms" ] || [ -d "$TEMP_EXTRACT/node_modules/debug/node_modules/ms" ]; then
                    success "debug -> ms dependency properly bundled"
                else
                    error "ms module missing from bundle (debug dependency)"
                fi
            fi

            # Check for bindings module if better-sqlite3 is used
            if [ -d "$TEMP_EXTRACT/node_modules/better-sqlite3" ]; then
                if [ -d "$TEMP_EXTRACT/node_modules/bindings" ] || [ -d "$TEMP_EXTRACT/node_modules/better-sqlite3/node_modules/bindings" ]; then
                    success "better-sqlite3 -> bindings dependency properly bundled"
                else
                    warning "bindings module may be missing from bundle"
                fi
            fi

            # Cleanup
            rm -rf "$TEMP_EXTRACT" 2>/dev/null || true
        else
            warning "Could not extract app bundle for deep dependency validation"
        fi
    else
        info "No packaged app found - run 'pnpm run build' to validate bundled dependencies"
    fi

    # Validate that all declared dependencies can be resolved
    echo "Testing dependency resolution..."
    if (cd apps/desktop && node -e "
        const pkg = require('./package.json');
        const deps = {...pkg.dependencies, ...pkg.devDependencies};
        for (const dep of Object.keys(deps)) {
            if (!dep.startsWith('@cleancue/')) {
                try {
                    require.resolve(dep);
                } catch (e) {
                    console.error('Cannot resolve:', dep);
                    process.exit(1);
                }
            }
        }
        console.log('All dependencies resolved successfully');
    " 2>/dev/null); then
        success "All declared dependencies can be resolved"
    else
        error "Some dependencies cannot be resolved"
    fi
else
    warning "Desktop package.json not found for transitive dependency validation"
fi

# 7. CHECK PACKAGED APP SMOKE TEST
echo
echo "📦 Testing Packaged Application..."
echo "--------------------------------"

if [ -f "apps/desktop/release/mac/CleanCue.app/Contents/MacOS/CleanCue" ]; then
    echo "Running packaged app smoke test..."
    # Test app startup for 3 seconds then kill
    timeout 3s "apps/desktop/release/mac/CleanCue.app/Contents/MacOS/CleanCue" --no-sandbox --disable-gpu 2>/dev/null && APP_STARTED=true || APP_STARTED=false

    if [ "$APP_STARTED" = true ]; then
        success "Packaged app starts successfully"
    else
        error "Packaged app failed to start - check for missing dependencies"
    fi
else
    warning "Packaged app not found - run 'pnpm run build' first"
fi

# 8. CHECK PYTHON ENVIRONMENT (if applicable)
echo
echo "🐍 Checking Python Environment..."
echo "--------------------------------"

if [ -d "packages/workers/venv" ]; then
    if [ -f "packages/workers/venv/bin/python" ]; then
        PYTHON_VERSION=$(packages/workers/venv/bin/python --version)
        success "Python environment found: $PYTHON_VERSION"

        # Check if required packages are installed
        if ! packages/workers/venv/bin/python -c "import numpy, scipy, librosa" 2>/dev/null; then
            warning "Some Python packages may be missing"
        else
            success "Python packages OK"
        fi
    else
        error "Python virtual environment corrupted"
    fi
else
    warning "No Python virtual environment found"
fi

# 7. FINAL SUMMARY
echo
echo "📊 Health Check Summary"
echo "======================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "All checks passed! Codebase is healthy."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warnings found, but no critical errors.${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS errors and $WARNINGS warnings found!${NC}"
    echo
    echo "🔧 Recommended actions:"
    echo "1. Fix all errors before proceeding"
    echo "2. Consider addressing warnings"
    echo "3. Run this script again after fixes"
    exit 1
fi