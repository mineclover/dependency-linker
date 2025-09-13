/**
 * Analysis Engine Contract
 * Core interface for multi-language AST analysis coordination
 */

import { Parser } from 'tree-sitter';

export interface IAnalysisEngine {
  /**
   * Initialize the analysis engine with configuration
   * @param config Analysis configuration
   */
  initialize(config: AnalysisConfig): Promise<void>;

  /**
   * Analyze a single file
   * @param filePath Path to file to analyze
   * @param options Analysis options for this specific file
   */
  analyzeFile(filePath: string, options?: FileAnalysisOptions): Promise<AnalysisResult>;

  /**
   * Analyze multiple files in batch
   * @param filePaths Array of file paths to analyze
   * @param options Batch analysis options
   */
  analyzeFiles(filePaths: string[], options?: BatchAnalysisOptions): Promise<AnalysisResult[]>;

  /**
   * Register a new language parser
   * @param parser Language parser to register
   */
  registerParser(parser: LanguageParser): void;

  /**
   * Register a new data extractor plugin
   * @param extractor Data extractor to register
   */
  registerExtractor(extractor: IDataExtractor<any>): void;

  /**
   * Register a new data interpreter plugin
   * @param interpreter Data interpreter to register
   */
  registerInterpreter(interpreter: IDataInterpreter<any, any>): void;

  /**
   * Get list of supported file extensions
   */
  getSupportedExtensions(): string[];

  /**
   * Get analysis engine status and metrics
   */
  getStatus(): EngineStatus;

  /**
   * Clear all caches
   */
  clearCache(): Promise<void>;

  /**
   * Shutdown the engine and cleanup resources
   */
  shutdown(): Promise<void>;
}

export interface AnalysisConfig {
  enabledExtractors: string[];
  enabledInterpreters: string[];
  cacheSettings: CacheConfig;
  parallelism: number;
  timeout: number;
  languageSettings: Record<string, any>;
}

export interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
  maxEntries: number;
  directory?: string;
}

export interface FileAnalysisOptions {
  extractors?: string[];
  interpreters?: string[];
  enableCache?: boolean;
  timeout?: number;
}

export interface BatchAnalysisOptions extends FileAnalysisOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (filePath: string, error: Error) => void;
}

export interface AnalysisResult {
  filePath: string;
  language: string;
  success: boolean;
  extractedData: ExtractedData[];
  interpretedResults: Record<string, any>;
  performance: PerformanceMetrics;
  errors: AnalysisError[];
}

export interface ExtractedData {
  type: string;
  language: string;
  filePath: string;
  location: SourceLocation;
  data: any;
  metadata: Record<string, any>;
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface PerformanceMetrics {
  parseTime: number;
  extractionTime: number;
  interpretationTime: number;
  totalTime: number;
  memoryUsage?: number;
}

export interface AnalysisError {
  code: string;
  message: string;
  phase: 'parse' | 'extract' | 'interpret';
  details?: any;
}

export interface EngineStatus {
  initialized: boolean;
  registeredParsers: string[];
  registeredExtractors: string[];
  registeredInterpreters: string[];
  cacheStats: CacheStats;
  performance: EnginePerformanceMetrics;
}

export interface CacheStats {
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

export interface EnginePerformanceMetrics {
  totalAnalyses: number;
  averageAnalysisTime: number;
  peakMemoryUsage: number;
}