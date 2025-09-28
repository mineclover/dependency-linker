# Enhanced Extractors Examples (v2.4.1)

## 🚀 Overview

Version 2.4.1 introduces two powerful new extractors that provide advanced analysis capabilities beyond basic dependency extraction:

- **EnhancedDependencyExtractor**: Named import usage tracking and dead code detection
- **EnhancedExportExtractor**: Complete export analysis with class member detection

## 📦 EnhancedDependencyExtractor Examples

### 1. Basic Usage Pattern

```typescript
import {
  EnhancedDependencyExtractor,
  TypeScriptParser
} from '@context-action/dependency-linker';

async function basicEnhancedAnalysis(filePath: string) {
  const parser = new TypeScriptParser();
  const extractor = new EnhancedDependencyExtractor();

  // Parse the file
  const parseResult = await parser.parse(filePath);
  if (!parseResult.ast) return null;

  // Perform enhanced analysis
  const result = extractor.extractEnhanced(parseResult.ast, filePath);

  // Basic statistics
  console.log('📊 Enhanced Dependency Analysis:');
  console.log(`  Total imports: ${result.usageAnalysis.totalImports}`);
  console.log(`  Used imports: ${result.usageAnalysis.usedImports}`);
  console.log(`  Unused imports: ${result.usageAnalysis.unusedImports}`);
  console.log(`  Efficiency: ${((result.usageAnalysis.usedImports / result.usageAnalysis.totalImports) * 100).toFixed(1)}%`);

  return result;
}
```

### 2. React Component Analysis

```typescript
async function analyzeReactComponent() {
  const reactCode = `
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, TextField, Dialog } from '@mui/material';
import { format, addDays, subDays } from 'date-fns';
import { debounce, throttle, isEmpty } from 'lodash';
import axios from 'axios';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Used: useEffect, format, addDays, axios
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await axios.get(\`/api/users/\${userId}\`);
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Used: format, addDays
  const formattedJoinDate = useMemo(() => {
    if (!user?.joinDate) return '';
    const joinDate = new Date(user.joinDate);
    const displayDate = addDays(joinDate, 1);
    return format(displayDate, 'PPP');
  }, [user?.joinDate]);

  // Used: debounce
  const debouncedSave = useCallback(
    debounce((data) => {
      axios.post('/api/users/save', data);
    }, 1000),
    []
  );

  // Used: Button, TextField (Dialog, useCallback, useMemo, subDays, throttle, isEmpty are unused)
  return (
    <div>
      <Button onClick={() => debouncedSave(user)}>
        Save Profile
      </Button>
      <TextField value={user?.name || ''} />
      <p>Joined: {formattedJoinDate}</p>
    </div>
  );
};
`;

  const parser = new TypeScriptParser();
  const extractor = new EnhancedDependencyExtractor();

  const parseResult = await parser.parse('/react-component.tsx', reactCode);
  const result = extractor.extractEnhanced(parseResult.ast, '/react-component.tsx');

  console.log('🔍 React Component Analysis:');

  // Analyze each dependency
  result.enhancedDependencies.forEach(dep => {
    console.log(`\n📦 ${dep.source}:`);
    console.log(`  Imported: ${dep.importedNames?.join(', ') || 'default import'}`);

    if (dep.usedMethods && dep.usedMethods.length > 0) {
      console.log(`  Used: ${dep.usedMethods.map(m =>
        `${m.methodName}(${m.callCount}x)`
      ).join(', ')}`);
    }

    if (dep.unusedImports && dep.unusedImports.length > 0) {
      console.log(`  ⚠️  Unused: ${dep.unusedImports.join(', ')}`);
    }

    const totalImports = dep.importedNames?.length || 1;
    const usedImports = dep.usedMethods?.length || 0;
    const efficiency = totalImports > 0 ? ((usedImports / totalImports) * 100).toFixed(1) : 0;
    console.log(`  📊 Efficiency: ${efficiency}%`);
  });

  // Optimization recommendations
  console.log('\n🔧 Optimization Recommendations:');
  result.usageAnalysis.unusedImportsList.forEach(({ source, unusedItems }) => {
    console.log(`❌ Remove from ${source}: ${unusedItems.join(', ')}`);
  });
}
```

### 3. Bundle Optimization Analysis

```typescript
async function analyzeBundleOptimization() {
  const lodashCode = `
import _ from 'lodash';
import { debounce, throttle, merge } from 'lodash';
import { format, parseISO } from 'date-fns';

// Inefficient: default import usage
const data = [1, 2, 2, 3, 4, 4];
const uniqueData = _.uniq(data);
const sortedData = _.sortBy(data);
const groupedData = _.groupBy(data, x => x % 2);

// Efficient: named import usage
const debouncedFn = debounce(() => console.log('debounced'), 100);
const mergedConfig = merge({}, { a: 1 }, { b: 2 });

// Date formatting
const formatted = format(new Date(), 'yyyy-MM-dd');
const parsed = parseISO('2024-01-01');

// Unused import
// throttle is imported but never used
`;

  const parser = new TypeScriptParser();
  const extractor = new EnhancedDependencyExtractor();

  const parseResult = await parser.parse('/bundle-analysis.ts', lodashCode);
  const result = extractor.extractEnhanced(parseResult.ast, '/bundle-analysis.ts');

  console.log('🌳 Bundle Optimization Analysis:');

  result.enhancedDependencies.forEach(dep => {
    if (dep.source === 'lodash') {
      console.log(`\n📦 ${dep.source} Bundle Impact:`);

      // Calculate potential savings
      const defaultImportMethods = dep.usedMethods?.filter(m =>
        m.methodName.startsWith('_')
      ) || [];

      if (defaultImportMethods.length > 0) {
        console.log('⚠️  Bundle Size Issues:');
        console.log('   Default import pulls entire lodash library (~70KB)');
        console.log('\n💡 Tree-shaking Recommendations:');

        defaultImportMethods.forEach(method => {
          const methodName = method.methodName.replace('_.', '');
          console.log(`   ${method.methodName} → import ${methodName} from 'lodash/${methodName}';`);
        });

        const potentialSavings = (defaultImportMethods.length * 2).toFixed(1); // Rough estimate
        console.log(`\n📊 Potential Bundle Reduction: ~${potentialSavings}KB per method`);
      }

      // Check named imports efficiency
      if (dep.unusedImports && dep.unusedImports.length > 0) {
        console.log(`\n🗑️  Remove Unused Imports: ${dep.unusedImports.join(', ')}`);
      }
    }
  });

  // Generate optimized import suggestions
  console.log('\n✨ Optimized Import Structure:');
  console.log(`
// Current (inefficient):
import _ from 'lodash';
import { debounce, throttle, merge } from 'lodash';

// Optimized (tree-shakable):
import debounce from 'lodash/debounce';
import merge from 'lodash/merge';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import groupBy from 'lodash/groupBy';
// Remove: throttle (unused)
  `);
}
```

### 4. Dependency Audit Tool

```typescript
async function createDependencyAudit(projectFiles: string[]) {
  const extractor = new EnhancedDependencyExtractor();
  const parser = new TypeScriptParser();

  const auditResults = {
    totalFiles: 0,
    totalDependencies: 0,
    inefficientImports: [] as any[],
    unusedImports: [] as any[],
    recommendations: [] as string[]
  };

  for (const filePath of projectFiles) {
    const parseResult = await parser.parse(filePath);
    if (!parseResult.ast) continue;

    const result = extractor.extractEnhanced(parseResult.ast, filePath);
    auditResults.totalFiles++;
    auditResults.totalDependencies += result.enhancedDependencies.length;

    // Find inefficient imports
    result.enhancedDependencies.forEach(dep => {
      const efficiency = dep.importedNames
        ? (dep.usedMethods?.length || 0) / dep.importedNames.length * 100
        : 100;

      if (efficiency < 50 && dep.importedNames && dep.importedNames.length > 2) {
        auditResults.inefficientImports.push({
          file: filePath,
          dependency: dep.source,
          efficiency: efficiency.toFixed(1),
          imported: dep.importedNames.length,
          used: dep.usedMethods?.length || 0
        });
      }

      if (dep.unusedImports && dep.unusedImports.length > 0) {
        auditResults.unusedImports.push({
          file: filePath,
          dependency: dep.source,
          unused: dep.unusedImports
        });
      }
    });
  }

  // Generate recommendations
  if (auditResults.inefficientImports.length > 0) {
    auditResults.recommendations.push(
      `Found ${auditResults.inefficientImports.length} inefficient imports (<50% usage)`
    );
  }

  if (auditResults.unusedImports.length > 0) {
    auditResults.recommendations.push(
      `Found ${auditResults.unusedImports.length} files with unused imports`
    );
  }

  console.log('📋 Project Dependency Audit:');
  console.log(`Files analyzed: ${auditResults.totalFiles}`);
  console.log(`Total dependencies: ${auditResults.totalDependencies}`);
  console.log(`\nIssues found:`);
  console.log(`- Inefficient imports: ${auditResults.inefficientImports.length}`);
  console.log(`- Unused imports: ${auditResults.unusedImports.length}`);

  return auditResults;
}
```

## 🔍 EnhancedExportExtractor Examples

### 1. API Documentation Generation

```typescript
import {
  EnhancedExportExtractor,
  TypeScriptParser
} from '@context-action/dependency-linker';

async function generateAPIDocumentation(filePath: string) {
  const apiCode = `
export interface User {
  id: string;
  name: string;
  email: string;
}

export type UserRole = 'admin' | 'user' | 'guest';

export const API_VERSION = '2.1.0';
export const DEFAULT_TIMEOUT = 5000;

export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}

export function validateEmail(email: string): boolean {
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

export class UserService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getUser(id: string): Promise<User> {
    return fetchUser(id);
  }

  public async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await fetch(\`\${this.baseUrl}/users/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response.json();
  }

  private formatUrl(path: string): string {
    return \`\${this.baseUrl}\${path}\`;
  }
}

export default UserService;
`;

  const parser = new TypeScriptParser();
  const extractor = new EnhancedExportExtractor();

  const parseResult = await parser.parse('/api.ts', apiCode);
  const result = extractor.extractExports(parseResult.ast, '/api.ts');

  console.log('📚 API Documentation:');
  console.log(`\n## Export Summary`);
  console.log(`- Functions: ${result.statistics.functionExports}`);
  console.log(`- Classes: ${result.statistics.classExports}`);
  console.log(`- Variables: ${result.statistics.variableExports}`);
  console.log(`- Types: ${result.statistics.typeExports}`);
  console.log(`- Default exports: ${result.statistics.defaultExports}`);

  // Generate function documentation
  console.log(`\n## Functions`);
  result.exportMethods
    .filter(exp => exp.exportType === 'function')
    .forEach(func => {
      console.log(`\n### \`${func.name}()\``);
      console.log(`- Type: ${func.declarationType}`);
      console.log(`- Location: Line ${func.location.line}`);
      if (func.isAsync) console.log(`- Async: Yes`);
      if (func.parameters && func.parameters.length > 0) {
        console.log(`- Parameters: ${func.parameters.map(p =>
          `${p.name}${p.optional ? '?' : ''}: ${p.type || 'any'}`
        ).join(', ')}`);
      }
      if (func.returnType) {
        console.log(`- Returns: ${func.returnType}`);
      }
    });

  // Generate class documentation
  console.log(`\n## Classes`);
  result.classes.forEach(cls => {
    console.log(`\n### \`${cls.className}\``);
    console.log(`- Location: Line ${cls.location.line}`);
    if (cls.superClass) console.log(`- Extends: ${cls.superClass}`);
    if (cls.implementsInterfaces && cls.implementsInterfaces.length > 0) {
      console.log(`- Implements: ${cls.implementsInterfaces.join(', ')}`);
    }

    console.log(`\n#### Methods (${cls.methods.length})`);
    cls.methods.forEach(method => {
      const visibility = method.visibility || 'public';
      const modifiers = [
        method.isStatic ? 'static' : '',
        method.isAsync ? 'async' : ''
      ].filter(Boolean).join(' ');

      console.log(`- \`${visibility} ${modifiers} ${method.name}()\``.trim());
    });

    if (cls.properties.length > 0) {
      console.log(`\n#### Properties (${cls.properties.length})`);
      cls.properties.forEach(prop => {
        const visibility = prop.visibility || 'public';
        const modifiers = prop.isStatic ? 'static' : '';
        console.log(`- \`${visibility} ${modifiers} ${prop.name}\``.trim());
      });
    }
  });

  return result;
}
```

### 2. Code Quality Analysis

```typescript
async function analyzeCodeQuality(filePath: string) {
  const parser = new TypeScriptParser();
  const extractor = new EnhancedExportExtractor();

  const parseResult = await parser.parse(filePath);
  if (!parseResult.ast) return null;

  const result = extractor.extractExports(parseResult.ast, filePath);

  console.log('📊 Code Quality Analysis:');

  // API surface analysis
  const publicMethods = result.exportMethods.filter(exp =>
    exp.exportType === 'function' ||
    (exp.exportType === 'class_method' && exp.visibility === 'public')
  );

  console.log(`\nAPI Surface:`);
  console.log(`- Public exports: ${publicMethods.length}`);
  console.log(`- Classes: ${result.statistics.classExports}`);
  console.log(`- Total API points: ${result.statistics.totalExports}`);

  // Complexity indicators
  const classComplexity = result.classes.map(cls => ({
    name: cls.className,
    methods: cls.methods.length,
    properties: cls.properties.length,
    complexity: cls.methods.length + cls.properties.length
  }));

  if (classComplexity.length > 0) {
    console.log(`\nClass Complexity:`);
    classComplexity
      .sort((a, b) => b.complexity - a.complexity)
      .forEach(cls => {
        console.log(`- ${cls.name}: ${cls.complexity} members (${cls.methods}m, ${cls.properties}p)`);
      });
  }

  // Recommendations
  const recommendations = [];
  if (result.statistics.totalExports > 20) {
    recommendations.push('Consider splitting large API surface into smaller modules');
  }
  if (classComplexity.some(c => c.complexity > 15)) {
    recommendations.push('Some classes have high complexity (>15 members)');
  }
  if (result.statistics.defaultExports === 0 && result.statistics.totalExports > 1) {
    recommendations.push('Consider adding a default export for main functionality');
  }

  if (recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`));
  }

  return result;
}
```

### 3. Migration Assistant

```typescript
async function analyzeForMigration(oldFilePath: string, newFilePath: string) {
  const parser = new TypeScriptParser();
  const extractor = new EnhancedExportExtractor();

  // Analyze old version
  const oldParseResult = await parser.parse(oldFilePath);
  const oldExports = oldParseResult.ast ?
    extractor.extractExports(oldParseResult.ast, oldFilePath) : null;

  // Analyze new version
  const newParseResult = await parser.parse(newFilePath);
  const newExports = newParseResult.ast ?
    extractor.extractExports(newParseResult.ast, newFilePath) : null;

  if (!oldExports || !newExports) {
    console.log('❌ Could not analyze both files');
    return;
  }

  console.log('🔄 Migration Analysis:');

  // Find removed exports
  const oldExportNames = new Set(oldExports.exportMethods.map(e => e.name));
  const newExportNames = new Set(newExports.exportMethods.map(e => e.name));

  const removedExports = [...oldExportNames].filter(name => !newExportNames.has(name));
  const addedExports = [...newExportNames].filter(name => !oldExportNames.has(name));

  if (removedExports.length > 0) {
    console.log(`\n❌ Removed Exports (${removedExports.length}):`);
    removedExports.forEach(name => console.log(`- ${name}`));
  }

  if (addedExports.length > 0) {
    console.log(`\n✅ Added Exports (${addedExports.length}):`);
    addedExports.forEach(name => console.log(`- ${name}`));
  }

  // Analyze class changes
  const oldClasses = new Map(oldExports.classes.map(c => [c.className, c]));
  const newClasses = new Map(newExports.classes.map(c => [c.className, c]));

  console.log(`\n🏗️  Class Changes:`);
  for (const [className, newClass] of newClasses) {
    const oldClass = oldClasses.get(className);
    if (!oldClass) {
      console.log(`+ New class: ${className}`);
      continue;
    }

    const oldMethods = new Set(oldClass.methods.map(m => m.name));
    const newMethods = new Set(newClass.methods.map(m => m.name));

    const removedMethods = [...oldMethods].filter(name => !newMethods.has(name));
    const addedMethods = [...newMethods].filter(name => !oldMethods.has(name));

    if (removedMethods.length > 0 || addedMethods.length > 0) {
      console.log(`\n  ${className}:`);
      removedMethods.forEach(method => console.log(`    - Removed: ${method}()`));
      addedMethods.forEach(method => console.log(`    + Added: ${method}()`));
    }
  }

  // Breaking changes detection
  const breakingChanges = [];
  if (removedExports.length > 0) {
    breakingChanges.push(`${removedExports.length} exports removed`);
  }

  oldClasses.forEach((oldClass, className) => {
    const newClass = newClasses.get(className);
    if (newClass) {
      const oldPublicMethods = oldClass.methods.filter(m =>
        m.visibility === 'public' || !m.visibility
      );
      const newPublicMethods = new Set(newClass.methods
        .filter(m => m.visibility === 'public' || !m.visibility)
        .map(m => m.name)
      );

      const removedPublicMethods = oldPublicMethods.filter(m =>
        !newPublicMethods.has(m.name)
      );

      if (removedPublicMethods.length > 0) {
        breakingChanges.push(
          `${className}: ${removedPublicMethods.length} public methods removed`
        );
      }
    }
  });

  if (breakingChanges.length > 0) {
    console.log(`\n⚠️  Breaking Changes:`);
    breakingChanges.forEach(change => console.log(`- ${change}`));
  } else {
    console.log(`\n✅ No breaking changes detected`);
  }
}
```

## 🔧 Integration Patterns

### Combining Both Extractors

```typescript
async function comprehensiveAnalysis(filePath: string) {
  const parser = new TypeScriptParser();
  const depExtractor = new EnhancedDependencyExtractor();
  const exportExtractor = new EnhancedExportExtractor();

  const parseResult = await parser.parse(filePath);
  if (!parseResult.ast) return null;

  // Get both analyses
  const dependencies = depExtractor.extractEnhanced(parseResult.ast, filePath);
  const exports = exportExtractor.extractExports(parseResult.ast, filePath);

  // Combined insights
  console.log('🔍 Comprehensive File Analysis:');
  console.log(`\nDependencies:`);
  console.log(`- Total imports: ${dependencies.usageAnalysis.totalImports}`);
  console.log(`- Unused imports: ${dependencies.usageAnalysis.unusedImports}`);
  console.log(`- Import efficiency: ${((dependencies.usageAnalysis.usedImports / dependencies.usageAnalysis.totalImports) * 100).toFixed(1)}%`);

  console.log(`\nExports:`);
  console.log(`- Total exports: ${exports.statistics.totalExports}`);
  console.log(`- Public API points: ${exports.exportMethods.filter(e =>
    e.exportType === 'function' ||
    (e.exportType === 'class_method' && e.visibility === 'public')
  ).length}`);

  // File health score
  const importEfficiency = (dependencies.usageAnalysis.usedImports / dependencies.usageAnalysis.totalImports) * 100;
  const exportComplexity = exports.statistics.totalExports;
  const healthScore = Math.max(0, 100 - (exportComplexity * 2) + importEfficiency) / 2;

  console.log(`\n📊 File Health Score: ${healthScore.toFixed(1)}/100`);

  return { dependencies, exports, healthScore };
}
```

### Build Tool Integration

```typescript
// webpack-plugin.js
class DependencyAnalysisPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('DependencyAnalysisPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'DependencyAnalysisPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_ANALYSE
        },
        async (assets) => {
          const { EnhancedDependencyExtractor, TypeScriptParser } =
            require('@context-action/dependency-linker');

          const parser = new TypeScriptParser();
          const extractor = new EnhancedDependencyExtractor();

          for (const filename of Object.keys(assets)) {
            if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
              const source = assets[filename].source();
              const parseResult = await parser.parse(filename, source);

              if (parseResult.ast) {
                const result = extractor.extractEnhanced(parseResult.ast, filename);

                // Report unused imports
                if (result.usageAnalysis.unusedImports > 0) {
                  compilation.warnings.push(
                    new Error(`${filename}: ${result.usageAnalysis.unusedImports} unused imports detected`)
                  );
                }
              }
            }
          }
        }
      );
    });
  }
}

module.exports = DependencyAnalysisPlugin;
```

## 📚 Additional Resources

- **[API Reference](docs/API.md)**: Complete extractor documentation
- **[Migration Guide](docs/MIGRATION_GUIDE_v2.4.1.md)**: Upgrading from v2.4.0
- **[Performance Guide](docs/PERFORMANCE.md)**: Optimization strategies
- **[Test Examples](tests/unit/extractors/)**: Unit test patterns

These enhanced extractors provide powerful insights for code optimization, API analysis, and dependency management, making them essential tools for modern TypeScript/JavaScript development workflows.