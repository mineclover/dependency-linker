/**
 * Batch Analysis Integration Test
 * Tests batch processing capabilities, parallel execution,
 * and performance optimization for multiple file analysis
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { AnalysisEngine } from '../../src/services/AnalysisEngine';
import type { AnalysisConfig } from '../../src/models/AnalysisConfig';
import type { AnalysisResult } from '../../src/models/AnalysisResult';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Test data for batch processing
const TEST_FILES = [
  'tests/fixtures/sample-typescript.ts',
  'tests/fixtures/another-sample.ts',
  'tests/fixtures/complex-typescript.ts'
];

const LARGE_BATCH_FILES = Array.from({ length: 20 }, (_, i) =>
  `tests/fixtures/sample-typescript.ts` // Reusing same file for consistent testing
);

describe('Batch Analysis Integration', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Basic Batch Processing', () => {
    test('should process multiple files in batch', async () => {
      const results = await engine.analyzeBatch(TEST_FILES);

      expect(results).toHaveLength(TEST_FILES.length);
      expect(results.every(r => r.filePath)).toBe(true);
      expect(results.every(r => r.language === 'typescript')).toBe(true);
      expect(results.every(r => r.errors.length === 0)).toBe(true);

      // Each result should have proper structure
      for (const result of results) {
        expect(result.extractedData).toBeDefined();
        expect(result.interpretedData).toBeDefined();
        expect(result.performanceMetrics).toBeDefined();
        expect(result.metadata).toBeDefined();
      }
    });

    test('should handle empty batch gracefully', async () => {
      const results = await engine.analyzeBatch([]);
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should process single file in batch', async () => {
      const results = await engine.analyzeBatch([TEST_FILES[0]]);

      expect(results).toHaveLength(1);
      expect(results[0].filePath).toBe(TEST_FILES[0]);
      expect(results[0].errors.length).toBe(0);
    });

    test('should maintain file order in results', async () => {
      const orderedFiles = [...TEST_FILES].sort();
      const results = await engine.analyzeBatch(orderedFiles);

      expect(results).toHaveLength(orderedFiles.length);

      for (let i = 0; i < results.length; i++) {
        expect(results[i].filePath).toBe(orderedFiles[i]);
      }
    });
  });

  describe('Batch Configuration', () => {
    test('should apply configuration to all files in batch', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependency', 'identifier'],
        interpreters: ['dependency-analysis'],
        useCache: false
      };

      const results = await engine.analyzeBatch(TEST_FILES, config);

      for (const result of results) {
        expect(result.metadata.extractorsUsed).toEqual(config.extractors);
        expect(result.metadata.interpretersUsed).toEqual(config.interpreters);
        expect(result.metadata.fromCache).toBe(false);

        // Should have data from specified extractors
        expect(result.extractedData.dependency).toBeDefined();
        expect(result.extractedData.identifier).toBeDefined();

        // Should have data from specified interpreters
        expect(result.interpretedData['dependency-analysis']).toBeDefined();
      }
    });

    test('should handle different configurations per file type', async () => {
      // Create a custom config that adapts based on file
      const results = await engine.analyzeBatch(TEST_FILES, {
        extractors: ['dependency', 'complexity'],
        interpreters: ['dependency-analysis']
      });

      // All TypeScript files should be analyzed with the same config
      for (const result of results) {
        expect(result.language).toBe('typescript');
        expect(result.extractedData.dependency).toBeDefined();
        expect(result.extractedData.complexity).toBeDefined();
      }
    });
  });

  describe('Error Handling in Batches', () => {
    test('should handle mix of valid and invalid files', async () => {
      const mixedFiles = [
        ...TEST_FILES,
        'non-existent-file.ts',
        'tests/fixtures/invalid-syntax.ts'
      ];

      const results = await engine.analyzeBatch(mixedFiles);

      expect(results).toHaveLength(mixedFiles.length);

      // Valid files should succeed
      const validResults = results.slice(0, TEST_FILES.length);
      for (const result of validResults) {
        expect(result.errors.length).toBe(0);
      }

      // Invalid files should have errors but still return results
      const invalidResults = results.slice(TEST_FILES.length);
      for (const result of invalidResults) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('should continue processing after individual file failures', async () => {
      const filesWithFailures = [
        TEST_FILES[0],
        'non-existent-file.ts',
        TEST_FILES[1],
        'another-non-existent.ts',
        TEST_FILES[2]
      ];

      const results = await engine.analyzeBatch(filesWithFailures);

      expect(results).toHaveLength(filesWithFailures.length);

      // Should have processed all files despite failures
      expect(results[0].errors.length).toBe(0); // Valid
      expect(results[1].errors.length).toBeGreaterThan(0); // Invalid
      expect(results[2].errors.length).toBe(0); // Valid
      expect(results[3].errors.length).toBeGreaterThan(0); // Invalid
      expect(results[4].errors.length).toBe(0); // Valid
    });

    test('should handle extractor failures in batch processing', async () => {
      // Register a failing extractor
      class FailingExtractor {
        extract(): any {
          throw new Error('Simulated extractor failure');
        }
        supports(): boolean { return true; }
        getName(): string { return 'failing-extractor'; }
        getVersion(): string { return '1.0.0'; }

        validate(data: any): any {
          return { isValid: true, errors: [], warnings: [] };
        }

        getMetadata(): any {
          return {
            name: this.getName(),
            version: this.getVersion(),
            description: 'Failing test extractor',
            supportedLanguages: ['typescript', 'javascript'],
            capabilities: {
              supportsStreaming: false,
              supportsPartialResults: false,
              maxFileSize: 1000000,
              estimatedMemoryUsage: 1000,
              processingTime: 'fast'
            }
          };
        }

        configure(options: any): void {
          // Configuration logic
        }

        getConfiguration(): any {
          return {};
        }

        getOutputSchema(): any {
          return {
            type: 'object',
            properties: {
              failed: { type: 'boolean' }
            }
          };
        }

        dispose(): void {
          // Cleanup logic
        }
      }

      engine.registerExtractor('failing', new FailingExtractor());

      const results = await engine.analyzeBatch(TEST_FILES, {
        extractors: ['dependency', 'failing']
      });

      // All files should be processed despite extractor failure
      expect(results).toHaveLength(TEST_FILES.length);

      for (const result of results) {
        // Should have errors due to failing extractor
        expect(result.errors.length).toBeGreaterThan(0);

        // But other extractors should still work
        expect(result.extractedData.dependency).toBeDefined();
      }
    });
  });

  describe('Performance Optimization', () => {
    test('should demonstrate performance benefits of batching', async () => {
      // Compare individual vs batch processing
      const individualStart = Date.now();
      const individualResults: AnalysisResult[] = [];
      for (const file of TEST_FILES) {
        const result = await engine.analyzeFile(file);
        individualResults.push(result);
      }
      const individualTime = Date.now() - individualStart;

      // Reset engine to clear cache
      engine = new AnalysisEngine();

      const batchStart = Date.now();
      const batchResults = await engine.analyzeBatch(TEST_FILES);
      const batchTime = Date.now() - batchStart;

      expect(individualResults).toHaveLength(TEST_FILES.length);
      expect(batchResults).toHaveLength(TEST_FILES.length);

      // Batch should be reasonably efficient (allow some overhead for batching logic)
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.2); // 20% overhead allowance
    });

    test('should scale efficiently with increasing batch size', async () => {
      const smallBatch = TEST_FILES;
      const largeBatch = LARGE_BATCH_FILES;

      // Small batch timing
      const smallStart = Date.now();
      const smallResults = await engine.analyzeBatch(smallBatch);
      const smallTime = Date.now() - smallStart;

      // Reset cache for fair comparison
      engine.clearCache();

      // Large batch timing
      const largeStart = Date.now();
      const largeResults = await engine.analyzeBatch(largeBatch);
      const largeTime = Date.now() - largeStart;

      expect(smallResults).toHaveLength(smallBatch.length);
      expect(largeResults).toHaveLength(largeBatch.length);

      // Time per file should be reasonable
      const smallTimePerFile = smallTime / smallBatch.length;
      const largeTimePerFile = largeTime / largeBatch.length;

      // Large batch should benefit from caching and optimizations
      expect(largeTimePerFile).toBeLessThanOrEqual(smallTimePerFile * 1.1); // Allow 10% variation
    });

    test('should benefit from caching in batch processing', async () => {
      // Process same files multiple times to test cache benefits
      const files = Array.from({ length: 10 }, () => TEST_FILES[0]); // Same file repeated

      const firstBatchStart = Date.now();
      const firstResults = await engine.analyzeBatch(files);
      const firstBatchTime = Date.now() - firstBatchStart;

      const secondBatchStart = Date.now();
      const secondResults = await engine.analyzeBatch(files);
      const secondBatchTime = Date.now() - secondBatchStart;

      expect(firstResults).toHaveLength(files.length);
      expect(secondResults).toHaveLength(files.length);

      // Second batch should be significantly faster due to caching
      expect(secondBatchTime).toBeLessThan(firstBatchTime * 0.5);

      // Cache stats should show high hit rate
      const cacheStats = engine.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(0.8);
    });
  });

  describe('Memory Management in Batches', () => {
    test('should maintain reasonable memory usage during large batches', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process a large batch
      await engine.analyzeBatch(LARGE_BATCH_FILES);

      const afterBatchMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterBatchMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should clean up memory after batch completion', async () => {
      const beforeBatch = process.memoryUsage().heapUsed;

      // Process multiple batches
      for (let i = 0; i < 3; i++) {
        await engine.analyzeBatch(TEST_FILES);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterBatches = process.memoryUsage().heapUsed;
      const memoryGrowth = afterBatches - beforeBatch;

      // Memory growth should be controlled
      expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024); // 30MB limit
    });
  });

  describe('Batch Analysis Reporting', () => {
    test('should provide batch-level performance metrics', async () => {
      const results = await engine.analyzeBatch(TEST_FILES);

      // Check individual performance metrics
      for (const result of results) {
        expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);
        expect(result.performanceMetrics.parseTime).toBeGreaterThan(0);
      }

      // Check engine-level metrics
      const engineMetrics = engine.getPerformanceMetrics();
      expect(engineMetrics.totalAnalyses).toBe(TEST_FILES.length);
      expect(engineMetrics.successfulAnalyses).toBe(TEST_FILES.length);
      expect(engineMetrics.failedAnalyses).toBe(0);
    });

    test('should aggregate batch results effectively', async () => {
      const results = await engine.analyzeBatch(TEST_FILES, {
        extractors: ['dependency', 'identifier'],
        interpreters: ['dependency-analysis']
      });

      // Aggregate dependency information across all files
      const allDependencies = results.flatMap(r =>
        r.extractedData.dependency?.dependencies || []
      );

      const allIdentifiers = results.flatMap(r =>
        r.extractedData.identifier?.identifiers || []
      );

      expect(allDependencies.length).toBeGreaterThan(0);
      expect(allIdentifiers.length).toBeGreaterThan(0);

      // Calculate batch statistics
      const totalAnalysisTime = results.reduce((sum, r) =>
        sum + r.performanceMetrics.totalTime, 0
      );

      const averageAnalysisTime = totalAnalysisTime / results.length;
      expect(averageAnalysisTime).toBeGreaterThan(0);
      expect(averageAnalysisTime).toBeLessThan(1000); // Should be under 1 second on average
    });

    test('should provide batch summary information', async () => {
      const files = [
        ...TEST_FILES,
        'non-existent.ts' // Include a failure case
      ];

      const results = await engine.analyzeBatch(files);

      // Calculate batch summary
      const summary = {
        total: results.length,
        successful: results.filter(r => r.errors.length === 0).length,
        failed: results.filter(r => r.errors.length > 0).length,
        languages: [...new Set(results.map(r => r.language))],
        totalTime: results.reduce((sum, r) => sum + r.performanceMetrics.totalTime, 0),
        averageTime: 0
      };

      summary.averageTime = summary.totalTime / summary.total;

      expect(summary.total).toBe(files.length);
      expect(summary.successful).toBe(TEST_FILES.length);
      expect(summary.failed).toBe(1);
      expect(summary.languages).toContain('typescript');
      expect(summary.averageTime).toBeGreaterThan(0);
    });
  });

  describe('Advanced Batch Scenarios', () => {
    test('should handle mixed file types in batch', async () => {
      // Create test files of different types if they exist
      const mixedFiles = TEST_FILES; // All TypeScript for this test

      const results = await engine.analyzeBatch(mixedFiles);

      expect(results).toHaveLength(mixedFiles.length);

      // Group by language
      const byLanguage = results.reduce((groups, result) => {
        const lang = result.language;
        if (!groups[lang]) groups[lang] = [];
        groups[lang].push(result);
        return groups;
      }, {} as Record<string, AnalysisResult[]>);

      // Should handle TypeScript files
      expect(byLanguage.typescript).toBeDefined();
      expect(byLanguage.typescript.length).toBeGreaterThan(0);
    });

    test('should support custom batch processing strategies', async () => {
      // Create a custom batch configuration
      const customConfig: AnalysisConfig = {
        extractors: ['dependency', 'identifier', 'complexity'],
        interpreters: ['dependency-analysis', 'identifier-analysis'],
        useCache: true
      };

      const results = await engine.analyzeBatch(TEST_FILES, customConfig);

      for (const result of results) {
        // Should have all requested extractors
        expect(result.extractedData.dependency).toBeDefined();
        expect(result.extractedData.identifier).toBeDefined();
        expect(result.extractedData.complexity).toBeDefined();

        // Should have all requested interpreters
        expect(result.interpretedData['dependency-analysis']).toBeDefined();
        expect(result.interpretedData['identifier-analysis']).toBeDefined();

        // Should preserve configuration
        expect(result.metadata.config).toBeDefined();
      }
    });

    test('should handle concurrent batch requests', async () => {
      // Simulate concurrent batch processing requests
      const batch1Promise = engine.analyzeBatch(TEST_FILES.slice(0, 2));
      const batch2Promise = engine.analyzeBatch(TEST_FILES.slice(1, 3));

      const [batch1Results, batch2Results] = await Promise.all([
        batch1Promise,
        batch2Promise
      ]);

      expect(batch1Results).toHaveLength(2);
      expect(batch2Results).toHaveLength(2);

      // Both batches should complete successfully
      expect(batch1Results.every(r => r.errors.length === 0)).toBe(true);
      expect(batch2Results.every(r => r.errors.length === 0)).toBe(true);

      // Should benefit from caching for overlapping files
      const cacheStats = engine.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Batch Validation and Quality Assurance', () => {
    test('should validate all results in batch have consistent structure', async () => {
      const results = await engine.analyzeBatch(TEST_FILES);

      // All results should have the same structure
      const requiredFields = ['filePath', 'language', 'extractedData', 'interpretedData', 'performanceMetrics', 'errors', 'metadata'];

      for (const result of results) {
        for (const field of requiredFields) {
          expect(result).toHaveProperty(field);
        }
      }

      // Metadata should be consistent
      for (const result of results) {
        expect(result.metadata.version).toBeDefined();
        expect(result.metadata.timestamp).toBeInstanceOf(Date);
        expect(typeof result.metadata.fromCache).toBe('boolean');
      }
    });

    test('should maintain data integrity across batch processing', async () => {
      const results = await engine.analyzeBatch(TEST_FILES);

      for (const result of results) {
        // Performance metrics should be consistent
        expect(result.performanceMetrics.totalTime).toBeGreaterThanOrEqual(
          result.performanceMetrics.parseTime +
          result.performanceMetrics.extractionTime +
          result.performanceMetrics.interpretationTime - 1 // Allow for 1ms rounding error
        );

        // File path should match requested file
        expect(TEST_FILES).toContain(result.filePath);

        // Language detection should be consistent
        expect(result.language).toBe('typescript');
      }
    });

    test('should provide consistent error reporting across batch', async () => {
      const validFiles = TEST_FILES;
      const invalidFiles = ['non-existent.ts', 'another-missing.ts'];
      const allFiles = [...validFiles, ...invalidFiles];

      const results = await engine.analyzeBatch(allFiles);

      // Valid files should have no errors
      const validResults = results.slice(0, validFiles.length);
      for (const result of validResults) {
        expect(result.errors).toHaveLength(0);
      }

      // Invalid files should have consistent error structure
      const invalidResults = results.slice(validFiles.length);
      for (const result of invalidResults) {
        expect(result.errors.length).toBeGreaterThan(0);

        for (const error of result.errors) {
          expect(error.type).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.type).toBe('string');
          expect(typeof error.message).toBe('string');
        }
      }
    });
  });
});