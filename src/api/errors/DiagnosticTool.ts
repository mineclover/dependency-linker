/**
 * Diagnostic Tool for System Health and Analysis
 * Comprehensive system diagnostics and health monitoring
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { TypeScriptAnalyzer } from '../TypeScriptAnalyzer';
import { DebugHelper } from './DebugHelper';
import { errorReporter } from './ErrorReporter';
import { logger } from '../../utils/logger';

export interface SystemHealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

export interface DiagnosticReport {
  timestamp: number;
  version: string;
  environment: {
    nodeVersion: string;
    platform: string;
    architecture: string;
    memory: NodeJS.MemoryUsage;
    uptime: number;
  };
  healthChecks: SystemHealthCheck[];
  performance: {
    overallScore: number;
    parseSpeed: number;
    memoryEfficiency: number;
    errorRate: number;
  };
  recommendations: string[];
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    impact: string;
    resolution: string;
  }>;
}

export interface PerformanceTest {
  testName: string;
  iterations: number;
  results: {
    averageTime: number;
    minTime: number;
    maxTime: number;
    standardDeviation: number;
    successRate: number;
    memoryUsage: number;
  };
}

export class DiagnosticTool {
  private analyzer: TypeScriptAnalyzer;
  private testFiles: Map<string, string> = new Map();

  constructor() {
    this.analyzer = new TypeScriptAnalyzer();
    this.initializeTestFiles();
  }

  /**
   * Run comprehensive system diagnostics
   */
  public async runComprehensiveDiagnostics(): Promise<DiagnosticReport> {
    const startTime = Date.now();
    logger.info('Starting comprehensive system diagnostics');

    try {
      // Gather environment information
      const environment = this.gatherEnvironmentInfo();
      
      // Run health checks
      const healthChecks = await this.runHealthChecks();
      
      // Run performance tests
      const performanceResults = await this.runPerformanceTests();
      
      // Analyze results and generate recommendations
      const { performance, recommendations, issues } = this.analyzeResults(healthChecks, performanceResults);

      const report: DiagnosticReport = {
        timestamp: startTime,
        version: this.getVersion(),
        environment,
        healthChecks,
        performance,
        recommendations,
        issues
      };

      const duration = Date.now() - startTime;
      logger.info(`Comprehensive diagnostics completed in ${duration}ms`, {
        healthyComponents: healthChecks.filter(h => h.status === 'healthy').length,
        totalComponents: healthChecks.length,
        overallScore: performance.overallScore
      });

      return report;
    } catch (error) {
      const errorId = errorReporter.reportError(error as Error, {
        operation: 'runComprehensiveDiagnostics'
      });
      throw new Error(`Diagnostic run failed: ${(error as Error).message} (Error ID: ${errorId})`);
    }
  }

  /**
   * Run quick health check
   */
  public async runQuickHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    score: number;
    criticalIssues: string[];
    summary: string;
  }> {
    const healthChecks = await this.runHealthChecks();
    const criticalIssues: string[] = [];
    
    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    healthChecks.forEach(check => {
      switch (check.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'warning':
          warningCount++;
          break;
        case 'error':
          errorCount++;
          criticalIssues.push(`${check.component}: ${check.message}`);
          break;
      }
    });

    const totalChecks = healthChecks.length;
    const score = Math.round((healthyCount / totalChecks) * 100);

    let status: 'healthy' | 'warning' | 'error';
    if (errorCount > 0) {
      status = 'error';
    } else if (warningCount > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    const summary = `${healthyCount}/${totalChecks} components healthy`;

    return {
      status,
      score,
      criticalIssues,
      summary
    };
  }

  /**
   * Test specific file analysis with detailed diagnostics
   */
  public async diagnoseFileAnalysis(filePath: string): Promise<{
    success: boolean;
    analysisResult?: any;
    diagnostics: {
      fileContext: any;
      performanceMetrics?: any;
      validationResults: any;
      dependencyAnalysis?: any;
      recommendations: string[];
    };
    error?: {
      message: string;
      analysis: any;
    };
  }> {
    const absolutePath = resolve(filePath);
    
    try {
      // Gather file context
      const fileContext = DebugHelper.gatherFileContext(absolutePath);
      
      // Start performance tracking
      DebugHelper.startPerformanceTracking(`diagnose_${absolutePath}`);
      
      // Attempt analysis
      const analysisResult = await this.analyzer.analyzeFile(absolutePath);
      
      // End performance tracking
      const performanceMetrics = DebugHelper.endPerformanceTracking(`diagnose_${absolutePath}`);
      
      // Validate results
      const validationResults = DebugHelper.validateAnalysisResult(analysisResult, absolutePath);
      
      // Analyze dependencies if successful
      let dependencyAnalysis;
      if (analysisResult.success && analysisResult.dependencies) {
        dependencyAnalysis = DebugHelper.analyzeDependencyPatterns(analysisResult.dependencies);
      }

      // Generate recommendations
      const recommendations = this.generateFileAnalysisRecommendations(
        fileContext, 
        analysisResult, 
        validationResults,
        performanceMetrics
      );

      return {
        success: true,
        analysisResult,
        diagnostics: {
          fileContext,
          performanceMetrics,
          validationResults,
          dependencyAnalysis,
          recommendations
        }
      };

    } catch (error) {
      // Analyze the failure
      const fileContext = DebugHelper.gatherFileContext(absolutePath);
      const errorAnalysis = DebugHelper.analyzeParseFailure(absolutePath, error as Error);

      return {
        success: false,
        diagnostics: {
          fileContext,
          validationResults: { isValid: false, errors: [(error as Error).message], warnings: [], suggestions: [] },
          recommendations: errorAnalysis.suggestions
        },
        error: {
          message: (error as Error).message,
          analysis: errorAnalysis
        }
      };
    }
  }

  /**
   * Benchmark analyzer performance
   */
  public async benchmarkPerformance(options: {
    iterations?: number;
    fileTypes?: ('small' | 'medium' | 'large')[];
    includeMemoryProfile?: boolean;
  } = {}): Promise<PerformanceTest[]> {
    const { 
      iterations = 10, 
      fileTypes = ['small', 'medium', 'large'],
      includeMemoryProfile = false 
    } = options;

    const results: PerformanceTest[] = [];

    for (const fileType of fileTypes) {
      const testFile = this.testFiles.get(fileType);
      if (!testFile) continue;

      const testResults = {
        times: [] as number[],
        successes: 0,
        memoryUsages: [] as number[]
      };

      logger.info(`Running performance benchmark for ${fileType} files (${iterations} iterations)`);

      for (let i = 0; i < iterations; i++) {
        const startMemory = includeMemoryProfile ? process.memoryUsage().heapUsed : 0;
        const startTime = Date.now();

        try {
          await this.analyzer.analyzeFile(testFile);
          testResults.successes++;
        } catch (error) {
          // Continue with benchmark even if some analyses fail
        }

        const endTime = Date.now();
        const endMemory = includeMemoryProfile ? process.memoryUsage().heapUsed : 0;

        testResults.times.push(endTime - startTime);
        if (includeMemoryProfile) {
          testResults.memoryUsages.push(endMemory - startMemory);
        }

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate statistics
      const times = testResults.times;
      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
      const standardDeviation = Math.sqrt(variance);
      const successRate = (testResults.successes / iterations) * 100;
      const avgMemoryUsage = includeMemoryProfile && testResults.memoryUsages.length > 0 
        ? testResults.memoryUsages.reduce((a, b) => a + b, 0) / testResults.memoryUsages.length 
        : 0;

      results.push({
        testName: `${fileType}_file_analysis`,
        iterations,
        results: {
          averageTime,
          minTime,
          maxTime,
          standardDeviation,
          successRate,
          memoryUsage: avgMemoryUsage
        }
      });
    }

    return results;
  }

  /**
   * Export comprehensive diagnostic data
   */
  public async exportDiagnostics(format: 'json' | 'text' = 'json'): Promise<string> {
    const report = await this.runComprehensiveDiagnostics();
    
    if (format === 'text') {
      return this.formatTextDiagnostics(report);
    }
    
    return JSON.stringify(report, null, 2);
  }

  private gatherEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  private async runHealthChecks(): Promise<SystemHealthCheck[]> {
    const checks: SystemHealthCheck[] = [];

    // Node.js version check
    checks.push(this.checkNodeVersion());
    
    // Memory check
    checks.push(this.checkMemoryUsage());
    
    // File system access check
    checks.push(await this.checkFileSystemAccess());
    
    // Parser availability check
    checks.push(this.checkParserAvailability());
    
    // Cache system check
    checks.push(await this.checkCacheSystem());
    
    // TypeScript analyzer functionality check
    checks.push(await this.checkAnalyzerFunctionality());

    return checks;
  }

  private checkNodeVersion(): SystemHealthCheck {
    const currentVersion = process.version;
    const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      return {
        component: 'Node.js Version',
        status: 'healthy',
        message: `Node.js ${currentVersion} is supported`,
        details: { version: currentVersion, majorVersion }
      };
    } else if (majorVersion >= 16) {
      return {
        component: 'Node.js Version',
        status: 'warning',
        message: `Node.js ${currentVersion} works but upgrade recommended`,
        details: { version: currentVersion, majorVersion },
        suggestions: ['Consider upgrading to Node.js 18 or later for optimal performance']
      };
    } else {
      return {
        component: 'Node.js Version',
        status: 'error',
        message: `Node.js ${currentVersion} is not supported`,
        details: { version: currentVersion, majorVersion },
        suggestions: ['Upgrade to Node.js 18 or later', 'Check compatibility documentation']
      };
    }
  }

  private checkMemoryUsage(): SystemHealthCheck {
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const memoryUsagePercentage = (memory.heapUsed / memory.heapTotal) * 100;

    if (heapUsedMB < 100 && memoryUsagePercentage < 75) {
      return {
        component: 'Memory Usage',
        status: 'healthy',
        message: `Memory usage is normal (${heapUsedMB}MB used)`,
        details: { heapUsedMB, heapTotalMB, usagePercentage: memoryUsagePercentage }
      };
    } else if (heapUsedMB < 500 && memoryUsagePercentage < 85) {
      return {
        component: 'Memory Usage',
        status: 'warning',
        message: `Memory usage is elevated (${heapUsedMB}MB used)`,
        details: { heapUsedMB, heapTotalMB, usagePercentage: memoryUsagePercentage },
        suggestions: ['Monitor memory usage during large batch operations', 'Consider enabling garbage collection']
      };
    } else {
      return {
        component: 'Memory Usage',
        status: 'error',
        message: `Memory usage is high (${heapUsedMB}MB used)`,
        details: { heapUsedMB, heapTotalMB, usagePercentage: memoryUsagePercentage },
        suggestions: ['Reduce batch sizes', 'Enable memory monitoring', 'Check for memory leaks']
      };
    }
  }

  private async checkFileSystemAccess(): Promise<SystemHealthCheck> {
    try {
      const testFile = join(process.cwd(), 'package.json');
      
      if (!existsSync(testFile)) {
        return {
          component: 'File System Access',
          status: 'warning',
          message: 'Cannot access package.json in current directory',
          suggestions: ['Ensure you are in a valid project directory', 'Check file permissions']
        };
      }

      const stats = statSync(testFile);
      const content = readFileSync(testFile, 'utf8');
      
      return {
        component: 'File System Access',
        status: 'healthy',
        message: 'File system access is working correctly',
        details: { 
          testFile, 
          size: stats.size, 
          readable: content.length > 0 
        }
      };
    } catch (error) {
      return {
        component: 'File System Access',
        status: 'error',
        message: `File system access error: ${(error as Error).message}`,
        suggestions: ['Check file permissions', 'Verify current working directory', 'Check disk space']
      };
    }
  }

  private checkParserAvailability(): SystemHealthCheck {
    try {
      // Try to access tree-sitter parser
      const Parser = require('tree-sitter');
      const TypeScript = require('tree-sitter-typescript').typescript;
      
      const parser = new Parser();
      parser.setLanguage(TypeScript);
      
      return {
        component: 'TypeScript Parser',
        status: 'healthy',
        message: 'Tree-sitter TypeScript parser is available',
        details: { parserAvailable: true }
      };
    } catch (error) {
      return {
        component: 'TypeScript Parser',
        status: 'error',
        message: `Parser initialization failed: ${(error as Error).message}`,
        suggestions: [
          'Reinstall tree-sitter and tree-sitter-typescript packages',
          'Check native module compilation',
          'Verify platform compatibility'
        ]
      };
    }
  }

  private async checkCacheSystem(): Promise<SystemHealthCheck> {
    try {
      // Test cache functionality
      const analyzer = new TypeScriptAnalyzer({ enableCache: true });
      
      return {
        component: 'Cache System',
        status: 'healthy',
        message: 'Cache system is functioning correctly',
        details: { cacheEnabled: true }
      };
    } catch (error) {
      return {
        component: 'Cache System',
        status: 'warning',
        message: `Cache system issue: ${(error as Error).message}`,
        suggestions: ['Disable cache if issues persist', 'Check file permissions for cache directory']
      };
    }
  }

  private async checkAnalyzerFunctionality(): Promise<SystemHealthCheck> {
    try {
      const testFile = this.testFiles.get('small');
      if (!testFile) {
        return {
          component: 'Analyzer Functionality',
          status: 'warning',
          message: 'No test file available for functionality check',
          suggestions: ['Ensure test files are properly initialized']
        };
      }

      const result = await this.analyzer.analyzeFile(testFile);
      
      if (result.success) {
        return {
          component: 'Analyzer Functionality',
          status: 'healthy',
          message: 'TypeScript analysis is working correctly',
          details: { 
            testPassed: true,
            dependencies: result.dependencies?.length || 0,
            // analysisTime not available on AnalysisResult
          }
        };
      } else {
        return {
          component: 'Analyzer Functionality',
          status: 'error',
          message: `Analysis test failed: ${result.error}`,
          suggestions: ['Check parser installation', 'Verify test file integrity']
        };
      }
    } catch (error) {
      return {
        component: 'Analyzer Functionality',
        status: 'error',
        message: `Analyzer test error: ${(error as Error).message}`,
        suggestions: ['Check analyzer initialization', 'Verify all dependencies are installed']
      };
    }
  }

  private async runPerformanceTests(): Promise<PerformanceTest[]> {
    return await this.benchmarkPerformance({
      iterations: 5,
      fileTypes: ['small', 'medium'],
      includeMemoryProfile: true
    });
  }

  private analyzeResults(healthChecks: SystemHealthCheck[], performanceResults: PerformanceTest[]): {
    performance: DiagnosticReport['performance'];
    recommendations: string[];
    issues: DiagnosticReport['issues'];
  } {
    const recommendations: string[] = [];
    const issues: DiagnosticReport['issues'] = [];

    // Analyze health checks
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;
    const errorCount = healthChecks.filter(h => h.status === 'error').length;

    // Add health-based recommendations and issues
    healthChecks.forEach(check => {
      if (check.suggestions) {
        recommendations.push(...check.suggestions);
      }
      
      if (check.status === 'error') {
        issues.push({
          severity: 'high',
          category: check.component,
          description: check.message,
          impact: 'System functionality may be compromised',
          resolution: check.suggestions?.join('; ') || 'See component documentation'
        });
      } else if (check.status === 'warning') {
        issues.push({
          severity: 'medium',
          category: check.component,
          description: check.message,
          impact: 'Performance may be suboptimal',
          resolution: check.suggestions?.join('; ') || 'Monitor component status'
        });
      }
    });

    // Analyze performance
    const avgParseSpeed = performanceResults.length > 0 
      ? performanceResults.reduce((sum, test) => sum + test.results.averageTime, 0) / performanceResults.length
      : 0;
    
    const avgSuccessRate = performanceResults.length > 0
      ? performanceResults.reduce((sum, test) => sum + test.results.successRate, 0) / performanceResults.length
      : 100;

    const avgMemoryUsage = performanceResults.length > 0
      ? performanceResults.reduce((sum, test) => sum + test.results.memoryUsage, 0) / performanceResults.length
      : 0;

    // Calculate performance scores
    const parseSpeedScore = Math.max(0, 100 - (avgParseSpeed / 10)); // Penalize if > 1000ms avg
    const memoryEfficiencyScore = Math.max(0, 100 - (avgMemoryUsage / 1024 / 1024 * 10)); // Penalize high memory usage
    const errorRateScore = avgSuccessRate;

    const overallScore = Math.round(
      (healthyCount / healthChecks.length * 40) + // 40% weight on health
      (parseSpeedScore * 0.3) + // 30% weight on speed
      (memoryEfficiencyScore * 0.15) + // 15% weight on memory
      (errorRateScore * 0.15) // 15% weight on success rate
    );

    // Add performance-based recommendations
    if (avgParseSpeed > 100) {
      recommendations.push('Consider optimizing for faster parsing performance');
    }
    if (avgMemoryUsage > 50 * 1024 * 1024) { // > 50MB
      recommendations.push('Monitor memory usage and consider optimizations');
    }
    if (avgSuccessRate < 95) {
      recommendations.push('Investigate causes of analysis failures');
    }

    return {
      performance: {
        overallScore,
        parseSpeed: Math.round(avgParseSpeed),
        memoryEfficiency: Math.round(memoryEfficiencyScore),
        errorRate: Math.round(100 - avgSuccessRate)
      },
      recommendations: [...new Set(recommendations)], // Remove duplicates
      issues
    };
  }

  private generateFileAnalysisRecommendations(
    fileContext: any,
    analysisResult: any,
    validationResults: any,
    performanceMetrics: any
  ): string[] {
    const recommendations: string[] = [];

    // File size recommendations
    if (fileContext.fileSize > 100 * 1024) { // > 100KB
      recommendations.push('Consider breaking down large files into smaller modules');
    }

    // Performance recommendations
    if (performanceMetrics && performanceMetrics.totalTime > 1000) {
      recommendations.push('Analysis took longer than expected - consider file optimizations');
    }

    // Validation recommendations
    if (validationResults && !validationResults.isValid) {
      recommendations.push('Address validation errors before proceeding');
    }

    // Unicode recommendations
    if (fileContext.hasUnicodeChars) {
      recommendations.push('Verify Unicode characters are intentional and properly encoded');
    }

    return recommendations;
  }

  private initializeTestFiles(): void {
    // Create simple test files for diagnostics
    const testDir = join(__dirname, '..', '..', '..', 'test_files');
    
    // Small test file
    const smallFile = `
import { resolve } from 'path';
import * as fs from 'fs';

export function readConfig(path: string): any {
  return JSON.parse(fs.readFileSync(resolve(path), 'utf8'));
}
`;
    
    // Medium test file
    const mediumFile = `
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';
import { Router } from 'express';

export interface User {
  id: number;
  name: string;
  email: string;
}

export class UserService {
  private apiUrl: string;
  
  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }
  
  async getUsers(): Promise<User[]> {
    const response = await axios.get(\`\${this.apiUrl}/users\`);
    return response.data;
  }
}

export const UserComponent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  
  const debouncedFetch = useCallback(
    debounce(async () => {
      const service = new UserService('/api');
      const userData = await service.getUsers();
      setUsers(userData);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);
  
  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>;
};
`;

    // Write test files to temporary locations
    try {
      const tmpDir = join(process.cwd(), '.diagnostic_tmp');
      if (!existsSync(tmpDir)) {
        require('fs').mkdirSync(tmpDir, { recursive: true });
      }
      
      const smallPath = join(tmpDir, 'small_test.ts');
      const mediumPath = join(tmpDir, 'medium_test.tsx');
      
      require('fs').writeFileSync(smallPath, smallFile);
      require('fs').writeFileSync(mediumPath, mediumFile);
      
      this.testFiles.set('small', smallPath);
      this.testFiles.set('medium', mediumPath);
    } catch (error) {
      // If we can't create test files, diagnostics will still work but with limited functionality
      logger.warn('Failed to initialize test files for diagnostics', { error: (error as Error).message });
    }
  }

  private getVersion(): string {
    try {
      const packagePath = join(__dirname, '..', '..', '..', 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  private formatTextDiagnostics(report: DiagnosticReport): string {
    let text = `TypeScript File Analyzer - Diagnostic Report\n`;
    text += '='.repeat(60) + '\n';
    text += `Generated: ${new Date(report.timestamp).toISOString()}\n`;
    text += `Version: ${report.version}\n\n`;

    // System Information
    text += `System Information:\n`;
    text += `  Node.js: ${report.environment.nodeVersion}\n`;
    text += `  Platform: ${report.environment.platform} (${report.environment.architecture})\n`;
    text += `  Memory: ${Math.round(report.environment.memory.heapUsed / 1024 / 1024)}MB used\n`;
    text += `  Uptime: ${Math.round(report.environment.uptime)}s\n\n`;

    // Health Checks
    text += `Health Checks:\n`;
    report.healthChecks.forEach(check => {
      const status = check.status === 'healthy' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
      text += `  ${status} ${check.component}: ${check.message}\n`;
    });
    text += '\n';

    // Performance Summary
    text += `Performance Summary:\n`;
    text += `  Overall Score: ${report.performance.overallScore}/100\n`;
    text += `  Parse Speed: ${report.performance.parseSpeed}ms avg\n`;
    text += `  Memory Efficiency: ${report.performance.memoryEfficiency}/100\n`;
    text += `  Error Rate: ${report.performance.errorRate}%\n\n`;

    // Issues
    if (report.issues.length > 0) {
      text += `Issues Found:\n`;
      report.issues.forEach(issue => {
        text += `  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}\n`;
        text += `    Impact: ${issue.impact}\n`;
        text += `    Resolution: ${issue.resolution}\n\n`;
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      text += `Recommendations:\n`;
      report.recommendations.forEach((rec, index) => {
        text += `  ${index + 1}. ${rec}\n`;
      });
    }

    return text;
  }
}

export default DiagnosticTool;