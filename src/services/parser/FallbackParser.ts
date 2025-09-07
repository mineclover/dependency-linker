/**
 * Fallback Parser
 * Single Responsibility: Providing regex-based parsing when Tree-sitter is unavailable
 */

import { LanguageConfigManager, LanguageConfig } from './LanguageConfigManager.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';

export interface FallbackAnalysisResult {
  filePath: string;
  language: string;
  dependencies: Array<{
    source: string;
    type: 'local' | 'external';
    line?: number;
    column?: number;
  }>;
  exports: Array<{
    name: string;
    type: 'default' | 'named' | 'namespace';
    line?: number;
  }>;
  comments: Array<{
    content: string;
    type: 'line' | 'block';
    line?: number;
  }>;
  metadata: {
    fileSize: number;
    lineCount: number;
    characterCount: number;
    language: string;
    hasParser: boolean;
  };
  parseErrors: string[];
}

/**
 * Fallback Parser
 * Provides regex-based parsing when Tree-sitter parsers are unavailable
 */
export class FallbackParser {
  private languageConfigManager: LanguageConfigManager;

  constructor() {
    this.languageConfigManager = new LanguageConfigManager();
  }

  /**
   * Analyze file using fallback parsing
   */
  async analyzeFile(filePath: string): Promise<FallbackAnalysisResult | null> {
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const extension = extname(filePath);
      const config = this.languageConfigManager.getConfigByExtension(extension);
      
      if (!config) {
        return this.createUnknownLanguageResult(filePath, content);
      }

      return this.analyzeContent(content, config, filePath);
    } catch (error) {
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
        parseErrors: [`Failed to read file: ${error}`]
      };
    }
  }

  /**
   * Analyze content using language configuration
   */
  private analyzeContent(
    content: string, 
    config: LanguageConfig, 
    filePath: string
  ): FallbackAnalysisResult {
    const result: FallbackAnalysisResult = {
      filePath,
      language: config.name.toLowerCase(),
      dependencies: [],
      exports: [],
      comments: [],
      metadata: {
        fileSize: Buffer.byteLength(content, 'utf-8'),
        lineCount: content.split('\n').length,
        characterCount: content.length,
        language: config.name.toLowerCase(),
        hasParser: config.parserAvailable
      },
      parseErrors: []
    };

    try {
      // Extract dependencies
      this.extractDependencies(content, config, result);
      
      // Extract exports
      this.extractExports(content, config, result);
      
      // Extract comments
      this.extractComments(content, config, result);
      
    } catch (error) {
      result.parseErrors.push(`Parse error: ${error}`);
    }

    return result;
  }

  /**
   * Extract dependencies using language patterns
   */
  private extractDependencies(
    content: string, 
    config: LanguageConfig, 
    result: FallbackAnalysisResult
  ): void {
    const lines = content.split('\n');
    
    for (const pattern of config.dependencyPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        try {
          const source = pattern.extractSource(match);
          const isLocal = pattern.isLocal(source);
          const lineNumber = this.getLineNumber(content, match.index);
          
          result.dependencies.push({
            source,
            type: isLocal ? 'local' : 'external',
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index) - 1
          });
        } catch (error) {
          result.parseErrors.push(`Dependency extraction error: ${error}`);
        }
      }
    }
  }

  /**
   * Extract exports using language patterns
   */
  private extractExports(
    content: string, 
    config: LanguageConfig, 
    result: FallbackAnalysisResult
  ): void {
    for (const pattern of config.exportPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        try {
          const name = pattern.extractName(match);
          const lineNumber = this.getLineNumber(content, match.index);
          
          result.exports.push({
            name,
            type: pattern.type,
            line: lineNumber
          });
        } catch (error) {
          result.parseErrors.push(`Export extraction error: ${error}`);
        }
      }
    }
  }

  /**
   * Extract comments using language patterns
   */
  private extractComments(
    content: string, 
    config: LanguageConfig, 
    result: FallbackAnalysisResult
  ): void {
    for (const pattern of config.commentPatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        try {
          const commentContent = pattern.extractContent(match);
          const lineNumber = this.getLineNumber(content, match.index);
          
          result.comments.push({
            content: commentContent,
            type: pattern.type,
            line: lineNumber
          });
        } catch (error) {
          result.parseErrors.push(`Comment extraction error: ${error}`);
        }
      }
    }
  }

  /**
   * Create result for unknown language
   */
  private createUnknownLanguageResult(filePath: string, content: string): FallbackAnalysisResult {
    return {
      filePath,
      language: 'unknown',
      dependencies: [],
      exports: [],
      comments: [],
      metadata: {
        fileSize: Buffer.byteLength(content, 'utf-8'),
        lineCount: content.split('\n').length,
        characterCount: content.length,
        language: 'unknown',
        hasParser: false
      },
      parseErrors: [`Unsupported file type: ${extname(filePath)}`]
    };
  }

  /**
   * Get line number from content index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(extension: string): boolean {
    return this.languageConfigManager.getConfigByExtension(extension) !== undefined;
  }

  /**
   * Get supported extensions
   */
  getSupportedExtensions(): string[] {
    const extensions: string[] = [];
    for (const language of this.languageConfigManager.getSupportedLanguages()) {
      const config = this.languageConfigManager.getLanguageConfig(language);
      if (config) {
        extensions.push(...config.extensions);
      }
    }
    return extensions;
  }
}