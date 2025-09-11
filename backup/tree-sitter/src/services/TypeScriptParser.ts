/**
 * TypeScript Parser Service
 * Single-file TypeScript analysis using tree-sitter
 */

import { AnalysisResult, createSuccessResult, createErrorResult, createParseError } from '../models/AnalysisResult';
import { DependencyInfo } from '../models/DependencyInfo';
import { ImportInfo } from '../models/ImportInfo';
import { ExportInfo } from '../models/ExportInfo';
import { TypeScriptParserEnhanced } from '../parsers/TypeScriptParserEnhanced';
import { createLogger } from '../utils/logger';

const logger = createLogger('TypeScriptParser');

export class TypeScriptParser {
  private enhancedParser: TypeScriptParserEnhanced;

  constructor() {
    this.enhancedParser = new TypeScriptParserEnhanced();
    logger.debug('TypeScriptParser initialized with enhanced parser');
  }

  /**
   * Parses a TypeScript file and extracts analysis information
   * @param filePath Path to the file being parsed
   * @param content File content
   * @returns Promise<AnalysisResult>
   */
  async parseFile(filePath: string, content: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      logger.debug(`Starting TypeScript file parsing for: ${filePath}`);
      
      // Use enhanced parser to extract information
      const result = this.enhancedParser.parseFile(content);

      const parseTime = Date.now() - startTime;
      logger.debug(`Parsing complete: ${result.dependencies.length} dependencies, ${result.imports.length} imports, ${result.exports.length} exports`);
      
      // If there were parse errors but we got some results, it's a partial success
      if (result.hasParseErrors && (result.dependencies.length > 0 || result.imports.length > 0 || result.exports.length > 0)) {
        logger.warn('Partial parsing success despite syntax errors');
        const analysisResult = createSuccessResult(filePath, parseTime, result.dependencies, result.imports, result.exports);
        // Mark as partial success by adding error information but keeping success=true
        analysisResult.success = true;
        analysisResult.error = { code: 'PARSE_ERROR', message: 'File contains syntax errors but partial analysis was possible' };
        return analysisResult;
      } else if (result.hasParseErrors) {
        // No results and parse errors - this is still a failure
        const err = new Error('Parse error: Unable to parse TypeScript content. The file contains syntax errors or invalid TypeScript code.');
        return createErrorResult(filePath, createParseError(err), parseTime);
      }
      
      return createSuccessResult(filePath, parseTime, result.dependencies, result.imports, result.exports);

    } catch (error) {
      const parseTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to parse TypeScript file', err);
      return createErrorResult(filePath, createParseError(err), parseTime);
    }
  }
}