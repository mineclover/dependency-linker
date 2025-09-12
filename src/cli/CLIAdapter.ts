/**
 * CLI Adapter for TypeScript File Analyzer
 * Bridges the CLI interface with the new API layer while maintaining perfect compatibility
 */

import { TypeScriptAnalyzer } from '../api/TypeScriptAnalyzer';
import { AnalysisOptions } from '../api/types';
import { AnalysisResult } from '../models/AnalysisResult';
import { OutputFormatter } from '../formatters/OutputFormatter';
import { createLogger } from '../utils/logger';
import { LogLevel } from '../api/types';
import { DiagnosticTool } from '../api/errors/DiagnosticTool';

export interface CLIOptions {
  file: string;
  format: string;
  includeSources?: boolean;
  parseTimeout?: number;
}

export interface CLIValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * CLI Adapter that translates between CLI options and API calls
 * Maintains perfect backward compatibility while using the new API internally
 */
export class CLIAdapter {
  private analyzer: TypeScriptAnalyzer;
  private formatter: OutputFormatter;

  constructor() {
    // Initialize analyzer with CLI-optimized settings
    this.analyzer = new TypeScriptAnalyzer({
      enableCache: false, // CLI is single-use, no cache benefits
      logLevel: LogLevel.ERROR, // Reduce CLI noise
      defaultTimeout: 30000
    });
    
    this.formatter = new OutputFormatter();
  }

  /**
   * Validate CLI options and file
   * @param options CLI options to validate
   * @returns Validation result
   */
  async validateOptions(options: CLIOptions): Promise<CLIValidationResult> {
    const errors: string[] = [];

    // Validate file path
    if (!options.file) {
      errors.push('File path is required');
    }

    // Validate format
    const supportedFormats = ['json', 'text', 'compact', 'summary', 'table', 'csv', 'deps-only', 'tree'];
    if (!supportedFormats.includes(options.format)) {
      errors.push(`Unsupported format: ${options.format}. Supported formats: ${supportedFormats.join(', ')}`);
    }

    // Validate file extension
    if (options.file && !this.isSupportedFile(options.file)) {
      errors.push('File must have .ts, .tsx, or .d.ts extension');
    }

    // File existence and readability will be checked by the analyzer
    if (options.file) {
      try {
        const validation = await this.analyzer.validateFile(options.file);
        if (!validation.canAnalyze) {
          errors.push(...validation.errors);
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error.message);
        } else {
          errors.push('File validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Analyze file using the new API
   * @param options CLI options
   * @returns Analysis result
   */
  async analyzeFile(options: CLIOptions): Promise<AnalysisResult> {
    // Convert CLI options to API options
    const analysisOptions: AnalysisOptions = {
      format: options.format as any,
      includeSources: options.includeSources || false,
      parseTimeout: options.parseTimeout || 30000
    };

    // Perform analysis using the new API
    return this.analyzer.analyzeFile(options.file, analysisOptions);
  }

  /**
   * Format analysis result for CLI output
   * @param result Analysis result
   * @param format Output format
   * @returns Formatted string
   */
  formatResult(result: AnalysisResult, format: string): string {
    return this.formatter.format(result, format as any);
  }

  /**
   * Get format header if needed (for CSV format)
   * @param format Output format
   * @returns Header string or empty string
   */
  getFormatHeader(format: string): string {
    return this.formatter.getFormatHeader(format as any);
  }

  /**
   * Create error output in CLI format
   * @param error Error to format
   * @param format Output format
   * @returns Formatted error string
   */
  formatError(error: { code?: string; message: string }, format: string): string {
    if (format === 'json') {
      const errorOutput = {
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message
        }
      };
      return JSON.stringify(errorOutput, null, 2);
    } else {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Check if file has supported extension
   * @param filePath File path to check
   * @returns True if supported
   */
  private isSupportedFile(filePath: string): boolean {
    const supportedExtensions = this.analyzer.getSupportedExtensions();
    return supportedExtensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Get supported file extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    return this.analyzer.getSupportedExtensions();
  }

  /**
   * Enhanced diagnostic and debugging capabilities for CLI
   */

  /**
   * Run system health check
   */
  async runHealthCheck(format: string = 'text'): Promise<string> {
    const healthCheck = await this.analyzer.getSystemHealth();
    
    if (format === 'json') {
      return JSON.stringify(healthCheck, null, 2);
    } else {
      let output = `System Health Check\n`;
      output += `==================\n`;
      output += `Status: ${healthCheck.status.toUpperCase()}\n`;
      output += `Score: ${healthCheck.score}/100\n`;
      output += `Summary: ${healthCheck.summary}\n`;
      
      if (healthCheck.criticalIssues.length > 0) {
        output += `\nCritical Issues:\n`;
        healthCheck.criticalIssues.forEach((issue, index) => {
          output += `  ${index + 1}. ${issue}\n`;
        });
      }
      
      return output;
    }
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics(format: string = 'text'): Promise<string> {
    return await this.analyzer.exportDiagnostics(format as any);
  }

  /**
   * Diagnose specific file analysis
   */
  async diagnoseFile(filePath: string, format: string = 'text'): Promise<string> {
    const diagnosis = await this.analyzer.diagnoseFileAnalysis(filePath);
    
    if (format === 'json') {
      return JSON.stringify(diagnosis, null, 2);
    } else {
      let output = `File Analysis Diagnosis\n`;
      output += `======================\n`;
      output += `File: ${filePath}\n`;
      output += `Success: ${diagnosis.success ? 'Yes' : 'No'}\n\n`;
      
      if (diagnosis.success && diagnosis.analysisResult) {
        const result = diagnosis.analysisResult;
        output += `Analysis Results:\n`;
        output += `  Dependencies: ${result.dependencies?.length || 0}\n`;
        output += `  Imports: ${result.imports?.length || 0}\n`;
        output += `  Exports: ${result.exports?.length || 0}\n`;
        if (result.analysisTime) {
          output += `  Analysis Time: ${result.analysisTime}ms\n`;
        }
        output += '\n';
      }
      
      if (diagnosis.error) {
        output += `Error: ${diagnosis.error.message}\n`;
        if (diagnosis.error.analysis.possibleCauses.length > 0) {
          output += `\nPossible Causes:\n`;
          diagnosis.error.analysis.possibleCauses.forEach((cause: string, index: number) => {
            output += `  ${index + 1}. ${cause}\n`;
          });
        }
        output += '\n';
      }
      
      if (diagnosis.diagnostics.recommendations.length > 0) {
        output += `Recommendations:\n`;
        diagnosis.diagnostics.recommendations.forEach((rec: string, index: number) => {
          output += `  ${index + 1}. ${rec}\n`;
        });
      }
      
      return output;
    }
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(format: string = 'text'): Promise<string> {
    const results = await this.analyzer.benchmarkPerformance({
      iterations: 5,
      fileTypes: ['small', 'medium'],
      includeMemoryProfile: true
    });
    
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    } else {
      let output = `Performance Benchmark Results\n`;
      output += `============================\n\n`;
      
      results.forEach(test => {
        output += `Test: ${test.testName}\n`;
        output += `  Iterations: ${test.iterations}\n`;
        output += `  Average Time: ${test.results.averageTime.toFixed(2)}ms\n`;
        output += `  Min Time: ${test.results.minTime}ms\n`;
        output += `  Max Time: ${test.results.maxTime}ms\n`;
        output += `  Success Rate: ${test.results.successRate.toFixed(1)}%\n`;
        if (test.results.memoryUsage > 0) {
          output += `  Memory Usage: ${Math.round(test.results.memoryUsage / 1024)}KB\n`;
        }
        output += '\n';
      });
      
      return output;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(format: string = 'text'): string {
    const stats = this.analyzer.getErrorStatistics();
    
    if (format === 'json') {
      return JSON.stringify(stats, null, 2);
    } else {
      let output = `Error Statistics\n`;
      output += `===============\n`;
      output += `Total Errors: ${stats.totalErrors}\n`;
      output += `Critical Errors: ${stats.criticalErrors}\n`;
      output += `Recent Errors (24h): ${stats.recentErrors}\n\n`;
      
      if (stats.topCategories.length > 0) {
        output += `Top Error Categories:\n`;
        stats.topCategories.forEach((cat, index) => {
          output += `  ${index + 1}. ${cat.category}: ${cat.count}\n`;
        });
      }
      
      return output;
    }
  }

  /**
   * Generate debug report
   */
  generateDebugReport(): string {
    return this.analyzer.generateDebugReport();
  }

  /**
   * Enable debug mode
   */
  enableDebugMode(): void {
    this.analyzer.setDebugMode(true);
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.analyzer.setDebugMode(false);
  }

  /**
   * Clear diagnostic data
   */
  clearDiagnosticData(): void {
    this.analyzer.clearDiagnosticData();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.analyzer.clearCache(); // Clear any cache that might exist
  }
}