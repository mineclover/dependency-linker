/**
 * Core File Analyzer Service
 * Implements IFileAnalyzer interface for modular architecture
 */

import * as fs from 'fs';
import * as path from 'path';
import { IFileAnalyzer } from '../interfaces/IFileAnalyzer';
import { ITypeScriptParser } from '../interfaces/ITypeScriptParser';
import { ValidationResult } from '../types/ParseTypes';
import { TypeScriptParser as CoreTypeScriptParser } from './TypeScriptParser';
import { DependencyAnalyzer } from '../../services/DependencyAnalyzer';
import { 
  FileAnalysisRequest, 
  normalizeAnalysisOptions, 
  validateFileAnalysisRequest, 
  isTypeScriptFile 
} from '../../models/FileAnalysisRequest';
import { 
  AnalysisResult, 
  AnalysisException,
  createSuccessResult,
  createErrorResult, 
  createFileNotFoundError, 
  createInvalidFileTypeError, 
  createPermissionDeniedError,
  createTimeoutError 
} from '../../models/AnalysisResult';

/**
 * Core FileAnalyzer implementation with dependency injection support
 */
export class FileAnalyzer implements IFileAnalyzer {
  private parser: ITypeScriptParser;
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(parser?: ITypeScriptParser) {
    // Use the provided parser or default to our core TypeScriptParser
    this.parser = parser || new CoreTypeScriptParser();
    this.dependencyAnalyzer = new DependencyAnalyzer();
  }

  /**
   * Analyzes a TypeScript file according to the provided request
   * @param request File analysis request
   * @returns Promise<AnalysisResult>
   */
  async analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult> {
    // Validate request
    const validation = validateFileAnalysisRequest(request);
    if (!validation.isValid) {
      return createErrorResult(
        request.filePath,
        {
          code: 'PARSE_ERROR',
          message: `Invalid request: ${validation.errors.join(', ')}`,
          details: { errors: validation.errors }
        }
      );
    }

    const options = normalizeAnalysisOptions(request.options);
    const { filePath } = request;

    try {
      // Check if file exists
      if (!await this.fileExists(filePath)) {
        return createErrorResult(filePath, createFileNotFoundError(filePath).analysisError);
      }

      // Check if it's a TypeScript file
      if (!isTypeScriptFile(filePath)) {
        return createErrorResult(filePath, createInvalidFileTypeError(filePath));
      }

      // Read file content
      const content = await this.readFile(filePath);

      // Set up timeout
      const timeoutPromise = this.createTimeoutPromise(options.parseTimeout);
      const analysisPromise = this.performAnalysis(filePath, content, options);

      // Race between analysis and timeout
      const result = await Promise.race([analysisPromise, timeoutPromise]);

      // If we got a timeout error, return it
      if ('error' in result && result.error?.code === 'TIMEOUT') {
        return result;
      }

      return result as AnalysisResult;

    } catch (error) {
      // Check if it's an AnalysisException with specific error information
      if (error instanceof AnalysisException) {
        return createErrorResult(filePath, error.analysisError);
      }
      
      // For other errors, wrap as PARSE_ERROR
      return createErrorResult(
        filePath,
        {
          code: 'PARSE_ERROR',
          message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          details: error instanceof Error ? { stack: error.stack } : { error }
        }
      );
    }
  }

  /**
   * Validates a file can be analyzed
   * @param filePath Path to validate
   * @returns Promise<ValidationResult>
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    let fileInfo: ValidationResult['fileInfo'];

    if (!filePath || typeof filePath !== 'string') {
      errors.push('File path is required');
      return { 
        isValid: false,
        filePath: filePath || '',
        canAnalyze: false, 
        errors 
      };
    }

    if (!isTypeScriptFile(filePath)) {
      errors.push('File must be a TypeScript file (.ts or .tsx)');
    }

    if (!await this.fileExists(filePath)) {
      errors.push('File does not exist');
    } else {
      try {
        const stats = await fs.promises.stat(filePath);
        fileInfo = {
          size: stats.size,
          extension: path.extname(filePath),
          lastModified: stats.mtime
        };

        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
          errors.push('File is too large (>10MB)');
        }
        if (stats.size === 0) {
          errors.push('File is empty');
        }
      } catch (error) {
        errors.push(`Cannot access file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      isValid: errors.length === 0,
      filePath,
      canAnalyze: errors.length === 0,
      errors,
      fileInfo
    };
  }

  /**
   * Performs the actual file analysis
   * @param filePath Path to the file
   * @param content File content
   * @param options Analysis options
   * @returns Promise<AnalysisResult>
   */
  private async performAnalysis(
    filePath: string,
    content: string,
    options: any
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    // Parse using the new ITypeScriptParser interface
    const parseResult = await this.parser.parseSource(content, {
      timeout: options.parseTimeout,
      includeSourceLocations: options.includeSources,
      includeTypeImports: true
    });

    const parseTime = Date.now() - startTime;
    
    if (parseResult.hasParseErrors && parseResult.dependencies.length === 0) {
      return createErrorResult(
        filePath,
        {
          code: 'PARSE_ERROR',
          message: 'Failed to parse TypeScript file due to syntax errors',
          details: { hasParseErrors: true }
        }
      );
    }

    // Create success result from parse result
    const result = createSuccessResult(
      filePath,
      parseTime,
      parseResult.dependencies,
      parseResult.imports,
      parseResult.exports
    );

    // If there were parse errors but we got some results, mark as partial success
    if (parseResult.hasParseErrors) {
      result.error = {
        code: 'PARSE_ERROR',
        message: 'File contains syntax errors but partial analysis was possible',
        details: { hasParseErrors: true }
      };
    }

    // Enhance dependencies with classification
    const classifiedDependencies = await this.dependencyAnalyzer.classifyDependencies(
      result.dependencies,
      filePath
    );

    // Replace original dependencies with classified ones
    result.dependencies = classifiedDependencies;

    return result;
  }

  /**
   * Creates a timeout promise that rejects after the specified time
   * @param timeout Timeout in milliseconds
   * @returns Promise that rejects with timeout error
   */
  private createTimeoutPromise(timeout: number): Promise<AnalysisResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(createErrorResult('', createTimeoutError(timeout)));
      }, timeout);
    });
  }

  /**
   * Checks if a file exists
   * @param filePath Path to check
   * @returns Promise<boolean>
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads file content
   * @param filePath Path to the file
   * @returns Promise<string>
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      // Check for specific error codes regardless of instanceof check
      if (error && typeof error === 'object' && (error as any).code) {
        const errorCode = (error as any).code;
        if (errorCode === 'EACCES') {
          throw createPermissionDeniedError(filePath);
        } else if (errorCode === 'ENOENT') {
          throw createFileNotFoundError(filePath);
        }
      }
      
      // For instanceof Error or other error types
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Failed to read file: ${String(error)}`);
    }
  }

  /**
   * Analyzes multiple files in parallel
   * @param requests Array of analysis requests
   * @param concurrency Maximum concurrent analyses
   * @returns Promise<AnalysisResult[]>
   */
  async analyzeFiles(
    requests: FileAnalysisRequest[],
    concurrency: number = 5
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // Process in batches to limit concurrency
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchPromises = batch.map(request => this.analyzeFile(request));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Gets analysis statistics for a file
   * @param result Analysis result
   * @returns Statistics object
   */
  getAnalysisStats(result: AnalysisResult): {
    dependencies: number;
    imports: number;
    exports: number;
    parseTime: number;
    success: boolean;
  } {
    return {
      dependencies: result.dependencies.length,
      imports: result.imports.length,
      exports: result.exports.length,
      parseTime: result.parseTime,
      success: result.success
    };
  }

  /**
   * Creates a dependency report for analysis result
   * @param result Analysis result
   * @returns Formatted report string
   */
  generateDependencyReport(result: AnalysisResult): string {
    if (!result.success) {
      return `# Analysis Failed\n\nError: ${result.error?.message || 'Unknown error'}\n`;
    }

    // Cast to classified dependencies for report generation
    const classifiedDeps = result.dependencies as any[];
    return this.dependencyAnalyzer.generateReport(classifiedDeps);
  }

  /**
   * Gets the parser version
   * @returns Parser version information
   */
  getVersion(): {
    parser: string;
    treeSitter: string;
    analyzer: string;
  } {
    return {
      parser: 'TypeScript Parser v1.0.0',
      treeSitter: 'tree-sitter v0.21.0',
      analyzer: 'Core File Analyzer v1.0.0'
    };
  }
}