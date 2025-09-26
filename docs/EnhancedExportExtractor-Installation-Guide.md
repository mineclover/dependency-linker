# EnhancedExportExtractor - Installation & Usage Guide

## 📦 Installation

### NPM Installation

```bash
npm install @context-action/dependency-linker
```

### Yarn Installation

```bash
yarn add @context-action/dependency-linker
```

## 🚀 Quick Start

### Basic Usage

```typescript
import {
  EnhancedExportExtractor,
  TypeScriptParser
} from '@context-action/dependency-linker';

// Initialize components
const parser = new TypeScriptParser();
const extractor = new EnhancedExportExtractor();

// Analyze a TypeScript file
async function analyzeFile(filePath: string) {
  const parseResult = await parser.parse(filePath);

  if (parseResult.ast) {
    const exportData = extractor.extractExports(parseResult.ast, filePath);
    console.log('Export Analysis:', exportData);
  }
}

// Usage
analyzeFile('./src/components/MyComponent.ts');
```

### Advanced Usage with Configuration

```typescript
import {
  EnhancedExportExtractor,
  TypeScriptParser,
  type EnhancedExportExtractionResult
} from '@context-action/dependency-linker';

class ExportAnalyzer {
  private parser = new TypeScriptParser();
  private extractor = new EnhancedExportExtractor();

  constructor() {
    // Configure the extractor
    this.extractor.configure({
      enabled: true,
      timeout: 10000,
      memoryLimit: 50 * 1024 * 1024, // 50MB
      defaultOptions: {
        includeLocations: true,
        includeComments: false,
        maxDepth: 15
      }
    });
  }

  async analyzeExports(
    filePath: string,
    sourceCode?: string
  ): Promise<EnhancedExportExtractionResult | null> {
    try {
      // Parse the file
      const parseResult = await this.parser.parse(filePath, sourceCode);

      if (!parseResult.ast || parseResult.errors.length > 0) {
        console.error('Parsing failed:', parseResult.errors);
        return null;
      }

      // Extract exports
      const result = this.extractor.extractExports(parseResult.ast, filePath);

      // Validate the result
      const validation = this.extractor.validate(result);
      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
      return null;
    }
  }

  printExportSummary(result: EnhancedExportExtractionResult) {
    console.log('\n📊 Export Summary:');
    console.log(`  Functions: ${result.statistics.functionExports}`);
    console.log(`  Classes: ${result.statistics.classExports}`);
    console.log(`  Variables: ${result.statistics.variableExports}`);
    console.log(`  Types: ${result.statistics.typeExports}`);
    console.log(`  Default Exports: ${result.statistics.defaultExports}`);
    console.log(`  Total: ${result.statistics.totalExports}`);

    if (result.classes.length > 0) {
      console.log('\n🏗️  Class Details:');
      result.classes.forEach(cls => {
        console.log(`  ${cls.className}:`);
        console.log(`    Methods: ${cls.methods.length}`);
        console.log(`    Properties: ${cls.properties.length}`);
        if (cls.superClass) {
          console.log(`    Extends: ${cls.superClass}`);
        }
      });
    }
  }
}

// Example usage
const analyzer = new ExportAnalyzer();

analyzer.analyzeExports('./src/services/UserService.ts').then(result => {
  if (result) {
    analyzer.printExportSummary(result);
  }
});
```

## 📚 API Reference

### EnhancedExportExtractor

#### Main Methods

```typescript
// Extract exports from AST
extractExports(ast: Parser.Tree, filePath: string): EnhancedExportExtractionResult

// Validate extraction results
validate(data: EnhancedExportExtractionResult): ValidationResult

// Configure the extractor
configure(options: ExtractorConfiguration): void

// Get current configuration
getConfiguration(): ExtractorConfiguration

// Interface compliance
supports(language: string): boolean
getName(): string
getVersion(): string
getMetadata(): ExtractorMetadata
```

#### Result Types

```typescript
interface EnhancedExportExtractionResult {
  exportMethods: ExportMethodInfo[];     // All export items
  statistics: ExportStatistics;         // Summary statistics
  classes: ClassExportInfo[];           // Detailed class info
}

interface ExportMethodInfo {
  name: string;
  exportType: ExportType;
  declarationType: DeclarationType;
  location: SourceLocation;
  parentClass?: string;
  isAsync?: boolean;
  isStatic?: boolean;
  visibility?: 'public' | 'private' | 'protected';
  parameters?: ParameterInfo[];
  returnType?: string;
}

interface ExportStatistics {
  totalExports: number;
  functionExports: number;
  classExports: number;
  variableExports: number;
  typeExports: number;
  defaultExports: number;
  classMethodsExports: number;
  classPropertiesExports: number;
}

interface ClassExportInfo {
  className: string;
  location: SourceLocation;
  methods: ClassMethodInfo[];
  properties: ClassPropertyInfo[];
  isDefaultExport: boolean;
  superClass?: string;
  implementsInterfaces?: string[];
}
```

#### Export Types

```typescript
type ExportType =
  | 'function'
  | 'class'
  | 'variable'
  | 'type'
  | 'enum'
  | 'default'
  | 'class_method'
  | 'class_property'
  | 're_export';
```

## 🛠️ Integration Examples

### Express.js API Endpoint

```typescript
import express from 'express';
import { EnhancedExportExtractor, TypeScriptParser } from '@context-action/dependency-linker';
import fs from 'fs/promises';

const app = express();
const parser = new TypeScriptParser();
const extractor = new EnhancedExportExtractor();

app.post('/analyze-exports', async (req, res) => {
  try {
    const { filePath, sourceCode } = req.body;

    let code = sourceCode;
    if (!code && filePath) {
      code = await fs.readFile(filePath, 'utf-8');
    }

    const parseResult = await parser.parse(filePath || 'input.ts', code);

    if (!parseResult.ast) {
      return res.status(400).json({
        error: 'Failed to parse code',
        details: parseResult.errors
      });
    }

    const result = extractor.extractExports(parseResult.ast, filePath || 'input.ts');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Export analyzer API running on port 3000');
});
```

### CLI Tool

```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { EnhancedExportExtractor, TypeScriptParser } from '@context-action/dependency-linker';
import fs from 'fs/promises';
import path from 'path';

const parser = new TypeScriptParser();
const extractor = new EnhancedExportExtractor();

program
  .name('export-analyzer')
  .description('Analyze TypeScript/JavaScript exports')
  .version('1.0.0');

program
  .argument('<file>', 'File to analyze')
  .option('-j, --json', 'Output as JSON')
  .option('-s, --summary', 'Show summary only')
  .option('-v, --verbose', 'Verbose output')
  .action(async (file, options) => {
    try {
      const filePath = path.resolve(file);
      const sourceCode = await fs.readFile(filePath, 'utf-8');

      const parseResult = await parser.parse(filePath, sourceCode);

      if (!parseResult.ast) {
        console.error('❌ Failed to parse file:', parseResult.errors);
        process.exit(1);
      }

      const result = extractor.extractExports(parseResult.ast, filePath);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.summary) {
        console.log('📊 Export Summary:');
        Object.entries(result.statistics).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      } else {
        console.log(`📁 Analysis of ${file}:`);
        console.log('\n📊 Statistics:');
        Object.entries(result.statistics).forEach(([key, value]) => {
          if (value > 0) {
            console.log(`  ${key}: ${value}`);
          }
        });

        if (options.verbose && result.exportMethods.length > 0) {
          console.log('\n📋 Detailed Exports:');
          result.exportMethods.forEach((exp, index) => {
            console.log(`  ${index + 1}. ${exp.name} (${exp.exportType})`);
            if (exp.parentClass) {
              console.log(`     └─ Class: ${exp.parentClass}`);
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

### React Component

```typescript
import React, { useState, useCallback } from 'react';
import { EnhancedExportExtractor, TypeScriptParser } from '@context-action/dependency-linker';

const ExportAnalyzerComponent: React.FC = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzer = new EnhancedExportExtractor();
  const parser = new TypeScriptParser();

  const analyzeCode = useCallback(async () => {
    if (!sourceCode.trim()) return;

    setLoading(true);
    try {
      const parseResult = await parser.parse('input.ts', sourceCode);

      if (parseResult.ast) {
        const exportData = analyzer.extractExports(parseResult.ast, 'input.ts');
        setResult(exportData);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, [sourceCode]);

  return (
    <div className="export-analyzer">
      <textarea
        value={sourceCode}
        onChange={(e) => setSourceCode(e.target.value)}
        placeholder="Paste your TypeScript code here..."
        rows={10}
        cols={80}
      />

      <button onClick={analyzeCode} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Exports'}
      </button>

      {result && (
        <div className="results">
          <h3>Export Statistics</h3>
          <ul>
            <li>Total Exports: {result.statistics.totalExports}</li>
            <li>Functions: {result.statistics.functionExports}</li>
            <li>Classes: {result.statistics.classExports}</li>
            <li>Variables: {result.statistics.variableExports}</li>
            <li>Types: {result.statistics.typeExports}</li>
          </ul>

          <h3>Export Details</h3>
          <ul>
            {result.exportMethods.map((exp, index) => (
              <li key={index}>
                <strong>{exp.name}</strong> ({exp.exportType})
                {exp.parentClass && <em> in {exp.parentClass}</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExportAnalyzerComponent;
```

## ⚙️ Configuration Options

```typescript
interface ExtractorConfiguration {
  enabled: boolean;
  timeout: number;              // ms
  memoryLimit: number;          // bytes
  defaultOptions: {
    includeLocations: boolean;
    includeComments: boolean;
    maxDepth: number;
  };
}

// Example configuration
extractor.configure({
  enabled: true,
  timeout: 15000,              // 15 seconds
  memoryLimit: 100 * 1024 * 1024, // 100MB
  defaultOptions: {
    includeLocations: true,
    includeComments: false,
    maxDepth: 20
  }
});
```

## 🎯 Supported Features

- ✅ **Function Exports**: `export function foo()`, `export async function bar()`
- ✅ **Class Exports**: `export class MyClass`, `export abstract class Base`
- ✅ **Variable Exports**: `export const API_URL`, `export let counter`
- ✅ **Type Exports**: `export interface User`, `export type Config`
- ✅ **Default Exports**: `export default class`, `export default function`
- ✅ **Named Exports**: `export { foo, bar as baz }`
- ✅ **Re-exports**: `export { Utils } from './utils'`, `export * from './types'`
- ✅ **Class Members**: Methods, properties, visibility, static/async modifiers
- ✅ **Inheritance**: Class extends and implements detection
- ✅ **Location Tracking**: Line and column information
- ✅ **Parameter Analysis**: Function/method parameter extraction

## 🚨 Error Handling

```typescript
async function robustAnalysis(filePath: string) {
  const extractor = new EnhancedExportExtractor();
  const parser = new TypeScriptParser();

  try {
    const parseResult = await parser.parse(filePath);

    if (!parseResult.success) {
      console.error('Parsing failed:', parseResult.errors);
      return null;
    }

    const result = extractor.extractExports(parseResult.ast, filePath);

    // Validate result
    const validation = extractor.validate(result);
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn('Warnings:', validation.warnings);
    }

    return result;

  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Memory Issues**
   ```typescript
   extractor.configure({
     memoryLimit: 200 * 1024 * 1024 // Increase to 200MB
   });
   ```

2. **Timeout Issues**
   ```typescript
   extractor.configure({
     timeout: 30000 // Increase to 30 seconds
   });
   ```

3. **Parser Errors**
   ```typescript
   const parseResult = await parser.parse(filePath, sourceCode);
   if (parseResult.errors.length > 0) {
     console.log('Parser errors:', parseResult.errors);
   }
   ```

### Performance Tips

- Use appropriate memory limits for your use case
- Set reasonable timeouts for large files
- Consider processing files in batches for bulk analysis
- Cache parser instances for repeated use

## 📄 License

MIT License - see the [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see our [contributing guidelines](../CONTRIBUTING.md) for details.

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/context-action/dependency-linker/issues)
- **Documentation**: [Full API documentation](./EnhancedExportExtractor-Usage.md)
- **Examples**: [More usage examples](../examples/)