# API Contracts

## Core Service Contracts

### IFileAnalyzer Interface

```typescript
export interface IFileAnalyzer {
  /**
   * Analyzes a TypeScript file and returns detailed analysis results
   * @param request - File analysis request with path and options
   * @returns Promise resolving to analysis results
   * @throws FileNotFoundError if file doesn't exist
   * @throws InvalidFileTypeError if file is not TypeScript
   * @throws ParseTimeoutError if parsing exceeds timeout
   */
  analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult>;

  /**
   * Validates if a file can be analyzed
   * @param filePath - Path to the file to validate
   * @returns Promise resolving to validation result
   */
  validateFile(filePath: string): Promise<ValidationResult>;
}
```

### ITypeScriptParser Interface

```typescript
export interface ITypeScriptParser {
  /**
   * Parses TypeScript source code and extracts AST information
   * @param source - TypeScript source code as string
   * @param options - Parse options including timeout and features
   * @returns Promise resolving to parse result with AST data
   * @throws ParseTimeoutError if parsing exceeds timeout
   * @throws SyntaxError if source has invalid syntax
   */
  parseSource(source: string, options: ParseOptions): Promise<ParseResult>;

  /**
   * Parses TypeScript file and extracts AST information  
   * @param filePath - Path to TypeScript file
   * @param options - Parse options including timeout and features
   * @returns Promise resolving to parse result with AST data
   * @throws FileNotFoundError if file doesn't exist
   * @throws ParseTimeoutError if parsing exceeds timeout
   */
  parseFile(filePath: string, options: ParseOptions): Promise<ParseResult>;
}
```

### IOutputFormatter Interface

```typescript
export interface IOutputFormatter {
  /**
   * Formats analysis result according to specified output format
   * @param result - Analysis result to format
   * @param format - Target output format (json, text, csv, etc.)
   * @returns Formatted string representation
   * @throws UnsupportedFormatError if format is not supported
   */
  format(result: AnalysisResult, format: OutputFormat): string;

  /**
   * Gets header information for specific format (e.g., CSV header)
   * @param format - Output format
   * @returns Header string or empty string if not applicable
   */
  getFormatHeader(format: OutputFormat): string;
}
```

## Main API Contract

### TypeScriptAnalyzer Class

```typescript
export class TypeScriptAnalyzer implements ITypeScriptAnalyzer {
  /**
   * Creates new TypeScript analyzer with optional configuration
   * @param options - Analyzer configuration options
   */
  constructor(options?: AnalyzerOptions);

  /**
   * Analyzes a single TypeScript file
   * @param filePath - Path to TypeScript file (.ts or .tsx)
   * @param options - Analysis options (format, timeout, etc.)
   * @returns Promise resolving to analysis result
   * @throws FileNotFoundError if file doesn't exist
   * @throws InvalidFileTypeError if file is not TypeScript
   * @throws ParseTimeoutError if analysis exceeds timeout
   * 
   * @example
   * ```typescript
   * const analyzer = new TypeScriptAnalyzer();
   * const result = await analyzer.analyzeFile('src/app.tsx');
   * console.log(`Found ${result.dependencies.length} dependencies`);
   * ```
   */
  analyzeFile(filePath: string, options?: AnalysisOptions): Promise<AnalysisResult>;

  /**
   * Analyzes multiple TypeScript files in batch
   * @param filePaths - Array of file paths to analyze
   * @param options - Batch analysis options including concurrency
   * @returns Promise resolving to batch analysis result
   * @throws BatchAnalysisError if batch processing fails
   * 
   * @example
   * ```typescript
   * const analyzer = new TypeScriptAnalyzer();
   * const results = await analyzer.analyzeFiles([
   *   'src/app.tsx',
   *   'src/utils.ts'
   * ]);
   * ```
   */
  analyzeFiles(filePaths: string[], options?: BatchAnalysisOptions): Promise<BatchAnalysisResult>;

  /**
   * Analyzes TypeScript source code directly
   * @param source - TypeScript source code as string
   * @param options - Source analysis options
   * @returns Promise resolving to analysis result
   * @throws ParseTimeoutError if analysis exceeds timeout
   * 
   * @example
   * ```typescript
   * const analyzer = new TypeScriptAnalyzer();
   * const source = 'import React from "react";';
   * const result = await analyzer.analyzeSource(source);
   * ```
   */
  analyzeSource(source: string, options?: SourceAnalysisOptions): Promise<AnalysisResult>;

  /**
   * Extracts only dependency information from a file
   * @param filePath - Path to TypeScript file
   * @returns Promise resolving to array of dependencies
   * @throws FileNotFoundError if file doesn't exist
   * 
   * @example
   * ```typescript
   * const analyzer = new TypeScriptAnalyzer();
   * const deps = await analyzer.extractDependencies('src/app.tsx');
   * const external = deps.filter(d => d.type === 'external');
   * ```
   */
  extractDependencies(filePath: string): Promise<DependencyInfo[]>;

  /**
   * Extracts only import information from a file
   * @param filePath - Path to TypeScript file
   * @returns Promise resolving to array of imports
   * @throws FileNotFoundError if file doesn't exist
   */
  getImports(filePath: string): Promise<ImportInfo[]>;

  /**
   * Extracts only export information from a file  
   * @param filePath - Path to TypeScript file
   * @returns Promise resolving to array of exports
   * @throws FileNotFoundError if file doesn't exist
   */
  getExports(filePath: string): Promise<ExportInfo[]>;

  /**
   * Validates if a file can be analyzed
   * @param filePath - Path to file to validate
   * @returns Promise resolving to validation result
   */
  validateFile(filePath: string): Promise<ValidationResult>;

  /**
   * Gets list of supported file extensions
   * @returns Array of supported extensions including dots (e.g., ['.ts', '.tsx'])
   */
  getSupportedExtensions(): string[];
}
```

## Factory Function Contracts

### Simple API Functions

```typescript
/**
 * Analyzes a TypeScript file with default settings
 * @param filePath - Path to TypeScript file
 * @param options - Optional analysis options
 * @returns Promise resolving to analysis result
 * 
 * @example
 * ```typescript
 * import { analyzeTypeScriptFile } from 'typescript-file-analyzer';
 * 
 * const result = await analyzeTypeScriptFile('src/app.tsx');
 * console.log(result.dependencies);
 * ```
 */
export function analyzeTypeScriptFile(
  filePath: string, 
  options?: AnalysisOptions
): Promise<AnalysisResult>;

/**
 * Extracts external package dependencies from a TypeScript file
 * @param filePath - Path to TypeScript file
 * @returns Promise resolving to array of package names
 * 
 * @example
 * ```typescript
 * import { extractDependencies } from 'typescript-file-analyzer';
 * 
 * const packages = await extractDependencies('src/app.tsx');
 * // Returns: ['react', '@mui/material', 'axios']
 * ```
 */
export function extractDependencies(filePath: string): Promise<string[]>;

/**
 * Analyzes multiple TypeScript files with default batch settings
 * @param filePaths - Array of file paths to analyze
 * @param options - Optional batch options
 * @returns Promise resolving to array of analysis results
 */
export function getBatchAnalysis(
  filePaths: string[], 
  options?: BatchOptions
): Promise<AnalysisResult[]>;
```

## Data Contracts

### Configuration Options

```typescript
export interface AnalyzerOptions {
  /** Maximum time in milliseconds for parsing (default: 5000) */
  parseTimeout?: number;
  
  /** Include source location information in results (default: false) */
  includeSourceLocations?: boolean;
  
  /** Enable result caching for repeated analysis (default: false) */
  enableCaching?: boolean;
  
  /** Custom parsers for specialized analysis (default: []) */
  customParsers?: ITypeScriptParser[];
  
  /** Custom formatters for additional output formats (default: []) */
  customFormatters?: IOutputFormatter[];
}

export interface AnalysisOptions {
  /** Output format for results (default: 'json') */
  format?: OutputFormat;
  
  /** Include source code locations in dependencies (default: false) */
  includeSources?: boolean;
  
  /** Include TypeScript type-only imports (default: true) */
  includeTypeImports?: boolean;
  
  /** Filter results to specific dependency types */
  filterTypes?: DependencyType[];
  
  /** Override default parse timeout */
  parseTimeout?: number;
}

export interface BatchAnalysisOptions extends AnalysisOptions {
  /** Maximum concurrent file processing (default: 4) */
  maxConcurrency?: number;
  
  /** Stop processing on first error (default: false) */
  failFast?: boolean;
  
  /** Progress callback for batch processing */
  progressCallback?: (completed: number, total: number) => void;
}
```

### Result Contracts

```typescript
export interface AnalysisResult {
  /** Path to the analyzed file */
  filePath: string;
  
  /** Whether analysis completed successfully */
  success: boolean;
  
  /** Array of all dependencies found in the file */
  dependencies: DependencyInfo[];
  
  /** Array of all import statements */
  imports: ImportInfo[];
  
  /** Array of all export statements */
  exports: ExportInfo[];
  
  /** Time taken for parsing in milliseconds */
  parseTime: number;
  
  /** Error information if analysis failed */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface BatchAnalysisResult {
  /** Array of individual file results */
  results: AnalysisResult[];
  
  /** Overall batch success status */
  success: boolean;
  
  /** Number of files successfully analyzed */
  successCount: number;
  
  /** Number of files that failed analysis */
  failureCount: number;
  
  /** Total time for batch processing in milliseconds */
  totalTime: number;
  
  /** Array of any errors encountered */
  errors: Array<{
    filePath: string;
    error: string;
  }>;
}

export interface ValidationResult {
  /** Whether file can be analyzed */
  canAnalyze: boolean;
  
  /** Array of validation error messages */
  errors: string[];
  
  /** File information if valid */
  fileInfo?: {
    size: number;
    extension: string;
    lastModified: Date;
  };
}
```

## Error Contracts

### Error Hierarchy

```typescript
export abstract class AnalysisError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  
  /** Additional error details */
  readonly details?: any;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class FileNotFoundError extends AnalysisError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
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
}

export class ParseTimeoutError extends AnalysisError {
  constructor(filePath: string, timeout: number) {
    super(
      `Parse timeout (${timeout}ms) exceeded for: ${filePath}`,
      'PARSE_TIMEOUT',
      { filePath, timeout }
    );
  }
}

export class BatchAnalysisError extends AnalysisError {
  constructor(message: string, failedFiles: string[]) {
    super(message, 'BATCH_ANALYSIS_ERROR', { failedFiles });
  }
}

export class UnsupportedFormatError extends AnalysisError {
  constructor(format: string, supportedFormats: string[]) {
    super(
      `Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`,
      'UNSUPPORTED_FORMAT',
      { format, supportedFormats }
    );
  }
}
```

## Compatibility Contracts

### CLI Compatibility

The API implementation must maintain 100% compatibility with existing CLI behavior:

1. **Command Signatures**: All existing CLI commands must work identically
2. **Output Formats**: All 7 output formats must produce identical results
3. **Error Messages**: Error messages must match existing CLI exactly
4. **Exit Codes**: Process exit codes must match existing CLI behavior
5. **Environment Variables**: All environment variable support maintained

### Performance Contracts

1. **Analysis Speed**: API should be within 5% of direct service call performance
2. **Memory Usage**: Memory consumption should not increase significantly
3. **Batch Processing**: Should scale efficiently with concurrent processing
4. **Startup Time**: API instantiation should be fast (<100ms)

### Integration Contracts

The API must support integration with:

1. **Build Tools**: Webpack, Rollup, Vite plugins
2. **IDEs**: VS Code extensions, language servers
3. **CI/CD**: GitHub Actions, Jenkins pipelines
4. **Testing**: Jest, Mocha test integration
5. **Node.js**: Both CommonJS and ESM environments