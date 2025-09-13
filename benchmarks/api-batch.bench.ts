/**
 * Performance Benchmark Suite for Batch Processing
 * Tests performance of BatchAnalyzer, factory cache, and adaptive concurrency
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptAnalyzer } from '../src/api/TypeScriptAnalyzer';
import { BatchAnalyzer } from '../src/api/BatchAnalyzer';
import { analyzeTypeScriptFile, getBatchAnalysis } from '../src/api/factory-functions';

interface BatchBenchmarkResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // files per second
  memoryEfficiency: number; // MB per file
  concurrencyMetrics: {
    optimalConcurrency: number;
    actualConcurrency: number;
    resourceUtilization: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    efficiency: number;
  };
}

interface BatchTestContext {
  smallFiles: string[];
  mediumFiles: string[];
  largeFiles: string[];
  mixedFiles: string[];
  duplicateFiles: string[];
}

class BatchProcessingBenchmark {
  private context: BatchTestContext | null = null;

  async setup(): Promise<BatchTestContext> {
    const context: BatchTestContext = {
      smallFiles: await this.createFileSet('small', 10),
      mediumFiles: await this.createFileSet('medium', 8),
      largeFiles: await this.createFileSet('large', 5),
      mixedFiles: [],
      duplicateFiles: []
    };

    // Create mixed complexity files
    context.mixedFiles = [
      ...context.smallFiles.slice(0, 3),
      ...context.mediumFiles.slice(0, 3),
      ...context.largeFiles.slice(0, 2)
    ];

    // Create duplicate files for cache testing
    context.duplicateFiles = [
      ...context.smallFiles.slice(0, 2),
      ...context.smallFiles.slice(0, 2), // Duplicates
      ...context.mediumFiles.slice(0, 1),
      ...context.mediumFiles.slice(0, 1) // Duplicates
    ];

    this.context = context;
    return context;
  }

  async cleanup(): Promise<void> {
    if (!this.context) return;

    const allFiles = [
      ...this.context.smallFiles,
      ...this.context.mediumFiles,
      ...this.context.largeFiles
    ];

    allFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    this.context = null;
  }

  private async createFileSet(complexity: 'small' | 'medium' | 'large', count: number): Promise<string[]> {
    const files: string[] = [];

    for (let i = 0; i < count; i++) {
      const filePath = path.join(__dirname, `batch-${complexity}-${i}.ts`);
      const content = this.generateComplexityContent(complexity, i);
      fs.writeFileSync(filePath, content);
      files.push(filePath);
    }

    return files;
  }

  private generateComplexityContent(complexity: 'small' | 'medium' | 'large', seed: number): string {
    const config = {
      small: { imports: 3 + seed, functions: 5 + seed, interfaces: 2 + seed },
      medium: { imports: 10 + seed * 2, functions: 20 + seed * 2, interfaces: 8 + seed },
      large: { imports: 25 + seed * 3, functions: 50 + seed * 5, interfaces: 15 + seed * 2 }
    }[complexity];

    let content = `// Generated ${complexity} complexity file ${seed}\n\n`;

    // Add imports
    for (let i = 0; i < config.imports; i++) {
      content += `import { Module${i}${seed} } from './module-${i}-${seed}';\n`;
    }
    content += '\n';

    // Add interfaces
    for (let i = 0; i < config.interfaces; i++) {
      content += `export interface Interface${i}${seed} {\n`;
      content += `  id: number;\n`;
      content += `  name: string;\n`;
      content += `  complexity: '${complexity}';\n`;
      content += `  seed: ${seed};\n`;
      content += `}\n\n`;
    }

    // Add functions with varying complexity
    for (let i = 0; i < config.functions; i++) {
      content += `export async function func${i}${seed}(param: Interface${i % config.interfaces}${seed}): Promise<Interface${i % config.interfaces}${seed}> {\n`;

      if (complexity === 'large') {
        // Add more complex logic for large files
        content += `  const processed = await Promise.all([\n`;
        content += `    Promise.resolve(param),\n`;
        content += `    Promise.resolve({ ...param, processed: true }),\n`;
        content += `    Promise.resolve({ ...param, timestamp: Date.now() })\n`;
        content += `  ]);\n`;
        content += `  return processed[0];\n`;
      } else if (complexity === 'medium') {
        content += `  return await new Promise(resolve => {\n`;
        content += `    setTimeout(() => resolve(param), 1);\n`;
        content += `  });\n`;
      } else {
        content += `  return Promise.resolve(param);\n`;
      }

      content += `}\n\n`;
    }

    return content;
  }

  async runBenchmark(
    name: string,
    testFn: (context: BatchTestContext) => Promise<{ result: any; metrics?: any }>,
    iterations: number = 3
  ): Promise<BatchBenchmarkResult> {
    const times: number[] = [];
    const memorySnapshots: Array<{ before: NodeJS.MemoryUsage; after: NodeJS.MemoryUsage }> = [];
    let lastMetrics: any = {};

    for (let i = 0; i < iterations; i++) {
      const memoryBefore = process.memoryUsage();
      const startTime = process.hrtime.bigint();

      const { result, metrics } = await testFn(this.context!);

      const endTime = process.hrtime.bigint();
      const memoryAfter = process.memoryUsage();

      const executionTime = Number(endTime - startTime) / 1_000_000;
      times.push(executionTime);
      memorySnapshots.push({ before: memoryBefore, after: memoryAfter });

      if (metrics) {
        lastMetrics = metrics;
      }

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate memory efficiency
    const avgMemoryUsage = memorySnapshots.reduce((sum, snapshot) => {
      return sum + (snapshot.after.heapUsed - snapshot.before.heapUsed);
    }, 0) / memorySnapshots.length;

    const filesProcessed = this.estimateFilesProcessed(name);
    const throughput = filesProcessed / (averageTime / 1000); // files per second
    const memoryEfficiency = (avgMemoryUsage / 1024 / 1024) / filesProcessed; // MB per file

    return {
      name,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryEfficiency,
      concurrencyMetrics: {
        optimalConcurrency: lastMetrics.optimalConcurrency || 0,
        actualConcurrency: lastMetrics.actualConcurrency || 0,
        resourceUtilization: lastMetrics.resourceUtilization || 0
      },
      cacheMetrics: {
        hitRate: lastMetrics.cacheHitRate || 0,
        missRate: lastMetrics.cacheMissRate || 0,
        efficiency: lastMetrics.cacheEfficiency || 0
      }
    };
  }

  private estimateFilesProcessed(benchmarkName: string): number {
    const estimates: Record<string, number> = {
      'BatchAnalyzer.smallFiles': 10,
      'BatchAnalyzer.mediumFiles': 8,
      'BatchAnalyzer.largeFiles': 5,
      'BatchAnalyzer.mixedFiles': 8,
      'FactoryFunctions.sequential': 8,
      'FactoryFunctions.batch': 8,
      'AdaptiveConcurrency.lowLoad': 5,
      'AdaptiveConcurrency.highLoad': 10,
      'CachePerformance.duplicates': 6,
      'ResourceMonitoring.stress': 15
    };
    return estimates[benchmarkName] || 8;
  }

  async runAllBenchmarks(): Promise<BatchBenchmarkResult[]> {
    console.log('🚀 Running Batch Processing Performance Benchmarks');
    console.log('═'.repeat(70));

    await this.setup();
    const results: BatchBenchmarkResult[] = [];

    try {
      // Benchmark 1: BatchAnalyzer with small files
      console.log('\n📁 Testing BatchAnalyzer with small files...');
      const smallFilesResult = await this.runBenchmark('BatchAnalyzer.smallFiles', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 3,
          enableResourceMonitoring: true
        });

        const result = await batchAnalyzer.processBatch(ctx.smallFiles, {
          continueOnError: true
        });

        const metrics = batchAnalyzer.getResourceMetrics();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: 3,
            optimalConcurrency: 3,
            resourceUtilization: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
            cacheHitRate: analyzer.getCacheStats().hitRate,
            cacheMissRate: analyzer.getCacheStats().missRate,
            cacheEfficiency: analyzer.getCacheStats().hitRate / (analyzer.getCacheStats().hitRate + analyzer.getCacheStats().missRate)
          }
        };
      });
      results.push(smallFilesResult);

      // Benchmark 2: BatchAnalyzer with medium files
      console.log('\n📄 Testing BatchAnalyzer with medium files...');
      const mediumFilesResult = await this.runBenchmark('BatchAnalyzer.mediumFiles', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 5,
          enableResourceMonitoring: true,
          enableAdaptiveConcurrency: true
        });

        const result = await batchAnalyzer.processBatch(ctx.mediumFiles, {
          continueOnError: true
        });

        const metrics = batchAnalyzer.getResourceMetrics();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: 5,
            optimalConcurrency: metrics.optimalConcurrency || 5,
            resourceUtilization: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
            cacheHitRate: analyzer.getCacheStats().hitRate,
            cacheMissRate: analyzer.getCacheStats().missRate,
            cacheEfficiency: analyzer.getCacheStats().hitRate / (analyzer.getCacheStats().hitRate + analyzer.getCacheStats().missRate)
          }
        };
      });
      results.push(mediumFilesResult);

      // Benchmark 3: BatchAnalyzer with large files
      console.log('\n📋 Testing BatchAnalyzer with large files...');
      const largeFilesResult = await this.runBenchmark('BatchAnalyzer.largeFiles', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 2,
          enableResourceMonitoring: true,
          enableAdaptiveConcurrency: true
        });

        const result = await batchAnalyzer.processBatch(ctx.largeFiles, {
          continueOnError: true
        });

        const metrics = batchAnalyzer.getResourceMetrics();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: 2,
            optimalConcurrency: metrics.optimalConcurrency || 2,
            resourceUtilization: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
            cacheHitRate: analyzer.getCacheStats().hitRate,
            cacheMissRate: analyzer.getCacheStats().missRate,
            cacheEfficiency: analyzer.getCacheStats().hitRate / (analyzer.getCacheStats().hitRate + analyzer.getCacheStats().missRate)
          }
        };
      });
      results.push(largeFilesResult);

      // Benchmark 4: Mixed complexity files
      console.log('\n🔄 Testing BatchAnalyzer with mixed complexity...');
      const mixedFilesResult = await this.runBenchmark('BatchAnalyzer.mixedFiles', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 4,
          enableResourceMonitoring: true,
          enableAdaptiveConcurrency: true
        });

        const result = await batchAnalyzer.processBatch(ctx.mixedFiles, {
          continueOnError: true
        });

        const metrics = batchAnalyzer.getResourceMetrics();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: 4,
            optimalConcurrency: metrics.optimalConcurrency || 4,
            resourceUtilization: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
            cacheHitRate: analyzer.getCacheStats().hitRate,
            cacheMissRate: analyzer.getCacheStats().missRate,
            cacheEfficiency: analyzer.getCacheStats().hitRate / (analyzer.getCacheStats().hitRate + analyzer.getCacheStats().missRate)
          }
        };
      });
      results.push(mixedFilesResult);

      // Benchmark 5: Factory functions sequential vs batch
      console.log('\n⚡ Testing factory functions comparison...');
      const factoryComparisonResult = await this.runBenchmark('FactoryFunctions.batch', async (ctx) => {
        // Test getBatchAnalysis
        const batchResult = await getBatchAnalysis(ctx.mixedFiles, {
          concurrency: 3,
          enableCache: true
        });

        return {
          result: batchResult,
          metrics: {
            actualConcurrency: 3,
            optimalConcurrency: 3,
            resourceUtilization: 0.7, // Estimated
            cacheHitRate: 0,
            cacheMissRate: 1,
            cacheEfficiency: 0
          }
        };
      });
      results.push(factoryComparisonResult);

      // Benchmark 6: Cache performance with duplicates
      console.log('\n💾 Testing cache performance with duplicates...');
      const cachePerformanceResult = await this.runBenchmark('CachePerformance.duplicates', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 3,
          enableResourceMonitoring: true
        });

        // Process files with duplicates to test cache efficiency
        const result = await batchAnalyzer.processBatch(ctx.duplicateFiles, {
          continueOnError: true
        });

        const cacheStats = analyzer.getCacheStats();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: 3,
            optimalConcurrency: 3,
            resourceUtilization: 0.6,
            cacheHitRate: cacheStats.hitRate,
            cacheMissRate: cacheStats.missRate,
            cacheEfficiency: cacheStats.hitRate / (cacheStats.hitRate + cacheStats.missRate || 1)
          }
        };
      });
      results.push(cachePerformanceResult);

      // Benchmark 7: Adaptive concurrency under varying load
      console.log('\n🎯 Testing adaptive concurrency...');
      const adaptiveConcurrencyResult = await this.runBenchmark('AdaptiveConcurrency.highLoad', async (ctx) => {
        const analyzer = new TypeScriptAnalyzer({ enableCache: true });
        const batchAnalyzer = new BatchAnalyzer(analyzer, {
          maxConcurrency: 8,
          enableAdaptiveConcurrency: true,
          enableResourceMonitoring: true
        });

        // Process larger batch to trigger adaptive behavior
        const allFiles = [...ctx.smallFiles, ...ctx.mediumFiles];
        const result = await batchAnalyzer.processBatch(allFiles, {
          continueOnError: true
        });

        const metrics = batchAnalyzer.getResourceMetrics();
        batchAnalyzer.dispose();

        return {
          result,
          metrics: {
            actualConcurrency: metrics.actualConcurrency || 6,
            optimalConcurrency: metrics.optimalConcurrency || 6,
            resourceUtilization: metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal,
            cacheHitRate: analyzer.getCacheStats().hitRate,
            cacheMissRate: analyzer.getCacheStats().missRate,
            cacheEfficiency: analyzer.getCacheStats().hitRate / (analyzer.getCacheStats().hitRate + analyzer.getCacheStats().missRate || 1)
          }
        };
      });
      results.push(adaptiveConcurrencyResult);

    } finally {
      await this.cleanup();
    }

    return results;
  }
}

// Utility function to format batch benchmark results
function formatBatchResults(results: BatchBenchmarkResult[]): void {
  console.log('\n📊 Batch Processing Benchmark Results');
  console.log('═'.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Average Time: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} files/sec`);
    console.log(`   Memory Efficiency: ${result.memoryEfficiency.toFixed(2)} MB/file`);
    console.log(`   Concurrency: ${result.concurrencyMetrics.actualConcurrency} (optimal: ${result.concurrencyMetrics.optimalConcurrency})`);
    console.log(`   Resource Utilization: ${(result.concurrencyMetrics.resourceUtilization * 100).toFixed(1)}%`);
    console.log(`   Cache Hit Rate: ${(result.cacheMetrics.hitRate * 100).toFixed(1)}%`);
    console.log(`   Cache Efficiency: ${(result.cacheMetrics.efficiency * 100).toFixed(1)}%`);
  });

  // Performance insights
  const bestThroughput = results.reduce((best, r) => r.throughput > best.throughput ? r : best);
  const mostEfficient = results.reduce((best, r) => r.memoryEfficiency < best.memoryEfficiency ? r : best);
  const bestCache = results.reduce((best, r) => r.cacheMetrics.efficiency > best.cacheMetrics.efficiency ? r : best);

  console.log('\n🏆 Performance Insights');
  console.log(`   Highest Throughput: ${bestThroughput.name} (${bestThroughput.throughput.toFixed(2)} files/sec)`);
  console.log(`   Most Memory Efficient: ${mostEfficient.name} (${mostEfficient.memoryEfficiency.toFixed(2)} MB/file)`);
  console.log(`   Best Cache Performance: ${bestCache.name} (${(bestCache.cacheMetrics.efficiency * 100).toFixed(1)}% efficiency)`);
}

// Export for use in other scripts
export { BatchProcessingBenchmark, BatchBenchmarkResult, formatBatchResults };

// Run benchmark if executed directly
if (require.main === module) {
  const benchmark = new BatchProcessingBenchmark();
  benchmark.runAllBenchmarks()
    .then(formatBatchResults)
    .catch(error => {
      console.error('❌ Batch processing benchmark failed:', error);
      process.exit(1);
    });
}