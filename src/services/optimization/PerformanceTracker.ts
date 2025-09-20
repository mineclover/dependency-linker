/**
 * PerformanceTracker service implementation (T023)
 * Tracks and compares test performance metrics
 *
 * Implements IPerformanceTracker contract from test-optimization.contract.ts
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Import from local models instead of external contract
// PerformanceBaseline, PerformanceMetrics, PerformanceComparison will be imported below

import {
  PerformanceAnalyzer,
  PerformanceBaselineBuilder,
  PerformanceTrend,
  PerformanceBaseline,
  PerformanceMetrics,
  PerformanceComparison,
  PerformanceTarget
} from '../../models/optimization/PerformanceBaseline';

export interface PerformanceTrackingOptions {
  maxRetries: number;
  retryDelay: number;         // ms between retries
  timeout: number;            // ms for test execution timeout
  warmupRuns: number;         // Number of warmup runs before measurement
  measurementRuns: number;    // Number of runs to average for final measurement
  enableMemoryProfiling: boolean;
  enableCpuProfiling: boolean;
  outputDirectory: string;    // Where to store performance data
}

export interface TestExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
}

export interface PerformanceTrendData {
  baselines: PerformanceBaseline[];
  trend: PerformanceTrend;
  predictions: PerformancePrediction[];
}

export interface PerformancePrediction {
  metric: 'executionTime' | 'passRate' | 'testCount' | 'coverage';
  currentValue: number;
  predictedValue: number;
  timeframe: '1week' | '1month' | '3months';
  confidence: number; // 0-1
}

export class PerformanceTracker {
  private options: PerformanceTrackingOptions;
  private results: TestExecutionResult[] = [];

  constructor(options: Partial<PerformanceTrackingOptions> = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 120000, // 2 minutes
      warmupRuns: 2,
      measurementRuns: 5,
      enableMemoryProfiling: true,
      enableCpuProfiling: false,
      outputDirectory: path.join(process.cwd(), '.performance-data'),
      ...options
    };

    this.ensureOutputDirectory();
  }

  async establishBaseline(testCommand: string): Promise<PerformanceBaseline> {
    if (!testCommand || typeof testCommand !== 'string') {
      throw new Error('Test command is required and must be a string');
    }

    console.log('📊 Establishing performance baseline...');

    try {
      // Perform warmup runs
      console.log(`🔥 Running ${this.options.warmupRuns} warmup runs...`);
      for (let i = 0; i < this.options.warmupRuns; i++) {
        await this.executeTestCommand(testCommand, false); // Don't store warmup results
      }

      // Perform measurement runs
      console.log(`📏 Running ${this.options.measurementRuns} measurement runs...`);
      const measurements: TestExecutionResult[] = [];

      for (let i = 0; i < this.options.measurementRuns; i++) {
        const result = await this.executeTestCommand(testCommand, true);
        measurements.push(result);
        console.log(`  Run ${i + 1}/${this.options.measurementRuns}: ${result.executionTime.toFixed(2)}ms`);
      }

      // Calculate averages
      const avgExecutionTime = measurements.reduce((sum, r) => sum + r.executionTime, 0) / measurements.length;
      const avgMemoryUsage = measurements.reduce((sum, r) => sum + r.memoryUsage, 0) / measurements.length;

      // Parse test results from output
      const lastResult = measurements[measurements.length - 1];
      const testMetrics = this.parseTestOutput(lastResult.stdout, lastResult.stderr);

      // Detect issues
      const workerIssues = measurements.some(r =>
        r.stderr.includes('worker exited') ||
        r.stderr.includes('worker process has failed')
      );

      const parserWarnings = this.countParserWarnings(measurements.map(r => r.stderr).join('\n'));

      // Build baseline
      const baseline = new PerformanceBaselineBuilder()
        .withExecutionTime(avgExecutionTime)
        .withTestCounts(testMetrics.totalTests, testMetrics.failedTests, testMetrics.failedSuites)
        .withCoverage(testMetrics.coveragePercentage)
        .withMemoryUsage(avgMemoryUsage / 1024 / 1024) // Convert to MB
        .withIssues(workerIssues, parserWarnings)
        .withEnvironment({
          nodeVersion: process.version,
          jestVersion: this.getJestVersion(),
          platform: process.platform,
          arch: process.arch
        })
        .withMetadata({
          measurementDuration: Date.now() - measurements[0].timestamp.getTime(),
          retries: 0,
          confidence: this.calculateConfidence(measurements),
          notes: `Baseline established with ${measurements.length} measurement runs`,
          gitCommit: this.getCurrentGitCommit(),
          branch: this.getCurrentGitBranch()
        })
        .build();

      // Save baseline
      await this.saveBaseline(baseline);

      console.log('✅ Performance baseline established');
      this.logBaselineSummary(baseline);

      return baseline;

    } catch (error) {
      console.error('❌ Failed to establish baseline:', error);
      throw new Error(`Failed to establish baseline: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async measureCurrent(testCommand: string): Promise<PerformanceMetrics> {
    if (!testCommand || typeof testCommand !== 'string') {
      throw new Error('Test command is required and must be a string');
    }

    console.log('📊 Measuring current performance...');

    try {
      // Single measurement run (no warmup needed for current measurement)
      const result = await this.executeTestCommand(testCommand, true);
      const testMetrics = this.parseTestOutput(result.stdout, result.stderr);

      const metrics: PerformanceMetrics = {
        executionTime: result.executionTime,
        testCount: testMetrics.totalTests,
        passRate: testMetrics.passRate,
        coveragePercentage: testMetrics.coveragePercentage,
        memoryUsage: result.memoryUsage / 1024 / 1024, // Convert to MB
        failureRate: testMetrics.totalTests > 0 ? testMetrics.failedTests / testMetrics.totalTests : 0,
        timestamp: new Date()
      };

      console.log('✅ Current performance measured');
      this.logMetricsSummary(metrics);

      return metrics;

    } catch (error) {
      console.error('❌ Failed to measure current performance:', error);
      throw new Error(`Failed to measure current performance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  comparePerformance(
    baseline: PerformanceBaseline,
    current: PerformanceMetrics
  ): PerformanceComparison {
    if (!baseline) {
      throw new Error('Baseline is required for performance comparison');
    }

    if (!current) {
      throw new Error('Current metrics are required for performance comparison');
    }

    console.log('📊 Comparing performance...');

    const comparison = PerformanceAnalyzer.comparePerformance(baseline, current);

    console.log('✅ Performance comparison completed');
    this.logComparisonSummary(comparison);

    return comparison;
  }

  // Extended functionality beyond the contract
  async trackPerformanceTrend(testCommand: string, days: number = 7): Promise<PerformanceTrendData> {
    console.log(`📈 Tracking performance trend over ${days} days...`);

    const baselines = await this.loadHistoricalBaselines(days);

    if (baselines.length < 2) {
      throw new Error(`Insufficient data for trend analysis. Found ${baselines.length} baselines, need at least 2`);
    }

    const trend = PerformanceAnalyzer.trackTrends(baselines);
    const predictions = this.generatePredictions(baselines);

    return {
      baselines,
      trend,
      predictions
    };
  }

  async runPerformanceRegression(
    testCommand: string,
    baselineId?: string
  ): Promise<PerformanceComparison> {
    console.log('🔍 Running performance regression analysis...');

    // Load baseline (specific or latest)
    const baseline = baselineId
      ? await this.loadBaseline(baselineId)
      : await this.loadLatestBaseline();

    if (!baseline) {
      throw new Error('No baseline found for regression analysis');
    }

    // Measure current performance
    const current = await this.measureCurrent(testCommand);

    // Compare and detect regressions
    const comparison = this.comparePerformance(baseline, current);

    // Check for significant regressions
    const regressionThresholds = {
      executionTime: -20, // 20% slower is a regression
      passRate: -2,       // 2% lower pass rate is a regression
      coverage: -5        // 5% coverage loss is a regression
    };

    if (comparison.timeImprovement < regressionThresholds.executionTime ||
        comparison.reliabilityChange < regressionThresholds.passRate ||
        comparison.coverageChange < regressionThresholds.coverage) {

      console.log('🚨 Performance regression detected!');
      this.logRegressionDetails(comparison, regressionThresholds);
    } else {
      console.log('✅ No significant performance regression detected');
    }

    return comparison;
  }

  private async executeTestCommand(command: string, storeResult: boolean = true): Promise<TestExecutionResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Test command timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      let stdout = '';
      let stderr = '';

      try {
        // Use execSync for simpler implementation, but in production you'd want streaming
        const result = execSync(command, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: this.options.timeout
        });

        clearTimeout(timeoutHandle);

        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        const executionResult: TestExecutionResult = {
          command,
          exitCode: 0,
          stdout: result,
          stderr: '',
          executionTime: endTime - startTime,
          memoryUsage: endMemory - startMemory,
          cpuUsage: 0, // Would need more sophisticated CPU monitoring
          timestamp: new Date(startTime)
        };

        if (storeResult) {
          this.results.push(executionResult);
        }

        resolve(executionResult);

      } catch (error: any) {
        clearTimeout(timeoutHandle);

        const endTime = Date.now();

        const executionResult: TestExecutionResult = {
          command,
          exitCode: error.status || 1,
          stdout: error.stdout || '',
          stderr: error.stderr || error.message,
          executionTime: endTime - startTime,
          memoryUsage: 0,
          cpuUsage: 0,
          timestamp: new Date(startTime)
        };

        if (storeResult) {
          this.results.push(executionResult);
        }

        resolve(executionResult); // Don't reject, let caller handle non-zero exit codes
      }
    });
  }

  private parseTestOutput(stdout: string, stderr: string): {
    totalTests: number;
    failedTests: number;
    failedSuites: number;
    passRate: number;
    coveragePercentage: number;
  } {
    const output = stdout + '\n' + stderr;

    // Parse Jest output patterns
    let totalTests = 0;
    let failedTests = 0;
    let failedSuites = 0;
    let coveragePercentage = 0;

    // Match test summary: "Tests: 286 passed, 23 failed, 309 total"
    const testMatch = output.match(/Tests:\s+(?:(\d+)\s+passed)?(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?(?:,\s+(\d+)\s+total)?/);
    if (testMatch) {
      const passed = parseInt(testMatch[1] || '0', 10);
      failedTests = parseInt(testMatch[2] || '0', 10);
      totalTests = parseInt(testMatch[4] || (passed + failedTests).toString(), 10);
    }

    // Match test suites: "Test Suites: 2 failed, 43 passed, 45 total"
    const suiteMatch = output.match(/Test Suites:\s+(?:(\d+)\s+failed,\s+)?(\d+)\s+passed/);
    if (suiteMatch) {
      failedSuites = parseInt(suiteMatch[1] || '0', 10);
    }

    // Match coverage: "All files      |   85.42 |"
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    if (coverageMatch) {
      coveragePercentage = parseFloat(coverageMatch[1]);
    }

    const passRate = totalTests > 0 ? ((totalTests - failedTests) / totalTests) * 100 : 0;

    return {
      totalTests,
      failedTests,
      failedSuites,
      passRate,
      coveragePercentage
    };
  }

  private countParserWarnings(stderr: string): number {
    const warningPatterns = [
      /parser.*already registered/gi,
      /duplicate.*parser/gi,
      /parser.*registration.*warning/gi
    ];

    let count = 0;
    for (const pattern of warningPatterns) {
      const matches = stderr.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  private calculateConfidence(measurements: TestExecutionResult[]): number {
    if (measurements.length < 2) return 0.5;

    // Calculate coefficient of variation for execution time
    const times = measurements.map(m => m.executionTime);
    const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Convert CV to confidence (lower variation = higher confidence)
    return Math.max(0.1, Math.min(1.0, 1 - cv));
  }

  private getJestVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      return packageJson.dependencies?.jest || packageJson.devDependencies?.jest || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getCurrentGitCommit(): string | undefined {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }

  private getCurrentGitBranch(): string | undefined {
    try {
      return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    } catch {
      return undefined;
    }
  }

  private async saveBaseline(baseline: PerformanceBaseline): Promise<void> {
    const fileName = `baseline-${baseline.timestamp.toISOString().split('T')[0]}.json`;
    const filePath = path.join(this.options.outputDirectory, fileName);

    fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2), 'utf-8');

    // Also save as latest baseline
    const latestPath = path.join(this.options.outputDirectory, 'latest-baseline.json');
    fs.writeFileSync(latestPath, JSON.stringify(baseline, null, 2), 'utf-8');
  }

  private async loadBaseline(id: string): Promise<PerformanceBaseline | null> {
    const filePath = path.join(this.options.outputDirectory, `baseline-${id}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async loadLatestBaseline(): Promise<PerformanceBaseline | null> {
    const latestPath = path.join(this.options.outputDirectory, 'latest-baseline.json');

    if (!fs.existsSync(latestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(latestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async loadHistoricalBaselines(days: number): Promise<PerformanceBaseline[]> {
    const baselines: PerformanceBaseline[] = [];
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    if (!fs.existsSync(this.options.outputDirectory)) {
      return baselines;
    }

    const files = fs.readdirSync(this.options.outputDirectory)
      .filter(file => file.startsWith('baseline-') && file.endsWith('.json'))
      .sort();

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.options.outputDirectory, file), 'utf-8');
        const baseline: PerformanceBaseline = JSON.parse(content);

        if (new Date(baseline.timestamp) >= cutoffDate) {
          baselines.push(baseline);
        }
      } catch {
        // Skip invalid files
      }
    }

    return baselines;
  }

  private generatePredictions(baselines: PerformanceBaseline[]): PerformancePrediction[] {
    // Simple linear regression for predictions
    const predictions: PerformancePrediction[] = [];

    if (baselines.length < 3) {
      return predictions; // Need at least 3 points for meaningful prediction
    }

    // Predict execution time trend
    const times = baselines.map(b => b.totalExecutionTime);
    const timeSlope = this.calculateSlope(times);

    predictions.push({
      metric: 'executionTime',
      currentValue: times[times.length - 1],
      predictedValue: times[times.length - 1] + (timeSlope * 7), // 1 week ahead
      timeframe: '1week',
      confidence: 0.7
    });

    // Predict pass rate trend
    const passRates = baselines.map(b => b.passRate);
    const passRateSlope = this.calculateSlope(passRates);

    predictions.push({
      metric: 'passRate',
      currentValue: passRates[passRates.length - 1],
      predictedValue: passRates[passRates.length - 1] + (passRateSlope * 7),
      timeframe: '1week',
      confidence: 0.6
    });

    return predictions;
  }

  private calculateSlope(values: number[]): number {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // sum of squares

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.options.outputDirectory)) {
      fs.mkdirSync(this.options.outputDirectory, { recursive: true });
    }
  }

  private logBaselineSummary(baseline: PerformanceBaseline): void {
    console.log(`📊 Baseline Summary:`);
    console.log(`   Execution Time: ${baseline.totalExecutionTime.toFixed(2)}ms`);
    console.log(`   Total Tests: ${baseline.totalTests}`);
    console.log(`   Pass Rate: ${baseline.passRate.toFixed(1)}%`);
    console.log(`   Coverage: ${baseline.coveragePercentage.toFixed(1)}%`);
    console.log(`   Memory: ${baseline.memoryUsage.toFixed(1)}MB`);
    console.log(`   Worker Issues: ${baseline.workerIssues ? 'Yes' : 'No'}`);
    console.log(`   Parser Warnings: ${baseline.parserWarnings}`);
  }

  private logMetricsSummary(metrics: PerformanceMetrics): void {
    console.log(`📊 Current Metrics:`);
    console.log(`   Execution Time: ${metrics.executionTime.toFixed(2)}ms`);
    console.log(`   Test Count: ${metrics.testCount}`);
    console.log(`   Pass Rate: ${metrics.passRate.toFixed(1)}%`);
    console.log(`   Coverage: ${metrics.coveragePercentage.toFixed(1)}%`);
    console.log(`   Memory: ${metrics.memoryUsage.toFixed(1)}MB`);
  }

  private logComparisonSummary(comparison: PerformanceComparison): void {
    console.log(`📊 Performance Comparison:`);
    console.log(`   Time Improvement: ${comparison.timeImprovement.toFixed(1)}%`);
    console.log(`   Test Reduction: ${comparison.testReduction}`);
    console.log(`   Reliability Change: ${comparison.reliabilityChange.toFixed(1)}%`);
    console.log(`   Coverage Change: ${comparison.coverageChange.toFixed(1)}%`);
    console.log(`   Meets Targets: ${comparison.meetsTargets ? 'Yes' : 'No'}`);
  }

  private logRegressionDetails(comparison: PerformanceComparison, thresholds: any): void {
    console.log(`🚨 Regression Details:`);
    if (comparison.timeImprovement < thresholds.executionTime) {
      console.log(`   ❌ Execution time regression: ${comparison.timeImprovement.toFixed(1)}% (threshold: ${thresholds.executionTime}%)`);
    }
    if (comparison.reliabilityChange < thresholds.passRate) {
      console.log(`   ❌ Pass rate regression: ${comparison.reliabilityChange.toFixed(1)}% (threshold: ${thresholds.passRate}%)`);
    }
    if (comparison.coverageChange < thresholds.coverage) {
      console.log(`   ❌ Coverage regression: ${comparison.coverageChange.toFixed(1)}% (threshold: ${thresholds.coverage}%)`);
    }
  }

  // Getters for debugging and analysis
  getExecutionResults(): TestExecutionResult[] {
    return [...this.results];
  }

  getOptions(): PerformanceTrackingOptions {
    return { ...this.options };
  }
}