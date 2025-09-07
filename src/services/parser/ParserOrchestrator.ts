/**
 * Parser Orchestrator
 * Single Responsibility: Coordinating between Tree-sitter and fallback parsing
 */

import { TreeSitterDependencyAnalyzer, FileAnalysisResult } from '../treeSitterDependencyAnalyzer.js';
import { FallbackParser, FallbackAnalysisResult } from './FallbackParser.js';
import { DependencyExtractionEngine } from '../dependencyExtractionEngine.js';
import { extname } from 'path';

export interface ParsedResult {
  source: 'treesitter' | 'fallback';
  result: FileAnalysisResult | FallbackAnalysisResult;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ParsingOptions {
  preferTreeSitter: boolean;
  fallbackOnError: boolean;
  includeMetrics: boolean;
  timeout?: number;
}

/**
 * Parser Orchestrator
 * Coordinates between Tree-sitter and fallback parsing strategies
 */
export class ParserOrchestrator {
  private treeSitterAnalyzer: TreeSitterDependencyAnalyzer;
  private fallbackParser: FallbackParser;
  private extractionEngine: DependencyExtractionEngine;

  constructor(extractionEngine: DependencyExtractionEngine) {
    this.treeSitterAnalyzer = new TreeSitterDependencyAnalyzer();
    this.fallbackParser = new FallbackParser();
    this.extractionEngine = extractionEngine;
  }

  /**
   * Parse file using the best available parser
   */
  async parseFile(
    filePath: string, 
    options: ParsingOptions = {
      preferTreeSitter: true,
      fallbackOnError: true,
      includeMetrics: false
    }
  ): Promise<ParsedResult> {
    const startTime = Date.now();
    
    // Try Tree-sitter first if preferred
    if (options.preferTreeSitter) {
      try {
        const result = await this.parseWithTreeSitter(filePath, options.timeout);
        if (result) {
          return {
            source: 'treesitter',
            result,
            processingTime: Date.now() - startTime,
            success: true
          };
        }
      } catch (error) {
        if (!options.fallbackOnError) {
          return {
            source: 'treesitter',
            result: this.createEmptyResult(filePath),
            processingTime: Date.now() - startTime,
            success: false,
            error: `Tree-sitter failed: ${error}`
          };
        }
      }
    }

    // Fall back to regex-based parsing
    try {
      const result = await this.parseWithFallback(filePath);
      if (result) {
        return {
          source: 'fallback',
          result,
          processingTime: Date.now() - startTime,
          success: true
        };
      }
    } catch (error) {
      return {
        source: 'fallback',
        result: this.createEmptyFallbackResult(filePath),
        processingTime: Date.now() - startTime,
        success: false,
        error: `Fallback parsing failed: ${error}`
      };
    }

    // If both fail, return empty result
    return {
      source: 'fallback',
      result: this.createEmptyFallbackResult(filePath),
      processingTime: Date.now() - startTime,
      success: false,
      error: 'All parsing strategies failed'
    };
  }

  /**
   * Parse multiple files
   */
  async parseFiles(
    filePaths: string[], 
    options: ParsingOptions = {
      preferTreeSitter: true,
      fallbackOnError: true,
      includeMetrics: false
    }
  ): Promise<ParsedResult[]> {
    const results = await Promise.all(
      filePaths.map(filePath => this.parseFile(filePath, options))
    );
    
    return results;
  }

  /**
   * Parse with Tree-sitter
   */
  private async parseWithTreeSitter(
    filePath: string, 
    timeout?: number
  ): Promise<FileAnalysisResult | null> {
    if (timeout) {
      return Promise.race([
        this.treeSitterAnalyzer.analyzeFile(filePath),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Tree-sitter timeout')), timeout)
        )
      ]);
    }
    
    return this.treeSitterAnalyzer.analyzeFile(filePath);
  }

  /**
   * Parse with fallback parser
   */
  private async parseWithFallback(filePath: string): Promise<FallbackAnalysisResult | null> {
    return this.fallbackParser.analyzeFile(filePath);
  }

  /**
   * Check parsing capabilities for file
   */
  getParsingCapabilities(filePath: string): {
    treeSitterSupported: boolean;
    fallbackSupported: boolean;
    extension: string;
  } {
    const extension = extname(filePath);
    
    return {
      treeSitterSupported: this.isTreeSitterSupported(extension),
      fallbackSupported: this.fallbackParser.isLanguageSupported(extension),
      extension
    };
  }

  /**
   * Get parsing statistics
   */
  getParsingStats(results: ParsedResult[]): {
    total: number;
    treeSitterSuccess: number;
    fallbackSuccess: number;
    failures: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
  } {
    const treeSitterSuccess = results.filter(r => r.source === 'treesitter' && r.success).length;
    const fallbackSuccess = results.filter(r => r.source === 'fallback' && r.success).length;
    const failures = results.filter(r => !r.success).length;
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    return {
      total: results.length,
      treeSitterSuccess,
      fallbackSuccess,
      failures,
      averageProcessingTime: results.length > 0 ? totalProcessingTime / results.length : 0,
      totalProcessingTime
    };
  }

  /**
   * Check if Tree-sitter supports file extension
   */
  private isTreeSitterSupported(extension: string): boolean {
    // This would check against Tree-sitter's supported languages
    const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp'];
    return supportedExtensions.includes(extension);
  }

  /**
   * Create empty result for Tree-sitter
   */
  private createEmptyResult(filePath: string): FileAnalysisResult {
    return {
      filePath,
      language: 'unknown',
      dependencies: [],
      exports: [],
      functions: [],
      classes: [],
      comments: [],
      metadata: {
        fileSize: 0,
        lineCount: 0,
        characterCount: 0,
        language: 'unknown'
      }
    };
  }

  /**
   * Create empty result for fallback
   */
  private createEmptyFallbackResult(filePath: string): FallbackAnalysisResult {
    return {
      filePath,
      language: 'unknown',
      dependencies: [],
      exports: [],
      comments: [],
      metadata: {
        fileSize: 0,
        lineCount: 0,
        characterCount: 0,
        language: 'unknown',
        hasParser: false
      },
      parseErrors: []
    };
  }
}