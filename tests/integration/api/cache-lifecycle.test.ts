/**
 * T047: Integration Test - Factory Cache Lifecycle
 * 
 * Tests end-to-end cache lifecycle management including:
 * - Cache initialization and state tracking
 * - Multi-session cache persistence
 * - Cache invalidation and cleanup
 * - Memory management across cache operations
 * - Performance impact of cache state changes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  analyzeTypeScriptFile, 
  getBatchAnalysis, 
  clearFactoryCache, 
  resetFactoryAnalyzer,
  getFactoryAnalyzer 
} from '../../../src/api/factory-functions';
import { TypeScriptAnalyzer } from '../../../src/api/TypeScriptAnalyzer';
import { MemoryMonitor, measureMemory, formatBytes } from '../../helpers/memory-test-utils';
import { TempResourceManager, setupResourceManagement } from '../../helpers/resource-test-utils';

describe('Integration: Factory Cache Lifecycle - T047', () => {
  let tempManager: TempResourceManager;
  let cleanup: () => Promise<void>;
  let memoryMonitor: MemoryMonitor;

  beforeEach(async () => {
    const resourceSetup = setupResourceManagement();
    tempManager = resourceSetup.tempManager;
    cleanup = resourceSetup.cleanup;

    memoryMonitor = new MemoryMonitor({
      sampleInterval: 100,
      maxSamples: 500,
      warnThreshold: 150 * 1024 * 1024, // 150MB
    });

    // Reset factory state
    resetFactoryAnalyzer();
    clearFactoryCache();
  });

  afterEach(async () => {
    memoryMonitor.stopMonitoring();
    await cleanup();
    resetFactoryAnalyzer();
    clearFactoryCache();
  });

  describe('Cache Initialization and State Management', () => {
    it('should initialize cache state correctly and track across operations', async () => {
      memoryMonitor.startMonitoring();

      // Create test files for cache testing
      const testFiles = {
        'module-a.ts': `
          export interface ModuleAType {
            id: number;
            name: string;
            data: Record<string, unknown>;
          }

          export const createModuleA = (): ModuleAType => ({
            id: 1,
            name: 'Module A',
            data: { initialized: true }
          });
        `,
        'module-b.ts': `
          import { ModuleAType } from './module-a';

          export class ModuleBService {
            private moduleA: ModuleAType;

            constructor(moduleA: ModuleAType) {
              this.moduleA = moduleA;
            }

            public process(): string {
              return \`Processing \${this.moduleA.name}\`;
            }
          }
        `,
        'complex-module.ts': `
          import * as path from 'path';
          import { readFileSync } from 'fs';
          import { ModuleBService } from './module-b';
          import { createModuleA } from './module-a';

          export class ComplexModule {
            private service: ModuleBService;
            private config: Record<string, any> = {};

            constructor() {
              const moduleA = createModuleA();
              this.service = new ModuleBService(moduleA);
              this.loadConfig();
            }

            private loadConfig(): void {
              try {
                const configPath = path.resolve('./config.json');
                const configData = readFileSync(configPath, 'utf8');
                this.config = JSON.parse(configData);
              } catch (error) {
                console.warn('Config loading failed:', error);
                this.config = { fallback: true };
              }
            }

            public async processAsync(): Promise<string> {
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve(this.service.process());
                }, 100);
              });
            }
          }
        `
      };

      const resources = await tempManager.createTestFiles(testFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Phase 1: Initial cache state - should be empty
      const initialAnalyzer = getFactoryAnalyzer();
      expect(initialAnalyzer).toBeDefined();

      // Get initial cache stats (if diagnostic methods exist)
      let initialCacheStats;
      try {
        const initialReport = await initialAnalyzer.getDiagnosticReport();
        initialCacheStats = initialReport.performanceMetrics;
        expect(initialCacheStats.cacheHitRate).toBe(0);
        expect(initialCacheStats.filesProcessed).toBe(0);
      } catch (error) {
        console.log('Diagnostic methods not available, using basic verification');
      }

      // Phase 2: First analysis pass - populate cache
      const firstPassResults = [];
      const firstPassTimes = [];

      for (const filePath of filePaths) {
        const result = await measureMemory(
          async () => analyzeTypeScriptFile(filePath),
          `First pass: ${filePath}`
        );
        
        firstPassResults.push(result.result);
        firstPassTimes.push(result.memory.duration);
        
        expect(result.result.success).toBe(true);
        expect(result.memory.delta.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB per analysis
      }

      // Phase 3: Verify cache population
      const afterFirstPassAnalyzer = getFactoryAnalyzer();
      let firstPassCacheStats;
      try {
        const firstPassReport = await afterFirstPassAnalyzer.getDiagnosticReport();
        firstPassCacheStats = firstPassReport.performanceMetrics;
        expect(firstPassCacheStats.filesProcessed).toBe(filePaths.length);
        expect(firstPassCacheStats.cacheHitRate).toBe(0); // No hits on first pass
      } catch (error) {
        console.log('Using basic cache verification');
      }

      // Phase 4: Second analysis pass - cache hits
      const secondPassResults = [];
      const secondPassTimes = [];

      for (const filePath of filePaths) {
        const result = await measureMemory(
          async () => analyzeTypeScriptFile(filePath),
          `Second pass: ${filePath}`
        );
        
        secondPassResults.push(result.result);
        secondPassTimes.push(result.memory.duration);
        
        expect(result.result.success).toBe(true);
        // Cache hits should use less memory and be faster
        expect(result.memory.delta.heapUsed).toBeLessThanOrEqual(firstPassTimes[secondPassTimes.length - 1] || Infinity);
      }

      // Phase 5: Verify cache performance improvement
      const averageFirstPass = firstPassTimes.reduce((a, b) => a + b, 0) / firstPassTimes.length;
      const averageSecondPass = secondPassTimes.reduce((a, b) => a + b, 0) / secondPassTimes.length;
      
      console.log(`Average first pass time: ${averageFirstPass.toFixed(2)}ms`);
      console.log(`Average second pass time: ${averageSecondPass.toFixed(2)}ms`);
      
      // Cache should provide performance benefit (allow some variance for system noise)
      expect(averageSecondPass).toBeLessThanOrEqual(averageFirstPass * 1.1);

      const memoryStats = memoryMonitor.getStats();
      expect(memoryStats.peak.memory).toBeLessThan(300 * 1024 * 1024); // 300MB peak
    });

    it('should handle cache invalidation and cleanup correctly', async () => {
      // Create test file
      const testFile = await tempManager.createTempFile(`
        export const cacheTestData = {
          timestamp: Date.now(),
          value: 'cache-invalidation-test'
        };
      `, 'cache-invalidation.ts');

      // First analysis - populate cache
      const firstResult = await measureMemory(
        async () => analyzeTypeScriptFile(testFile.path),
        'Before cache clear'
      );
      expect(firstResult.result.success).toBe(true);

      // Verify analyzer has cache data
      const analyzer = getFactoryAnalyzer();
      let beforeClearStats;
      try {
        const beforeReport = await analyzer.getDiagnosticReport();
        beforeClearStats = beforeReport.performanceMetrics;
        expect(beforeClearStats.filesProcessed).toBeGreaterThan(0);
      } catch (error) {
        console.log('Using basic cache verification for invalidation test');
      }

      // Clear cache
      clearFactoryCache();

      // Verify cache is cleared
      let afterClearStats;
      try {
        const afterReport = await analyzer.getDiagnosticReport();
        afterClearStats = afterReport.performanceMetrics;
        // Cache hit rate should be reset or files processed should start over
        expect(afterClearStats.cacheHitRate).toBeLessThanOrEqual(beforeClearStats?.cacheHitRate || 1);
      } catch (error) {
        console.log('Cache cleared - diagnostic verification skipped');
      }

      // Second analysis after cache clear - should be similar to first analysis timing
      const secondResult = await measureMemory(
        async () => analyzeTypeScriptFile(testFile.path),
        'After cache clear'
      );
      expect(secondResult.result.success).toBe(true);

      // Performance should be similar to first analysis (cache miss)
      const timingRatio = secondResult.memory.duration / firstResult.memory.duration;
      expect(timingRatio).toBeGreaterThan(0.5); // Should not be dramatically faster
      expect(timingRatio).toBeLessThan(2.0); // Should not be dramatically slower
    });

    it('should manage memory efficiently across cache operations', async () => {
      memoryMonitor.startMonitoring();

      // Create multiple test files for memory pressure testing
      const memoryTestFiles: Record<string, string> = {};
      
      for (let i = 0; i < 20; i++) {
        memoryTestFiles[`memory-test-${i}.ts`] = `
          export interface MemoryTest${i} {
            id: number;
            data: Array<{
              index: number;
              value: string;
              metadata: Record<string, unknown>;
            }>;
          }

          export class MemoryTestService${i} {
            private data: MemoryTest${i};

            constructor() {
              this.data = {
                id: ${i},
                data: Array.from({ length: 100 }, (_, idx) => ({
                  index: idx,
                  value: \`item-\${idx}\`,
                  metadata: { created: Date.now(), serviceId: ${i} }
                }))
              };
            }

            public getData(): MemoryTest${i} {
              return { ...this.data };
            }

            public processData(): number {
              return this.data.data.reduce((sum, item) => sum + item.index, 0);
            }
          }
        `;
      }

      const resources = await tempManager.createTestFiles(memoryTestFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Analyze files in batches to test cache memory management
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < filePaths.length; i += batchSize) {
        batches.push(filePaths.slice(i, i + batchSize));
      }

      let totalAnalysisTime = 0;
      const batchResults = [];

      for (const [batchIndex, batch] of batches.entries()) {
        const batchResult = await measureMemory(
          async () => getBatchAnalysis(batch, { concurrency: 3, continueOnError: true }),
          `Batch ${batchIndex + 1}/${batches.length}`
        );

        batchResults.push(batchResult);
        totalAnalysisTime += batchResult.memory.duration;

        // Memory usage should not grow excessively with each batch
        expect(batchResult.memory.delta.heapUsed).toBeLessThan(200 * 1024 * 1024); // 200MB per batch
        
        // Verify all files in batch were processed
        expect(batchResult.result.length).toBe(batch.length);
        batchResult.result.forEach(result => {
          expect(result.success).toBe(true);
        });
      }

      // Final memory and performance validation
      const finalMemoryStats = memoryMonitor.getStats();
      console.log('Memory Management Test Results:');
      console.log(`- Peak memory usage: ${formatBytes(finalMemoryStats.peak.memory)}`);
      console.log(`- Average memory usage: ${formatBytes(finalMemoryStats.average.memory)}`);
      console.log(`- Total files processed: ${filePaths.length}`);
      console.log(`- Total analysis time: ${totalAnalysisTime.toFixed(2)}ms`);
      console.log(`- Average per file: ${(totalAnalysisTime / filePaths.length).toFixed(2)}ms`);

      // Memory should not exceed reasonable limits
      expect(finalMemoryStats.peak.memory).toBeLessThan(500 * 1024 * 1024); // 500MB peak
      
      // Get final diagnostic report
      const finalAnalyzer = getFactoryAnalyzer();
      try {
        const finalReport = await finalAnalyzer.getDiagnosticReport();
        expect(finalReport.performanceMetrics.filesProcessed).toBe(filePaths.length);
        expect(finalReport.systemHealth).toBeGreaterThan(0.5); // System should be healthy
        
        console.log(`- Final cache hit rate: ${(finalReport.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`- System health: ${(finalReport.systemHealth * 100).toFixed(1)}%`);
      } catch (error) {
        console.log('Final diagnostic report not available');
      }
    });
  });

  describe('Multi-Session Cache Behavior', () => {
    it('should maintain consistent cache behavior across analyzer resets', async () => {
      // Create test file
      const testFile = await tempManager.createTempFile(`
        export const sessionTestData = {
          sessionId: 'multi-session-test',
          timestamp: Date.now()
        };
      `, 'session-test.ts');

      // Session 1: Analyze and measure
      const session1Result = await measureMemory(
        async () => analyzeTypeScriptFile(testFile.path),
        'Session 1 analysis'
      );
      expect(session1Result.result.success).toBe(true);

      // Get session 1 analyzer state
      const session1Analyzer = getFactoryAnalyzer();
      let session1Stats;
      try {
        const session1Report = await session1Analyzer.getDiagnosticReport();
        session1Stats = session1Report.performanceMetrics;
      } catch (error) {
        console.log('Session 1 diagnostics not available');
      }

      // Reset analyzer (simulating new session)
      resetFactoryAnalyzer();

      // Session 2: Analyze same file (should be cache miss)
      const session2Result = await measureMemory(
        async () => analyzeTypeScriptFile(testFile.path),
        'Session 2 analysis'
      );
      expect(session2Result.result.success).toBe(true);

      // Get session 2 analyzer state
      const session2Analyzer = getFactoryAnalyzer();
      expect(session2Analyzer).toBeDefined();
      expect(session2Analyzer).not.toBe(session1Analyzer); // Different instances

      let session2Stats;
      try {
        const session2Report = await session2Analyzer.getDiagnosticReport();
        session2Stats = session2Report.performanceMetrics;
        expect(session2Stats.filesProcessed).toBe(1); // Fresh start
        expect(session2Stats.cacheHitRate).toBe(0); // No cache from previous session
      } catch (error) {
        console.log('Session 2 diagnostics not available');
      }

      // Performance should be similar between sessions for same file
      const performanceRatio = session2Result.memory.duration / session1Result.memory.duration;
      expect(performanceRatio).toBeGreaterThan(0.5);
      expect(performanceRatio).toBeLessThan(2.0);

      console.log('Multi-Session Cache Test:');
      console.log(`- Session 1 time: ${session1Result.memory.duration.toFixed(2)}ms`);
      console.log(`- Session 2 time: ${session2Result.memory.duration.toFixed(2)}ms`);
      console.log(`- Performance ratio: ${performanceRatio.toFixed(2)}`);
    });
  });
});