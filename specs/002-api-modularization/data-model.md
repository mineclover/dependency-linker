# Data Model & Interface Design

## Overview

This document defines the complete data model and interface architecture for the TypeScript File Analyzer API modularization. The design maintains backward compatibility while enabling flexible programmatic access.

## Core Data Models

### Analysis Result Model

```typescript
export interface AnalysisResult {
  readonly success: boolean;
  readonly filePath: string;
  readonly parseTime: number;
  readonly dependencies: DependencyInfo[];
  readonly imports: ImportInfo[];
  readonly exports: ExportInfo[];
  readonly metadata: AnalysisMetadata;
  readonly errors?: AnalysisError[];
}

export interface AnalysisMetadata {
  readonly fileSize: number;
  readonly linesOfCode: number;
  readonly timestamp: Date;
  readonly version: string;
  readonly options: AnalysisOptions;
}

export interface BatchAnalysisResult {
  readonly success: boolean;
  readonly totalFiles: number;
  readonly completedFiles: number;
  readonly failedFiles: number;
  readonly totalTime: number;
  readonly results: AnalysisResult[];
  readonly errors: BatchError[];
}
```

### Dependency Information Model

```typescript
export interface DependencyInfo {
  readonly name: string;
  readonly type: DependencyType;
  readonly source: string;
  readonly resolvedPath?: string;
  readonly packageName?: string;
  readonly version?: string;
  readonly location: SourceLocation;
  readonly isTypeOnly: boolean;
  readonly isExternal: boolean;
  readonly isDev: boolean;
}

export enum DependencyType {
  IMPORT = 'import',
  REQUIRE = 'require',
  DYNAMIC_IMPORT = 'dynamic-import',
  TYPE_IMPORT = 'type-import',
  NAMESPACE_IMPORT = 'namespace-import'
}

export interface SourceLocation {
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}
```

### Import/Export Models

```typescript
export interface ImportInfo {
  readonly source: string;
  readonly specifiers: ImportSpecifier[];
  readonly type: ImportType;
  readonly location: SourceLocation;
  readonly isTypeOnly: boolean;
}

export interface ImportSpecifier {
  readonly name: string;
  readonly alias?: string;
  readonly isDefault: boolean;
  readonly isNamespace: boolean;
}

export enum ImportType {
  NAMED = 'named',
  DEFAULT = 'default',
  NAMESPACE = 'namespace',
  SIDE_EFFECT = 'side-effect'
}

export interface ExportInfo {
  readonly name: string;
  readonly type: ExportType;
  readonly source?: string;
  readonly location: SourceLocation;
  readonly isDefault: boolean;
  readonly isReExport: boolean;
}

export enum ExportType {
  NAMED = 'named',
  DEFAULT = 'default',
  NAMESPACE = 'namespace',
  DECLARATION = 'declaration'
}
```

### Configuration Models

```typescript
export interface AnalyzerOptions {
  readonly parseTimeout?: number;
  readonly includeSourceLocations?: boolean;
  readonly enableCaching?: boolean;
  readonly cacheDirectory?: string;
  readonly customParsers?: ITypeScriptParser[];
  readonly customFormatters?: IOutputFormatter[];
  readonly customClassifiers?: IDependencyClassifier[];
  readonly logLevel?: LogLevel;
}

export interface AnalysisOptions {
  readonly format?: OutputFormat;
  readonly includeSources?: boolean;
  readonly includeTypeImports?: boolean;
  readonly includeDevDependencies?: boolean;
  readonly filterTypes?: DependencyType[];
  readonly filterPackages?: string[];
  readonly parseTimeout?: number;
  readonly resolvePackages?: boolean;
}

export interface BatchAnalysisOptions extends AnalysisOptions {
  readonly maxConcurrency?: number;
  readonly failFast?: boolean;
  readonly progressCallback?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  readonly completed: number;
  readonly total: number;
  readonly current?: string;
  readonly errors: number;
}

export enum OutputFormat {
  JSON = 'json',
  YAML = 'yaml',
  CSV = 'csv',
  XML = 'xml',
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}
```

### Validation Models

```typescript
export interface ValidationResult {
  readonly isValid: boolean;
  readonly filePath: string;
  readonly issues: ValidationIssue[];
  readonly suggestions: string[];
}

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly severity: IssueSeverity;
  readonly location?: SourceLocation;
}

export enum IssueSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
```

## Core Service Interfaces

### File Analysis Interface

```typescript
export interface IFileAnalyzer {
  analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;
  analyzeFiles(request: BatchAnalysisRequest): Promise<BatchAnalysisResult>;
  analyzeSource(request: SourceAnalysisRequest): Promise<AnalysisResult>;
  validateFile(filePath: string): Promise<ValidationResult>;
  getSupportedExtensions(): string[];
  clearCache(): Promise<void>;
}

export interface FileAnalysisRequest {
  readonly filePath: string;
  readonly options?: AnalysisOptions;
  readonly context?: AnalysisContext;
}

export interface BatchAnalysisRequest {
  readonly filePaths: string[];
  readonly options?: BatchAnalysisOptions;
  readonly context?: AnalysisContext;
}

export interface SourceAnalysisRequest {
  readonly source: string;
  readonly fileName?: string;
  readonly options?: AnalysisOptions;
  readonly context?: AnalysisContext;
}

export interface AnalysisContext {
  readonly workingDirectory?: string;
  readonly packageJsonPath?: string;
  readonly tsConfigPath?: string;
  readonly nodeModulesPath?: string;
}
```

### Parser Interface

```typescript
export interface ITypeScriptParser {
  parseFile(filePath: string, options: ParseOptions): Promise<ParseResult>;
  parseSource(source: string, options: ParseOptions): Promise<ParseResult>;
  validateSyntax(source: string): Promise<SyntaxValidationResult>;
  getSupportedExtensions(): string[];
}

export interface ParseOptions {
  readonly includeSourceLocations?: boolean;
  readonly includeComments?: boolean;
  readonly strictMode?: boolean;
  readonly timeout?: number;
  readonly tsConfig?: object;
}

export interface ParseResult {
  readonly success: boolean;
  readonly ast?: any;
  readonly sourceFile?: any;
  readonly imports: RawImportInfo[];
  readonly exports: RawExportInfo[];
  readonly parseTime: number;
  readonly errors: ParseError[];
}

export interface RawImportInfo {
  readonly source: string;
  readonly specifiers: string[];
  readonly location: SourceLocation;
  readonly isTypeOnly: boolean;
  readonly isDynamic: boolean;
}

export interface RawExportInfo {
  readonly name: string;
  readonly source?: string;
  readonly location: SourceLocation;
  readonly isDefault: boolean;
  readonly isReExport: boolean;
}

export interface SyntaxValidationResult {
  readonly isValid: boolean;
  readonly errors: ParseError[];
  readonly warnings: ParseError[];
}
```

### Dependency Classification Interface

```typescript
export interface IDependencyClassifier {
  classify(importSource: string, context: ClassificationContext): DependencyClassification;
  classifyBatch(imports: string[], context: ClassificationContext): DependencyClassification[];
  isExternal(importSource: string, context: ClassificationContext): boolean;
  resolvePackageName(importSource: string): string | null;
  resolvePackageVersion(packageName: string, context: ClassificationContext): string | null;
}

export interface ClassificationContext {
  readonly workingDirectory: string;
  readonly packageJsonPath?: string;
  readonly nodeModulesPath?: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

export interface DependencyClassification {
  readonly name: string;
  readonly type: DependencyType;
  readonly category: DependencyCategory;
  readonly packageName?: string;
  readonly version?: string;
  readonly resolvedPath?: string;
  readonly isExternal: boolean;
  readonly isDev: boolean;
}

export enum DependencyCategory {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  PEER = 'peer',
  OPTIONAL = 'optional',
  BUILTIN = 'builtin',
  LOCAL = 'local'
}
```

### Output Formatting Interface

```typescript
export interface IOutputFormatter {
  format(result: AnalysisResult, format: OutputFormat, options?: FormatOptions): string;
  formatBatch(results: BatchAnalysisResult, format: OutputFormat, options?: FormatOptions): string;
  getSupportedFormats(): OutputFormat[];
  validateFormat(format: OutputFormat): boolean;
}

export interface FormatOptions {
  readonly pretty?: boolean;
  readonly includeMetadata?: boolean;
  readonly filterFields?: string[];
  readonly sortBy?: string;
  readonly groupBy?: string;
  readonly template?: string;
}
```

### Caching Interface

```typescript
export interface IAnalysisCache {
  get(key: string): Promise<AnalysisResult | null>;
  set(key: string, result: AnalysisResult, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  readonly size: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly totalRequests: number;
}
```

## Main API Interface

### TypeScript Analyzer Interface

```typescript
export interface ITypeScriptAnalyzer {
  // Primary analysis methods
  analyzeFile(filePath: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  analyzeFiles(filePaths: string[], options?: BatchAnalysisOptions): Promise<BatchAnalysisResult>;
  analyzeSource(source: string, options?: SourceAnalysisOptions): Promise<AnalysisResult>;
  
  // Convenience methods
  extractDependencies(filePath: string): Promise<DependencyInfo[]>;
  getImports(filePath: string): Promise<ImportInfo[]>;
  getExports(filePath: string): Promise<ExportInfo[]>;
  
  // Utility methods
  validateFile(filePath: string): Promise<ValidationResult>;
  getSupportedExtensions(): string[];
  clearCache(): Promise<void>;
  
  // Configuration methods
  updateOptions(options: Partial<AnalyzerOptions>): void;
  getOptions(): AnalyzerOptions;
  
  // Event methods
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  emit(event: string, ...args: any[]): boolean;
}

export interface SourceAnalysisOptions extends AnalysisOptions {
  readonly fileName?: string;
  readonly assumeTypeScript?: boolean;
}
```

## Error Handling Model

### Error Hierarchy

```typescript
export abstract class AnalysisError extends Error {
  readonly code: string;
  readonly details?: any;
  readonly timestamp: Date;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
  
  abstract toJSON(): object;
}

export class FileNotFoundError extends AnalysisError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.details.filePath,
      timestamp: this.timestamp
    };
  }
}

export class ParseTimeoutError extends AnalysisError {
  constructor(filePath: string, timeout: number) {
    super(
      `Parse timeout (${timeout}ms) exceeded for: ${filePath}`,
      'PARSE_TIMEOUT',
      { filePath, timeout }
    );
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.details.filePath,
      timeout: this.details.timeout,
      timestamp: this.timestamp
    };
  }
}

export class InvalidFileTypeError extends AnalysisError {
  constructor(filePath: string, expectedExtensions: string[]) {
    super(
      `Invalid file type: ${filePath}. Expected: ${expectedExtensions.join(', ')}`,
      'INVALID_FILE_TYPE',
      { filePath, expectedExtensions }
    );
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.details.filePath,
      expectedExtensions: this.details.expectedExtensions,
      timestamp: this.timestamp
    };
  }
}

export class ParseError extends AnalysisError {
  constructor(message: string, filePath: string, location?: SourceLocation) {
    super(message, 'PARSE_ERROR', { filePath, location });
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.details.filePath,
      location: this.details.location,
      timestamp: this.timestamp
    };
  }
}

export class BatchError extends AnalysisError {
  constructor(message: string, failures: AnalysisError[]) {
    super(message, 'BATCH_ERROR', { failures });
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      failures: this.details.failures.map((f: AnalysisError) => f.toJSON()),
      timestamp: this.timestamp
    };
  }
}
```

## Factory and Builder Patterns

### Factory Interfaces

```typescript
export interface IAnalyzerFactory {
  create(options?: AnalyzerOptions): ITypeScriptAnalyzer;
  createDefault(): ITypeScriptAnalyzer;
  createWithPreset(preset: AnalyzerPreset): ITypeScriptAnalyzer;
}

export enum AnalyzerPreset {
  FAST = 'fast',
  COMPREHENSIVE = 'comprehensive',
  MINIMAL = 'minimal',
  DEVELOPMENT = 'development',
  PRODUCTION = 'production'
}

export interface IParserFactory {
  createParser(type: ParserType): ITypeScriptParser;
  createEnhancedParser(options?: ParseOptions): ITypeScriptParser;
  createCustomParser(config: ParserConfig): ITypeScriptParser;
}

export enum ParserType {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  FAST = 'fast'
}

export interface ParserConfig {
  readonly includeJSDoc?: boolean;
  readonly includeTrivia?: boolean;
  readonly skipLibCheck?: boolean;
  readonly customTransformers?: any[];
}
```

### Builder Interfaces

```typescript
export interface IAnalysisRequestBuilder {
  setFilePath(filePath: string): IAnalysisRequestBuilder;
  setOptions(options: AnalysisOptions): IAnalysisRequestBuilder;
  setContext(context: AnalysisContext): IAnalysisRequestBuilder;
  build(): FileAnalysisRequest;
}

export interface IBatchRequestBuilder {
  addFile(filePath: string): IBatchRequestBuilder;
  addFiles(filePaths: string[]): IBatchRequestBuilder;
  setOptions(options: BatchAnalysisOptions): IBatchRequestBuilder;
  setContext(context: AnalysisContext): IBatchRequestBuilder;
  build(): BatchAnalysisRequest;
}
```

## Event System Model

### Event Interfaces

```typescript
export interface AnalysisEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly data: any;
}

export interface FileAnalysisStartEvent extends AnalysisEvent {
  readonly type: 'analysis:start';
  readonly data: {
    filePath: string;
    options: AnalysisOptions;
  };
}

export interface FileAnalysisCompleteEvent extends AnalysisEvent {
  readonly type: 'analysis:complete';
  readonly data: {
    filePath: string;
    result: AnalysisResult;
    duration: number;
  };
}

export interface BatchProgressEvent extends AnalysisEvent {
  readonly type: 'batch:progress';
  readonly data: BatchProgress;
}

export interface CacheHitEvent extends AnalysisEvent {
  readonly type: 'cache:hit';
  readonly data: {
    key: string;
    filePath: string;
  };
}

export interface CacheMissEvent extends AnalysisEvent {
  readonly type: 'cache:miss';
  readonly data: {
    key: string;
    filePath: string;
  };
}
```

## Type Guards and Utilities

### Type Guards

```typescript
export function isAnalysisResult(obj: any): obj is AnalysisResult {
  return obj && 
    typeof obj.success === 'boolean' &&
    typeof obj.filePath === 'string' &&
    Array.isArray(obj.dependencies);
}

export function isDependencyInfo(obj: any): obj is DependencyInfo {
  return obj &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.isExternal === 'boolean';
}

export function isAnalysisError(obj: any): obj is AnalysisError {
  return obj instanceof AnalysisError;
}

export function isBatchAnalysisResult(obj: any): obj is BatchAnalysisResult {
  return obj &&
    typeof obj.success === 'boolean' &&
    typeof obj.totalFiles === 'number' &&
    Array.isArray(obj.results);
}
```

### Utility Types

```typescript
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type AnalysisResultWithoutMetadata = Omit<AnalysisResult, 'metadata'>;

export type MinimalAnalysisResult = Pick<AnalysisResult, 'success' | 'filePath' | 'dependencies'>;
```

## Versioning and Compatibility

### Version Interfaces

```typescript
export interface VersionInfo {
  readonly version: string;
  readonly apiVersion: string;
  readonly buildDate: Date;
  readonly compatibleVersions: string[];
}

export interface CompatibilityResult {
  readonly isCompatible: boolean;
  readonly requiredVersion: string;
  readonly currentVersion: string;
  readonly issues: CompatibilityIssue[];
}

export interface CompatibilityIssue {
  readonly type: 'breaking' | 'deprecated' | 'warning';
  readonly message: string;
  readonly suggestion?: string;
}
```

---
**Generated**: 2024-09-12  
**Phase 1**: Complete  
**Next Phase**: Implementation Tasks