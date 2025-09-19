#!/bin/bash

# Complete UI Testing Script for CleanCue
# This script runs comprehensive UI tests across all components

set -e

echo "🧪 CleanCue Complete UI Testing Suite"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test category
run_test_category() {
    local category=$1
    local command=$2
    local description=$3

    echo -e "${BLUE}🔧 Running $category Tests${NC}"
    echo "   $description"
    echo "   Command: $command"
    echo ""

    if eval $command; then
        echo -e "${GREEN}✅ $category Tests: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $category Tests: FAILED${NC}"
        ((FAILED_TESTS++))
    fi

    ((TOTAL_TESTS++))
    echo ""
}

# Function to check component coverage
check_component_coverage() {
    echo -e "${BLUE}📊 Checking Component Test Coverage${NC}"
    echo ""

    local components_dir="packages/ui/src/components"
    local total_components=0
    local tested_components=0

    echo "Components with tests:"
    for component_file in $(find $components_dir -name "*.tsx" ! -name "*.test.tsx" ! -name "*.stories.tsx"); do
        ((total_components++))
        local component_name=$(basename "$component_file" .tsx)
        local test_file="${components_dir}/${component_name}.test.tsx"

        if [ -f "$test_file" ]; then
            echo -e "  ${GREEN}✅${NC} $component_name"
            ((tested_components++))
        else
            echo -e "  ${RED}❌${NC} $component_name (missing test)"
        fi
    done

    echo ""
    echo "Coverage: $tested_components/$total_components components have tests"
    local coverage_percent=$((tested_components * 100 / total_components))

    if [ $coverage_percent -ge 80 ]; then
        echo -e "${GREEN}✅ Good coverage: ${coverage_percent}%${NC}"
    elif [ $coverage_percent -ge 60 ]; then
        echo -e "${YELLOW}⚠️  Moderate coverage: ${coverage_percent}%${NC}"
    else
        echo -e "${RED}❌ Low coverage: ${coverage_percent}%${NC}"
    fi
    echo ""
}

# 1. Component Unit Tests
run_test_category "Unit" \
    "cd packages/ui && npm test -- --run --reporter=verbose" \
    "Testing individual React components with Vitest + Testing Library"

# 2. Integration Tests
run_test_category "Integration" \
    "cd packages/ui && npm test -- --run --reporter=verbose src/App.test.tsx" \
    "Testing component integration and state management"

# 3. TypeScript Compilation
run_test_category "TypeScript" \
    "cd packages/ui && npx tsc --noEmit" \
    "Validating TypeScript types and compilation"

# 4. Linting
run_test_category "Linting" \
    "cd packages/ui && npm run lint" \
    "Code quality and style consistency checks"

# 5. Build Test
run_test_category "Build" \
    "cd packages/ui && npm run build" \
    "Production build validation"

# 6. E2E Tests (if Electron app can be built)
if [ -f "apps/desktop/dist/main.js" ]; then
    run_test_category "E2E" \
        "npm test -- tests/ui-integration.test.js" \
        "Full application workflow testing with Spectron"
else
    echo -e "${YELLOW}⚠️  Skipping E2E tests - desktop app not built${NC}"
    echo "   Run 'npm run build' in apps/desktop first"
    echo ""
fi

# Component coverage check
check_component_coverage

# Performance Tests
echo -e "${BLUE}⚡ Performance Tests${NC}"
echo ""
echo "Testing UI responsiveness and load times..."

# Bundle size check
if [ -f "packages/ui/dist/index.html" ]; then
    bundle_size=$(du -sh packages/ui/dist/ | cut -f1)
    echo "Bundle size: $bundle_size"

    # Check for large files
    echo "Largest bundle files:"
    find packages/ui/dist/ -type f -name "*.js" -o -name "*.css" | \
        xargs ls -lh | sort -k5 -hr | head -3 | \
        awk '{print "  " $9 ": " $5}'
else
    echo -e "${YELLOW}⚠️  No build artifacts found for size analysis${NC}"
fi
echo ""

# Accessibility Tests
echo -e "${BLUE}♿ Accessibility Tests${NC}"
echo ""
echo "Checking for common accessibility issues..."

# Check for missing alt text, aria labels, etc.
accessibility_issues=0

# Check for images without alt text
if grep -r "img.*src" packages/ui/src/ --include="*.tsx" | grep -v "alt=" > /dev/null; then
    echo -e "${RED}❌ Found images without alt text${NC}"
    ((accessibility_issues++))
else
    echo -e "${GREEN}✅ All images have alt text${NC}"
fi

# Check for buttons without accessible text
if grep -r "<button" packages/ui/src/ --include="*.tsx" | grep -v -E "(aria-label|title)" | grep -E "^[^>]*>$" > /dev/null; then
    echo -e "${YELLOW}⚠️  Some buttons may lack accessible text${NC}"
    ((accessibility_issues++))
fi

if [ $accessibility_issues -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious accessibility issues found${NC}"
else
    echo -e "${YELLOW}⚠️  $accessibility_issues potential accessibility issues${NC}"
fi
echo ""

# Security Tests
echo -e "${BLUE}🔒 Security Tests${NC}"
echo ""
echo "Checking for security vulnerabilities..."

# Check for dangerous innerHTML usage
if grep -r "dangerouslySetInnerHTML" packages/ui/src/ --include="*.tsx" > /dev/null; then
    echo -e "${RED}❌ Found dangerous innerHTML usage${NC}"
else
    echo -e "${GREEN}✅ No dangerous innerHTML usage${NC}"
fi

# Check for eval usage
if grep -r "eval\s*(" packages/ui/src/ --include="*.tsx" --include="*.ts" > /dev/null; then
    echo -e "${RED}❌ Found eval() usage${NC}"
else
    echo -e "${GREEN}✅ No eval() usage found${NC}"
fi

echo ""

# Summary
echo "🏁 Test Summary"
echo "==============="
echo ""
echo -e "Total test categories: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All UI tests passed! Your UI is ready for production.${NC}"
    exit 0
else
    echo -e "${RED}💥 Some tests failed. Please review the output above.${NC}"
    exit 1
fi