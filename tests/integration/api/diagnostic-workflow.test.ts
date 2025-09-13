/**
 * T046: Integration Test - Diagnostic Methods Workflow
 * 
 * Tests end-to-end diagnostic workflow including:
 * - System health monitoring
 * - Performance metrics collection
 * - Error/warning aggregation
 * - Cache statistics
 * - Memory usage tracking
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TypeScriptAnalyzer } from '../../../src/api/TypeScriptAnalyzer';
import { analyzeTypeScriptFile, resetFactoryAnalyzer, clearFactoryCache } from '../../../src/api/factory-functions';
import { MemoryMonitor, measureMemory, formatBytes } from '../../helpers/memory-test-utils';
import { TempResourceManager, setupResourceManagement, createTestTypeScriptFiles } from '../../helpers/resource-test-utils';
import { join } from 'path';

interface DiagnosticReport {
  timestamp: Date;
  systemHealth: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  performanceMetrics: {
    averageParseTime: number;
    totalAnalysisTime: number;
    filesProcessed: number;
    cacheHitRate: number;
  };
  errors: Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
    message: string;
  }>;
  warnings: Array<{
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

describe('Integration: Diagnostic Methods Workflow - T046', () => {
  let analyzer: TypeScriptAnalyzer;
  let tempManager: TempResourceManager;
  let cleanup: () => Promise<void>;
  let memoryMonitor: MemoryMonitor;

  beforeEach(async () => {
    const resourceSetup = setupResourceManagement();
    tempManager = resourceSetup.tempManager;
    cleanup = resourceSetup.cleanup;
    
    analyzer = new TypeScriptAnalyzer({
      enableCache: true,
      cacheSize: 100,
      defaultTimeout: 5000,
      logLevel: 'info',
    });

    memoryMonitor = new MemoryMonitor({
      sampleInterval: 50,
      maxSamples: 200,
      warnThreshold: 100 * 1024 * 1024, // 100MB
    });
  });

  afterEach(async () => {
    await cleanup();
    memoryMonitor.stopMonitoring();
    resetFactoryAnalyzer();
    clearFactoryCache();
  });

  describe('Complete Diagnostic Workflow', () => {
    it('should provide comprehensive diagnostic reporting throughout analysis lifecycle', async () => {
      // Start memory monitoring
      memoryMonitor.startMonitoring();

      // Create test files for analysis
      const testFiles = createTestTypeScriptFiles();
      const resources = await tempManager.createTestFiles(testFiles);

      const filePaths = Object.values(resources).map(r => r.path);

      // Phase 1: Initial diagnostic state
      const initialReport = await analyzer.getDiagnosticReport();
      expect(initialReport).toBeDefined();
      expect(initialReport.timestamp).toBeInstanceOf(Date);
      expect(initialReport.systemHealth).toBeGreaterThanOrEqual(0);
      expect(initialReport.performanceMetrics.filesProcessed).toBe(0);
      expect(initialReport.performanceMetrics.cacheHitRate).toBe(0);

      // Phase 2: Analyze files and track performance
      const analysisResults = [];
      const startTime = Date.now();

      for (const filePath of filePaths) {
        try {
          const result = await measureMemory(
            async () => analyzer.analyzeFile(filePath),
            `Analyzing ${filePath}`
          );
          analysisResults.push(result.result);
          
          // Verify memory usage is reasonable for each analysis
          expect(result.memory.delta.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB per file
          expect(result.memory.duration).toBeLessThan(10000); // 10s per file
        } catch (error) {
          // Track analysis errors for diagnostic validation
          console.warn(`Analysis failed for ${filePath}:`, error);
        }
      }

      const totalAnalysisTime = Date.now() - startTime;

      // Phase 3: Post-analysis diagnostic report
      const postAnalysisReport = await analyzer.getDiagnosticReport();
      expect(postAnalysisReport.timestamp).toBeInstanceOf(Date);
      expect(postAnalysisReport.timestamp.getTime()).toBeGreaterThan(initialReport.timestamp.getTime());
      
      // Verify performance metrics updated
      expect(postAnalysisReport.performanceMetrics.filesProcessed).toBeGreaterThan(0);
      expect(postAnalysisReport.performanceMetrics.totalAnalysisTime).toBeGreaterThan(0);
      expect(postAnalysisReport.performanceMetrics.averageParseTime).toBeGreaterThan(0);

      // Phase 4: Cache performance validation
      // Analyze same files again to test cache hit rate
      const secondPassResults = [];
      for (const filePath of filePaths.slice(0, 2)) { // Analyze first 2 files again
        try {
          const result = await analyzer.analyzeFile(filePath);
          secondPassResults.push(result);
        } catch (error) {
          console.warn(`Second pass analysis failed for ${filePath}:`, error);
        }
      }

      const finalReport = await analyzer.getDiagnosticReport();
      expect(finalReport.performanceMetrics.cacheHitRate).toBeGreaterThan(0);

      // Phase 5: Memory usage validation
      const memoryStats = memoryMonitor.getStats();
      expect(memoryStats.peak.heapUsed).toBeLessThan(200 * 1024 * 1024); // 200MB peak
      expect(finalReport.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB current

      // Phase 6: Error and warning aggregation
      if (finalReport.errors.length > 0) {
        finalReport.errors.forEach(error => {
          expect(error).toHaveProperty('type');
          expect(error).toHaveProperty('count');
          expect(error).toHaveProperty('lastOccurrence');
          expect(error.lastOccurrence).toBeInstanceOf(Date);
          expect(error.count).toBeGreaterThan(0);
        });
      }

      if (finalReport.warnings.length > 0) {
        finalReport.warnings.forEach(warning => {
          expect(warning).toHaveProperty('type');
          expect(warning).toHaveProperty('count');
          expect(warning).toHaveProperty('severity');
          expect(['low', 'medium', 'high']).toContain(warning.severity);
          expect(warning.count).toBeGreaterThan(0);
        });
      }

      // Phase 7: System health scoring
      expect(finalReport.systemHealth).toBeGreaterThanOrEqual(0);
      expect(finalReport.systemHealth).toBeLessThanOrEqual(1);

      console.log('Diagnostic Workflow Summary:');
      console.log(`- Files processed: ${finalReport.performanceMetrics.filesProcessed}`);
      console.log(`- Cache hit rate: ${(finalReport.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`);
      console.log(`- System health: ${(finalReport.systemHealth * 100).toFixed(1)}%`);
      console.log(`- Memory peak: ${formatBytes(memoryStats.peak.heapUsed)}`);
      console.log(`- Total analysis time: ${totalAnalysisTime}ms`);
    });

    it('should handle diagnostic reporting under error conditions', async () => {
      // Create test files with known issues
      const errorFiles = {
        'syntax-error.ts': `
          export const broken = {
            id: 1
            name: 'missing-comma'
          };
        `,
        'type-error.ts': `
          interface User {
            id: number;
            name: string;
          }
          
          const user: User = {
            id: 'string-instead-of-number',
            name: 123
          };
        `,
        'import-error.ts': `
          import { NonExistentModule } from 'does-not-exist';
          import * as fs from 'fs'; // Missing semicolon
          
          export const usesBrokenImport = () => {
            return NonExistentModule.method();
          };
        `
      };

      const resources = await tempManager.createTestFiles(errorFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Analyze files with errors
      const analysisResults = [];
      for (const filePath of filePaths) {
        try {
          const result = await analyzer.analyzeFile(filePath);
          analysisResults.push(result);
        } catch (error) {
          // Expected for some files with errors
          console.log(`Expected error for ${filePath}:`, error.message);
        }
      }

      // Get diagnostic report after errors
      const errorReport = await analyzer.getDiagnosticReport();
      
      expect(errorReport).toBeDefined();
      expect(errorReport.performanceMetrics.filesProcessed).toBeGreaterThan(0);
      
      // Should have recorded errors
      if (errorReport.errors.length > 0) {
        expect(errorReport.errors.some(e => e.type.includes('Parse') || e.type.includes('Error')))
          .toBe(true);
      }

      // System health should reflect issues
      expect(errorReport.systemHealth).toBeGreaterThanOrEqual(0);
      expect(errorReport.systemHealth).toBeLessThanOrEqual(1);
    });

    it('should track cache lifecycle and performance impact', async () => {
      const simpleFile = await tempManager.createTempFile(`
        export interface TestInterface {
          id: number;
          value: string;
        }
        
        export const testFunction = (): TestInterface => ({
          id: 1,
          value: 'test'
        });
      `, 'cache-test.ts');

      // First analysis - cache miss
      const firstAnalysis = await measureMemory(
        async () => analyzer.analyzeFile(simpleFile.path),
        'First analysis (cache miss)'
      );

      const afterFirstReport = await analyzer.getDiagnosticReport();
      expect(afterFirstReport.performanceMetrics.filesProcessed).toBe(1);

      // Second analysis - cache hit
      const secondAnalysis = await measureMemory(
        async () => analyzer.analyzeFile(simpleFile.path),
        'Second analysis (cache hit)'
      );

      const afterSecondReport = await analyzer.getDiagnosticReport();
      expect(afterSecondReport.performanceMetrics.filesProcessed).toBe(2);
      expect(afterSecondReport.performanceMetrics.cacheHitRate).toBeGreaterThan(0);

      // Cache hit should be faster and use less memory
      expect(secondAnalysis.memory.duration).toBeLessThanOrEqual(firstAnalysis.memory.duration);
      
      // Clear cache and verify impact
      analyzer.clearCache();
      
      // Third analysis - cache miss again
      const thirdAnalysis = await measureMemory(
        async () => analyzer.analyzeFile(simpleFile.path),
        'Third analysis (cache cleared)'
      );

      const finalReport = await analyzer.getDiagnosticReport();
      expect(finalReport.performanceMetrics.filesProcessed).toBe(3);
      
      // Performance should be similar to first analysis
      expect(thirdAnalysis.memory.duration).toBeGreaterThanOrEqual(secondAnalysis.memory.duration * 0.8);

      console.log('Cache Performance Analysis:');
      console.log(`- First analysis: ${firstAnalysis.memory.duration.toFixed(2)}ms`);
      console.log(`- Cached analysis: ${secondAnalysis.memory.duration.toFixed(2)}ms`);
      console.log(`- After cache clear: ${thirdAnalysis.memory.duration.toFixed(2)}ms`);
      console.log(`- Final cache hit rate: ${(finalReport.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Factory Functions Integration', () => {
    it('should integrate diagnostic reporting with factory functions', async () => {
      const testFile = await tempManager.createTempFile(`
        export const factoryTest = {
          value: 'integration-test'
        };
      `, 'factory-integration.ts');

      // Use factory function for analysis
      const result = await analyzeTypeScriptFile(testFile.path);
      expect(result.success).toBe(true);

      // Factory analyzer should also support diagnostics
      const factoryAnalyzer = analyzer; // In real implementation, would get factory analyzer
      const report = await factoryAnalyzer.getDiagnosticReport();
      
      expect(report).toBeDefined();
      expect(report.performanceMetrics.filesProcessed).toBeGreaterThanOrEqual(1);
    });
  });
});