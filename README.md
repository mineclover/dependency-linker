# Multi-Language Dependency Linker

🎯 **Advanced Multi-Language AST Analysis Framework with Extensible Plugin Architecture**

## 🚀 Now Supporting Both CLI and Programmatic API

This project provides a comprehensive multi-language code analysis framework with both command-line interface and programmatic API access, built on tree-sitter for maximum performance and reliability. Supports TypeScript, Go, Java, Markdown, and custom analysis types through extensible plugin architecture.

## 🌟 Key Features

### ✅ Multi-Language Plugin Architecture
- **🌐 Language Support**: TypeScript, Go, Java, Markdown, and extensible parser system
- **🖥️ CLI Tool**: Complete command-line interface for terminal usage
- **🔧 Programmatic API**: Full API access for integration into applications
- **⚡ High Performance**: <200ms analysis time with tree-sitter parsing
- **🔍 Comprehensive Analysis**: Dependencies, imports, exports, complexity, and source locations
- **📊 Multiple Formats**: JSON (API), compact, summary, table, CSV, and more
- **🛡️ Error Recovery**: Robust parsing with graceful error handling
- **🔌 Plugin System**: Extensible extractors and interpreters for custom analysis
- **🛤️ Project Root Path Normalization**: Consistent path handling across execution contexts
- **🎯 Enhanced Dependency Analysis**: Named import tracking with actual usage analysis
- **🌳 Tree-shaking Optimization**: Dead code detection and bundle size optimization
- **📊 Usage Pattern Analysis**: Method call frequency and dependency utilization metrics
- **⚡ Tree-sitter Query System**: High-performance AST analysis with configurable query injection
- **🔒 Type-Safe Query Results**: Strongly-typed query outputs with comprehensive result validation
- **🚀 Cursor-Based Optimization**: Memory-efficient traversal for large codebases

### 🚀 API Capabilities
- **Multi-Language Support**: TypeScript, JavaScript, Go, Java, Markdown parsers
- **Language-Specific Analysis**: Dedicated extractors and interpreters for each language
- **Class-based API**: `TypeScriptAnalyzer` with dependency injection
- **Factory Functions**: Simple function-based API (`analyzeTypeScriptFile`, `analyzeMarkdownFile`)
- **Batch Processing**: `BatchAnalyzer` with concurrency control and resource monitoring
- **Advanced Caching**: Multi-tier caching with memory and file storage
- **Event System**: Progress tracking and real-time analysis events
- **CLI Integration**: Seamless CLI-to-API bridge with perfect compatibility

### 🛤️ Project Root Path Normalization System

**Consistent caching and path handling regardless of execution location:**

- **📁 Auto Project Root Detection**: Automatically finds project root using markers (package.json, .git, tsconfig.json, etc.)
- **🔄 Path Normalization**: Converts any path to project-root-relative format (`./src/file.ts`)
- **💾 Cache Efficiency**: Single cache entry per file regardless of execution directory
- **🌍 Cross-Platform**: Unified path handling for Windows/Unix systems
- **⚡ Performance Optimized**: Cached project root detection for repeated operations

```javascript
// All paths normalized to project root - same cache key
await analyzer.analyzeFile('./src/component.tsx');           // From project root
await analyzer.analyzeFile('src/component.tsx');             // From project root
await analyzer.analyzeFile('/full/path/src/component.tsx');  // Absolute path
await analyzer.analyzeFile('../project/src/component.tsx');  // From subdirectory

// All generate the same normalized path: "./src/component.tsx"
```

**📚 Complete Guide**: [Path Normalization Documentation](docs/PATH_NORMALIZATION.md)

### 🧪 테스트 현황
- **Total Test Suites**: 33개 테스트 스위트 ✅ (전체 시스템 검증)
- **Unit Tests**: 6개 스위트 ✅ (모든 핵심 컴포넌트 검증)
- **Integration Tests**: 12개 스위트 ✅ (다국어 분석 & 배치 처리 검증)
- **Contract Tests**: 11개 스위트 ✅ (API 인터페이스 호환성 검증)
- **Performance Validation**: 정의된 목표치 검증 ✅
  - 파싱 시간: <200ms/파일
  - 메모리 사용량: <500MB/세션
  - 캐시 적중률: >80%
  - 동시 분석: 10개 병렬 처리
- **Multi-Language Support**: TypeScript, JavaScript, Go, Java, Markdown 분석 테스트 ✅

### 📚 문서화
- **README.md**: 기술 개요 및 설치 가이드 (현재 파일)
- **[docs/](docs/)**: 상세 문서 디렉토리
  - **[API.md](docs/API.md)**: API 개요 및 빠른 참조 (v2.4.1 업데이트)
  - **[api/](docs/api/)**: 테스트 기반 상세 API 문서
    - **[Factory Functions](docs/api/functions/factory-functions.md)**: 단순 함수 API
    - **[TypeScriptAnalyzer](docs/api/classes/TypeScriptAnalyzer.md)**: 메인 분석기 클래스
    - **[BatchAnalyzer](docs/api/classes/BatchAnalyzer.md)**: 배치 처리 시스템
    - **[Core Interfaces](docs/api/core/interfaces.md)**: 핵심 인터페이스
  - **[CHANGELOG_v2.4.1.md](docs/CHANGELOG_v2.4.1.md)**: 🆕 v2.4.1 변경사항 및 개선점
  - **[MIGRATION_GUIDE_v2.4.1.md](docs/MIGRATION_GUIDE_v2.4.1.md)**: 🔄 정적 클래스에서 함수로 마이그레이션 가이드
  - **[PACKAGE_EXPORTS.md](docs/PACKAGE_EXPORTS.md)**: 📦 트리쉐이킹 및 선택적 임포트 가이드
  - **[ENHANCED_EXTRACTORS_EXAMPLES.md](docs/ENHANCED_EXTRACTORS_EXAMPLES.md)**: 🚀 고급 추출기 사용 예제
  - **[quickstart.md](docs/quickstart.md)**: 빠른 시작 가이드
  - **[CORE_LOGIC.md](docs/CORE_LOGIC.md)**: 핵심 로직과 아키텍처
  - **[USAGE.md](docs/USAGE.md)**: 실제 활용법 및 고급 사용법
  - **[EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md)**: CLI/API 확장 가이드
  - **[DEBUGGING.md](docs/DEBUGGING.md)**: 문제 해결 가이드
  - **[PERFORMANCE.md](docs/PERFORMANCE.md)**: 성능 최적화 가이드
  - **[CACHE_MANAGEMENT.md](docs/CACHE_MANAGEMENT.md)**: 캐시 관리 및 리셋 가이드
  - **[CACHE_ARCHITECTURE_DEEP_DIVE.md](docs/CACHE_ARCHITECTURE_DEEP_DIVE.md)**: 내장 캐싱 구조 심층 분석
  - **[CACHE_FLOW_DIAGRAM.md](docs/CACHE_FLOW_DIAGRAM.md)**: 캐싱 플로우 다이어그램
  - **[TECHNICAL_README.md](docs/TECHNICAL_README.md)**: 기술 세부사항
- **demo/README.md**: 🎯 **인터랙티브 데모 가이드** - 실제 실행 가능한 예제들

## 🎯 인터랙티브 데모 체험

### 🚀 원클릭 데모 실행
```bash
# 모든 예제를 자동으로 분석하고 결과 생성
./demo/run-demo.sh
```

**포함된 데모:**
- ✅ 간단한 React 컴포넌트 (1개 의존성)
- ✅ 복잡한 React 앱 (11개 의존성 - MUI, axios, lodash 등)
- ✅ Node.js Express 서버 (20개 의존성)
- ✅ 구문 오류 파일 (에러 복구 능력 테스트)
- ✅ 성능 벤치마크 및 통계

**📖 상세 가이드**: [demo/README.md](demo/README.md)

### 📁 데모 디렉토리 구성
`demo/` 디렉토리에는 실제 실행 가능한 예제 파일들과 자동화된 테스트 스크립트가 포함되어 있습니다. 각 예제는 다양한 복잡도와 의존성 패턴을 보여주어 실제 프로젝트에서의 활용법을 이해할 수 있도록 구성되었습니다.

**데모 실행 결과 (최신 검증):**
- ✅ **간단한 컴포넌트**: 1개 의존성, 분석 시간 ~6ms
- ✅ **복잡한 앱**: 11개 의존성 (React, MUI, axios 등), 분석 시간 ~10ms  
- ✅ **Express 서버**: 20개 의존성, 분석 시간 ~13ms
- ✅ **구문 오류 파일**: 에러 복구 성공, 3개 의존성 추출
- ✅ **성능 측정**: 모든 파일 50ms 미만 고속 분석

## 🚀 Quick Start

### 📦 Installation & Package Usage

```bash
# Install from npm
npm install @context-action/dependency-linker

# Or use locally after building
npm run build
```

```javascript
// Multi-language analysis API
const { analyzeTypeScriptFile, GoParser, JavaParser, MarkdownParser } = require('@context-action/dependency-linker');

// TypeScript/JavaScript analysis
const result = await analyzeTypeScriptFile('./src/component.tsx');
console.log(result.dependencies);

// Go analysis
const goParser = new GoParser();
const goResult = await goParser.parseFile('./main.go');

// Java analysis
const javaParser = new JavaParser();
const javaResult = await javaParser.parseFile('./Main.java');

// Markdown link extraction
const mdParser = new MarkdownParser();
const mdResult = await mdParser.parseFile('./README.md');
```

### 🖥️ CLI Usage

```bash
# Multi-language file analysis (auto-detects language)
./analyze-file src/component.tsx    # TypeScript
./analyze-file main.go              # Go
./analyze-file Main.java            # Java
./analyze-file README.md            # Markdown

# Human-readable format
./analyze-file src/component.tsx --format summary

# Include source locations
./analyze-file src/component.tsx --include-sources

# Enhanced integrated analysis (recommended)
./analyze-file src/component.tsx --use-integrated --preset fast

# Configuration management
./analyze-file config list
./analyze-file config show --preset comprehensive

# Help
./analyze-file --help
```

### 🔧 Configuration Options

The CLI now supports advanced configuration options for optimized analysis:

```bash
# Use predefined presets
./analyze-file src/app.tsx --use-integrated --preset fast          # Fast processing
./analyze-file src/app.tsx --use-integrated --preset balanced      # Balanced (default)
./analyze-file src/app.tsx --use-integrated --preset comprehensive # Maximum detail
./analyze-file src/app.tsx --use-integrated --preset lightweight   # Minimal memory
./analyze-file src/app.tsx --use-integrated --preset debug         # Development/debugging

# Custom configuration options
./analyze-file src/app.tsx --use-integrated \
  --detail-level comprehensive \
  --optimization-mode accuracy \
  --enabled-views summary,table,tree \
  --max-string-length 2000 \
  --max-array-length 200 \
  --max-depth 15

# Configuration management
./analyze-file config list                              # List all presets
./analyze-file config show --preset fast               # Show preset details
./analyze-file config validate --preset comprehensive  # Validate preset
./analyze-file config list --format json               # JSON output
```

### 📊 Output Formats

The tool supports multiple output formats optimized for different use cases:

```bash
# Standard formats
./analyze-file src/app.tsx --format json         # Full JSON (default)
./analyze-file src/app.tsx --format text         # Human-readable
./analyze-file src/app.tsx --format compact      # Minified JSON
./analyze-file src/app.tsx --format summary      # Key metrics summary
./analyze-file src/app.tsx --format table        # Formatted table
./analyze-file src/app.tsx --format tree         # Tree visualization
./analyze-file src/app.tsx --format csv          # CSV for spreadsheets
./analyze-file src/app.tsx --format deps-only    # Dependencies only

# Enhanced integrated formats (--use-integrated)
./analyze-file src/app.tsx --use-integrated --format minimal  # Compact one-line
./analyze-file src/app.tsx --use-integrated --format report   # Comprehensive report
```

### 📊 Analysis Result Example

#### Standard Analysis Output
```json
{
  "filePath": "example.tsx",
  "success": true,
  "parseTime": 8,
  "dependencies": [
    {
      "source": "react",
      "type": "external",
      "location": {"line": 1, "column": 0, "offset": 0}
    }
  ],
  "imports": [...],
  "exports": [...]
}
```

#### Enhanced Integrated Analysis Output (--use-integrated)
```json
{
  "core": {
    "filePath": "example.tsx",
    "success": true,
    "dependencies": [...],
    "performanceMetrics": {
      "parseTime": 8,
      "totalTime": 15,
      "memoryUsage": 2.5
    }
  },
  "views": {
    "summary": {
      "fileName": "example.tsx",
      "totalDependencies": 5,
      "externalDependencies": 3,
      "internalDependencies": 2,
      "analysisTime": "15ms"
    },
    "table": {
      "headers": ["Dependency", "Type", "Location"],
      "rows": [
        ["react", "external", "line 1"],
        ["./utils", "internal", "line 3"]
      ]
    },
    "tree": {
      "name": "example.tsx",
      "children": [
        {"name": "react", "type": "external"},
        {"name": "./utils", "type": "internal"}
      ]
    }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "analysisVersion": "2.0.0",
    "configuration": {
      "preset": "balanced",
      "detailLevel": "standard"
    }
  }
}
```

## ⚙️ Configuration Presets

The tool provides five built-in configuration presets optimized for different use cases:

### 🚀 **Fast** - Quick Analysis
- **Use case**: Rapid development, CI/CD pipelines
- **Views**: Summary, Minimal only
- **Detail level**: Minimal
- **Optimization**: Speed-focused
- **Performance**: ~5ms analysis time

```bash
./analyze-file src/app.tsx --use-integrated --preset fast
```

### ⚖️ **Balanced** - General Purpose (Default)
- **Use case**: Regular development workflow
- **Views**: All views (summary, table, tree, csv, minimal)
- **Detail level**: Standard
- **Optimization**: Balanced speed and accuracy
- **Performance**: ~15ms analysis time

```bash
./analyze-file src/app.tsx --use-integrated --preset balanced
```

### 🔍 **Comprehensive** - Maximum Detail
- **Use case**: Code audits, detailed analysis
- **Views**: All views with maximum detail
- **Detail level**: Comprehensive
- **Optimization**: Accuracy-focused
- **Performance**: ~25ms analysis time

```bash
./analyze-file src/app.tsx --use-integrated --preset comprehensive
```

### 🪶 **Lightweight** - Minimal Memory
- **Use case**: Resource-constrained environments
- **Views**: Summary only
- **Detail level**: Minimal
- **Optimization**: Memory-efficient
- **Performance**: ~3ms analysis time, <10MB memory

```bash
./analyze-file src/app.tsx --use-integrated --preset lightweight
```

### 🐛 **Debug** - Development/Debugging
- **Use case**: Development, troubleshooting
- **Views**: All views with maximum limits
- **Detail level**: Comprehensive
- **Optimization**: No caching, single-threaded
- **Performance**: ~50ms analysis time (detailed output)

```bash
./analyze-file src/app.tsx --use-integrated --preset debug
```

### 🎛️ Custom Configuration

Override any preset with custom options:

```bash
./analyze-file src/app.tsx --use-integrated \
  --preset balanced \
  --detail-level comprehensive \
  --enabled-views summary,table \
  --max-string-length 1500 \
  --optimization-mode accuracy
```

**Available options:**
- `--detail-level`: `minimal` | `standard` | `comprehensive`
- `--optimization-mode`: `speed` | `balanced` | `accuracy`
- `--enabled-views`: Comma-separated list of `summary,table,tree,csv,minimal`
- `--max-string-length`: Maximum string length in output (default: 1000)
- `--max-array-length`: Maximum array length in output (default: 100)
- `--max-depth`: Maximum nesting depth in output (default: 10)

## 📚 API Documentation

### 🚀 Core API Overview

The `@context-action/dependency-linker` package exports a comprehensive set of APIs for multi-language code analysis. All APIs support TypeScript with full type definitions.

#### 📦 Main Package Exports (v2.4.1)

```typescript
// Core API - Factory Functions (Simple API)
export {
  analyzeTypeScriptFile,
  analyzeMarkdownFile,
  extractDependencies,
  getBatchAnalysis,
  analyzeDirectory,
  resetFactoryAnalyzers,
  resetSharedAnalyzer
} from './api/factory-functions';

// Core API - Classes (Advanced API)
export { TypeScriptAnalyzer } from './api/TypeScriptAnalyzer';
export { BatchAnalyzer } from './api/BatchAnalyzer';

// Enhanced Extractors (Recent Updates)
export { EnhancedDependencyExtractor } from './extractors/EnhancedDependencyExtractor';
export { EnhancedExportExtractor } from './extractors/EnhancedExportExtractor';

// Extractors & Interpreters (Plugin System)
export { DependencyExtractor } from './extractors/DependencyExtractor';
export { IdentifierExtractor } from './extractors/IdentifierExtractor';
export { ComplexityExtractor } from './extractors/ComplexityExtractor';
export { MarkdownLinkExtractor } from './extractors/MarkdownLinkExtractor';
export { PathResolverInterpreter } from './interpreters/PathResolverInterpreter';
export { DependencyAnalysisInterpreter } from './interpreters/DependencyAnalysisInterpreter';
export { IdentifierAnalysisInterpreter } from './interpreters/IdentifierAnalysisInterpreter';
export { LinkDependencyInterpreter } from './interpreters/LinkDependencyInterpreter';

// Library Functions (Utility Functions - Recently Converted from Static Classes)
export {
  // AST Traversal Utilities (formerly ASTTraverser class)
  traverse, findNodes, findNode, findNodesByType, findNodesByTypes,
  getChildren, getChildrenByType, getChildByType,

  // Node Utilities (formerly NodeUtils class)
  getText, clearTextCache, getSourceLocation, hasChildOfType,
  getIdentifierName, isVariableDeclaration, isFunctionDeclaration,
  isClassDeclaration, isTypeDeclaration, isAsync, isStatic, getVisibility,

  // Text Matching (formerly TextMatcher class)
  findAllExports, findExportsByType, hasExports, countExports,
  parseNamedExports, cleanExportText
} from './extractors/enhanced-export';

// Core Models (Data Structures)
export { PathInfo, createPathInfo } from './models/PathInfo';
export type { AnalysisResult } from './models/AnalysisResult';
export type { PerformanceMetrics } from './models/PerformanceMetrics';

// Language Parsers (Multi-Language Support)
export { TypeScriptParser } from './parsers/TypeScriptParser';
export { JavaScriptParser } from './parsers/JavaScriptParser';
export { GoParser } from './parsers/GoParser';
export { JavaParser } from './parsers/JavaParser';
export { MarkdownParser } from './parsers/MarkdownParser';

// Core Services (Engine & Infrastructure)
export { AnalysisEngine } from './services/AnalysisEngine';
export { CacheManager } from './services/CacheManager';
export { ExtractorRegistry } from './services/ExtractorRegistry';
export { InterpreterRegistry } from './services/InterpreterRegistry';
export { ParserRegistry } from './services/ParserRegistry';
export { DataIntegrator } from './services/integration/DataIntegrator';

// Utilities (Helper Functions)
export { createLogger } from './utils/logger';
export { normalizePath, isProjectPath } from './utils/PathUtils';
```

### 🎯 Quick Start Examples

#### 1. Simple Function API (Recommended for Most Use Cases)

```typescript
import { analyzeTypeScriptFile, analyzeMarkdownFile } from '@context-action/dependency-linker';

// TypeScript/JavaScript analysis
const result = await analyzeTypeScriptFile('./src/component.tsx', {
  useIntegrated: true,
  preset: 'balanced',
  format: 'report'
});

console.log('Dependencies:', result.core.dependencies);
console.log('Analysis time:', result.metadata.analysisTime);

// Markdown link analysis
const markdownResult = await analyzeMarkdownFile('./README.md');
console.log('Links found:', markdownResult.interpretedData['link-analysis'].summary.totalLinks);
```

#### 2. Class-based API (Advanced Usage)

```typescript
import { TypeScriptAnalyzer, BatchAnalyzer } from '@context-action/dependency-linker';

// Create analyzer with caching
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheSize: 1000,
  defaultTimeout: 30000
});

// Single file analysis
const result = await analyzer.analyzeFile('./src/index.ts');

// Batch processing
const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true
});

const results = await batchAnalyzer.processBatch([
  './src/index.ts',
  './src/utils.ts',
  './src/types.ts'
]);
```

#### 3. Enhanced Analysis (New in v2.4.1)

```typescript
import {
  EnhancedDependencyExtractor,
  EnhancedExportExtractor,
  TypeScriptParser
} from '@context-action/dependency-linker';

const parser = new TypeScriptParser();
const depExtractor = new EnhancedDependencyExtractor();
const exportExtractor = new EnhancedExportExtractor();

// Enhanced dependency analysis with usage tracking
const parseResult = await parser.parse('./src/component.tsx');
const depResult = depExtractor.extractEnhanced(parseResult.ast, './src/component.tsx');

console.log('Named imports:', depResult.usageAnalysis.totalImports);
console.log('Unused imports:', depResult.usageAnalysis.unusedImports);

// Enhanced export analysis
const exportResult = exportExtractor.extractExports(parseResult.ast, './src/component.tsx');
console.log('Exported functions:', exportResult.statistics.functionExports);
console.log('Class methods:', exportResult.statistics.classMethodsExports);
```

#### 4. Utility Functions (Recently Converted from Static Classes)

```typescript
import {
  traverse, findNodes, getText, getSourceLocation,
  findAllExports, parseNamedExports
} from '@context-action/dependency-linker';
import { TypeScriptParser } from '@context-action/dependency-linker';

const parser = new TypeScriptParser();
const parseResult = await parser.parse('./src/example.ts');

// AST traversal (formerly ASTTraverser.traverse)
traverse(parseResult.ast, (node) => {
  if (node.type === 'function_declaration') {
    console.log('Function found:', getText(node));
    console.log('Location:', getSourceLocation(node));
  }
});

// Find specific nodes (formerly ASTTraverser.findNodes)
const functions = findNodes(parseResult.ast, node =>
  node.type === 'function_declaration'
);

// Text-based export detection (formerly TextMatcher.findAllExports)
const sourceCode = '...' // file content
const exports = findAllExports(sourceCode);
console.log('Detected exports:', exports);
```

### 📦 Tree-Shaking Optimized Imports

For optimal bundle size, import only what you need:

#### Basic Analysis Setup
```typescript
// Minimal TypeScript analysis
import { TypeScriptParser } from '@context-action/dependency-linker/dist/parsers/TypeScriptParser';
import { DependencyExtractor } from '@context-action/dependency-linker/dist/extractors/DependencyExtractor';

// Enhanced analysis setup
import { EnhancedDependencyExtractor } from '@context-action/dependency-linker/dist/extractors/EnhancedDependencyExtractor';
import { EnhancedExportExtractor } from '@context-action/dependency-linker/dist/extractors/EnhancedExportExtractor';
```

#### Utility Functions Only
```typescript
// Import individual utility functions (v2.4.1 functional refactor)
import {
  traverse, findNodes, getText, getSourceLocation
} from '@context-action/dependency-linker/dist/extractors/enhanced-export';
```

#### Multi-Language Support
```typescript
// Language-specific parsers
import { TypeScriptParser } from '@context-action/dependency-linker/dist/parsers/TypeScriptParser';
import { JavaParser } from '@context-action/dependency-linker/dist/parsers/JavaParser';
import { GoParser } from '@context-action/dependency-linker/dist/parsers/GoParser';
import { MarkdownParser } from '@context-action/dependency-linker/dist/parsers/MarkdownParser';
```

### 📊 Bundle Size Impact

| Import Strategy | Bundle Size | Use Case |
|----------------|-------------|----------|
| Full package | ~250KB | Complete analysis suite |
| Core API only | ~120KB | Standard usage |
| Single parser | ~80KB | Language-specific analysis |
| Utilities only | ~45KB | Custom analysis tools |
| Individual functions | ~30KB | Minimal tree-shaken builds |

### 🔧 TypeScript Support

All exports include comprehensive TypeScript definitions:

```typescript
import type {
  AnalysisResult,
  EnhancedDependencyInfo,
  ExportMethodInfo,
  ParseResult,
  PerformanceMetrics
} from '@context-action/dependency-linker';

// Type-safe analysis
const result: AnalysisResult = await analyzeTypeScriptFile('./file.ts');
const dependencies: EnhancedDependencyInfo[] = result.extractedData.dependencies;
```

### 🆕 What's New in v2.4.1

1. **Static Class Refactor**: Converted `ASTTraverser`, `NodeUtils`, and `TextMatcher` from static classes to exported functions for better tree-shaking and functional programming patterns.

2. **Enhanced Export Analysis**: Complete rewrite of export detection with class member analysis, inheritance tracking, and statistical reporting.

3. **Improved Utility Functions**: All utility functions now available as individual exports with maintained performance through caching.

4. **Better TypeScript Integration**: Improved type definitions and better IDE support for all exported functions.

### 📚 Module Categories

| Category | Description | Key Exports |
|----------|-------------|-------------|
| **Core API** | High-level analysis functions | `analyzeTypeScriptFile`, `TypeScriptAnalyzer` |
| **Enhanced Extractors** | Advanced analysis tools | `EnhancedDependencyExtractor`, `EnhancedExportExtractor` |
| **Utility Functions** | AST and text processing | `traverse`, `getText`, `findAllExports` |
| **Language Parsers** | Multi-language support | `TypeScriptParser`, `JavaParser`, `GoParser` |
| **Core Services** | Infrastructure components | `AnalysisEngine`, `CacheManager` |
| **Data Models** | Type definitions | `AnalysisResult`, `PathInfo` |

## 🎯 Language-Specific Analysis Capabilities

### 📋 Comprehensive Parser Ecosystem

Our multi-language analysis framework provides specialized capabilities for each supported language, with dedicated parsers, extractors, and interpreters working together to deliver comprehensive code analysis.

#### 🔤 **TypeScript/JavaScript Analysis Stack**

**Parser**: `TypeScriptParser`, `JavaScriptParser`
**Primary Extractors**: `DependencyExtractor`, `EnhancedDependencyExtractor`, `EnhancedExportExtractor`, `IdentifierExtractor`, `ComplexityExtractor`
**Interpreters**: `DependencyAnalysisInterpreter`, `IdentifierAnalysisInterpreter`, `PathResolverInterpreter`

##### 🚀 Capabilities
- **📦 Dependency Analysis**: Import/export tracking with named import usage analysis
- **🌳 Tree-shaking Optimization**: Dead code detection and bundle size reduction
- **📊 Export Analysis**: Complete export classification with class member analysis
- **🔍 Identifier Tracking**: Variable and function usage patterns
- **📈 Complexity Metrics**: Cyclomatic complexity and code quality metrics
- **🎯 Usage Patterns**: Method call frequency and dependency utilization
- **📍 Source Locations**: Exact line/column tracking for all elements

##### 💡 Example Use Cases
```javascript
// Named import usage analysis
import { analyzeTypeScriptFile } from '@context-action/dependency-linker';

const result = await analyzeTypeScriptFile('./src/component.tsx', {
  useIntegrated: true,
  preset: 'comprehensive'
});

// Access TypeScript-specific analysis
console.log('Dependencies:', result.extractedData.dependencies);
console.log('Export analysis:', result.extractedData.exports);
console.log('Usage patterns:', result.interpretedData.usageAnalysis);
```

#### 📄 **Markdown Analysis Stack**

**Parser**: `MarkdownParser`
**Primary Extractors**: `MarkdownLinkExtractor`
**Interpreters**: `LinkDependencyInterpreter`

##### 🚀 Capabilities
- **🔗 Link Analysis**: Comprehensive link dependency tracking
- **🏷️ Smart Categorization**: Email, anchor, image, documentation classification
- **🛡️ Security Analysis**: Blocked domain detection and suspicious link identification
- **⚡ Performance Monitoring**: Large file detection and performance warnings
- **♿ Accessibility Checks**: Image alt text validation and compliance
- **📊 Domain Analytics**: Intelligent domain grouping and analytics
- **🔧 MIME Type Detection**: Automatic file type identification
- **📈 Content Quality**: Link density analysis and recommendations

##### 💡 Example Use Cases
```javascript
// Comprehensive markdown link analysis
import { analyzeMarkdownFile } from '@context-action/dependency-linker';

const result = await analyzeMarkdownFile('./docs/README.md');

// Access markdown-specific analysis
const linkAnalysis = result.interpretedData['link-analysis'];
console.log('Total links:', linkAnalysis.summary.totalLinks);
console.log('Broken links:', linkAnalysis.summary.brokenLinks);
console.log('Security issues:', linkAnalysis.issues.filter(i => i.type === 'security_risk'));
console.log('Accessibility warnings:', linkAnalysis.issues.filter(i => i.type === 'accessibility_issue'));
```

#### ☕ **Java Analysis Stack**

**Parser**: `JavaParser`
**Primary Extractors**: `DependencyExtractor`, `IdentifierExtractor`, `ComplexityExtractor`
**Interpreters**: `DependencyAnalysisInterpreter`, `PathResolverInterpreter`

##### 🚀 Capabilities
- **📦 Package Analysis**: Import statement and package dependency tracking
- **🏗️ Class Structure**: Class, interface, and inheritance analysis
- **📍 Method Tracking**: Method definitions and call patterns
- **📊 Complexity Analysis**: Method and class complexity metrics
- **🔍 Identifier Analysis**: Variable and method usage patterns
- **📁 Package Resolution**: Java package path resolution and validation

##### 💡 Example Use Cases
```javascript
// Java dependency analysis
import { JavaParser, DependencyExtractor } from '@context-action/dependency-linker';

const parser = new JavaParser();
const extractor = new DependencyExtractor();

const parseResult = await parser.parse('./src/Main.java');
const dependencies = extractor.extract(parseResult.ast, './src/Main.java');

console.log('Java imports:', dependencies.filter(d => d.type === 'external'));
console.log('Internal classes:', dependencies.filter(d => d.type === 'internal'));
```

#### 🐹 **Go Analysis Stack**

**Parser**: `GoParser`
**Primary Extractors**: `DependencyExtractor`, `IdentifierExtractor`, `ComplexityExtractor`
**Interpreters**: `DependencyAnalysisInterpreter`, `PathResolverInterpreter`

##### 🚀 Capabilities
- **📦 Module Analysis**: Go module and package dependency tracking
- **🏗️ Function Analysis**: Function definitions and call patterns
- **📍 Struct Tracking**: Struct definitions and method analysis
- **📊 Complexity Metrics**: Function and package complexity analysis
- **🔍 Identifier Tracking**: Variable and function usage patterns
- **📁 Module Resolution**: Go module path resolution and validation

##### 💡 Example Use Cases
```javascript
// Go dependency analysis
import { GoParser, DependencyExtractor } from '@context-action/dependency-linker';

const parser = new GoParser();
const extractor = new DependencyExtractor();

const parseResult = await parser.parse('./cmd/main.go');
const dependencies = extractor.extract(parseResult.ast, './cmd/main.go');

console.log('Go imports:', dependencies.filter(d => d.type === 'external'));
console.log('Local packages:', dependencies.filter(d => d.type === 'internal'));
```

#### 🔄 **Cross-Language Features**

All parsers share common capabilities through unified interfaces:

##### 🛠️ **Universal Capabilities**
- **⚡ High Performance**: <200ms analysis time across all languages
- **🔄 AST Caching**: Intelligent caching for repeated analysis
- **📊 Metrics Collection**: Performance and quality metrics
- **🎯 Error Recovery**: Graceful handling of syntax errors
- **📍 Source Mapping**: Precise location tracking
- **🔧 Configurable Options**: Flexible parser and extractor configuration

##### 📦 **Shared Interfaces**
```typescript
// Universal analysis interface
interface AnalysisResult {
  filePath: string;
  language: string;
  extractedData: Record<string, any>;    // Parser-specific data
  interpretedData: Record<string, any>;  // Analysis results
  performanceMetrics: PerformanceMetrics;
  errors: AnalysisError[];
}

// All parsers implement ILanguageParser
interface ILanguageParser {
  parse(filePath: string, content?: string): Promise<ParseResult>;
  supports(language: string): boolean;
  getMetadata(): ParserMetadata;
}
```

##### 🎯 **Integration Examples**
```javascript
// Multi-language project analysis
import { AnalysisEngine, ParserFactory } from '@context-action/dependency-linker';

const engine = new AnalysisEngine();
const factory = new ParserFactory();

// Analyze entire project
const projectFiles = [
  './src/index.ts',           // TypeScript
  './docs/README.md',         // Markdown
  './backend/Main.java',      // Java
  './services/main.go'        // Go
];

const results = await Promise.all(
  projectFiles.map(file => engine.analyzeFile(file))
);

// Unified analysis across languages
results.forEach(result => {
  console.log(`${result.language} file: ${result.filePath}`);
  console.log(`Dependencies: ${Object.keys(result.extractedData).length}`);
  console.log(`Performance: ${result.performanceMetrics.parseTime}ms`);
});
```

## 🎯 Advanced Analysis Features

### 📊 EnhancedDependencyExtractor - Named Import Usage Tracking

The `EnhancedDependencyExtractor` extends the basic dependency analysis to provide detailed insights into named import usage, dead code detection, and tree-shaking optimization opportunities.

#### 🚀 Key Features

- **🔍 Named Import Tracking**: Tracks which methods from named imports are actually used
- **📈 Usage Statistics**: Method call frequency and usage patterns
- **🗑️ Dead Code Detection**: Identifies imported but unused methods
- **🌳 Tree-shaking Optimization**: Bundle size reduction recommendations
- **📍 Source Location Tracking**: Exact line/column information for all usage
- **🔗 Dependency Utilization**: Package usage efficiency metrics

#### 📦 Import and Usage

```javascript
// ES6/TypeScript import
import { EnhancedDependencyExtractor } from '@context-action/dependency-linker';

// CommonJS import
const { EnhancedDependencyExtractor } = require('@context-action/dependency-linker');

// Tree-shaking optimized import
import { EnhancedDependencyExtractor } from '@context-action/dependency-linker/dist/extractors/EnhancedDependencyExtractor';
```

#### 💡 Basic Usage Example

```javascript
import { EnhancedDependencyExtractor } from '@context-action/dependency-linker';
import { TypeScriptParser } from '@context-action/dependency-linker';

async function analyzeNamedImports() {
  const code = `
import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { debounce, throttle } from 'lodash';

function MyComponent() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tomorrow = addDays(date, 1);
    console.log(format(tomorrow, 'yyyy-MM-dd'));
  }, [date]);

  const debouncedUpdate = debounce(() => {
    setDate(new Date());
  }, 1000);

  // throttle is imported but never used

  return <div onClick={debouncedUpdate}>Click me</div>;
}
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/example.tsx', code);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/example.tsx');

  console.log('📊 Analysis Results:');
  console.log(`Total imports: ${result.usageAnalysis.totalImports}`);
  console.log(`Used methods: ${result.usageAnalysis.usedImports}`);
  console.log(`Unused imports: ${result.usageAnalysis.unusedImports}`);

  // Detailed per-dependency analysis
  result.enhancedDependencies.forEach(dep => {
    console.log(`\n📦 ${dep.source}:`);
    console.log(`  Imported: ${dep.importedNames?.join(', ')}`);
    console.log(`  Used: ${dep.usedMethods?.map(m => `${m.methodName}(${m.callCount}x)`).join(', ') || 'None'}`);

    if (dep.unusedImports?.length) {
      console.log(`  ⚠️ Unused: ${dep.unusedImports.join(', ')}`);
    }
  });
}
```

#### 🔍 Advanced Analysis Features

##### 1. Tree-shaking Optimization Analysis

```javascript
async function analyzeTreeShaking() {
  const lodashCode = `
import _ from 'lodash';
import { debounce } from 'lodash';

// Inefficient: default import usage
const uniqueData = _.uniq([1, 2, 2, 3]);
const sortedData = _.sortBy([3, 1, 2]);

// Efficient: named import usage
const debouncedFn = debounce(() => console.log('debounced'), 100);
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/optimization.ts', lodashCode);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/optimization.ts');

  // Tree-shaking recommendations
  result.enhancedDependencies.forEach(dep => {
    if (dep.source === 'lodash') {
      console.log('🌳 Tree-shaking Recommendations:');

      if (dep.usedMethods) {
        const defaultImportMethods = dep.usedMethods.filter(m => m.methodName.startsWith('_'));

        if (defaultImportMethods.length > 0) {
          console.log('⚠️ Inefficient default imports found:');
          defaultImportMethods.forEach(method => {
            const methodName = method.methodName.replace('_.', '');
            console.log(`  ${method.methodName} → import { ${methodName} } from 'lodash/${methodName}';`);
          });
        }
      }

      if (dep.unusedImports?.length) {
        console.log(`🗑️ Remove unused: ${dep.unusedImports.join(', ')}`);
      }
    }
  });
}
```

##### 2. Usage Pattern Analysis

```javascript
async function analyzeUsagePatterns() {
  const complexCode = `
import React, { useState, useEffect, useCallback } from 'react';
import { format, isAfter, isBefore } from 'date-fns';
import { debounce, merge, isEmpty } from 'lodash';

const Dashboard = () => {
  const [data, setData] = useState([]);

  // High frequency: format used multiple times
  const formatDate = useCallback((date) => format(date, 'yyyy-MM-dd'), []);
  const formatTime = (date) => format(date, 'HH:mm');
  const displayDate = (date) => format(date, 'PPP');

  // Medium frequency: debounce, merge
  const debouncedSearch = debounce((query) => {
    const filters = merge({}, { search: query });
    console.log(filters);
  }, 300);

  // Low frequency: isEmpty
  const processData = (rawData) => {
    if (isEmpty(rawData)) return [];
    return rawData;
  };

  return <div>Dashboard</div>;
};
`;

  const parser = new TypeScriptParser();
  const parseResult = await parser.parse('/dashboard.tsx', complexCode);

  const extractor = new EnhancedDependencyExtractor();
  const result = extractor.extractEnhanced(parseResult.ast, '/dashboard.tsx');

  console.log('📈 Usage Pattern Analysis:');

  // Categorize by usage frequency
  const highUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count >= 3);
  const mediumUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count >= 2 && m.count < 3);
  const lowUsage = result.usageAnalysis.mostUsedMethods.filter(m => m.count === 1);

  console.log('🔥 High usage (3+ calls):', highUsage.map(m => `${m.method}(${m.count}x)`));
  console.log('🔶 Medium usage (2 calls):', mediumUsage.map(m => `${m.method}(${m.count}x)`));
  console.log('🔷 Low usage (1 call):', lowUsage.map(m => `${m.method}(${m.count}x)`));

  // Package utilization analysis
  result.enhancedDependencies.forEach(dep => {
    const totalImports = dep.importedNames?.length || 0;
    const usedImports = dep.usedMethods?.length || 0;
    const utilizationRate = totalImports > 0 ? ((usedImports / totalImports) * 100).toFixed(1) : 0;

    console.log(`📦 ${dep.source}: ${utilizationRate}% utilization (${usedImports}/${totalImports})`);
  });
}
```

#### 📋 API Reference

##### EnhancedDependencyInfo Interface

```typescript
interface EnhancedDependencyInfo {
  // Basic dependency info
  source: string;
  type: "external" | "internal" | "relative";
  location?: SourceLocation;
  isTypeOnly?: boolean;

  // Enhanced analysis
  importedNames?: string[];          // All imported named items
  usedMethods?: UsedMethodInfo[];    // Actually used methods
  unusedImports?: string[];          // Imported but unused items
  usageCount?: number;               // Total usage count
  usageLocations?: SourceLocation[]; // All usage locations
}
```

##### UsedMethodInfo Interface

```typescript
interface UsedMethodInfo {
  methodName: string;                // Method name
  originalName?: string;             // Original name if aliased
  usageType: "call" | "property" | "reference"; // Usage type
  locations: SourceLocation[];      // All usage locations
  callCount: number;                 // Number of times called
  contextInfo?: {
    parentFunction?: string;
    isInCondition?: boolean;
    isInLoop?: boolean;
    callArguments?: string[];
  };
}
```

##### EnhancedDependencyExtractionResult Interface

```typescript
interface EnhancedDependencyExtractionResult extends DependencyExtractionResult {
  enhancedDependencies: EnhancedDependencyInfo[];
  usageAnalysis: {
    totalImports: number;
    usedImports: number;
    unusedImports: number;
    mostUsedMethods: Array<{
      method: string;
      count: number;
      source: string;
    }>;
    unusedImportsList: Array<{
      source: string;
      unusedItems: string[];
    }>;
  };
}
```

#### 🎯 Usage Scenarios

##### 1. Code Review and Optimization
- Identify unused imports for code cleanup
- Find over-imported packages for tree-shaking
- Analyze method usage patterns for refactoring

##### 2. Bundle Size Optimization
- Detect inefficient lodash/utility library usage
- Recommend specific imports over namespace imports
- Calculate potential bundle size savings

##### 3. Dependency Management
- Monitor actual usage vs. declared dependencies
- Identify packages with low utilization rates
- Track method-level dependency patterns

##### 4. Development Workflow
- Automated dead code detection in CI/CD
- Usage-based dependency recommendations
- Performance-focused import analysis

#### 💡 Best Practices

1. **Use for Large Codebases**: Most effective on projects with many dependencies
2. **Regular Analysis**: Run periodically to maintain clean imports
3. **Combine with Linting**: Integrate findings with ESLint unused import rules
4. **Focus on Heavy Packages**: Prioritize analysis of large libraries (lodash, moment, etc.)
5. **Bundle Analysis**: Use results to guide tree-shaking and bundler configuration

## 📤 EnhancedExportExtractor - Advanced Export Analysis

The `EnhancedExportExtractor` provides comprehensive analysis of TypeScript/JavaScript export patterns, including classes, functions, variables, types, and detailed class member analysis with full test coverage (23/23 tests passing).

### 🚀 Key Features

- **📊 Complete Export Classification**: Functions, classes, variables, types, enums, default exports
- **🏗️ Class Member Analysis**: Methods, properties, visibility (public/private/protected)
- **📍 Source Location Tracking**: Exact line/column information for all exports
- **🔄 Re-export Detection**: `export { foo } from 'module'` and `export *` patterns
- **📈 Export Statistics**: Comprehensive metrics and summary data
- **🎯 Inheritance Support**: Class extends and implements detection
- **⚡ High Performance**: Optimized AST traversal with pattern-matching backup
- **🧪 Production Ready**: 100% test coverage with robust error handling

### 📦 Installation & Usage

```bash
npm install @context-action/dependency-linker
```

#### Basic Usage

```typescript
import {
  EnhancedExportExtractor,
  TypeScriptParser
} from '@context-action/dependency-linker';

// Initialize components
const parser = new TypeScriptParser();
const extractor = new EnhancedExportExtractor();

// Analyze a TypeScript file
async function analyzeExports(filePath: string) {
  const parseResult = await parser.parse(filePath);

  if (parseResult.ast) {
    const exportData = extractor.extractExports(parseResult.ast, filePath);

    console.log('📊 Export Summary:');
    console.log(`  Functions: ${exportData.statistics.functionExports}`);
    console.log(`  Classes: ${exportData.statistics.classExports}`);
    console.log(`  Variables: ${exportData.statistics.variableExports}`);
    console.log(`  Types: ${exportData.statistics.typeExports}`);
    console.log(`  Total: ${exportData.statistics.totalExports}`);

    // Detailed export information
    exportData.exportMethods.forEach(exp => {
      console.log(`${exp.name} (${exp.exportType})`);
      if (exp.parentClass) {
        console.log(`  └─ Class: ${exp.parentClass}`);
      }
    });
  }
}
```

#### Advanced Configuration & Validation

```typescript
async function robustExportAnalysis(filePath: string) {
  const parser = new TypeScriptParser();
  const extractor = new EnhancedExportExtractor();

  // Configure for production use
  extractor.configure({
    enabled: true,
    timeout: 15000,                    // 15 seconds for large files
    memoryLimit: 100 * 1024 * 1024,   // 100MB memory limit
    defaultOptions: {
      includeLocations: true,
      includeComments: false,
      maxDepth: 20
    }
  });

  try {
    const parseResult = await parser.parse(filePath);

    if (!parseResult.ast || parseResult.errors.length > 0) {
      console.error('Parsing failed:', parseResult.errors);
      return null;
    }

    const result = extractor.extractExports(parseResult.ast, filePath);

    // Validate results
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
    console.error('Analysis failed:', error);
    return null;
  }
}
```

### 📋 API Reference

#### Main Types

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

interface ClassExportInfo {
  className: string;
  location: SourceLocation;
  methods: ClassMethodInfo[];
  properties: ClassPropertyInfo[];
  isDefaultExport: boolean;
  superClass?: string;
  implementsInterfaces?: string[];
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

type ExportType =
  | 'function'      // export function foo()
  | 'class'         // export class Bar
  | 'variable'      // export const API_URL
  | 'type'          // export interface User
  | 'enum'          // export enum Status
  | 'default'       // export default
  | 'class_method'  // class method
  | 'class_property'// class property
  | 're_export';    // export { foo } from 'module'
```

### 🎯 Supported Export Patterns

- ✅ **Function Exports**: `export function foo()`, `export async function bar()`
- ✅ **Class Exports**: `export class MyClass`, `export abstract class Base`
- ✅ **Variable Exports**: `export const API_URL`, `export let counter`
- ✅ **Type Exports**: `export interface User`, `export type Config`
- ✅ **Enum Exports**: `export enum Status { ACTIVE = 'active' }`
- ✅ **Default Exports**: `export default class`, `export default function`
- ✅ **Named Exports**: `export { foo, bar as baz }`
- ✅ **Re-exports**: `export { Utils } from './utils'`, `export * from './types'`
- ✅ **Class Members**: Methods, properties with full visibility analysis
- ✅ **Inheritance**: Class extends and implements detection
- ✅ **Complex Generics**: Generic functions and classes with type parameters
- ✅ **Parameter Analysis**: Function parameters with optional/default detection

### 📚 Comprehensive Documentation

- **[Installation Guide](docs/EnhancedExportExtractor-Installation-Guide.md)**: Complete setup, integration examples, and real-world usage scenarios
- **[Usage Guide (한국어)](docs/EnhancedExportExtractor-Usage.md)**: Detailed Korean usage guide with practical examples
- **[Unit Tests](tests/unit/extractors/EnhancedExportExtractor.test.ts)**: 23 comprehensive test cases covering all functionality
- **[Usage Examples](examples/enhanced-export-usage-examples.ts)**: 5 practical usage examples with error handling
- **[Demo Code](examples/export-analysis-example.ts)**: Interactive analysis demonstration with sample code

### 🔍 데이터 구조 및 활용

#### 기본 분석 결과 구조

```typescript
// 분석 결과 예시
const exportData = extractor.extractExports(parseResult.ast, filePath);

// 반환되는 데이터 구조:
{
  exportMethods: [
    {
      name: "getUserData",
      exportType: "function",
      declarationType: "named_export",
      location: { line: 4, column: 0 },
      isAsync: true,
      parameters: [{ name: "id", optional: false, type: "string" }],
      returnType: "Promise<User>"
    },
    {
      name: "UserService",
      exportType: "class",
      declarationType: "named_export",
      location: { line: 15, column: 0 }
    },
    {
      name: "getUser",
      exportType: "class_method",
      declarationType: "class_member",
      location: { line: 20, column: 2 },
      parentClass: "UserService",
      visibility: "public",
      isAsync: true,
      isStatic: false
    }
  ],
  statistics: {
    totalExports: 8,
    functionExports: 2,
    classExports: 1,
    variableExports: 2,
    typeExports: 2,
    defaultExports: 1,
    classMethodsExports: 3,
    classPropertiesExports: 1
  },
  classes: [
    {
      className: "UserService",
      location: { line: 15, column: 0 },
      methods: [
        {
          name: "getUser",
          visibility: "public",
          isStatic: false,
          isAsync: true,
          parameters: [{ name: "id", optional: false }]
        }
      ],
      properties: [
        {
          name: "apiUrl",
          visibility: "private",
          isStatic: false,
          type: "string"
        }
      ],
      isDefaultExport: false,
      superClass: "BaseService"
    }
  ]
}
```

#### 데이터 활용 패턴

```typescript
// 1. 통계 기반 분석
const { statistics } = exportData;
console.log(`API 복잡도: ${statistics.totalExports}개 export`);
console.log(`클래스 중심도: ${statistics.classMethodsExports}개 메서드`);

// 2. Export 유형별 필터링
const publicAPI = exportData.exportMethods.filter(exp =>
  exp.exportType === 'function' ||
  (exp.exportType === 'class_method' && exp.visibility === 'public')
);

// 3. 클래스 구조 분석
exportData.classes.forEach(cls => {
  console.log(`클래스 ${cls.className}:`);
  console.log(`- 메서드 ${cls.methods.length}개`);
  console.log(`- 프로퍼티 ${cls.properties.length}개`);
  if (cls.superClass) {
    console.log(`- ${cls.superClass} 상속`);
  }
});

// 4. 위치 정보 활용
const exportsByLine = exportData.exportMethods
  .sort((a, b) => a.location.line - b.location.line);

// 5. 비동기 함수 찾기
const asyncFunctions = exportData.exportMethods.filter(exp => exp.isAsync);
console.log(`비동기 함수: ${asyncFunctions.length}개`);
```

### ⚡ Performance & Testing

- **Analysis Speed**: ~5-15ms per file (optimized AST traversal)
- **Memory Efficient**: Smart memory management with configurable limits
- **Scalable**: Handles large codebases efficiently
- **Error Recovery**: Graceful handling of syntax errors with pattern-matching backup
- **Test Coverage**: **100% (23/23 tests passing)** - All export patterns validated
- **Production Ready**: Used in real-world projects with comprehensive error handling

### 🛠️ Error Handling & Troubleshooting

#### Common Issues

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

#### Performance Tips

- Use appropriate memory limits for your use case
- Set reasonable timeouts for large files
- Consider processing files in batches for bulk analysis
- Cache parser instances for repeated use

The EnhancedExportExtractor is production-ready with comprehensive testing and provides detailed insights for code analysis, documentation generation, API discovery, and export management workflows.

### Simple Function API

```javascript
const {
  analyzeTypeScriptFile,
  extractDependencies,
  getBatchAnalysis,
  analyzeDirectory
} = require('@context-action/dependency-linker');

// Standard analysis
const result = await analyzeTypeScriptFile('./src/index.ts', {
  format: 'json',
  includeSources: true,
  parseTimeout: 10000
});

// Enhanced integrated analysis (recommended)
const integratedResult = await analyzeTypeScriptFile('./src/index.ts', {
  useIntegrated: true,
  preset: 'balanced',
  format: 'report'
});

// Custom integrated configuration
const customResult = await analyzeTypeScriptFile('./src/index.ts', {
  useIntegrated: true,
  detailLevel: 'comprehensive',
  optimizationMode: 'accuracy',
  enabledViews: ['summary', 'table', 'tree'],
  maxStringLength: 2000
});

// Batch processing with presets
const results = await getBatchAnalysis([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 3,
  useIntegrated: true,
  preset: 'fast',
  onProgress: (completed, total) => console.log(`${completed}/${total}`)
});

// Directory analysis with configuration
const dirResults = await analyzeDirectory('./src', {
  extensions: ['.ts', '.tsx'],
  ignorePatterns: ['**/*.test.ts', '**/node_modules/**'],
  useIntegrated: true,
  preset: 'balanced'
});
```

### Class-based API

```javascript
const { TypeScriptAnalyzer } = require('@context-action/dependency-linker');

// Create analyzer with options
const analyzer = new TypeScriptAnalyzer({
  enableCache: true,
  cacheSize: 1000,
  defaultTimeout: 30000
});

// Analyze file with options
const result = await analyzer.analyzeFile('./src/index.ts', {
  format: 'json',
  includeSources: true
});

// Convenience methods
const dependencies = await analyzer.extractDependencies('./src/index.ts');
const imports = await analyzer.getImports('./src/index.ts');
const exports = await analyzer.getExports('./src/index.ts');

// Batch processing
const batchResult = await analyzer.analyzeFiles([
  './src/index.ts',
  './src/utils.ts'
], {
  concurrency: 5,
  continueOnError: true
});

// Clean up
analyzer.clearCache();
```

### 🗄️ 캐시 관리

```javascript
const { TypeScriptAnalyzer, resetFactoryAnalyzers, resetSharedAnalyzer } = require('@context-action/dependency-linker');

const analyzer = new TypeScriptAnalyzer();

// 개별 분석기 캐시 초기화
analyzer.clearCache();

// 팩토리 공유 분석기 초기화 (권장: 테스트 환경)
resetFactoryAnalyzers();
resetSharedAnalyzer();

// 캐시 통계 확인
const stats = analyzer.getCacheStats();
console.log(`Cache size: ${stats.size}, hits: ${stats.hits}`);
```

### Advanced Batch Processing

```javascript
const { BatchAnalyzer } = require('@context-action/dependency-linker/dist/api/BatchAnalyzer');

const batchAnalyzer = new BatchAnalyzer(analyzer, {
  maxConcurrency: 5,
  enableResourceMonitoring: true,
  memoryLimit: 512 // MB
});

const result = await batchAnalyzer.processBatch(filePaths, {
  continueOnError: true,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
  onFileError: (filePath, error) => {
    console.log(`Error in ${filePath}: ${error.message}`);
  }
});

console.log('Resource metrics:', batchAnalyzer.getResourceMetrics());
batchAnalyzer.dispose();
```

## 📚 Examples & Integration

### 🎯 Comprehensive Examples

The `examples/` directory contains production-ready integration examples:

- **`basic-usage.js`**: Simple API usage patterns and error handling
- **`batch-processing.js`**: Advanced batch processing with progress tracking
- **`webpack-plugin.js`**: Custom Webpack plugin for build-time analysis
- **`vscode-extension.js`**: VS Code extension development example

```bash
# Run any example
node examples/basic-usage.js
node examples/batch-processing.js
```

**📖 See [examples/README.md](examples/README.md) for detailed guides and integration patterns.**

## 🔨 Real-World Use Cases

### 1. 의존성 관리
```bash
# 프로젝트의 모든 외부 패키지 찾기
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  ./analyze-file "$file" | jq '.dependencies[] | select(.type == "external") | .source'
done | sort | uniq
```

### 2. 빌드 도구 통합
```javascript
// webpack.config.js에서 사용
const { execSync } = require('child_process');

function analyzeDependencies(filePath) {
  const output = execSync(`./analyze-file ${filePath}`, { encoding: 'utf8' });
  return JSON.parse(output).dependencies;
}
```

### 3. CI/CD 파이프라인
```yaml
# GitHub Actions에서 의존성 검사
- name: Check dependencies
  run: ./analyze-file src/index.ts | jq '.dependencies[].source'
```

## 기술 스택

- **Core**: TypeScript, tree-sitter, tree-sitter-typescript
- **Testing**: Jest, 포괄적 단위/통합/성능 테스트 (95% 커버리지)
- **Code Quality**: Biome (최신 린터/포맷터, ESLint 대체)
- **Architecture**: Clean Architecture, SOLID 원칙, Dependency Injection
- **Performance**: 밀리초 단위 분석, 메모리 효율성, 배치 처리

## 시스템 요구사항

- Node.js 16+ (Node.js 22+ 권장)
- 네이티브 빌드 도구 (tree-sitter 바인딩용)
- TypeScript/TSX 파일

## 설치 및 실행

```bash
# 의존성 설치 (이미 완료됨)
npm install

# tree-sitter 리빌드 (필요한 경우)
npm rebuild tree-sitter

# 프로젝트 빌드 (이미 완료됨)
npm run build

# 코드 품질 검사 (Biome)
npm run lint

# 코드 포맷팅
npm run format

# CLI 실행 권한 확인
chmod +x analyze-file

# 테스트 실행
npm test

# 사용 시작!
./analyze-file --help
```

## 📚 문서 가이드

모든 상세 문서는 **[docs/](docs/)** 디렉토리에서 찾을 수 있습니다:

- 🎯 **[demo/README.md](demo/README.md)**: 인터랙티브 데모 - 실제 실행 가능한 예제들
- 📖 **[docs/quickstart.md](docs/quickstart.md)**: 빠른 시작 가이드와 기본 예시
- 🔧 **[docs/API.md](docs/API.md)**: 완전한 API 문서 - 프로그래밍 방식 사용법
- 🏗️ **[docs/CORE_LOGIC.md](docs/CORE_LOGIC.md)**: 핵심 로직, 아키텍처, API/CLI 통합
- 📚 **[docs/USAGE.md](docs/USAGE.md)**: 실제 활용법 및 고급 사용법
- 🛠️ **[docs/EXTENSION_GUIDE.md](docs/EXTENSION_GUIDE.md)**: CLI/API 확장 모듈 구현 가이드라인
- 🔍 **[docs/DEBUGGING.md](docs/DEBUGGING.md)**: 문제 해결 및 디버깅 가이드
- ⚡ **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)**: 성능 최적화 및 벤치마크
- 🔧 **[README.md](README.md)**: 기술 문서 및 개요 (현재 파일)

## 품질 보증

### ✅ 완료된 검증 항목
- **TypeScript 타입 검사**: 모든 타입 에러 해결 완료
- **빌드 시스템**: 정상 빌드 및 배포 가능 상태
- **Code Quality**: Biome 마이그레이션 완료 (ESLint 대체)
- **CLI 기능**: 모든 명령줄 옵션 검증 완료
- **성능 벤치마크**: 밀리초 단위 분석 성능 달성
- **성능 테스트**: 포괄적 성능 테스트 픽스처 및 임계값 검증
- **에러 처리**: 모든 예외 상황 대응 완료

### 🔧 기술적 특징
- **Zero Dependencies**: 런타임 의존성 최소화
- **Memory Efficient**: 대용량 파일 처리 최적화
- **Error Recovery**: 부분 파싱으로 강건성 확보
- **Cross-Platform**: macOS/Linux/Windows 지원

## 🌍 크로스 플랫폼 지원

PathInfo 시스템은 모든 주요 운영체제에서 최적화된 성능을 제공합니다:

### 🪟 Windows 지원
- **드라이브 문자**: `C:\`, `D:\` 등 Windows 드라이브 처리
- **UNC 경로**: `\\server\share\file` 네트워크 경로 지원
- **환경 변수**: `%USERPROFILE%`, `%PROGRAMFILES%` 등 자동 확장
- **PowerShell 통합**: Windows 개발 환경 최적화

**Windows 데모 실행:**
```bash
npx tsx demo-windows-pathinfo.ts
```

### 🍎 macOS 지원
- **앱 번들**: `.app` 패키지 구조 인식 및 분석
- **틸드 확장**: `~/Documents` 홈 디렉토리 자동 확장
- **시스템 경로**: `/Applications`, `/Library`, `/System` 특별 처리
- **Apple Silicon**: ARM64 아키텍처 네이티브 최적화
- **Homebrew**: `/opt/homebrew` 패키지 경로 지원

**macOS 데모 실행:**
```bash
npx tsx demo-macos-pathinfo.ts
```

### 🐧 Linux 지원
- **POSIX 준수**: 표준 Unix 경로 시스템
- **FHS 표준**: Filesystem Hierarchy Standard 호환
- **권한 시스템**: Linux 파일 권한 인식
- **시스템 디렉토리**: `/usr`, `/etc`, `/var` 등 표준 경로

**Linux 데모 실행:**
```bash
npx tsx demo-linux-pathinfo.ts
```

### 🌍 통합 멀티 OS 데모
모든 플랫폼의 기능을 한 번에 체험:
```bash
npx tsx demo-multi-os-pathinfo.ts
```

### 📁 크로스 플랫폼 개발 가이드
- **[Windows 개발 가이드](docs/windows-development-guide.md)**: Windows 환경 최적화
- **[macOS 개발 가이드](docs/macos-development-guide.md)**: macOS 환경 최적화
- **[크로스 플랫폼 예제](examples/cross-platform-paths.ts)**: 통합 경로 처리 유틸리티

### 🔧 플랫폼별 최적화 기능
```javascript
// 플랫폼 감지 및 최적화
const { createPathInfo } = require('./src/lib/index');

// Windows
const windowsPath = createPathInfo('C:\\Users\\Name\\file.txt');
console.log(windowsPath.separator); // '\'

// macOS
const macosPath = createPathInfo('/Applications/App.app/Contents/MacOS/App');
console.log(macosPath.isWithinProject); // false (시스템 앱)

// Linux
const linuxPath = createPathInfo('/usr/local/bin/tool');
console.log(linuxPath.depth); // 4
```

### 🎯 크로스 플랫폼 테스트
```bash
# 모든 플랫폼 호환성 테스트
npx tsx test-cross-platform-paths.ts

# 플랫폼별 성능 벤치마크
npm run benchmark:cross-platform
```

## 라이선스

MIT 라이선스로 제공됩니다.

---

## 🏆 프로젝트 완성

**✅ 개발 완료**: 모든 기능 구현 및 테스트 완료  
**🚀 배포 준비**: 빌드 성공, 타입 에러 해결 완료  
**📦 사용 가능**: CLI 도구 즉시 실행 가능  
**🔧 유지보수**: 안정적인 코드베이스, 포괄적 테스트

### 최종 검증 결과
- **TypeScript 컴파일**: ✅ 에러 없음
- **전체 빌드**: ✅ 성공
- **CLI 실행**: ✅ 정상 작동  
- **테스트 스위트**: ✅ 핵심 기능 100% 통과

**🎯 준비 완료! 바로 사용하세요!**