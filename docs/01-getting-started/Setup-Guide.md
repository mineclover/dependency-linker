# Setup Guide

## Installation & Configuration

### Prerequisites

#### System Requirements
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 or **yarn**: >= 3.0.0
- **Operating System**: macOS, Linux, Windows
- **Memory**: Minimum 2GB RAM (recommended 4GB+ for large projects)

#### Language-Specific Requirements

**TypeScript/JavaScript Projects**:
- TypeScript >= 4.5.0 (if using TypeScript)
- No additional dependencies

**Java Projects**:
- Java 8+ (for tree-sitter-java parser)
- No JDK required for analysis-only usage

**Python Projects**:
- Python 3.8+ (for tree-sitter-python parser)
- No Python interpreter required for analysis-only usage

**Go Projects**:
- Go 1.18+ (for tree-sitter-go parser)
- No Go compiler required for analysis-only usage

### Installation

#### Option 1: npm
```bash
npm install @context-action/dependency-linker
```

#### Option 2: yarn
```bash
yarn add @context-action/dependency-linker
```

#### Option 3: pnpm
```bash
pnpm add @context-action/dependency-linker
```

### Verification

Verify installation with a quick test:

```typescript
// test-installation.js
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const code = `
import React from 'react';
export const Component = () => <div>Hello</div>;
`;

async function test() {
  try {
    const result = await analyzeTypeScriptFile(code, 'test.tsx');
    console.log('✅ Installation successful!');
    console.log(`Found ${result.queryResults['ts-import-sources']?.length || 0} imports`);
  } catch (error) {
    console.log('❌ Installation failed:', error.message);
  }
}

test();
```

Run test:
```bash
node test-installation.js
```

Expected output:
```
✅ Installation successful!
Found 1 imports
```

## Project Setup

### Basic TypeScript Project

#### 1. Initialize Project
```bash
mkdir my-analysis-project
cd my-analysis-project
npm init -y
npm install typescript @types/node
npm install @context-action/dependency-linker
```

#### 2. Create tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 3. Create Basic Analysis Script
```typescript
// src/analyze.ts
import {
  analyzeTypeScriptFile,
  createCustomKeyMapper,
  initializeAnalysisSystem
} from '@context-action/dependency-linker';

// Initialize the system
initializeAnalysisSystem();

async function analyzeProject() {
  const sourceCode = `
    import React, { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import type { User } from './types';

    export const UserProfile: React.FC = () => {
      const [user, setUser] = useState<User | null>(null);
      return <Button>Hello {user?.name}</Button>;
    };
  `;

  // Basic analysis
  const analysis = await analyzeTypeScriptFile(sourceCode, 'UserProfile.tsx');

  console.log('📊 Analysis Results:');
  console.log(`- Imports: ${analysis.queryResults['ts-import-sources']?.length || 0}`);
  console.log(`- Named imports: ${analysis.queryResults['ts-named-imports']?.length || 0}`);
  console.log(`- Exports: ${analysis.queryResults['ts-export-declarations']?.length || 0}`);

  // Custom mapping analysis
  const customMapping = {
    "리액트_임포트": "ts-import-sources",
    "컴포넌트_익스포트": "ts-export-declarations"
  };

  const customAnalysis = await analyzeTypeScriptFile(sourceCode, 'UserProfile.tsx', {
    customMapping,
    customConditions: {
      "리액트_임포트": true,
      "컴포넌트_익스포트": true
    }
  });

  console.log('\n🎯 Custom Results:');
  if (customAnalysis.customResults) {
    Object.entries(customAnalysis.customResults).forEach(([key, results]) => {
      console.log(`- ${key}: ${results.length} items`);
    });
  }
}

analyzeProject().catch(console.error);
```

#### 4. Run Analysis
```bash
npx tsx src/analyze.ts
```

### Multi-Language Project Setup

#### Project Structure
```
multi-lang-analysis/
├── package.json
├── src/
│   ├── analyze-typescript.ts
│   ├── analyze-java.ts
│   ├── analyze-python.ts
│   └── analyze-go.ts
├── samples/
│   ├── sample.ts
│   ├── Sample.java
│   ├── sample.py
│   └── sample.go
└── results/
    └── analysis-output.json
```

#### Multi-Language Analysis Script
```typescript
// src/multi-language-analyzer.ts
import {
  analyzeFile,
  analyzeTypeScriptFile,
  analyzeJavaFile,
  analyzePythonFile,
  createCustomKeyMapper,
  initializeAnalysisSystem
} from '@context-action/dependency-linker';
import { readFileSync, writeFileSync } from 'fs';

// Initialize system once
initializeAnalysisSystem({
  enableCaching: true,
  maxConcurrency: 5,
  logLevel: 'info'
});

async function analyzeProject() {
  const files = [
    { path: 'samples/sample.ts', language: 'typescript' },
    { path: 'samples/Sample.java', language: 'java' },
    { path: 'samples/sample.py', language: 'python' },
    { path: 'samples/sample.go', language: 'go' }
  ];

  const results = [];

  for (const file of files) {
    try {
      const content = readFileSync(file.path, 'utf-8');
      let analysis;

      switch (file.language) {
        case 'typescript':
          analysis = await analyzeTypeScriptFile(content, file.path);
          break;
        case 'java':
          analysis = await analyzeJavaFile(content, file.path);
          break;
        case 'python':
          analysis = await analyzePythonFile(content, file.path);
          break;
        default:
          analysis = await analyzeFile(content, file.path);
      }

      results.push({
        file: file.path,
        language: file.language,
        analysis: {
          nodeCount: analysis.parseMetadata.nodeCount,
          executionTime: analysis.performanceMetrics.totalExecutionTime,
          queryCount: Object.keys(analysis.queryResults).length
        }
      });

      console.log(`✅ Analyzed ${file.path} (${file.language})`);
    } catch (error) {
      console.error(`❌ Failed to analyze ${file.path}:`, error.message);
    }
  }

  // Save results
  writeFileSync('results/analysis-output.json', JSON.stringify(results, null, 2));
  console.log('📄 Results saved to results/analysis-output.json');
}

analyzeProject().catch(console.error);
```

## CLI Tools Setup

### Global CLI Installation
```bash
npm install -g @context-action/dependency-linker
```

### Available Commands
```bash
# Analyze a single file
analyze-file src/component.tsx

# Analyze with custom output
analyze-file src/component.tsx --output=json --pretty

# Batch analysis
tsdl analyze src/ --recursive --output=report.json

# Help
analyze-file --help
tsdl --help
```

### CLI Configuration File
Create `.dependency-linker.json` in your project root:

```json
{
  "defaultLanguage": "typescript",
  "outputFormat": "json",
  "enableCaching": true,
  "maxConcurrency": 10,
  "customMappings": {
    "imports": "ts-import-sources",
    "exports": "ts-export-declarations",
    "types": "ts-type-imports"
  },
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "*.test.ts",
    "*.spec.ts"
  ]
}
```

## IDE Integration

### Visual Studio Code

#### Extension Setup
1. Install the "Dependency Linker" extension
2. Configure in VS Code settings:

```json
{
  "dependencyLinker.enableAutoAnalysis": true,
  "dependencyLinker.customMappings": {
    "imports": "ts-import-sources",
    "exports": "ts-export-declarations"
  },
  "dependencyLinker.analysisOnSave": true
}
```

#### Custom Tasks
Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Analyze Current File",
      "type": "shell",
      "command": "analyze-file",
      "args": ["${file}"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### JetBrains IDEs

#### Plugin Installation
1. Install "Dependency Linker" plugin from marketplace
2. Configure in Settings > Tools > Dependency Linker

#### Custom Run Configurations
Create run configuration for analysis:
- **Name**: Analyze Project
- **Command**: `npx analyze-file`
- **Arguments**: `$FilePath$`
- **Working Directory**: `$ProjectFileDir$`

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/dependency-analysis.yml`:

```yaml
name: Dependency Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Install Dependency Linker
        run: npm install -g @context-action/dependency-linker

      - name: Analyze Project
        run: |
          tsdl analyze src/ --output=analysis.json
          echo "Analysis complete"

      - name: Upload Analysis Results
        uses: actions/upload-artifact@v3
        with:
          name: dependency-analysis
          path: analysis.json
```



## Docker Setup

### Dockerfile
```dockerfile
FROM node:18-alpine

# Install dependency linker
RUN npm install -g @context-action/dependency-linker

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Default command
CMD ["tsdl", "analyze", "src/", "--output=analysis.json"]
```


## Environment Configuration

### Development Environment
```bash
# .env.development
NODE_ENV=development
DEPENDENCY_LINKER_LOG_LEVEL=debug
DEPENDENCY_LINKER_CACHE=true
DEPENDENCY_LINKER_MAX_CONCURRENCY=5
```

### Production Environment
```bash
# .env.production
NODE_ENV=production
DEPENDENCY_LINKER_LOG_LEVEL=error
DEPENDENCY_LINKER_CACHE=true
DEPENDENCY_LINKER_MAX_CONCURRENCY=10
DEPENDENCY_LINKER_MEMORY_LIMIT=512MB
```

### Configuration Loading
```typescript
import { initializeAnalysisSystem } from '@context-action/dependency-linker';

// Load configuration from environment
initializeAnalysisSystem({
  logLevel: process.env.DEPENDENCY_LINKER_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',
  enableCaching: process.env.DEPENDENCY_LINKER_CACHE === 'true',
  maxConcurrency: parseInt(process.env.DEPENDENCY_LINKER_MAX_CONCURRENCY || '10'),
  memoryLimit: process.env.DEPENDENCY_LINKER_MEMORY_LIMIT
});
```

## Troubleshooting

### Common Issues

#### Issue 1: Parser Not Found
**Error**: `No parser registered for language: [language]`

**Solution**:
```typescript
// Import language support explicitly
import '@context-action/dependency-linker/typescript';
import '@context-action/dependency-linker/java';
import '@context-action/dependency-linker/python';
import '@context-action/dependency-linker/go';
```

#### Issue 2: Memory Issues
**Error**: `JavaScript heap out of memory`

**Solutions**:
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 your-script.js

# Or configure memory limit
DEPENDENCY_LINKER_MEMORY_LIMIT=2GB node your-script.js
```

#### Issue 3: Performance Issues
**Symptoms**: Slow analysis, high CPU usage

**Solutions**:
```typescript
// Reduce concurrency
initializeAnalysisSystem({
  maxConcurrency: 2
});

// Enable caching
initializeAnalysisSystem({
  enableCaching: true,
  cacheSize: '100MB'
});

// Use batch processing
const results = await Promise.all(
  files.slice(0, 10).map(file => analyzeFile(file.content, file.path))
);
```

### Debug Mode

Enable debug logging:

```typescript
import { initializeAnalysisSystem } from '@context-action/dependency-linker';

initializeAnalysisSystem({
  logLevel: 'debug'
});
```

Or via environment:
```bash
DEPENDENCY_LINKER_LOG_LEVEL=debug node your-script.js
```

### Health Check

Create a health check script:

```typescript
// health-check.ts
import {
  analyzeTypeScriptFile,
  initializeAnalysisSystem
} from '@context-action/dependency-linker';

async function healthCheck() {
  try {
    initializeAnalysisSystem();

    const testCode = 'import React from "react"; export default React;';
    const result = await analyzeTypeScriptFile(testCode, 'test.tsx');

    console.log('✅ Health check passed');
    console.log(`- Parse time: ${result.parseMetadata.parseTime}ms`);
    console.log(`- Execution time: ${result.performanceMetrics.totalExecutionTime}ms`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

healthCheck();
```

Run health check:
```bash
npx tsx health-check.ts
```

---

**Setup Guide Version**: 2.1.0
**Last Updated**: 2025-09-29
**Support**: For setup issues, see [Migration Guide](./Migration-Guide.md) and [API Reference](./API.md)