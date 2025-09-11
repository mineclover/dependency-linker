#!/bin/bash

# verify-separation.sh
# Verifies that backup/tree-sitter has complete separation from parent src/ directory

echo "🔍 Verifying backup/tree-sitter separation from parent src/ directory..."

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES=0

echo -e "\n📁 Current directory: $(pwd)"

# 1. Check for any imports from parent ../src/ directory
echo -e "\n1️⃣ Checking for imports from parent ../src/ directory..."
if grep -r "from.*\.\./\.\./src" src/ 2>/dev/null; then
    echo -e "${RED}❌ Found imports from parent ../src/ directory${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No imports from parent ../src/ directory found${NC}"
fi

# 2. Check for any require from parent src
echo -e "\n2️⃣ Checking for require() from parent src..."
if grep -r "require.*\.\./\.\./src" src/ 2>/dev/null; then
    echo -e "${RED}❌ Found require() from parent src directory${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No require() from parent src directory found${NC}"
fi

# 3. Check that all imports are relative within backup/tree-sitter
echo -e "\n3️⃣ Checking that all internal imports use relative paths..."
EXTERNAL_IMPORTS=$(grep -r "from ['\"]\.\./" src/ 2>/dev/null | grep -v "from '\.\./\.\./src" || true)
if [ -n "$EXTERNAL_IMPORTS" ]; then
    echo -e "${YELLOW}⚠️ Found some external relative imports (checking if they're valid):${NC}"
    echo "$EXTERNAL_IMPORTS"
    # This is not necessarily an error - could be valid relative imports within backup/tree-sitter
else
    echo -e "${GREEN}✅ All relative imports appear to be internal to backup/tree-sitter${NC}"
fi

# 4. Verify package.json has its own dependencies
echo -e "\n4️⃣ Checking package.json has tree-sitter dependencies..."
if [ -f "package.json" ]; then
    if grep -q "tree-sitter" package.json; then
        echo -e "${GREEN}✅ package.json contains tree-sitter dependencies${NC}"
    else
        echo -e "${RED}❌ package.json missing tree-sitter dependencies${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ No package.json found${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 5. Check that TypeScript config is self-contained
echo -e "\n5️⃣ Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✅ tsconfig.json exists${NC}"
    # Check for any extends that might reference parent
    if grep -q "extends.*\.\./\.\./.*" tsconfig.json 2>/dev/null; then
        echo -e "${RED}❌ tsconfig.json extends parent directory configuration${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}✅ tsconfig.json is self-contained${NC}"
    fi
else
    echo -e "${RED}❌ No tsconfig.json found${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 6. Verify built artifacts are self-contained
echo -e "\n6️⃣ Checking built artifacts..."
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ dist/ directory exists${NC}"
else
    echo -e "${YELLOW}⚠️ No dist/ directory found (may not be built yet)${NC}"
fi

# 7. Check analyze-file CLI exists and is executable
echo -e "\n7️⃣ Checking CLI executable..."
if [ -f "analyze-file" ] && [ -x "analyze-file" ]; then
    echo -e "${GREEN}✅ analyze-file CLI executable exists${NC}"
else
    echo -e "${RED}❌ analyze-file CLI executable missing or not executable${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 8. Summary
echo -e "\n📊 Verification Summary:"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: Complete separation verified!${NC}"
    echo -e "${GREEN}backup/tree-sitter is completely independent from parent src/${NC}"
    exit 0
else
    echo -e "${RED}❌ FAILED: $ISSUES issues found${NC}"
    echo -e "${RED}backup/tree-sitter has dependencies on parent src/${NC}"
    exit 1
fi