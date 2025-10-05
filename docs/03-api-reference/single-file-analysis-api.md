# Single File Analysis API

**Purpose**: Analyze individual source files and store results in graph database with absolute file paths.

---

## Overview

The Single File Analysis API provides a simple interface for analyzing individual files and storing their dependency information in a graph database. This API is ideal for:

- **Incremental Analysis**: Analyze files as they change in a development environment
- **File Watchers**: Integration with file system watchers for real-time updates
- **CI/CD Pipelines**: Analyze specific files affected by changes
- **IDE Integration**: Provide dependency insights for individual files
- **Quick Analysis**: Fast analysis without full project scanning

---

## Quick Start

### Basic Usage

```typescript
import { analyzeSingleFile } from '@context-action/dependency-linker/integration';

// Analyze a single file (absolute path required)
const result = await analyzeSingleFile('/absolute/path/to/file.ts');

console.log(`Analyzed: ${result.filePath}`);
console.log(`Language: ${result.language}`);
console.log(`Nodes created: ${result.stats.nodesCreated}`);
console.log(`Edges created: ${result.stats.edgesCreated}`);
console.log(`Time: ${result.stats.processingTime}ms`);
```

### With Options

```typescript
import { analyzeSingleFile } from '@context-action/dependency-linker/integration';

const result = await analyzeSingleFile('/absolute/path/to/file.ts', {
  projectName: 'My Project',
  projectRoot: '/absolute/path/to/project',
  dbPath: '/custom/path/to/graph.db',
  enableInference: true,
  replaceExisting: true,
});
```

---

## API Reference

### `analyzeSingleFile(filePath, options?)`

Analyzes a single file and stores results in graph database.

**Parameters**:
- `filePath` (string, required): Absolute path to the file
- `options` (SingleFileAnalysisOptions, optional): Analysis options

**Returns**: `Promise<SingleFileAnalysisResult>`

**Throws**: `SingleFileAnalysisError` on validation or analysis failure

**Example**:
```typescript
try {
  const result = await analyzeSingleFile('/project/src/main.ts', {
    enableInference: true
  });
  console.log(`Success: ${result.stats.nodesCreated} nodes`);
} catch (error) {
  if (error instanceof SingleFileAnalysisError) {
    console.error(`Error [${error.code}]: ${error.message}`);
  }
}
```

---

### `analyzeMultipleFiles(filePaths, options?)`

Analyzes multiple files in batch mode.

**Parameters**:
- `filePaths` (string[], required): Array of absolute file paths
- `options` (SingleFileAnalysisOptions, optional): Analysis options

**Returns**: `Promise<SingleFileAnalysisResult[]>`

**Example**:
```typescript
const results = await analyzeMultipleFiles([
  '/project/src/file1.ts',
  '/project/src/file2.ts',
  '/project/src/file3.ts'
], {
  projectName: 'Batch Analysis',
  enableInference: true
});

console.log(`Analyzed ${results.length} files`);
```

---

### `SingleFileAnalyzer`

Class-based API for reusing GraphAnalysisSystem instance.

**Constructor**:
```typescript
const analyzer = new SingleFileAnalyzer(graphSystem?);
```

**Methods**:

#### `analyze(filePath, options?)`
Analyzes a single file.

```typescript
const result = await analyzer.analyze('/path/to/file.ts', {
  enableInference: true
});
```

#### `analyzeMultiple(filePaths, options?)`
Analyzes multiple files.

```typescript
const results = await analyzer.analyzeMultiple([
  '/path/to/file1.ts',
  '/path/to/file2.ts'
]);
```

#### `close()`
Closes database connection.

```typescript
await analyzer.close();
```

**Example**:
```typescript
const analyzer = new SingleFileAnalyzer();

try {
  const result1 = await analyzer.analyze('/path/to/file1.ts');
  const result2 = await analyzer.analyze('/path/to/file2.ts');

  console.log('Both files analyzed');
} finally {
  await analyzer.close();
}
```

---

## Options

### `SingleFileAnalysisOptions`

```typescript
interface SingleFileAnalysisOptions {
  /**
   * Database path (default: file directory/.dependency-linker/graph.db)
   */
  dbPath?: string;

  /**
   * Project root path (default: file directory)
   */
  projectRoot?: string;

  /**
   * Project name (default: 'Single File Analysis')
   */
  projectName?: string;

  /**
   * Enable inference computation (default: true)
   */
  enableInference?: boolean;

  /**
   * Replace existing file data (default: true)
   */
  replaceExisting?: boolean;

  /**
   * Auto-detect language from extension (default: true)
   */
  autoDetectLanguage?: boolean;

  /**
   * Explicit language specification
   */
  language?: SupportedLanguage;
}
```

### Default Behavior

- **dbPath**: `.dependency-linker/graph.db` in file's directory
- **projectRoot**: Parent directory of the file
- **projectName**: `'Single File Analysis'`
- **enableInference**: `true` (compute inference relationships)
- **replaceExisting**: `true` (delete old data before re-analysis)
- **autoDetectLanguage**: `true` (detect from file extension)

---

## Result Structure

### `SingleFileAnalysisResult`

```typescript
interface SingleFileAnalysisResult {
  /**
   * Analyzed file path (absolute)
   */
  filePath: string;

  /**
   * Detected language
   */
  language: SupportedLanguage;

  /**
   * Parse result (imports, exports, declarations, etc.)
   */
  parseResult: ParseResult;

  /**
   * Graph storage result
   */
  storageResult: StorageResult;

  /**
   * Inference relationship count (if enabled)
   */
  inferenceCount?: number;

  /**
   * Analysis statistics
   */
  stats: {
    nodesCreated: number;
    edgesCreated: number;
    processingTime: number; // milliseconds
  };
}
```

**Example**:
```typescript
const result = await analyzeSingleFile('/path/to/file.ts');

// Access parsed data
console.log('Imports:', result.parseResult.imports);
console.log('Exports:', result.parseResult.exports);

// Access statistics
console.log('Nodes:', result.stats.nodesCreated);
console.log('Edges:', result.stats.edgesCreated);
console.log('Time:', result.stats.processingTime, 'ms');
```

---

## Error Handling

### `SingleFileAnalysisError`

Custom error class with error codes.

```typescript
class SingleFileAnalysisError extends Error {
  code: string;
  filePath?: string;
}
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_PATH` | Path is not absolute | Use absolute path |
| `FILE_NOT_FOUND` | File does not exist | Check file path |
| `NOT_A_FILE` | Path is directory | Provide file path |
| `UNSUPPORTED_FILE_TYPE` | File type not supported | Use supported extensions |
| `ANALYSIS_FAILED` | Analysis failed | Check file syntax |

### Example

```typescript
import { analyzeSingleFile, SingleFileAnalysisError } from '@context-action/dependency-linker/integration';

try {
  await analyzeSingleFile('/path/to/file.ts');
} catch (error) {
  if (error instanceof SingleFileAnalysisError) {
    switch (error.code) {
      case 'INVALID_PATH':
        console.error('Use absolute path');
        break;
      case 'FILE_NOT_FOUND':
        console.error('File does not exist');
        break;
      case 'UNSUPPORTED_FILE_TYPE':
        console.error('File type not supported');
        break;
      default:
        console.error('Analysis failed:', error.message);
    }
  }
}
```

---

## Use Cases

### 1. File Watcher Integration

```typescript
import { watch } from 'node:fs';
import { SingleFileAnalyzer } from '@context-action/dependency-linker/integration';

const analyzer = new SingleFileAnalyzer();

watch('/project/src', { recursive: true }, async (event, filename) => {
  if (filename?.endsWith('.ts')) {
    const filePath = `/project/src/${filename}`;

    try {
      const result = await analyzer.analyze(filePath);
      console.log(`Updated: ${filename} (${result.stats.nodesCreated} nodes)`);
    } catch (error) {
      console.error(`Failed to analyze ${filename}:`, error);
    }
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await analyzer.close();
  process.exit();
});
```

### 2. CI/CD Integration

```typescript
import { analyzeMultipleFiles } from '@context-action/dependency-linker/integration';
import { execSync } from 'node:child_process';

// Get changed files from git
const changedFiles = execSync('git diff --name-only HEAD~1')
  .toString()
  .split('\n')
  .filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
  .map(f => `/absolute/path/to/${f}`);

// Analyze changed files
const results = await analyzeMultipleFiles(changedFiles, {
  projectName: 'CI Analysis',
  dbPath: '/ci/workspace/graph.db'
});

console.log(`Analyzed ${results.length} changed files`);

// Check for issues
const failedAnalysis = results.filter(r => r.stats.nodesCreated === 0);
if (failedAnalysis.length > 0) {
  console.error('Some files failed analysis');
  process.exit(1);
}
```

### 3. IDE Extension

```typescript
import { SingleFileAnalyzer } from '@context-action/dependency-linker/integration';

class DependencyExtension {
  private analyzer = new SingleFileAnalyzer();

  async onDocumentSave(document: any) {
    const filePath = document.uri.fsPath;

    try {
      const result = await this.analyzer.analyze(filePath, {
        replaceExisting: true,
        enableInference: true
      });

      // Show notification
      this.showNotification(
        `Analyzed: ${result.stats.nodesCreated} nodes, ${result.stats.edgesCreated} edges`
      );

      // Update dependency view
      this.updateDependencyView(result.parseResult);
    } catch (error) {
      this.showError(`Analysis failed: ${error.message}`);
    }
  }

  async dispose() {
    await this.analyzer.close();
  }
}
```

### 4. Incremental Build System

```typescript
import { SingleFileAnalyzer } from '@context-action/dependency-linker/integration';

class IncrementalBuilder {
  private analyzer: SingleFileAnalyzer;

  constructor(projectRoot: string) {
    this.analyzer = new SingleFileAnalyzer();
  }

  async buildFile(filePath: string) {
    // Analyze file
    const result = await this.analyzer.analyze(filePath, {
      replaceExisting: true,
      enableInference: false // Compute inference at the end
    });

    // Get dependencies
    const dependencies = result.parseResult.imports || [];

    // Build dependencies first
    for (const dep of dependencies) {
      await this.buildDependency(dep);
    }

    // Build current file
    await this.compileFile(filePath);

    return result;
  }

  async finalizeBuild() {
    // Compute inference for all analyzed files
    // (Implementation depends on GraphAnalysisSystem access)
    await this.analyzer.close();
  }
}
```

### 5. Custom Language Support

```typescript
import { analyzeSingleFile } from '@context-action/dependency-linker/integration';

// Analyze with explicit language
const result = await analyzeSingleFile('/path/to/file.ts', {
  autoDetectLanguage: false,
  language: 'typescript' // Explicitly specify language
});
```

---

## Performance Considerations

### 1. Reuse Analyzer Instance

```typescript
// ❌ Bad: Create new instance for each file
for (const file of files) {
  const result = await analyzeSingleFile(file); // New instance each time
}

// ✅ Good: Reuse analyzer instance
const analyzer = new SingleFileAnalyzer();
for (const file of files) {
  const result = await analyzer.analyze(file); // Reuse instance
}
await analyzer.close();
```

### 2. Batch Analysis

```typescript
// ❌ Bad: Individual analysis
for (const file of files) {
  await analyzeSingleFile(file);
}

// ✅ Good: Batch analysis
await analyzeMultipleFiles(files);
```

### 3. Inference Timing

```typescript
// For batch operations, disable inference during analysis
const analyzer = new SingleFileAnalyzer();

for (const file of files) {
  await analyzer.analyze(file, {
    enableInference: false // Disable during batch
  });
}

// Compute inference once at the end
// (Requires direct GraphAnalysisSystem access)
await analyzer.close();
```

### 4. Database Location

```typescript
// Use in-memory DB for temporary analysis
const result = await analyzeSingleFile(file, {
  dbPath: ':memory:' // In-memory database
});

// Use persistent DB for incremental builds
const result = await analyzeSingleFile(file, {
  dbPath: '/project/.cache/graph.db' // Persistent database
});
```

---

## Integration with Other APIs

### With Graph Query API

```typescript
import { analyzeSingleFile, createGraphAnalysisSystem } from '@context-action/dependency-linker/integration';

// Analyze file
await analyzeSingleFile('/path/to/file.ts', {
  dbPath: '/project/graph.db'
});

// Query results
const system = createGraphAnalysisSystem({
  projectRoot: '/project',
  dbPath: '/project/graph.db'
});

const dependencies = await system.getFileDependencies('/path/to/file.ts');
console.log('Dependencies:', dependencies);

await system.close();
```

### With Batch Analysis

```typescript
import {
  analyzeSingleFile,
  analyzeProjectToGraph
} from '@context-action/dependency-linker/integration';

// Initial full project analysis
await analyzeProjectToGraph('/project', {
  dbPath: '/project/graph.db'
});

// Incremental single file updates
await analyzeSingleFile('/project/src/changed-file.ts', {
  projectRoot: '/project',
  dbPath: '/project/graph.db',
  replaceExisting: true
});
```

---

## Supported Languages

| Language | Extensions | Auto-Detection |
|----------|------------|----------------|
| TypeScript | `.ts` | ✅ |
| TSX | `.tsx` | ✅ |
| JavaScript | `.js` | ✅ |
| JSX | `.jsx` | ✅ |
| Java | `.java` | ✅ |
| Python | `.py` | ✅ |
| Go | `.go` | ✅ |

---

## Best Practices

### DO ✅

- Use absolute paths for all file operations
- Reuse `SingleFileAnalyzer` instances for multiple files
- Handle errors with `SingleFileAnalysisError`
- Close analyzer when done (`await analyzer.close()`)
- Use batch API for multiple files
- Set appropriate `projectRoot` for accurate path resolution

### DON'T ❌

- Don't use relative paths
- Don't create new analyzer for each file
- Don't ignore errors
- Don't forget to close analyzer
- Don't analyze unsupported file types
- Don't skip validation

---

## Troubleshooting

### Issue: "File path must be absolute"

**Cause**: Provided relative path instead of absolute path

**Solution**:
```typescript
import { resolve } from 'node:path';

const absolutePath = resolve('/project/src', 'file.ts');
await analyzeSingleFile(absolutePath);
```

### Issue: "File does not exist"

**Cause**: File path is incorrect or file was deleted

**Solution**:
```typescript
import { existsSync } from 'node:fs';

if (existsSync(filePath)) {
  await analyzeSingleFile(filePath);
} else {
  console.error('File not found:', filePath);
}
```

### Issue: "Unsupported file type"

**Cause**: File extension not in supported list

**Solution**: Use supported extensions or request new language support

### Issue: Slow performance with many files

**Cause**: Creating new analyzer for each file

**Solution**: Reuse analyzer instance or use batch API

---

## Related Documentation

- [Integration API](API.md) - Complete integration API reference
- [Graph Database](../src/database/README.md) - Database system guide
- [Inference System](inference-system.md) - Inference capabilities
- [Module Organization](module-organization.md) - Codebase structure

---

**Last Updated**: 2025-09-30
**Version**: 1.0
**Maintainer**: Integration Module Team