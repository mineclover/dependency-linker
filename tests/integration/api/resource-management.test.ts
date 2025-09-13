/**
 * T048: Integration Test - Resource Management Under Load
 * 
 * Tests resource management capabilities under various load scenarios:
 * - High concurrency analysis
 * - Memory pressure handling
 * - File handle management
 * - Timeout and error recovery
 * - System resource monitoring
 * - Performance degradation detection
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TypeScriptAnalyzer } from '../../../src/api/TypeScriptAnalyzer';
import { 
  getBatchAnalysis, 
  analyzeDirectory,
  analyzeTypeScriptFile,
  resetFactoryAnalyzer,
  clearFactoryCache 
} from '../../../src/api/factory-functions';
import { 
  ResourceMonitor, 
  TempResourceManager, 
  setupResourceManagement, 
  withResourceLimits 
} from '../../helpers/resource-test-utils';
import { MemoryMonitor, measureMemory, formatBytes } from '../../helpers/memory-test-utils';
import { join } from 'path';

describe('Integration: Resource Management Under Load - T048', () => {
  let tempManager: TempResourceManager;
  let cleanup: () => Promise<void>;
  let resourceMonitor: ResourceMonitor;
  let memoryMonitor: MemoryMonitor;

  beforeEach(async () => {
    const resourceSetup = setupResourceManagement();
    tempManager = resourceSetup.tempManager;
    cleanup = resourceSetup.cleanup;

    resourceMonitor = new ResourceMonitor();
    memoryMonitor = new MemoryMonitor({
      sampleInterval: 50,
      maxSamples: 1000,
      warnThreshold: 200 * 1024 * 1024, // 200MB warning threshold
    });

    // Reset state
    resetFactoryAnalyzer();
    clearFactoryCache();
  });

  afterEach(async () => {
    resourceMonitor.stopMonitoring();
    memoryMonitor.stopMonitoring();
    await cleanup();
    resetFactoryAnalyzer();
    clearFactoryCache();
  });

  describe('High Concurrency Load Testing', () => {
    it('should handle high concurrency analysis without resource exhaustion', async () => {
      resourceMonitor.startMonitoring();
      memoryMonitor.startMonitoring();

      // Create a large number of test files for concurrent analysis
      const fileCount = 50;
      const testFiles: Record<string, string> = {};

      for (let i = 0; i < fileCount; i++) {
        testFiles[`concurrent-test-${i}.ts`] = `
          import * as path from 'path';
          import { EventEmitter } from 'events';
          import * as fs from 'fs';

          export interface ConcurrentTest${i} {
            id: number;
            processingTime: number;
            dependencies: string[];
            metadata: {
              created: Date;
              fileIndex: number;
              complexity: 'low' | 'medium' | 'high';
            };
          }

          export class ConcurrentProcessor${i} extends EventEmitter {
            private config: ConcurrentTest${i};
            private readonly processingDelay = ${Math.floor(Math.random() * 100)};

            constructor() {
              super();
              this.config = {
                id: ${i},
                processingTime: this.processingDelay,
                dependencies: [
                  'path', 'events', 'fs',
                  ${i > 0 ? `'./concurrent-test-${i - 1}'` : 'null'}
                ].filter(Boolean),
                metadata: {
                  created: new Date(),
                  fileIndex: ${i},
                  complexity: ${i % 3 === 0 ? "'high'" : i % 2 === 0 ? "'medium'" : "'low'"}
                }
              };
            }

            public async processAsync(): Promise<ConcurrentTest${i}> {
              return new Promise((resolve) => {
                setTimeout(() => {
                  this.emit('processed', this.config);
                  resolve(this.config);
                }, this.processingDelay);
              });
            }

            public static async batchProcess(items: number[]): Promise<ConcurrentTest${i}[]> {
              const processors = items.map(() => new ConcurrentProcessor${i}());
              const results = await Promise.all(
                processors.map(p => p.processAsync())
              );
              return results;
            }
          }

          export const utility${i} = {
            generateId: () => \`concurrent-\${${i}}-\${Date.now()}\`,
            processFile: async (filePath: string) => {
              try {
                const content = await fs.promises.readFile(filePath, 'utf8');
                return { success: true, content: content.substring(0, 100) };
              } catch (error) {
                return { success: false, error: error.message };
              }
            }
          };
        `;
      }

      const resources = await tempManager.createTestFiles(testFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Test high concurrency batch analysis
      const concurrencyLevels = [5, 10, 20];
      const results: Record<number, any> = {};

      for (const concurrency of concurrencyLevels) {
        console.log(`Testing concurrency level: ${concurrency}`);

        const batchResult = await withResourceLimits(
          async () => measureMemory(
            async () => getBatchAnalysis(filePaths, { 
              concurrency, 
              continueOnError: true,
              timeout: 10000
            }),
            `Concurrency ${concurrency}`
          ),
          {
            maxMemoryMB: 400,
            maxFileHandles: 200,
            timeoutMs: 60000,
          }
        );

        results[concurrency] = batchResult;

        // Verify all files were processed successfully
        expect(batchResult.result.result.length).toBe(fileCount);
        
        const successCount = batchResult.result.result.filter(r => r.success).length;
        const successRate = successCount / fileCount;
        
        expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate
        
        console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`  Duration: ${batchResult.result.memory.duration.toFixed(2)}ms`);
        console.log(`  Memory delta: ${formatBytes(batchResult.result.memory.delta.heapUsed)}`);
      }

      // Verify resource usage patterns
      const resourceStats = resourceMonitor.getStats();
      const memoryStats = memoryMonitor.getStats();

      expect(resourceStats.peak.memory).toBeLessThan(400 * 1024 * 1024); // 400MB peak
      expect(memoryStats.peak.heapUsed).toBeLessThan(300 * 1024 * 1024); // 300MB peak heap

      console.log('Resource Management Summary:');
      console.log(`- Peak memory: ${formatBytes(resourceStats.peak.memory)}`);
      console.log(`- Peak heap: ${formatBytes(memoryStats.peak.heapUsed)}`);
      console.log(`- Peak file handles: ${resourceStats.peak.fileHandles}`);
      console.log(`- Duration: ${resourceStats.duration}ms`);
    });

    it('should gracefully handle memory pressure and recover', async () => {
      memoryMonitor.startMonitoring();

      // Create memory-intensive test files
      const memoryTestFiles: Record<string, string> = {};
      
      for (let i = 0; i < 15; i++) {
        memoryTestFiles[`memory-intensive-${i}.ts`] = `
          import * as fs from 'fs';
          import * as path from 'path';
          import { EventEmitter } from 'events';

          // Large type definitions to increase memory usage
          export type LargeType${i} = {
            ${Array.from({ length: 50 }, (_, idx) => 
              `field${idx}: { id: number; data: string; metadata: Record<string, unknown>; }`
            ).join('\n    ')}
          };

          export interface MemoryIntensive${i} {
            id: number;
            largeData: LargeType${i};
            nestedStructure: {
              level1: {
                level2: {
                  level3: {
                    data: Array<{
                      index: number;
                      content: string;
                      references: string[];
                    }>;
                  };
                };
              };
            };
          }

          export class MemoryIntensiveProcessor${i} {
            private data: MemoryIntensive${i};
            private cache: Map<string, any> = new Map();
            private eventEmitter = new EventEmitter();

            constructor() {
              this.data = this.initializeData();
              this.setupEventHandlers();
            }

            private initializeData(): MemoryIntensive${i} {
              const largeData = {} as LargeType${i};
              ${Array.from({ length: 50 }, (_, idx) => 
                `largeData.field${idx} = { 
                   id: ${idx}, 
                   data: 'data-${i}-${idx}'.repeat(100), 
                   metadata: { created: Date.now(), index: ${idx} } 
                 };`
              ).join('\n        ')}

              return {
                id: ${i},
                largeData,
                nestedStructure: {
                  level1: {
                    level2: {
                      level3: {
                        data: Array.from({ length: 200 }, (_, idx) => ({
                          index: idx,
                          content: \`content-\${idx}-\${'x'.repeat(50)}\`,
                          references: Array.from({ length: 10 }, (_, refIdx) => 
                            \`ref-\${idx}-\${refIdx}\`
                          )
                        }))
                      }
                    }
                  }
                }
              };
            }

            private setupEventHandlers(): void {
              this.eventEmitter.on('process', (data) => {
                this.cache.set(\`process-\${Date.now()}\`, data);
              });
            }

            public async processWithMemoryPressure(): Promise<any> {
              // Create additional memory pressure
              const tempArrays = Array.from({ length: 100 }, (_, idx) => 
                new Array(1000).fill(\`temp-data-\${idx}\`)
              );

              try {
                const result = {
                  processed: true,
                  dataSize: JSON.stringify(this.data).length,
                  cacheSize: this.cache.size,
                  tempDataSize: tempArrays.length
                };

                this.eventEmitter.emit('process', result);
                return result;
              } finally {
                // Cleanup temp data
                tempArrays.length = 0;
              }
            }
          }
        `;
      }

      const resources = await tempManager.createTestFiles(memoryTestFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Analyze with memory pressure monitoring
      let memoryPressureDetected = false;
      let recoverySuccessful = false;

      try {
        const result = await withResourceLimits(
          async () => measureMemory(
            async () => {
              // Process files in smaller batches to manage memory
              const batchSize = 3;
              const results = [];
              
              for (let i = 0; i < filePaths.length; i += batchSize) {
                const batch = filePaths.slice(i, i + batchSize);
                console.log(`Processing memory pressure batch ${Math.floor(i / batchSize) + 1}`);
                
                try {
                  const batchResults = await getBatchAnalysis(batch, {
                    concurrency: 2,
                    continueOnError: true,
                    timeout: 15000
                  });
                  results.push(...batchResults);
                  
                  // Force garbage collection between batches if available
                  if (global.gc) {
                    global.gc();
                  }
                  
                  // Small delay to allow memory cleanup
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                  memoryPressureDetected = true;
                  console.warn(`Memory pressure detected in batch: ${error.message}`);
                  
                  // Attempt recovery
                  clearFactoryCache();
                  if (global.gc) global.gc();
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Retry with even smaller batch
                  const retryResults = await getBatchAnalysis(batch.slice(0, 1), {
                    concurrency: 1,
                    continueOnError: true,
                    timeout: 20000
                  });
                  results.push(...retryResults);
                  recoverySuccessful = true;
                }
              }
              
              return results;
            },
            'Memory pressure test'
          ),
          {
            maxMemoryMB: 300,
            maxFileHandles: 100,
            timeoutMs: 120000,
          }
        );

        // Verify results
        expect(result.result.result.length).toBeGreaterThan(0);
        
        const memoryStats = memoryMonitor.getStats();
        console.log('Memory Pressure Test Results:');
        console.log(`- Memory pressure detected: ${memoryPressureDetected}`);
        console.log(`- Recovery successful: ${recoverySuccessful}`);
        console.log(`- Peak memory: ${formatBytes(memoryStats.peak.heapUsed)}`);
        console.log(`- Files processed: ${result.result.result.length}`);
        
        // System should handle pressure gracefully
        if (memoryPressureDetected) {
          expect(recoverySuccessful).toBe(true);
        }
        
      } catch (error) {
        // If we hit memory limits, that's expected behavior
        console.log('Expected memory limit reached:', error.message);
        expect(error.message).toMatch(/Memory limit exceeded|timeout|resource/i);
      }
    });
  });

  describe('File Handle and Resource Management', () => {
    it('should manage file handles efficiently during directory analysis', async () => {
      resourceMonitor.startMonitoring();

      // Create nested directory structure
      const baseDir = await tempManager.createTempDir('resource-test');
      
      // Create multiple subdirectories with files
      const dirStructure = {
        'src/components': 10,
        'src/services': 8,
        'src/utils': 6,
        'src/types': 5,
        'tests/unit': 12,
        'tests/integration': 7,
      };

      const allFiles: string[] = [];

      for (const [dirPath, fileCount] of Object.entries(dirStructure)) {
        const fullDirPath = join(baseDir.path, dirPath);
        await tempManager.createTempDir(dirPath);

        for (let i = 0; i < fileCount; i++) {
          const fileName = `file-${i}.ts`;
          const content = `
            export interface ${dirPath.replace(/[\/\-]/g, '')}Type${i} {
              id: number;
              name: string;
              data: Record<string, unknown>;
            }

            export const create${dirPath.replace(/[\/\-]/g, '')}${i} = (): ${dirPath.replace(/[\/\-]/g, '')}Type${i} => ({
              id: ${i},
              name: '${dirPath}-${i}',
              data: { created: Date.now() }
            });
          `;
          
          const filePath = join(fullDirPath, fileName);
          await tempManager.createTempFile(content, fileName);
          allFiles.push(filePath);
        }
      }

      console.log(`Created ${allFiles.length} files across ${Object.keys(dirStructure).length} directories`);

      // Analyze directory with resource monitoring
      const analysisResult = await withResourceLimits(
        async () => measureMemory(
          async () => analyzeDirectory(baseDir.path, {
            extensions: ['.ts'],
            maxDepth: 5,
            ignorePatterns: ['**/node_modules/**']
          }),
          'Directory analysis'
        ),
        {
          maxMemoryMB: 250,
          maxFileHandles: 150,
          timeoutMs: 60000,
        }
      );

      // Verify resource management
      expect(analysisResult.result.result.length).toBeGreaterThan(0);
      
      const resourceStats = resourceMonitor.getStats();
      
      expect(resourceStats.peak.fileHandles).toBeLessThan(150);
      expect(resourceStats.peak.memory).toBeLessThan(250 * 1024 * 1024);

      console.log('Directory Analysis Resource Usage:');
      console.log(`- Files processed: ${analysisResult.result.result.length}`);
      console.log(`- Peak file handles: ${resourceStats.peak.fileHandles}`);
      console.log(`- Peak memory: ${formatBytes(resourceStats.peak.memory)}`);
      console.log(`- Analysis duration: ${analysisResult.result.memory.duration.toFixed(2)}ms`);

      // Verify success rates
      const successCount = analysisResult.result.result.filter(r => r.success).length;
      const successRate = successCount / analysisResult.result.result.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate minimum
    });

    it('should handle timeout and error recovery gracefully', async () => {
      resourceMonitor.startMonitoring();
      memoryMonitor.startMonitoring();

      // Create files with different complexity and potential issues
      const problematicFiles = {
        'timeout-test.ts': `
          // Very complex file that might timeout
          ${Array.from({ length: 100 }, (_, i) => `
            export interface ComplexInterface${i} {
              ${Array.from({ length: 20 }, (_, j) => `field${j}: string;`).join('\n    ')}
            }
          `).join('\n')}
        `,
        'circular-dependency.ts': `
          import { CircularB } from './circular-b';
          export interface CircularA {
            b: CircularB;
          }
        `,
        'circular-b.ts': `
          import { CircularA } from './circular-dependency';
          export interface CircularB {
            a: CircularA;
          }
        `,
        'syntax-issues.ts': `
          // File with potential parsing challenges
          const obj = {
            prop1: function() {
              return {
                nested: {
                  deeply: {
                    very: {
                      much: {
                        so: "complex"
                      }
                    }
                  }
                }
              };
            }
          };
        `
      };

      const resources = await tempManager.createTestFiles(problematicFiles);
      const filePaths = Object.values(resources).map(r => r.path);

      // Test with strict timeout limits
      const analysisResults = [];
      let timeoutCount = 0;
      let recoveryCount = 0;

      for (const filePath of filePaths) {
        try {
          const result = await withResourceLimits(
            async () => measureMemory(
              async () => analyzeTypeScriptFile(filePath, { timeout: 2000 }),
              `Analyzing ${filePath}`
            ),
            {
              maxMemoryMB: 100,
              timeoutMs: 5000,
            }
          );

          analysisResults.push(result.result.result);
          
        } catch (error) {
          timeoutCount++;
          console.log(`Timeout/error for ${filePath}: ${error.message}`);
          
          // Attempt recovery with relaxed limits
          try {
            clearFactoryCache();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const recoveryResult = await analyzeTypeScriptFile(filePath, { 
              timeout: 10000,
              continueOnError: true 
            });
            
            analysisResults.push(recoveryResult);
            recoveryCount++;
            console.log(`Recovery successful for ${filePath}`);
            
          } catch (recoveryError) {
            console.log(`Recovery failed for ${filePath}: ${recoveryError.message}`);
            // Add null result to track failed analysis
            analysisResults.push(null);
          }
        }
      }

      const resourceStats = resourceMonitor.getStats();
      const memoryStats = memoryMonitor.getStats();

      console.log('Timeout and Recovery Test Results:');
      console.log(`- Total files: ${filePaths.length}`);
      console.log(`- Timeout/error count: ${timeoutCount}`);
      console.log(`- Recovery count: ${recoveryCount}`);
      console.log(`- Final results: ${analysisResults.filter(r => r !== null).length}`);
      console.log(`- Peak memory: ${formatBytes(memoryStats.peak.heapUsed)}`);
      console.log(`- Total duration: ${resourceStats.duration}ms`);

      // System should handle timeouts gracefully
      expect(recoveryCount).toBeGreaterThanOrEqual(Math.floor(timeoutCount * 0.5)); // At least 50% recovery rate
      expect(analysisResults.filter(r => r !== null).length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring and Degradation Detection', () => {
    it('should detect and report performance degradation under sustained load', async () => {
      memoryMonitor.startMonitoring();

      const analyzer = new TypeScriptAnalyzer({
        enableCache: true,
        cacheSize: 50, // Smaller cache to trigger cache evictions
        defaultTimeout: 5000,
      });

      // Create sustained load test
      const loadTestRounds = 5;
      const filesPerRound = 8;
      const performanceMetrics = [];

      for (let round = 0; round < loadTestRounds; round++) {
        console.log(`Starting load test round ${round + 1}/${loadTestRounds}`);

        // Create fresh files for each round
        const roundFiles: Record<string, string> = {};
        for (let i = 0; i < filesPerRound; i++) {
          roundFiles[`load-test-r${round}-f${i}.ts`] = `
            import * as path from 'path';
            import { EventEmitter } from 'events';
            
            export class LoadTestClass${round}_${i} extends EventEmitter {
              private data: Map<string, any> = new Map();
              
              constructor() {
                super();
                this.initialize();
              }
              
              private initialize(): void {
                for (let j = 0; j < 50; j++) {
                  this.data.set(\`key-\${j}\`, {
                    value: \`data-${round}-${i}-\${j}\`,
                    timestamp: Date.now(),
                    metadata: { round: ${round}, file: ${i}, index: j }
                  });
                }
              }
              
              public process(): any {
                const results = [];
                for (const [key, value] of this.data.entries()) {
                  results.push({ key, ...value });
                }
                return results;
              }
            }
          `;
        }

        const roundResources = await tempManager.createTestFiles(roundFiles);
        const roundFilePaths = Object.values(roundResources).map(r => r.path);

        // Measure performance for this round
        const roundStart = Date.now();
        const roundResults = [];

        for (const filePath of roundFilePaths) {
          const result = await measureMemory(
            async () => analyzer.analyzeFile(filePath),
            `Round ${round + 1} file analysis`
          );
          roundResults.push(result);
        }

        const roundDuration = Date.now() - roundStart;
        const avgFileTime = roundResults.reduce((sum, r) => sum + r.memory.duration, 0) / roundResults.length;
        const avgMemoryDelta = roundResults.reduce((sum, r) => sum + r.memory.delta.heapUsed, 0) / roundResults.length;

        performanceMetrics.push({
          round: round + 1,
          totalDuration: roundDuration,
          avgFileTime,
          avgMemoryDelta,
          successRate: roundResults.filter(r => r.result.success).length / roundResults.length
        });

        // Get diagnostic report if available
        try {
          const diagnosticReport = await analyzer.getDiagnosticReport();
          performanceMetrics[round].cacheHitRate = diagnosticReport.performanceMetrics.cacheHitRate;
          performanceMetrics[round].systemHealth = diagnosticReport.systemHealth;
        } catch (error) {
          console.log(`Diagnostic report not available for round ${round + 1}`);
        }

        console.log(`Round ${round + 1} completed: ${avgFileTime.toFixed(2)}ms avg per file`);
      }

      // Analyze performance trends
      console.log('\nSustained Load Performance Analysis:');
      performanceMetrics.forEach((metrics, index) => {
        console.log(`Round ${metrics.round}:`);
        console.log(`  - Avg file time: ${metrics.avgFileTime.toFixed(2)}ms`);
        console.log(`  - Avg memory delta: ${formatBytes(metrics.avgMemoryDelta)}`);
        console.log(`  - Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
        if (metrics.cacheHitRate !== undefined) {
          console.log(`  - Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
        }
        if (metrics.systemHealth !== undefined) {
          console.log(`  - System health: ${(metrics.systemHealth * 100).toFixed(1)}%`);
        }
      });

      // Check for performance degradation
      const firstRoundTime = performanceMetrics[0].avgFileTime;
      const lastRoundTime = performanceMetrics[performanceMetrics.length - 1].avgFileTime;
      const degradationRatio = lastRoundTime / firstRoundTime;

      console.log(`\nPerformance degradation ratio: ${degradationRatio.toFixed(2)}`);

      // Performance should not degrade significantly (allow some variance)
      expect(degradationRatio).toBeLessThan(3.0); // Performance shouldn't degrade more than 3x
      
      // Success rates should remain high
      performanceMetrics.forEach(metrics => {
        expect(metrics.successRate).toBeGreaterThan(0.8); // 80% minimum success rate
      });

      const finalMemoryStats = memoryMonitor.getStats();
      console.log(`\nFinal memory statistics:`);
      console.log(`- Peak heap usage: ${formatBytes(finalMemoryStats.peak.heapUsed)}`);
      console.log(`- Average heap usage: ${formatBytes(finalMemoryStats.average.heapUsed)}`);
    });
  });
});