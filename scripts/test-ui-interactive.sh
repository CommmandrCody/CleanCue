#!/bin/bash

# Interactive UI Testing Script for CleanCue
# This script provides an interactive testing menu

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen
clear

echo -e "${BLUE}🧪 CleanCue Interactive UI Testing${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""
echo "Choose what to test:"
echo ""
echo -e "${CYAN}1.${NC} Quick Component Tests (unit tests)"
echo -e "${CYAN}2.${NC} Integration Tests (App.test.tsx)"
echo -e "${CYAN}3.${NC} New Components Tests (AudioPlayer, Settings)"
echo -e "${CYAN}4.${NC} TypeScript Compilation Check"
echo -e "${CYAN}5.${NC} All UI Tests (comprehensive)"
echo -e "${CYAN}6.${NC} Build Test (production build)"
echo -e "${CYAN}7.${NC} Live Development Testing"
echo -e "${CYAN}8.${NC} Component Coverage Report"
echo -e "${CYAN}9.${NC} Fix Common Test Issues"
echo -e "${CYAN}0.${NC} Exit"
echo ""
echo -n "Enter your choice (0-9): "

read choice

case $choice in
    1)
        echo -e "${BLUE}🏃 Running Quick Component Tests...${NC}"
        echo ""
        cd packages/ui
        npm test -- --run --reporter=verbose src/components/Header.test.tsx src/components/ScanDialog.test.tsx
        ;;
    2)
        echo -e "${BLUE}🔗 Running Integration Tests...${NC}"
        echo ""
        cd packages/ui
        npm test -- --run --reporter=verbose src/App.test.tsx
        ;;
    3)
        echo -e "${BLUE}🆕 Running New Component Tests...${NC}"
        echo ""
        cd packages/ui
        echo "Testing AudioPlayer component..."
        npm test -- --run --reporter=verbose src/components/AudioPlayer.test.tsx
        echo ""
        echo "Testing Settings component..."
        npm test -- --run --reporter=verbose src/components/Settings.test.tsx
        ;;
    4)
        echo -e "${BLUE}📝 Checking TypeScript Compilation...${NC}"
        echo ""
        cd packages/ui
        echo "Compiling TypeScript..."
        if npx tsc --noEmit; then
            echo -e "${GREEN}✅ TypeScript compilation successful!${NC}"
        else
            echo -e "${RED}❌ TypeScript compilation failed!${NC}"
            echo "Fix the errors above and try again."
        fi
        ;;
    5)
        echo -e "${BLUE}🎯 Running Complete UI Test Suite...${NC}"
        echo ""
        ./scripts/test-ui-complete.sh
        ;;
    6)
        echo -e "${BLUE}🏗️ Testing Production Build...${NC}"
        echo ""
        cd packages/ui
        echo "Building for production..."
        if npm run build; then
            echo -e "${GREEN}✅ Production build successful!${NC}"

            # Check bundle size
            if [ -d "dist" ]; then
                echo ""
                echo "Bundle analysis:"
                echo "Total size: $(du -sh dist/ | cut -f1)"
                echo "Largest files:"
                find dist/ -type f -name "*.js" -o -name "*.css" | \
                    xargs ls -lh | sort -k5 -hr | head -3 | \
                    awk '{print "  " $9 ": " $5}'
            fi
        else
            echo -e "${RED}❌ Production build failed!${NC}"
        fi
        ;;
    7)
        echo -e "${BLUE}🔴 Starting Live Development Testing...${NC}"
        echo ""
        echo "This will start the development server with testing enabled."
        echo "Open http://localhost:3000 in your browser to test the UI."
        echo "Press Ctrl+C to stop."
        echo ""
        echo -e "${YELLOW}Starting development server...${NC}"

        # Start development with testing flags
        cd packages/ui
        npm run dev
        ;;
    8)
        echo -e "${BLUE}📊 Generating Component Coverage Report...${NC}"
        echo ""

        components_dir="packages/ui/src/components"
        total_components=0
        tested_components=0

        echo "Component Test Coverage Report:"
        echo "==============================="
        echo ""

        echo "Components WITH tests:"
        for component_file in $(find $components_dir -name "*.tsx" ! -name "*.test.tsx" ! -name "*.stories.tsx"); do
            ((total_components++))
            component_name=$(basename "$component_file" .tsx)
            test_file="${components_dir}/${component_name}.test.tsx"

            if [ -f "$test_file" ]; then
                echo -e "  ${GREEN}✅${NC} $component_name"
                ((tested_components++))
            fi
        done

        echo ""
        echo "Components MISSING tests:"
        for component_file in $(find $components_dir -name "*.tsx" ! -name "*.test.tsx" ! -name "*.stories.tsx"); do
            component_name=$(basename "$component_file" .tsx)
            test_file="${components_dir}/${component_name}.test.tsx"

            if [ ! -f "$test_file" ]; then
                echo -e "  ${RED}❌${NC} $component_name"
            fi
        done

        echo ""
        echo "Summary:"
        echo "--------"
        coverage_percent=$((tested_components * 100 / total_components))
        echo "Total components: $total_components"
        echo "Tested components: $tested_components"
        echo "Coverage: ${coverage_percent}%"

        if [ $coverage_percent -ge 80 ]; then
            echo -e "${GREEN}✅ Excellent coverage!${NC}"
        elif [ $coverage_percent -ge 60 ]; then
            echo -e "${YELLOW}⚠️  Good coverage, room for improvement${NC}"
        else
            echo -e "${RED}❌ Low coverage - consider adding more tests${NC}"
        fi
        ;;
    9)
        echo -e "${BLUE}🔧 Fixing Common Test Issues...${NC}"
        echo ""

        echo "1. Cleaning node_modules and reinstalling..."
        cd packages/ui
        rm -rf node_modules package-lock.json
        npm install

        echo ""
        echo "2. Clearing test cache..."
        npm test -- --run --clearCache > /dev/null 2>&1 || true

        echo ""
        echo "3. Updating test snapshots..."
        npm test -- --run --updateSnapshot > /dev/null 2>&1 || true

        echo ""
        echo "4. Running a quick test to verify fixes..."
        if npm test -- --run --silent src/App.test.tsx; then
            echo -e "${GREEN}✅ Tests are working correctly!${NC}"
        else
            echo -e "${YELLOW}⚠️  Some issues remain. Check the output above.${NC}"
        fi
        ;;
    0)
        echo -e "${CYAN}Goodbye! 👋${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Please try again.${NC}"
        ;;
esac

echo ""
echo -e "${CYAN}Test completed. Press any key to return to menu...${NC}"
read -n 1 -s
exec "$0"  # Restart the script