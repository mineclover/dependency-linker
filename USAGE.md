# Usage Guide - Advanced TypeScript Dependency Analysis Tool

A production-ready TypeScript dependency analysis tool with high-performance analysis, namespace management, and comprehensive compliance checking.

## 🚀 Quick Start

### Installation
```bash
npm install @context-action/dependency-linker
```

### Basic Usage
```bash
# Initialize project
dependency-linker init --project my-app

# Analyze files
dependency-linker analyze --pattern "src/**/*.ts"

# Performance-optimized analysis
dependency-linker analyze --pattern "src/**/*.ts" --performance

# Namespace-based analysis
dependency-linker namespace --all

# Query system management
dependency-linker namespace --queries
dependency-linker namespace --queries-for source
```

## 🏗️ Project Setup

### 1. Initialize Project
```bash
# Create configuration
dependency-linker init --project my-app --directory ./src

# This creates dependency-linker.config.json with default namespaces
```

### 2. Configure Namespaces
```json
{
  "projectName": "my-app",
  "rootPath": "/path/to/project",
  "namespaces": {
    "source": {
      "name": "source",
      "description": "Source code analysis",
      "patterns": {
        "include": ["src/**/*.ts"],
        "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
      },
      "analysis": {
        "enabled": true,
        "options": {
          "enableParallelExecution": true,
          "enableCaching": true
        }
      },
      "compliance": {
        "enabled": true,
        "rules": ["exported-symbols-naming", "async-function-naming"]
      },
      "output": {
        "format": "json",
        "destination": "./reports/source-analysis.json",
        "includeMetadata": true,
        "includeStatistics": true
      }
    }
  }
}
```

## 🔍 Analysis Commands

### Direct File Analysis
```bash
# Basic analysis
dependency-linker analyze --pattern "src/**/*.ts"

# With compliance checking
dependency-linker analyze --pattern "src/**/*.ts" --compliance

# Performance-optimized analysis
dependency-linker analyze --pattern "src/**/*.ts" --performance \
  --max-concurrency 16 --batch-size 100 --memory-limit 2048

# Output to file
dependency-linker analyze --pattern "src/**/*.ts" \
  --output report.json --format json --include-statistics
```

### Namespace-Based Analysis
```bash
# List all namespaces
dependency-linker namespace --list

# Run specific namespace
dependency-linker namespace --name source

# Run all namespaces
dependency-linker namespace --all

# Add new namespace
dependency-linker namespace --add components

# Remove namespace
dependency-linker namespace --remove old-namespace
```

### File Watching
```bash
# Watch specific namespace
dependency-linker watch --namespace source --interval 5000

# Watch all namespaces
dependency-linker watch --interval 1000
```

### Scheduled Analysis
```bash
# Run scheduled analysis once
dependency-linker schedule

# Run as daemon process
dependency-linker schedule --daemon
```

## 📋 Compliance Checking

### Built-in Rules
The tool includes several built-in compliance rules:

- **PascalCase Naming**: Exported symbols should follow PascalCase convention
- **camelCase Properties**: Interface properties should follow camelCase convention
- **Async Function Naming**: Async functions should have descriptive names

### Custom Rules
Create custom compliance rules:

```json
[
  {
    "id": "custom-naming",
    "name": "Custom Naming Convention",
    "description": "All functions should start with verb",
    "severity": "warning",
    "check": "function(symbols) { /* custom logic */ }"
  }
]
```

### Compliance Commands
```bash
# Check compliance with default rules
dependency-linker compliance --pattern "src/**/*.ts"

# Custom rules and severity
dependency-linker compliance --pattern "src/**/*.ts" \
  --rules custom-rules.json --severity warning
```

## ⚡ Performance Optimization

### High-Performance Analysis
```bash
# Enable performance optimizations
dependency-linker analyze --pattern "src/**/*.ts" --performance

# Custom performance settings
dependency-linker analyze --pattern "src/**/*.ts" --performance \
  --max-concurrency 16 \
  --batch-size 100 \
  --memory-limit 2048
```

### Performance Features
- **Intelligent Caching**: 6x performance improvement with file-based and memory caching
- **Batch Processing**: Process 50+ files simultaneously
- **Memory Management**: Automatic memory cleanup and configurable limits
- **Concurrent Processing**: Up to 8 parallel workers (configurable)
- **Real-time Monitoring**: Live performance metrics and throughput tracking

### Performance Results
```
📊 Performance Results (120 TypeScript files, 4,671 symbols):

First Run (No Cache):
- Time: 71.87ms
- Files/sec: 1,669.65
- Symbols/sec: 64,991.14
- Memory: 12.96MB peak
- Cache: 0 hits, 120 misses

Second Run (With Cache):
- Time: 11.46ms (6.3x faster)
- Files/sec: 10,469.07 (6.3x faster)
- Symbols/sec: 407,508.66 (6.3x faster)
- Memory: 10.41MB peak (20% less)
- Cache: 120 hits, 0 misses (100% hit rate)
```

## 🛠️ Programmatic Usage

### High-Performance Analysis
```typescript
import { analyzeFilesWithPerformance, DEFAULT_PERFORMANCE_CONFIG } from '@context-action/dependency-linker';

const config = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  maxConcurrency: 16,
  batchSize: 100,
  memoryLimit: 2048
};

const results = await analyzeFilesWithPerformance(files, 'typescript', config);
console.log(`Performance: ${results.metrics.filesPerSecond} files/sec`);
console.log(`Cache: ${results.cacheStats.hits} hits, ${results.cacheStats.misses} misses`);
```

### Namespace Management
```typescript
import { AnalysisNamespaceManager, createNamespaceConfig } from '@context-action/dependency-linker';

const manager = new AnalysisNamespaceManager('./dependency-linker.config.json');

// Add new namespace
const componentsNamespace = createNamespaceConfig(
  'components',
  'React components analysis',
  ['src/components/**/*.tsx'],
  ['src/components/**/*.test.tsx']
);

await manager.addNamespace(componentsNamespace);

// Run analysis
const report = await manager.runNamespace('components');
console.log(`Found ${report.summary.totalSymbols} symbols`);
```

### Query System Management
```typescript
import { AnalysisNamespaceManager } from '@context-action/dependency-linker';

const manager = new AnalysisNamespaceManager('./dependency-linker.config.json');

// Get available query categories
const categories = manager.getQueryCategories();
console.log('Available categories:', Object.keys(categories));

// Get active queries for namespace
const activeQueries = await manager.getActiveQueriesForNamespace('source');
console.log('Active queries:', activeQueries);

// Configure custom queries
const customConfig = {
  queries: {
    categories: ['basic-analysis', 'symbol-definitions'],
    custom: {
      enabled: true,
      queryIds: ['custom-query-1', 'custom-query-2']
    },
    options: {
      enableParallelExecution: true,
      enableCaching: true,
      maxConcurrency: 4
    }
  }
};
```

### Type-Safe Analysis
```typescript
import { analyzeFileTypeSafe } from '@context-action/dependency-linker';

const { result, symbols, errors } = await analyzeFileTypeSafe(
  sourceCode,
  'typescript',
  'MyFile.ts'
);

console.log(`Found ${symbols.length} symbols`);
symbols.forEach(symbol => {
  console.log(`${symbol.name} (${symbol.type}) - ${symbol.isExported ? 'exported' : 'internal'}`);
});
```

### Compliance Checking
```typescript
import { checkCompliance, DEFAULT_COMPLIANCE_RULES } from '@context-action/dependency-linker';

const customRule = {
  id: 'custom-naming',
  name: 'Custom Naming Convention',
  description: 'All functions should start with verb',
  severity: 'warning' as const,
  check: (symbols) => {
    const violations = symbols.filter(s => 
      s.type === 'function' && !s.name.match(/^(get|set|is|has|can|should)/)
    );
    return {
      ruleId: 'custom-naming',
      passed: violations.length === 0,
      message: `${violations.length} functions violate naming convention`,
      affectedSymbols: violations.map(v => v.name),
      suggestions: violations.map(v => `Consider renaming ${v.name} to start with a verb`)
    };
  }
};

const results = checkCompliance(symbols, [...DEFAULT_COMPLIANCE_RULES, customRule]);
```

## 📊 Output Formats

### JSON Output
```json
{
  "timestamp": "2025-10-05T12:52:07.194Z",
  "summary": {
    "totalFiles": 120,
    "totalSymbols": 4671,
    "exportedSymbols": 15,
    "complianceScore": 85.5
  },
  "symbols": [
    {
      "name": "MyClass",
      "type": "class",
      "filePath": "src/MyClass.ts",
      "startLine": 1,
      "endLine": 10,
      "isExported": true,
      "metadata": {
        "isAbstract": false,
        "isStatic": false,
        "accessModifier": "public"
      }
    }
  ],
  "compliance": [
    {
      "ruleId": "exported-symbols-naming",
      "passed": true,
      "message": "All exported symbols follow PascalCase convention",
      "affectedSymbols": [],
      "suggestions": []
    }
  ],
  "statistics": {
    "byType": {
      "function": 139,
      "interface": 224,
      "class": 61,
      "method": 1293,
      "property": 2935,
      "enum": 7
    },
    "byFile": {
      "src/MyClass.ts": 15,
      "src/utils.ts": 8
    },
    "byExport": {
      "exported": 15,
      "internal": 4656
    }
  }
}
```

### CSV Output
```csv
name,type,filePath,startLine,endLine,isExported
MyClass,class,src/MyClass.ts,1,10,true
myFunction,function,src/utils.ts,5,8,false
```

## 🔧 Configuration Options

### Performance Configuration
```typescript
interface PerformanceConfig {
  maxConcurrency: number;        // Maximum concurrent files (default: 8)
  batchSize: number;            // Files per batch (default: 50)
  enableCaching: boolean;       // Enable caching (default: true)
  cacheDirectory: string;       // Cache directory (default: ./.dependency-linker-cache)
  enableWorkerThreads: boolean; // Enable worker threads (default: true)
  enableStreaming: boolean;     // Enable streaming (default: true)
  memoryLimit: number;         // Memory limit in MB (default: 1024)
}
```

### Namespace Configuration
```typescript
interface NamespaceConfig {
  name: string;
  description: string;
  patterns: {
    include: string[];         // Glob patterns to include
    exclude: string[];         // Glob patterns to exclude
  };
  analysis: {
    enabled: boolean;
    options: {
      enableParallelExecution: boolean;
      enableCaching: boolean;
    };
  };
  compliance: {
    enabled: boolean;
    rules: string[];            // Rule IDs to apply
    customRules?: ComplianceRule[];
  };
  output: {
    format: 'json' | 'csv' | 'table';
    destination: string;
    includeMetadata: boolean;
    includeStatistics: boolean;
  };
  schedule?: {
    enabled: boolean;
    interval: number;           // Milliseconds
    cron?: string;
  };
}
```

## 🎯 Best Practices

### 1. Project Organization
- Use namespaces to organize files by purpose (source, tests, docs)
- Configure appropriate include/exclude patterns
- Set up compliance rules for your coding standards

### 2. Performance Optimization
- Enable caching for repeated analysis
- Use appropriate batch sizes for your project size
- Monitor memory usage for large projects

### 3. Compliance Checking
- Start with built-in rules and add custom rules as needed
- Use appropriate severity levels (error, warning, info)
- Provide helpful suggestions for rule violations

### 4. Continuous Integration
- Use scheduled analysis for regular quality checks
- Set up file watching for development workflows
- Integrate compliance checking into CI/CD pipelines

## 🚨 Troubleshooting

### Common Issues

#### Tree-sitter Parsing Errors
The tool includes robust regex-based fallback parsing to ensure 100% success rate. If you encounter parsing errors, the tool will automatically fall back to regex-based analysis.

#### Memory Issues
For large projects, adjust memory limits:
```bash
dependency-linker analyze --performance --memory-limit 2048
```

#### Performance Issues
Optimize performance settings:
```bash
dependency-linker analyze --performance \
  --max-concurrency 4 \
  --batch-size 25
```

### Debug Mode
Enable verbose logging:
```bash
DEBUG=dependency-linker:* dependency-linker analyze --pattern "src/**/*.ts"
```

## 📚 Additional Resources

- [API Documentation](./docs/API.md) - Complete API reference
- [Configuration Guide](./docs/CONVENTIONS.md) - Configuration best practices
- [Performance Guide](./docs/PERFORMANCE.md) - Performance optimization tips
- [Compliance Guide](./docs/COMPLIANCE.md) - Compliance checking setup