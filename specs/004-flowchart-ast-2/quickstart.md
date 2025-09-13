# Quickstart: Multi-Language AST Analysis Framework

## Overview
This guide demonstrates how to use the refactored AST-based code analysis framework to analyze code in multiple languages with extensible analysis types.

## Installation

```bash
npm install ast-analysis-core
# or
yarn add ast-analysis-core
```

## Basic Usage

### 1. Initialize Analysis Engine

```typescript
import { AnalysisEngine, TypeScriptParser, GoParser, DependencyExtractor, DependencyAnalysisInterpreter } from 'ast-analysis-core';

const engine = new AnalysisEngine();

// Register language parsers
engine.registerParser(new TypeScriptParser());
engine.registerParser(new GoParser());

// Register analysis plugins
engine.registerExtractor(new DependencyExtractor());
engine.registerInterpreter(new DependencyAnalysisInterpreter());

// Initialize with configuration
await engine.initialize({
  enabledExtractors: ['dependency'],
  enabledInterpreters: ['dependency-analysis'],
  cacheSettings: { enabled: true, ttlMs: 3600000 },
  parallelism: 4,
  timeout: 30000,
  languageSettings: {
    typescript: { includeTypeImports: true },
    go: { includeTestFiles: false }
  }
});
```

### 2. Analyze Single File

```typescript
// Analyze a TypeScript file
const result = await engine.analyzeFile('./src/components/Button.tsx');

if (result.success) {
  console.log(`Language: ${result.language}`);
  console.log(`Dependencies found: ${result.interpretedResults['dependency-analysis'].dependencies.length}`);

  // Access raw extracted data
  const dependencyData = result.extractedData.filter(d => d.type === 'dependency');
  console.log('Raw dependencies:', dependencyData);

  // Access interpreted results
  const analysis = result.interpretedResults['dependency-analysis'];
  console.log('External packages:', analysis.externalPackages);
  console.log('Internal modules:', analysis.internalModules);
} else {
  console.error('Analysis failed:', result.errors);
}
```

### 3. Batch Analysis

```typescript
const files = [
  './src/components/Button.tsx',
  './src/utils/helpers.ts',
  './services/api.go',
  './models/user.go'
];

const results = await engine.analyzeFiles(files, {
  concurrency: 2,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
  onError: (filePath, error) => {
    console.error(`Failed to analyze ${filePath}:`, error.message);
  }
});

// Process results
const successfulResults = results.filter(r => r.success);
console.log(`Successfully analyzed ${successfulResults.length}/${results.length} files`);
```

## Adding Custom Analysis Types

### 1. Create Custom Extractor

```typescript
import { IDataExtractor, SourceLocation } from 'ast-analysis-core';

interface FunctionData {
  name: string;
  parameters: string[];
  returnType?: string;
  location: SourceLocation;
}

class FunctionExtractor implements IDataExtractor<FunctionData> {
  readonly name = 'function';
  readonly version = '1.0.0';
  readonly supportedLanguages = ['typescript', 'javascript'];
  readonly outputType = 'function';

  async extract(ast, source, filePath, language): Promise<FunctionData[]> {
    const functions: FunctionData[] = [];

    const visit = (node) => {
      if (node.type === 'function_declaration') {
        const name = node.childForFieldName('name')?.text || 'anonymous';
        const params = this.extractParameters(node);

        functions.push({
          name,
          parameters: params,
          location: {
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            offset: node.startIndex
          }
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        visit(node.child(i));
      }
    };

    visit(ast.rootNode);
    return functions;
  }

  supportsLanguage(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }

  private extractParameters(node: any): string[] {
    // Implementation to extract function parameters
    return [];
  }
}
```

### 2. Create Custom Interpreter

```typescript
import { IDataInterpreter, AnalysisContext } from 'ast-analysis-core';

interface FunctionAnalysisResult {
  totalFunctions: number;
  averageParameterCount: number;
  functionsByComplexity: Record<string, string[]>;
  unusedFunctions: string[];
}

class FunctionAnalysisInterpreter implements IDataInterpreter<FunctionData, FunctionAnalysisResult> {
  readonly name = 'function-analysis';
  readonly version = '1.0.0';
  readonly inputType = 'function';
  readonly outputType = 'function-analysis';
  readonly dependencies = [];

  async interpret(data: FunctionData[], context: AnalysisContext): Promise<FunctionAnalysisResult> {
    const totalFunctions = data.length;
    const averageParameterCount = data.reduce((sum, f) => sum + f.parameters.length, 0) / totalFunctions;

    const functionsByComplexity = {
      simple: data.filter(f => f.parameters.length <= 2).map(f => f.name),
      moderate: data.filter(f => f.parameters.length > 2 && f.parameters.length <= 5).map(f => f.name),
      complex: data.filter(f => f.parameters.length > 5).map(f => f.name)
    };

    return {
      totalFunctions,
      averageParameterCount,
      functionsByComplexity,
      unusedFunctions: [] // Would require cross-reference analysis
    };
  }

  supportsInputType(inputType: string): boolean {
    return inputType === this.inputType;
  }
}
```

### 3. Register and Use Custom Plugins

```typescript
// Register custom plugins
engine.registerExtractor(new FunctionExtractor());
engine.registerInterpreter(new FunctionAnalysisInterpreter());

// Update configuration
await engine.initialize({
  enabledExtractors: ['dependency', 'function'],
  enabledInterpreters: ['dependency-analysis', 'function-analysis'],
  // ... other config
});

// Analyze with custom plugins
const result = await engine.analyzeFile('./src/utils/helpers.ts');
const functionAnalysis = result.interpretedResults['function-analysis'];
console.log('Function analysis:', functionAnalysis);
```

## Multi-Language Analysis

```typescript
// Analyze mixed-language project
const projectFiles = [
  './frontend/src/App.tsx',        // TypeScript
  './backend/handlers/user.go',    // Go
  './shared/models/User.java',     // Java
  './scripts/deploy.py'            // Python (if parser registered)
];

const results = await engine.analyzeFiles(projectFiles);

// Group results by language
const resultsByLanguage = results.reduce((acc, result) => {
  if (!acc[result.language]) acc[result.language] = [];
  acc[result.language].push(result);
  return acc;
}, {});

console.log('Languages analyzed:', Object.keys(resultsByLanguage));
```

## Performance Monitoring

```typescript
// Get engine status and performance metrics
const status = engine.getStatus();
console.log('Engine Status:', {
  initialized: status.initialized,
  parsers: status.registeredParsers,
  extractors: status.registeredExtractors,
  interpreters: status.registeredInterpreters,
  cacheHitRate: status.cacheStats.hitRate,
  averageAnalysisTime: status.performance.averageAnalysisTime
});

// Monitor individual analysis performance
const result = await engine.analyzeFile('./large-file.ts');
console.log('Performance:', {
  parseTime: result.performance.parseTime,
  extractionTime: result.performance.extractionTime,
  interpretationTime: result.performance.interpretationTime,
  totalTime: result.performance.totalTime
});
```

## CLI Usage

```bash
# Analyze single file
ast-analyze ./src/index.ts --format json --output results.json

# Batch analysis with specific extractors
ast-analyze ./src/**/*.ts --extractors dependency,identifier --interpreters dependency-analysis,identifier-analysis

# Multi-language analysis
ast-analyze ./src/**/*.{ts,go,java} --config analysis.config.json

# Performance monitoring
ast-analyze ./src --monitor --output-metrics metrics.json
```

## Configuration File Example

```json
{
  "enabledExtractors": ["dependency", "identifier", "complexity"],
  "enabledInterpreters": ["dependency-analysis", "identifier-analysis"],
  "cacheSettings": {
    "enabled": true,
    "ttlMs": 3600000,
    "maxEntries": 10000
  },
  "parallelism": 8,
  "timeout": 60000,
  "languageSettings": {
    "typescript": {
      "includeTypeImports": true,
      "includeDeclarationFiles": false
    },
    "go": {
      "includeTestFiles": true,
      "analyzeBuildTags": ["integration"]
    },
    "java": {
      "includeAnnotations": true,
      "analyzeGenerics": true
    }
  }
}
```

## Next Steps

1. **Extend Language Support**: Add parsers for additional languages
2. **Custom Analysis Types**: Create domain-specific extractors and interpreters
3. **Integration**: Integrate with build tools, IDEs, or CI/CD pipelines
4. **Performance Tuning**: Optimize for your specific use cases and file sizes

For more detailed examples and advanced usage, see the [API documentation](./contracts/) and [data model specification](./data-model.md).