/**
 * Integration test for performance benchmarks
 * Validates that the analysis engine meets performance targets
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createDefaultAnalysisEngine } from '../../src/lib/factory';
import { AnalysisConfig, AnalysisConfigUtils } from '../../src/models/AnalysisConfig';
import type { AnalysisEngine } from '../../src/services/AnalysisEngine';
import * as fs from 'fs';
import * as path from 'path';

describe('Performance Benchmarks', () => {
  let analysisEngine: AnalysisEngine;
  const testFiles = {
    small: path.join(__dirname, '../fixtures/small-file.ts'),
    medium: path.join(__dirname, '../fixtures/medium-file.ts'),
    large: path.join(__dirname, '../fixtures/large-file.ts')
  };

  beforeEach(() => {
    analysisEngine = createDefaultAnalysisEngine();
  });

  test('single file analysis should complete within performance targets', async () => {
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const startTime = Date.now();
    const result = await analysisEngine.analyzeFile(testFiles.medium, config);
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Performance target: <200ms per file
    expect(duration).toBeLessThan(200);
    expect(result.performanceMetrics.totalTime).toBeLessThan(200);
    expect(result.performanceMetrics.parseTime).toBeLessThan(100);
    expect(result.performanceMetrics.extractionTime).toBeLessThan(50);
    expect(result.performanceMetrics.interpretationTime).toBeLessThan(50);
  });

  test('memory usage should stay within limits', async () => {
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const initialMemory = process.memoryUsage().heapUsed;
    const result = await analysisEngine.analyzeFile(testFiles.large, config);
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryDelta = finalMemory - initialMemory;

    // Memory target: <100MB per session
    expect(memoryDelta).toBeLessThan(100 * 1024 * 1024);
    expect(result.performanceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024);
  });

  test('batch analysis should scale linearly', async () => {
    const files = [testFiles.small, testFiles.medium];
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const startTime = Date.now();
    const results = await analysisEngine.analyzeBatch(files, config);
    const endTime = Date.now();

    const totalDuration = endTime - startTime;
    const avgDurationPerFile = totalDuration / files.length;

    // Should maintain per-file performance in batch mode
    expect(avgDurationPerFile).toBeLessThan(250); // Allow some overhead
    expect(results).toHaveLength(files.length);
    results.forEach(result => {
      expect(result.performanceMetrics.totalTime).toBeLessThan(300);
    });
  });

  test('cache hit rate should meet targets', async () => {
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis'],
      cache: { enabled: true }
    });

    // First analysis - cache miss
    await analysisEngine.analyzeFile(testFiles.medium, config);

    // Second analysis - should hit cache
    await analysisEngine.analyzeFile(testFiles.medium, config);

    const cacheStats = analysisEngine.getCacheStats();

    // Cache hit rate target: >80%
    expect(cacheStats.hitRate).toBeGreaterThan(0.8);
  });

  test('concurrent analysis should maintain performance', async () => {
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const concurrentAnalyses = [
      analysisEngine.analyzeFile(testFiles.small, config),
      analysisEngine.analyzeFile(testFiles.medium, config),
      analysisEngine.analyzeFile(testFiles.small, config)
    ];

    const startTime = Date.now();
    const results = await Promise.all(concurrentAnalyses);
    const endTime = Date.now();

    const totalDuration = endTime - startTime;

    // Should complete concurrent analyses efficiently
    expect(totalDuration).toBeLessThan(500);
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.performanceMetrics.totalTime).toBeLessThan(200);
    });
  });

  test('large file analysis should remain performant', async () => {
    // Create a large test file if it doesn't exist
    if (!fs.existsSync(testFiles.large)) {
      const largeContent = generateLargeTypeScriptFile(1000); // 1000 lines
      fs.writeFileSync(testFiles.large, largeContent);
    }

    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const startTime = Date.now();
    const result = await analysisEngine.analyzeFile(testFiles.large, config);
    const endTime = Date.now();

    const duration = endTime - startTime;

    // Large files should still complete within reasonable time
    expect(duration).toBeLessThan(1000); // 1 second for large files
    expect(result.performanceMetrics.totalTime).toBeLessThan(1000);
  });
});

function generateLargeTypeScriptFile(lines: number): string {
  const imports = [
    "import { Component } from 'react';",
    "import { Service } from './service';",
    "import { Helper } from '../utils/helper';",
    "import * as Constants from './constants';"
  ];

  const classContent = [];
  for (let i = 0; i < lines - 10; i++) {
    classContent.push(`  method${i}(): void {`);
    classContent.push(`    console.log('Method ${i}');`);
    classContent.push(`    return;`);
    classContent.push(`  }`);
  }

  return [
    ...imports,
    '',
    'export class LargeTestClass {',
    ...classContent,
    '}',
    ''
  ].join('\n');
}