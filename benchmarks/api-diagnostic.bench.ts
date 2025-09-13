/**
 * Performance Benchmark Suite for Diagnostic Methods
 * Tests performance of diagnostic tools, error reporting, and debug helpers
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptAnalyzer } from '../src/api/TypeScriptAnalyzer';
import { BatchAnalyzer } from '../src/api/BatchAnalyzer';
import { DiagnosticTool, DebugHelper, errorReporter } from '../src/api/errors/index';

interface BenchmarkResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  operationsPerSecond: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface DiagnosticBenchmarkContext {
  analyzer: TypeScriptAnalyzer;
  batchAnalyzer: BatchAnalyzer;
  testFiles: string[];
  errorFiles: string[];
  diagnosticTool: DiagnosticTool;
  debugHelper: DebugHelper;
}

class DiagnosticBenchmark {
  private context: DiagnosticBenchmarkContext | null = null;

  async setup(): Promise<DiagnosticBenchmarkContext> {
    // Create test files
    const testFiles = await this.createTestFiles();
    const errorFiles = await this.createErrorFiles();

    // Initialize components
    const analyzer = new TypeScriptAnalyzer({
      enableCache: true,
      logLevel: 'info',
      enablePerformanceTracking: true
    });

    const batchAnalyzer = new BatchAnalyzer(analyzer, {
      maxConcurrency: 3,
      enableResourceMonitoring: true,
      enableDiagnostics: true
    });

    const diagnosticTool = new DiagnosticTool(analyzer);
    const debugHelper = new DebugHelper();

    this.context = {
      analyzer,
      batchAnalyzer,
      testFiles,
      errorFiles,
      diagnosticTool,
      debugHelper
    };

    return this.context;
  }

  async cleanup(): Promise<void> {
    if (!this.context) return;

    // Clean up test files
    [...this.context.testFiles, ...this.context.errorFiles].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // Dispose analyzers
    this.context.batchAnalyzer.dispose();
    this.context = null;
  }

  private async createTestFiles(): Promise<string[]> {
    const files: string[] = [];

    // Valid TypeScript files of varying complexity
    const fileConfigs = [
      { name: 'simple.ts', complexity: 'low' },
      { name: 'medium.ts', complexity: 'medium' },
      { name: 'complex.ts', complexity: 'high' },
      { name: 'large.ts', complexity: 'very-high' }
    ];

    for (const config of fileConfigs) {
      const filePath = path.join(__dirname, `test-${config.name}`);
      const content = this.generateTypeScriptContent(config.complexity);
      fs.writeFileSync(filePath, content);
      files.push(filePath);
    }

    return files;
  }

  private async createErrorFiles(): Promise<string[]> {
    const files: string[] = [];

    // Files with various types of errors
    const errorConfigs = [
      { name: 'syntax-error.ts', type: 'syntax' },
      { name: 'type-error.ts', type: 'type' },
      { name: 'missing-import.ts', type: 'import' },
      { name: 'circular-deps.ts', type: 'circular' }
    ];

    for (const config of errorConfigs) {
      const filePath = path.join(__dirname, `error-${config.name}`);
      const content = this.generateErrorContent(config.type);
      fs.writeFileSync(filePath, content);
      files.push(filePath);
    }

    return files;
  }

  private generateTypeScriptContent(complexity: string): string {
    const complexityMap = {
      'low': { imports: 3, functions: 5, interfaces: 2, classes: 1 },
      'medium': { imports: 8, functions: 15, interfaces: 5, classes: 3 },
      'high': { imports: 15, functions: 30, interfaces: 10, classes: 5 },
      'very-high': { imports: 25, functions: 50, interfaces: 15, classes: 8 }
    };

    const config = complexityMap[complexity as keyof typeof complexityMap] || complexityMap.medium;

    let content = '// Generated TypeScript file for diagnostic benchmarking\n\n';

    // Add imports
    for (let i = 0; i < config.imports; i++) {
      content += `import { Item${i} } from './module${i}';\n`;
    }
    content += '\n';

    // Add interfaces
    for (let i = 0; i < config.interfaces; i++) {
      content += `interface Interface${i} {\n`;
      content += `  id: number;\n`;
      content += `  name: string;\n`;
      content += `  data: any;\n`;
      content += `}\n\n`;
    }

    // Add functions
    for (let i = 0; i < config.functions; i++) {
      content += `export function func${i}(param: Interface${i % config.interfaces}): Promise<Interface${i % config.interfaces}> {\n`;
      content += `  return Promise.resolve(param);\n`;
      content += `}\n\n`;
    }

    // Add classes
    for (let i = 0; i < config.classes; i++) {
      content += `export class Class${i} implements Interface${i % config.interfaces} {\n`;
      content += `  id: number = ${i};\n`;
      content += `  name: string = 'Class${i}';\n`;
      content += `  data: any = {};\n\n`;
      content += `  async process(): Promise<void> {\n`;
      content += `    await func${i % config.functions}(this);\n`;
      content += `  }\n`;
      content += `}\n\n`;
    }

    return content;
  }

  private generateErrorContent(errorType: string): string {
    switch (errorType) {
      case 'syntax':
        return `
// Syntax error file
export function invalidSyntax( {
  return "missing closing parenthesis";
}
`;

      case 'type':
        return `
// Type error file
interface User {
  id: number;
  name: string;
}

export function processUser(user: User): string {
  return user.nonExistentProperty; // Type error
}
`;

      case 'import':
        return `
// Missing import error
import { NonExistentModule } from './non-existent-module';

export function useNonExistent() {
  return new NonExistentModule();
}
`;

      case 'circular':
        return `
// Circular dependency (this would be part of a circular chain)
import { CircularDep } from './circular-dep-partner';

export class CircularClass {
  partner: CircularDep;
}
`;

      default:
        return '// Default error content\nexport const errorExample = "error";';
    }
  }

  async runBenchmark(name: string, testFn: (context: DiagnosticBenchmarkContext) => Promise<any>, iterations: number = 5): Promise<BenchmarkResult> {
    const times: number[] = [];
    let memoryUsage = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const startTime = process.hrtime.bigint();

      try {
        await testFn(this.context!);
      } catch (error) {
        // Expected for some diagnostic tests
      }

      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();

      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      times.push(executionTime);

      memoryUsage = endMemory;

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const operationsPerSecond = 1000 / averageTime;

    return {
      name,
      averageTime,
      minTime,
      maxTime,
      iterations,
      operationsPerSecond,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      }
    };
  }

  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🔧 Running Diagnostic Methods Performance Benchmarks');
    console.log('═'.repeat(60));

    await this.setup();
    const results: BenchmarkResult[] = [];

    try {
      // Benchmark 1: DiagnosticTool performance analysis
      console.log('\n📊 Testing DiagnosticTool performance analysis...');
      const diagnosticResult = await this.runBenchmark('DiagnosticTool.analyzePerformance', async (ctx) => {
        for (const file of ctx.testFiles) {
          await ctx.diagnosticTool.analyzePerformance(file);
        }
      });
      results.push(diagnosticResult);

      // Benchmark 2: DiagnosticTool system health
      console.log('\n🏥 Testing DiagnosticTool system health check...');
      const healthResult = await this.runBenchmark('DiagnosticTool.getSystemHealth', async (ctx) => {
        await ctx.diagnosticTool.getSystemHealth();
      });
      results.push(healthResult);

      // Benchmark 3: Error detection and analysis
      console.log('\n🚨 Testing error detection performance...');
      const errorDetectionResult = await this.runBenchmark('DiagnosticTool.detectErrors', async (ctx) => {
        for (const file of ctx.errorFiles) {
          try {
            await ctx.analyzer.analyzeFile(file);
          } catch (error) {
            // Analyze the error with diagnostic tools
            await ctx.diagnosticTool.analyzeError(error as Error, { filePath: file });
          }
        }
      });
      results.push(errorDetectionResult);

      // Benchmark 4: Debug helper performance
      console.log('\n🐛 Testing DebugHelper performance...');
      const debugResult = await this.runBenchmark('DebugHelper.generateReport', async (ctx) => {
        for (const file of ctx.testFiles) {
          const analysis = await ctx.analyzer.analyzeFile(file);
          ctx.debugHelper.logAnalysisDetails(analysis, { includeMetrics: true });
        }
      });
      results.push(debugResult);

      // Benchmark 5: Error reporter performance
      console.log('\n📝 Testing error reporter performance...');
      const reporterResult = await this.runBenchmark('errorReporter.reportError', async (ctx) => {
        for (const file of ctx.errorFiles) {
          try {
            await ctx.analyzer.analyzeFile(file);
          } catch (error) {
            errorReporter.reportError(error as Error, {
              context: { filePath: file },
              severity: 'high',
              includeStackTrace: true
            });
          }
        }
      });
      results.push(reporterResult);

      // Benchmark 6: Batch diagnostic analysis
      console.log('\n🔄 Testing batch diagnostic analysis...');
      const batchDiagnosticResult = await this.runBenchmark('BatchAnalyzer.diagnosticAnalysis', async (ctx) => {
        await ctx.batchAnalyzer.processBatch([...ctx.testFiles, ...ctx.errorFiles], {
          continueOnError: true,
          enableDiagnostics: true
        });
      });
      results.push(batchDiagnosticResult);

      // Benchmark 7: Performance metrics collection
      console.log('\n📈 Testing performance metrics collection...');
      const metricsResult = await this.runBenchmark('PerformanceMetrics.collection', async (ctx) => {
        for (const file of ctx.testFiles) {
          await ctx.analyzer.analyzeFile(file);
          const metrics = ctx.analyzer.getPerformanceMetrics();
          ctx.diagnosticTool.analyzePerformanceMetrics(metrics);
        }
      });
      results.push(metricsResult);

      // Benchmark 8: Resource monitoring
      console.log('\n💾 Testing resource monitoring...');
      const resourceResult = await this.runBenchmark('ResourceMonitoring.collection', async (ctx) => {
        const resourceMetrics = ctx.batchAnalyzer.getResourceMetrics();
        ctx.diagnosticTool.analyzeResourceUsage(resourceMetrics);
      });
      results.push(resourceResult);

    } finally {
      await this.cleanup();
    }

    return results;
  }
}

// Utility function to format benchmark results
function formatResults(results: BenchmarkResult[]): void {
  console.log('\n📊 Diagnostic Methods Benchmark Results');
  console.log('═'.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Average Time: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min Time: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max Time: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Operations/sec: ${result.operationsPerSecond.toFixed(2)}`);
    console.log(`   Memory Usage: ${result.memoryUsage.heapUsed}MB heap, ${result.memoryUsage.external}MB external`);
    console.log(`   Iterations: ${result.iterations}`);
  });

  // Summary statistics
  const avgTime = results.reduce((sum, r) => sum + r.averageTime, 0) / results.length;
  const totalOps = results.reduce((sum, r) => sum + r.operationsPerSecond, 0);

  console.log('\n📈 Summary');
  console.log(`   Average execution time across all tests: ${avgTime.toFixed(2)}ms`);
  console.log(`   Total operations per second: ${totalOps.toFixed(2)}`);
  console.log(`   Most efficient: ${results.reduce((best, r) => r.operationsPerSecond > best.operationsPerSecond ? r : best).name}`);
  console.log(`   Slowest: ${results.reduce((slowest, r) => r.averageTime > slowest.averageTime ? r : slowest).name}`);
}

// Export for use in other scripts
export { DiagnosticBenchmark, BenchmarkResult, formatResults };

// Run benchmark if executed directly
if (require.main === module) {
  const benchmark = new DiagnosticBenchmark();
  benchmark.runAllBenchmarks()
    .then(formatResults)
    .catch(error => {
      console.error('❌ Diagnostic benchmark failed:', error);
      process.exit(1);
    });
}