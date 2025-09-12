/**
 * Core TypeScript Parser Service
 * Implements ITypeScriptParser interface for modular architecture
 */

import * as fs from 'fs';
import { ITypeScriptParser } from '../interfaces/ITypeScriptParser';
import { ParseOptions, ParseResult } from '../types/ParseTypes';
import { TypeScriptParserEnhanced } from '../../parsers/TypeScriptParserEnhanced';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CoreTypeScriptParser');

/**
 * Core TypeScriptParser implementation with interface compliance
 */
export class TypeScriptParser implements ITypeScriptParser {
  private enhancedParser: TypeScriptParserEnhanced;

  constructor() {
    this.enhancedParser = new TypeScriptParserEnhanced();
    logger.debug('Core TypeScriptParser initialized with enhanced parser');
  }

  /**
   * Parses TypeScript source code and extracts AST information
   * @param source TypeScript source code as string
   * @param options Parse options including timeout and features
   * @returns Promise resolving to parse result with AST data
   */
  async parseSource(source: string, options?: ParseOptions): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      logger.debug('Starting TypeScript source parsing');

      // Set up timeout if specified
      if (options?.timeout) {
        const timeoutPromise = this.createTimeoutPromise(options.timeout);
        const parsePromise = this.performSourceParsing(source, options);
        const result = await Promise.race([parsePromise, timeoutPromise]);
        return result;
      } else {
        return await this.performSourceParsing(source, options);
      }
    } catch (error) {
      const parseTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (err.message.includes('timeout')) {
        throw new Error(`ParseTimeoutError: ${err.message}`);
      }
      
      logger.error('Failed to parse TypeScript source', err);
      throw new Error(`SyntaxError: ${err.message}`);
    }
  }

  /**
   * Parses TypeScript file and extracts AST information  
   * @param filePath Path to TypeScript file
   * @param options Parse options including timeout and features
   * @returns Promise resolving to parse result with AST data
   */
  async parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
    try {
      // Check if file exists
      if (!await this.fileExists(filePath)) {
        throw new Error(`FileNotFoundError: File does not exist: ${filePath}`);
      }

      // Read file content
      const source = await this.readFile(filePath);
      
      // Parse the source with file context
      const result = await this.parseSource(source, options);
      
      logger.debug(`File parsing complete for: ${filePath}`);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to parse TypeScript file: ${filePath}`, err);
      
      if (err.message.includes('FileNotFoundError')) {
        throw new Error(`FileNotFoundError: ${err.message}`);
      }
      if (err.message.includes('ParseTimeoutError')) {
        throw new Error(`ParseTimeoutError: ${err.message}`);
      }
      
      throw err;
    }
  }

  /**
   * Performs the actual source parsing
   * @param source TypeScript source code
   * @param options Parse options
   * @returns Promise<ParseResult>
   */
  private async performSourceParsing(source: string, options?: ParseOptions): Promise<ParseResult> {
    try {
      // Use enhanced parser to extract information
      const result = this.enhancedParser.parseFile(source);

      // Apply options if specified
      let finalResult = result;
      
      if (options?.includeTypeImports === false) {
        // Filter out type-only imports if requested
        finalResult.imports = result.imports.filter((imp: any) => !imp.isTypeOnly);
      }

      logger.debug(`Source parsing complete: ${result.dependencies.length} dependencies, ${result.imports.length} imports, ${result.exports.length} exports`);
      
      return {
        dependencies: finalResult.dependencies,
        imports: finalResult.imports,
        exports: finalResult.exports,
        hasParseErrors: finalResult.hasParseErrors
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Enhanced parser failed', err);
      
      // Return empty result with error flag
      return {
        dependencies: [],
        imports: [],
        exports: [],
        hasParseErrors: true
      };
    }
  }

  /**
   * Creates a timeout promise that rejects after the specified time
   * @param timeout Timeout in milliseconds
   * @returns Promise that rejects with timeout error
   */
  private createTimeoutPromise(timeout: number): Promise<ParseResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Parse operation timed out after ${timeout}ms`));
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
      if (error && typeof error === 'object' && (error as any).code === 'ENOENT') {
        throw new Error(`FileNotFoundError: File not found: ${filePath}`);
      }
      
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  /**
   * Gets supported TypeScript file extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.d.ts'];
  }

  /**
   * Gets parser configuration information
   * @returns Parser configuration object
   */
  getParserInfo(): {
    name: string;
    version: string;
    treeSitterVersion: string;
    supportedExtensions: string[];
  } {
    return {
      name: 'Core TypeScript Parser',
      version: '1.0.0',
      treeSitterVersion: '0.21.0',
      supportedExtensions: this.getSupportedExtensions()
    };
  }
}