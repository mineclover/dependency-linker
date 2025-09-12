/**
 * Advanced Batch Processing for TypeScript Analysis
 * High-performance batch processing with concurrency control and intelligent resource management
 */

import { TypeScriptAnalyzer } from './TypeScriptAnalyzer';
import { 
  BatchAnalysisOptions, 
  BatchResult, 
  ProgressInfo,
  BatchSummary,
  BatchErrorInfo,
  AnalysisOptions,
  CancellationToken,
  Logger,
  LogLevel
} from './types';
import { AnalysisResult } from '../models/AnalysisResult';
import { 
  BatchError,
  OperationCancelledError,
  ResourceError,
  ErrorUtils
} from './errors';
import { createLogger } from '../utils/logger';

export interface BatchAnalyzerOptions {
  /** Maximum number of concurrent analysis operations */
  maxConcurrency?: number;
  /** Enable adaptive concurrency based on system resources */
  adaptiveConcurrency?: boolean;
  /** Memory usage limit in MB */
  memoryLimit?: number;
  /** Enable resource monitoring */
  enableResourceMonitoring?: boolean;
  /** Logger instance */
  logger?: Logger;
}

export interface ResourceMetrics {
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  activeOperations: number;
  queuedOperations: number;
  completedOperations: number;
  errorOperations: number;
}

/**
 * Advanced batch analyzer with intelligent resource management
 * Supports configurable concurrency, progress tracking, and error recovery
 */
export class BatchAnalyzer {
  private analyzer: TypeScriptAnalyzer;
  private logger: Logger;
  private options: Required<BatchAnalyzerOptions>;
  private activeOperations: Set<Promise<void>> = new Set();
  private isCancelled = false;
  private resourceMetrics: ResourceMetrics;
  private resourceMonitorInterval?: NodeJS.Timeout | undefined;

  constructor(
    analyzer?: TypeScriptAnalyzer,
    options: BatchAnalyzerOptions = {}
  ) {
    this.analyzer = analyzer || new TypeScriptAnalyzer();
    this.logger = options.logger || createLogger('BatchAnalyzer');
    
    this.options = {
      maxConcurrency: options.maxConcurrency || 5,
      adaptiveConcurrency: options.adaptiveConcurrency || false,
      memoryLimit: options.memoryLimit || 512, // 512 MB default
      enableResourceMonitoring: options.enableResourceMonitoring || true,
      logger: this.logger
    };

    this.resourceMetrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      activeOperations: 0,
      queuedOperations: 0,
      completedOperations: 0,
      errorOperations: 0
    };

    if (this.options.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
  }

  /**
   * Process multiple files with advanced batch processing
   * @param filePaths Array of file paths to analyze
   * @param options Batch processing options
   * @param cancellationToken Optional cancellation token
   * @returns Promise resolving to batch results
   */
  async processBatch(
    filePaths: string[],
    options: BatchAnalysisOptions = {},
    cancellationToken?: CancellationToken
  ): Promise<BatchResult> {
    if (filePaths.length === 0) {
      return this.createEmptyBatchResult();
    }

    const startTime = Date.now();
    this.isCancelled = false;
    
    // Set up cancellation handling
    if (cancellationToken) {
      cancellationToken.onCancellationRequested(() => {
        this.isCancelled = true;
        this.logger.warn('Batch processing cancellation requested');
      });
    }

    const results: AnalysisResult[] = [];
    const errors: BatchErrorInfo[] = [];
    
    // Determine processing strategy
    const strategy = this.selectProcessingStrategy(filePaths.length, options);
    this.logger.info(`Processing ${filePaths.length} files using ${strategy} strategy`);

    try {
      switch (strategy) {
        case 'fail-fast':
          await this.processFailFast(filePaths, options, results, errors);
          break;
        case 'collect-all':
          await this.processCollectAll(filePaths, options, results, errors);
          break;
        case 'best-effort':
        default:
          await this.processBestEffort(filePaths, options, results, errors);
          break;
      }

      if (this.isCancelled) {
        throw new OperationCancelledError('processBatch', { reason: 'Batch processing was cancelled' });
      }

      const totalTime = Date.now() - startTime;
      const summary = this.createBatchSummary(results, errors, totalTime);

      return {
        results,
        summary,
        errors,
        totalTime
      };

    } catch (error) {
      this.logger.error('Batch processing failed', error);
      
      if (error instanceof OperationCancelledError) {
        throw error;
      }

      throw ErrorUtils.createBatchError(
        errors.map(e => ({ filePath: e.filePath, error: new Error(e.message) })),
        results
      );
    } finally {
      this.cleanup();
    }
  }

  /**
   * Get current resource metrics
   * @returns Current resource usage metrics
   */
  getResourceMetrics(): ResourceMetrics {
    this.updateResourceMetrics();
    return { ...this.resourceMetrics };
  }

  /**
   * Dispose of the batch analyzer and clean up resources
   */
  dispose(): void {
    this.cleanup();
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = undefined;
    }
    this.logger.info('BatchAnalyzer disposed');
  }

  /**
   * Fail-fast processing strategy - stops on first error
   */
  private async processFailFast(
    filePaths: string[],
    options: BatchAnalysisOptions,
    results: AnalysisResult[],
    errors: BatchErrorInfo[]
  ): Promise<void> {
    const concurrency = this.getCurrentConcurrency();
    
    for (let i = 0; i < filePaths.length; i += concurrency) {
      if (this.isCancelled) break;
      
      const batch = filePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(filePath => this.processSingleFile(filePath, options, results, errors));
      
      await Promise.all(batchPromises);
      
      // Check if any errors occurred in this batch
      if (errors.length > 0) {
        throw ErrorUtils.createBatchError(
          errors.map(e => ({ filePath: e.filePath, error: new Error(e.message) })), 
          results
        );
      }
      
      // Report progress
      this.reportProgress(results.length, filePaths.length, filePaths[Math.min(i, filePaths.length - 1)], options.onProgress);
    }
  }

  /**
   * Collect-all processing strategy - processes all files regardless of errors
   */
  private async processCollectAll(
    filePaths: string[],
    options: BatchAnalysisOptions,
    results: AnalysisResult[],
    errors: BatchErrorInfo[]
  ): Promise<void> {
    const concurrency = this.getCurrentConcurrency();
    
    for (let i = 0; i < filePaths.length; i += concurrency) {
      if (this.isCancelled) break;
      
      const batch = filePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(filePath => this.processSingleFile(filePath, options, results, errors));
      
      // Continue processing even if individual files fail
      await Promise.allSettled(batchPromises);
      
      // Report progress
      this.reportProgress(results.length, filePaths.length, filePaths[Math.min(i, filePaths.length - 1)], options.onProgress);
      
      // Check resource usage and throttle if necessary
      await this.checkResourceUsage();
    }
  }

  /**
   * Best-effort processing strategy - balances error tolerance with performance
   */
  private async processBestEffort(
    filePaths: string[],
    options: BatchAnalysisOptions,
    results: AnalysisResult[],
    errors: BatchErrorInfo[]
  ): Promise<void> {
    const concurrency = this.getCurrentConcurrency();
    const maxErrorRate = 0.1; // Stop if error rate exceeds 10%
    
    for (let i = 0; i < filePaths.length; i += concurrency) {
      if (this.isCancelled) break;
      
      const batch = filePaths.slice(i, i + concurrency);
      const batchPromises = batch.map(filePath => this.processSingleFile(filePath, options, results, errors));
      
      await Promise.allSettled(batchPromises);
      
      // Check error rate
      const totalProcessed = results.length + errors.length;
      const errorRate = errors.length / Math.max(totalProcessed, 1);
      
      if (errorRate > maxErrorRate && totalProcessed > 10) {
        this.logger.warn(`High error rate detected (${Math.round(errorRate * 100)}%), stopping best-effort processing`);
        break;
      }
      
      // Report progress
      this.reportProgress(results.length, filePaths.length, filePaths[Math.min(i, filePaths.length - 1)], options.onProgress);
      
      // Adaptive resource management
      await this.checkResourceUsage();
    }
  }

  /**
   * Process a single file with error handling
   */
  private async processSingleFile(
    filePath: string,
    options: BatchAnalysisOptions,
    results: AnalysisResult[],
    errors: BatchErrorInfo[]
  ): Promise<void> {
    const operation = this.processSingleFileInternal(filePath, options, results, errors);
    this.activeOperations.add(operation);
    this.resourceMetrics.activeOperations = this.activeOperations.size;
    
    try {
      await operation;
    } finally {
      this.activeOperations.delete(operation);
      this.resourceMetrics.activeOperations = this.activeOperations.size;
    }
  }

  /**
   * Internal single file processing logic
   */
  private async processSingleFileInternal(
    filePath: string,
    options: BatchAnalysisOptions,
    results: AnalysisResult[],
    errors: BatchErrorInfo[]
  ): Promise<void> {
    if (this.isCancelled) return;

    try {
      const analysisOptions: AnalysisOptions = {
        format: 'json',
        includeSources: options.includeSources || false,
        parseTimeout: options.parseTimeout || 30000
      };

      const result = await this.analyzer.analyzeFile(filePath, analysisOptions);
      results.push(result);
      this.resourceMetrics.completedOperations++;
      
      if (options.onFileComplete) {
        options.onFileComplete(filePath, result);
      }

    } catch (error) {
      const errorInfo: BatchErrorInfo = {
        filePath,
        code: ErrorUtils.getErrorCode(error),
        message: ErrorUtils.getUserMessage(error),
        details: error
      };
      
      errors.push(errorInfo);
      this.resourceMetrics.errorOperations++;
      
      if (options.onFileError) {
        options.onFileError(filePath, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Select appropriate processing strategy based on options and file count
   */
  private selectProcessingStrategy(fileCount: number, options: BatchAnalysisOptions): string {
    if (options.failFast) return 'fail-fast';
    if (options.continueOnError === false) return 'fail-fast';
    if (options.continueOnError === true) return 'collect-all';
    
    // Default to best-effort for balanced processing
    return 'best-effort';
  }

  /**
   * Get current concurrency level based on settings and resource usage
   */
  private getCurrentConcurrency(): number {
    if (!this.options.adaptiveConcurrency) {
      return this.options.maxConcurrency;
    }

    // Adaptive concurrency based on memory usage
    const memoryUsageRatio = this.resourceMetrics.memoryUsage / this.options.memoryLimit;
    
    if (memoryUsageRatio > 0.8) {
      return Math.max(1, Math.floor(this.options.maxConcurrency * 0.5));
    } else if (memoryUsageRatio > 0.6) {
      return Math.max(2, Math.floor(this.options.maxConcurrency * 0.7));
    } else {
      return this.options.maxConcurrency;
    }
  }

  /**
   * Check resource usage and throttle if necessary
   */
  private async checkResourceUsage(): Promise<void> {
    this.updateResourceMetrics();
    
    const memoryUsageRatio = this.resourceMetrics.memoryUsage / this.options.memoryLimit;
    
    if (memoryUsageRatio > 0.9) {
      this.logger.warn(`High memory usage: ${this.resourceMetrics.memoryUsage}MB (${Math.round(memoryUsageRatio * 100)}%)`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit to allow memory to be freed
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (memoryUsageRatio > 0.95) {
      throw new ResourceError('memory', { 
        currentUsage: this.resourceMetrics.memoryUsage, 
        limit: this.options.memoryLimit 
      });
    }
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(
    completed: number,
    total: number,
    currentOperation: string,
    callback?: (completed: number, total: number) => void
  ): void {
    if (callback) {
      callback(completed, total);
    }
    
    const percentage = Math.round((completed / total) * 100);
    this.logger.debug(`Batch progress: ${completed}/${total} (${percentage}%) - ${currentOperation}`);
  }

  /**
   * Update resource metrics
   */
  private updateResourceMetrics(): void {
    const memUsage = process.memoryUsage();
    this.resourceMetrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    
    // CPU usage would require additional monitoring - simplified for now
    this.resourceMetrics.cpuUsage = 0;
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.resourceMonitorInterval = setInterval(() => {
      this.updateResourceMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Create batch summary from results
   */
  private createBatchSummary(
    results: AnalysisResult[], 
    errors: BatchErrorInfo[], 
    totalTime: number
  ): BatchSummary {
    const successfulFiles = results.filter(r => r.success).length;
    const totalDependencies = results.reduce((sum, r) => sum + r.dependencies.length, 0);
    const totalImports = results.reduce((sum, r) => sum + r.imports.length, 0);
    const totalExports = results.reduce((sum, r) => sum + r.exports.length, 0);
    
    return {
      totalFiles: results.length + errors.length,
      successfulFiles,
      failedFiles: errors.length,
      totalDependencies,
      totalImports,
      totalExports,
      averageTime: results.length > 0 ? totalTime / results.length : 0
    };
  }

  /**
   * Create empty batch result
   */
  private createEmptyBatchResult(): BatchResult {
    return {
      results: [],
      summary: {
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalDependencies: 0,
        totalImports: 0,
        totalExports: 0,
        averageTime: 0
      },
      errors: [],
      totalTime: 0
    };
  }

  /**
   * Cleanup resources and active operations
   */
  private cleanup(): void {
    // Cancel all active operations
    this.activeOperations.clear();
    this.isCancelled = false;
    
    // Reset metrics
    this.resourceMetrics.activeOperations = 0;
    this.resourceMetrics.queuedOperations = 0;
  }
}