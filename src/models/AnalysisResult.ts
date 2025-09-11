/**
 * Analysis Result Model
 * The result of analyzing a TypeScript file
 */

import { DependencyInfo } from './DependencyInfo';
import { ImportInfo } from './ImportInfo';
import { ExportInfo } from './ExportInfo';
import { SourceLocation } from './SourceLocation';

export interface AnalysisError {
  /** Error code */
  code: 'PARSE_ERROR' | 'FILE_NOT_FOUND' | 'INVALID_FILE_TYPE' | 'PERMISSION_DENIED' | 'TIMEOUT';
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: any;
}

export interface AnalysisResult {
  /** The analyzed file path */
  filePath: string;
  /** Whether analysis completed successfully */
  success: boolean;
  /** Extracted dependencies */
  dependencies: DependencyInfo[];
  /** Import statements */
  imports: ImportInfo[];
  /** Exported symbols */
  exports: ExportInfo[];
  /** Time taken to parse in milliseconds */
  parseTime: number;
  /** Error details if analysis failed */
  error?: AnalysisError;
}

/**
 * Creates a successful analysis result
 * @param filePath The analyzed file path
 * @param parseTime Time taken for parsing
 * @param dependencies Extracted dependencies
 * @param imports Import statements
 * @param exports Export statements
 * @returns Successful analysis result
 */
export function createSuccessResult(
  filePath: string,
  parseTime: number,
  dependencies: DependencyInfo[] = [],
  imports: ImportInfo[] = [],
  exports: ExportInfo[] = []
): AnalysisResult {
  return {
    filePath,
    success: true,
    dependencies,
    imports,
    exports,
    parseTime
  };
}

/**
 * Creates a failed analysis result
 * @param filePath The file path that failed analysis
 * @param error Error information
 * @param parseTime Time taken before failure (default: 0)
 * @returns Failed analysis result with partial data
 */
export function createErrorResult(
  filePath: string,
  error: AnalysisError,
  parseTime: number = 0,
  dependencies: DependencyInfo[] = [],
  imports: ImportInfo[] = [],
  exports: ExportInfo[] = []
): AnalysisResult {
  return {
    filePath,
    success: false,
    dependencies,
    imports,
    exports,
    parseTime,
    error
  };
}

/**
 * Creates an error for file not found
 * @param filePath The missing file path
 * @returns AnalysisError for file not found
 */
export function createFileNotFoundError(filePath: string): AnalysisException {
  return new AnalysisException({
    code: 'FILE_NOT_FOUND',
    message: `File not found: ${filePath}`,
    details: { filePath }
  });
}

/**
 * Creates an error for invalid file type
 * @param filePath The file path with invalid type
 * @returns AnalysisError for invalid file type
 */
export function createInvalidFileTypeError(filePath: string): AnalysisError {
  return {
    code: 'INVALID_FILE_TYPE',
    message: `Invalid file type. Only TypeScript files (.ts, .tsx) are supported: ${filePath}`,
    details: { filePath }
  };
}

/**
 * Custom error class that carries AnalysisError information
 */
export class AnalysisException extends Error {
  public readonly analysisError: AnalysisError;
  
  constructor(analysisError: AnalysisError) {
    super(analysisError.message);
    this.name = 'AnalysisException';
    this.analysisError = analysisError;
  }
}

/**
 * Creates an error for permission denied
 * @param filePath The file path that couldn't be accessed
 * @returns AnalysisError for permission denied
 */
export function createPermissionDeniedError(filePath: string): AnalysisException {
  return new AnalysisException({
    code: 'PERMISSION_DENIED',
    message: `Permission denied: Cannot read file ${filePath}`,
    details: { filePath }
  });
}

/**
 * Creates an error for parsing timeout
 * @param timeout The timeout value that was exceeded
 * @returns AnalysisError for timeout
 */
export function createTimeoutError(timeout: number): AnalysisError {
  return {
    code: 'TIMEOUT',
    message: `Analysis timed out after ${timeout}ms`,
    details: { timeout }
  };
}

/**
 * Creates an error for parsing failure
 * @param originalError The original error that caused parsing to fail
 * @returns AnalysisError for parse error
 */
export function createParseError(originalError: Error | string): AnalysisError {
  const message = originalError instanceof Error ? originalError.message : originalError;
  return {
    code: 'PARSE_ERROR',
    message: `Parse error: ${message}`,
    details: originalError instanceof Error ? {
      name: originalError.name,
      stack: originalError.stack
    } : { message: originalError }
  };
}

/**
 * Validates an analysis result structure
 * @param result The result to validate
 * @returns True if the result structure is valid
 */
export function isValidAnalysisResult(result: any): result is AnalysisResult {
  return (
    result &&
    typeof result === 'object' &&
    typeof result.filePath === 'string' &&
    typeof result.success === 'boolean' &&
    Array.isArray(result.dependencies) &&
    Array.isArray(result.imports) &&
    Array.isArray(result.exports) &&
    typeof result.parseTime === 'number' &&
    (result.error === undefined || (
      typeof result.error === 'object' &&
      typeof result.error.code === 'string' &&
      typeof result.error.message === 'string'
    ))
  );
}