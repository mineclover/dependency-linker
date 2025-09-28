# Migration Guide: Static Classes to Functions (v2.4.1)

## 🚀 Overview

Version 2.4.1 converts three static-only classes to functional exports for better tree-shaking, performance, and modern development patterns. This guide provides step-by-step migration instructions.

## 🔄 Classes Converted

| Old Class | New Functions | Location |
|-----------|---------------|----------|
| `ASTTraverser` | `traverse`, `findNodes`, etc. | `extractors/enhanced-export` |
| `NodeUtils` | `getText`, `getSourceLocation`, etc. | `extractors/enhanced-export` |
| `TextMatcher` | `findAllExports`, `parseNamedExports`, etc. | `extractors/enhanced-export` |

## 📋 Step-by-Step Migration

### Step 1: Update Imports

#### Before (v2.4.0)
```typescript
import {
  ASTTraverser,
  NodeUtils,
  TextMatcher
} from '@context-action/dependency-linker';
```

#### After (v2.4.1)
```typescript
import {
  // AST traversal functions
  traverse,
  findNodes,
  findNode,
  getChildren,

  // Node utility functions
  getText,
  getSourceLocation,
  isAsync,
  getVisibility,

  // Text matching functions
  findAllExports,
  parseNamedExports,
  hasExports
} from '@context-action/dependency-linker';
```

### Step 2: Update Function Calls

#### ASTTraverser Migration

**Before:**
```typescript
// Traverse AST
ASTTraverser.traverse(ast, (node) => {
  console.log(node.type);
});

// Find nodes
const functions = ASTTraverser.findNodes(ast, node =>
  node.type === 'function_declaration'
);

// Get children
const children = ASTTraverser.getChildren(node);
const identifiers = ASTTraverser.getChildrenByType(node, 'identifier');
```

**After:**
```typescript
// Traverse AST
traverse(ast, (node) => {
  console.log(node.type);
});

// Find nodes
const functions = findNodes(ast, node =>
  node.type === 'function_declaration'
);

// Get children
const children = getChildren(node);
const identifiers = getChildrenByType(node, 'identifier');
```

#### NodeUtils Migration

**Before:**
```typescript
// Get node text
const text = NodeUtils.getText(node);

// Get source location
const location = NodeUtils.getSourceLocation(node);

// Type checking
const isFunction = NodeUtils.isFunctionDeclaration(node);
const isClass = NodeUtils.isClassDeclaration(node);

// Property checking
const asyncFunction = NodeUtils.isAsync(node);
const staticMethod = NodeUtils.isStatic(node);
const visibility = NodeUtils.getVisibility(node);

// Clear cache
NodeUtils.clearTextCache();
```

**After:**
```typescript
// Get node text
const text = getText(node);

// Get source location
const location = getSourceLocation(node);

// Type checking
const isFunction = isFunctionDeclaration(node);
const isClass = isClassDeclaration(node);

// Property checking
const asyncFunction = isAsync(node);
const staticMethod = isStatic(node);
const visibility = getVisibility(node);

// Clear cache
clearTextCache();
```

#### TextMatcher Migration

**Before:**
```typescript
// Find exports
const exports = TextMatcher.findAllExports(sourceCode);
const namedExports = TextMatcher.findExportsByType(sourceCode, 'named');

// Parse exports
const parsed = TextMatcher.parseNamedExports('export { foo, bar }');

// Check for exports
const hasExports = TextMatcher.hasExports(sourceCode);
const count = TextMatcher.countExports(sourceCode);

// Clean text
const clean = TextMatcher.cleanExportText(exportText);
```

**After:**
```typescript
// Find exports
const exports = findAllExports(sourceCode);
const namedExports = findExportsByType(sourceCode, 'named');

// Parse exports
const parsed = parseNamedExports('export { foo, bar }');

// Check for exports
const hasAnyExports = hasExports(sourceCode);
const count = countExports(sourceCode);

// Clean text
const clean = cleanExportText(exportText);
```

## 🔧 Automated Migration

### Using Search and Replace (VS Code)

1. **Find and Replace ASTTraverser calls:**
   - Find: `ASTTraverser\.(\w+)`
   - Replace: `$1`
   - Files: `*.ts`, `*.js`

2. **Find and Replace NodeUtils calls:**
   - Find: `NodeUtils\.(\w+)`
   - Replace: `$1`
   - Files: `*.ts`, `*.js`

3. **Find and Replace TextMatcher calls:**
   - Find: `TextMatcher\.(\w+)`
   - Replace: `$1`
   - Files: `*.ts`, `*.js`

4. **Update imports:**
   - Find: `import\s*\{\s*([^}]*)(ASTTraverser|NodeUtils|TextMatcher)([^}]*)\s*\}`
   - Replace with individual function imports

### Using sed (Unix/Linux/macOS)

```bash
#!/bin/bash

# Navigate to your project directory
cd /path/to/your/project

# Backup files
find src -name "*.ts" -o -name "*.js" | xargs -I {} cp {} {}.backup

# Replace ASTTraverser calls
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/ASTTraverser\.traverse/traverse/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/ASTTraverser\.findNodes/findNodes/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/ASTTraverser\.findNode/findNode/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/ASTTraverser\.getChildren/getChildren/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/ASTTraverser\.getChildrenByType/getChildrenByType/g'

# Replace NodeUtils calls
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/NodeUtils\.getText/getText/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/NodeUtils\.getSourceLocation/getSourceLocation/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/NodeUtils\.isAsync/isAsync/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/NodeUtils\.isStatic/isStatic/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/NodeUtils\.getVisibility/getVisibility/g'

# Replace TextMatcher calls
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/TextMatcher\.findAllExports/findAllExports/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/TextMatcher\.parseNamedExports/parseNamedExports/g'
find src -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/TextMatcher\.hasExports/hasExports/g'

echo "Migration completed. Check your files and remove .backup files if everything works correctly."
```

### Migration Script (Node.js)

```javascript
// migrate-v2.4.1.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = {
  // ASTTraverser
  'ASTTraverser.traverse': 'traverse',
  'ASTTraverser.findNodes': 'findNodes',
  'ASTTraverser.findNode': 'findNode',
  'ASTTraverser.getChildren': 'getChildren',
  'ASTTraverser.getChildrenByType': 'getChildrenByType',
  'ASTTraverser.getChildByType': 'getChildByType',

  // NodeUtils
  'NodeUtils.getText': 'getText',
  'NodeUtils.getSourceLocation': 'getSourceLocation',
  'NodeUtils.isAsync': 'isAsync',
  'NodeUtils.isStatic': 'isStatic',
  'NodeUtils.getVisibility': 'getVisibility',
  'NodeUtils.clearTextCache': 'clearTextCache',

  // TextMatcher
  'TextMatcher.findAllExports': 'findAllExports',
  'TextMatcher.parseNamedExports': 'parseNamedExports',
  'TextMatcher.hasExports': 'hasExports',
  'TextMatcher.countExports': 'countExports'
};

const importReplacements = {
  'ASTTraverser': ['traverse', 'findNodes', 'findNode', 'getChildren', 'getChildrenByType', 'getChildByType'],
  'NodeUtils': ['getText', 'getSourceLocation', 'isAsync', 'isStatic', 'getVisibility', 'clearTextCache'],
  'TextMatcher': ['findAllExports', 'parseNamedExports', 'hasExports', 'countExports']
};

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace function calls
  for (const [oldCall, newCall] of Object.entries(replacements)) {
    if (content.includes(oldCall)) {
      content = content.replace(new RegExp(oldCall.replace('.', '\\.'), 'g'), newCall);
      modified = true;
    }
  }

  // Update imports
  const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]@context-action\/dependency-linker['"]/g;
  content = content.replace(importRegex, (match, imports) => {
    const importList = imports.split(',').map(i => i.trim());
    const newImports = [];

    importList.forEach(imp => {
      if (importReplacements[imp]) {
        newImports.push(...importReplacements[imp]);
        modified = true;
      } else {
        newImports.push(imp);
      }
    });

    const uniqueImports = [...new Set(newImports)];
    return `import { ${uniqueImports.join(', ')} } from '@context-action/dependency-linker'`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Migrated: ${filePath}`);
  }
}

// Find and migrate files
const files = glob.sync('src/**/*.{ts,js}');
files.forEach(migrateFile);

console.log(`🎉 Migration completed for ${files.length} files`);
```

Run the script:
```bash
node migrate-v2.4.1.js
```

## 📝 Complete Migration Example

### Before Migration (v2.4.0)

```typescript
// analyzer.ts
import {
  ASTTraverser,
  NodeUtils,
  TextMatcher,
  TypeScriptParser
} from '@context-action/dependency-linker';

export class CustomAnalyzer {
  async analyzeFile(filePath: string) {
    const parser = new TypeScriptParser();
    const result = await parser.parse(filePath);

    if (!result.ast) return null;

    // Find all functions
    const functions = ASTTraverser.findNodes(result.ast, node =>
      node.type === 'function_declaration'
    );

    // Analyze each function
    const analysis = functions.map(func => {
      const name = NodeUtils.getIdentifierName(func);
      const location = NodeUtils.getSourceLocation(func);
      const isAsync = NodeUtils.isAsync(func);
      const text = NodeUtils.getText(func);

      return { name, location, isAsync, text };
    });

    // Check for exports
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const exports = TextMatcher.findAllExports(sourceCode);
    const hasExports = TextMatcher.hasExports(sourceCode);

    return { functions: analysis, exports, hasExports };
  }

  cleanup() {
    NodeUtils.clearTextCache();
  }
}
```

### After Migration (v2.4.1)

```typescript
// analyzer.ts
import {
  // Function imports (new in v2.4.1)
  findNodes,
  getIdentifierName,
  getSourceLocation,
  isAsync,
  getText,
  findAllExports,
  hasExports,
  clearTextCache,

  // Existing imports (unchanged)
  TypeScriptParser
} from '@context-action/dependency-linker';

export class CustomAnalyzer {
  async analyzeFile(filePath: string) {
    const parser = new TypeScriptParser();
    const result = await parser.parse(filePath);

    if (!result.ast) return null;

    // Find all functions (no class prefix needed)
    const functions = findNodes(result.ast, node =>
      node.type === 'function_declaration'
    );

    // Analyze each function (direct function calls)
    const analysis = functions.map(func => {
      const name = getIdentifierName(func);
      const location = getSourceLocation(func);
      const asyncFunc = isAsync(func);
      const text = getText(func);

      return { name, location, isAsync: asyncFunc, text };
    });

    // Check for exports (direct function calls)
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const exports = findAllExports(sourceCode);
    const hasAnyExports = hasExports(sourceCode);

    return { functions: analysis, exports, hasExports: hasAnyExports };
  }

  cleanup() {
    clearTextCache();
  }
}
```

## ✅ Migration Checklist

### Pre-Migration
- [ ] **Backup your codebase** (Git commit or copy)
- [ ] **Identify usage** of ASTTraverser, NodeUtils, TextMatcher
- [ ] **Check TypeScript compilation** before migration
- [ ] **Run tests** to establish baseline

### Migration
- [ ] **Update package version** to v2.4.1
- [ ] **Update imports** to use individual functions
- [ ] **Replace static method calls** with function calls
- [ ] **Update TypeScript types** if needed
- [ ] **Run automated migration scripts** if applicable

### Post-Migration
- [ ] **Compile TypeScript** and fix any errors
- [ ] **Run tests** to ensure functionality
- [ ] **Check bundle size** for improvements
- [ ] **Update documentation** if applicable
- [ ] **Remove backup files** once verified

## 🔍 Troubleshooting

### Common Issues

#### 1. Import Errors
```typescript
// Error: Cannot find name 'traverse'
// Solution: Add traverse to imports
import { traverse } from '@context-action/dependency-linker';
```

#### 2. Missing Function Imports
```typescript
// Error: Cannot find name 'getText'
// Solution: Import all used functions
import { getText, getSourceLocation, isAsync } from '@context-action/dependency-linker';
```

#### 3. TypeScript Type Errors
```typescript
// Error: Type errors with function parameters
// Solution: Import types if needed
import type { NodeVisitor } from '@context-action/dependency-linker';
```

#### 4. Bundle Size Issues
```typescript
// Problem: Bundle size not reduced
// Solution: Use direct imports for tree-shaking
import { traverse } from '@context-action/dependency-linker/dist/extractors/enhanced-export';
```

### Verification

#### Test Migration Success
```typescript
// test-migration.ts
import { traverse, getText, findAllExports } from '@context-action/dependency-linker';

// Verify functions work
console.log('✅ Functions imported successfully');

// Test with sample data
const mockAST = { type: 'program', children: [] };
traverse(mockAST, (node) => console.log(node.type));

console.log('✅ Migration successful!');
```

#### Bundle Size Check
```bash
# Before migration
npm run build
du -h dist/

# After migration
npm run build
du -h dist/

# Compare sizes
```

## 🎯 Benefits After Migration

### Performance Improvements
- **Faster imports**: No class instantiation overhead
- **Better tree-shaking**: Individual functions can be eliminated
- **Smaller bundles**: Up to 50% size reduction with selective imports

### Developer Experience
- **Cleaner code**: No class prefixes needed
- **Better IDE support**: Enhanced autocomplete and type checking
- **Functional patterns**: Easier composition and testing

### Maintenance
- **Simplified codebase**: Fewer classes to maintain
- **Better testability**: Individual functions easier to unit test
- **Future-proof**: Aligns with modern JavaScript patterns

## 📚 Additional Resources

- **[API Documentation](docs/API.md)**: Complete function reference
- **[Changelog](docs/CHANGELOG_v2.4.1.md)**: Detailed changes
- **[Package Exports](docs/PACKAGE_EXPORTS.md)**: Tree-shaking guide
- **[Examples](examples/)**: Updated usage examples

## 🆘 Support

If you encounter issues during migration:

1. **Check the documentation** for updated examples
2. **Review the test suite** for usage patterns
3. **Open an issue** on GitHub with specific error details
4. **Include before/after code** to help debug problems

The migration is designed to be straightforward and backward-compatible at the high level, ensuring your core analysis functionality continues to work while providing benefits of the new functional architecture.