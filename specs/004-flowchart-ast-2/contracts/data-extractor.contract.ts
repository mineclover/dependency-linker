/**
 * Data Extractor Plugin Contract
 * Interface for extracting specific information from AST nodes
 */

import { Parser } from 'tree-sitter';

export interface IDataExtractor<T> {
  /**
   * Unique identifier for this extractor
   */
  readonly name: string;

  /**
   * Version of this extractor for compatibility tracking
   */
  readonly version: string;

  /**
   * List of programming languages this extractor supports
   */
  readonly supportedLanguages: string[];

  /**
   * Data type identifier that this extractor produces
   */
  readonly outputType: string;

  /**
   * Extract specific data from AST
   * @param ast Parsed AST tree
   * @param source Original source code
   * @param filePath Path to the analyzed file
   * @param language Detected programming language
   * @returns Array of extracted data items
   */
  extract(
    ast: Parser.Tree,
    source: string,
    filePath: string,
    language: string
  ): Promise<T[]>;

  /**
   * Validate if this extractor can process the given language
   * @param language Programming language identifier
   */
  supportsLanguage(language: string): boolean;

  /**
   * Get configuration schema for this extractor
   */
  getConfigSchema(): ExtractorConfigSchema;

  /**
   * Validate extractor configuration
   * @param config Configuration object to validate
   */
  validateConfig(config: any): ConfigValidationResult;
}

export interface ExtractorConfigSchema {
  properties: Record<string, ConfigProperty>;
  required: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: any;
  enum?: any[];
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Built-in extractor types for common analysis patterns
 */

export interface DependencyExtractor extends IDataExtractor<DependencyData> {
  readonly outputType: 'dependency';
}

export interface DependencyData {
  source: string;
  type: 'external' | 'internal' | 'relative';
  importType: 'import' | 'require' | 'dynamic';
  specifiers: ImportSpecifier[];
  location: SourceLocation;
}

export interface ImportSpecifier {
  type: 'default' | 'named' | 'namespace';
  imported: string;
  local: string;
}

export interface IdentifierExtractor extends IDataExtractor<IdentifierData> {
  readonly outputType: 'identifier';
}

export interface IdentifierData {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  scope: 'global' | 'module' | 'local';
  visibility: 'public' | 'private' | 'protected';
  location: SourceLocation;
  references: SourceLocation[];
}

export interface ComplexityExtractor extends IDataExtractor<ComplexityData> {
  readonly outputType: 'complexity';
}

export interface ComplexityData {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  functionLength: number;
  location: SourceLocation;
  functionName?: string;
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}