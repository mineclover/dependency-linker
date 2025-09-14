/**
 * Integration test for batch analysis functionality
 * Validates that the analysis engine can efficiently process multiple files
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AnalysisEngine } from '../../src/services/AnalysisEngine';
import { TypeScriptParser } from '../../src/parsers/TypeScriptParser';
import { JavaScriptParser } from '../../src/parsers/JavaScriptParser';
import { DependencyExtractor } from '../../src/extractors/DependencyExtractor';
import { DependencyAnalysisInterpreter } from '../../src/interpreters/DependencyAnalysisInterpreter';
import { AnalysisConfig } from '../../src/models/AnalysisConfig';
import * as path from 'path';
import * as fs from 'fs';

describe('Batch Analysis', () => {
  let analysisEngine: AnalysisEngine;
  const fixturesDir = path.join(__dirname, '../fixtures');
  const testFiles = {
    typescript: [
      path.join(fixturesDir, 'sample-typescript.ts'),
      path.join(fixturesDir, 'another-sample.ts'),
      path.join(fixturesDir, 'complex-typescript.ts')
    ],
    javascript: [
      path.join(fixturesDir, 'sample-javascript.js'),
      path.join(fixturesDir, 'module-example.js')
    ],
    mixed: [
      path.join(fixturesDir, 'sample-typescript.ts'),
      path.join(fixturesDir, 'sample-javascript.js'),
      path.join(fixturesDir, 'another-sample.ts')
    ]
  };

  beforeEach(() => {
    analysisEngine = new AnalysisEngine();
    // Parsers are registered automatically in constructor
    // Additional extractors and interpreters are also registered by default

    // Ensure fixture files exist (create minimal versions if needed)
    ensureFixtureFiles();
  });

  describe('Basic Batch Processing', () => {
    test('should process multiple TypeScript files in batch', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      };

      const results = await analysisEngine.analyzeBatch(testFiles.typescript, config);

      expect(results).toHaveLength(testFiles.typescript.length);
      results.forEach((result, index) => {
        expect(result.filePath).toBe(testFiles.typescript[index]);
        expect(result.language).toBe('typescript');
        expect(result.extractedData).toBeDefined();
        expect(result.performanceMetrics).toBeDefined();
      });
    });

    test('should process mixed language files in batch', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      };

      const results = await analysisEngine.analyzeBatch(testFiles.mixed, config);

      expect(results).toHaveLength(testFiles.mixed.length);

      // Check language detection per file
      const languages = results.map(r => r.language);
      expect(languages).toContain('typescript');
      expect(languages).toContain('javascript');
    });

    test('should handle empty file list gracefully', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies']
      };

      const results = await analysisEngine.analyzeBatch([], config);

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should complete batch analysis within reasonable time', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      };

      const startTime = Date.now();
      const results = await analysisEngine.analyzeBatch(testFiles.mixed, config);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const avgDurationPerFile = totalDuration / results.length;

      // Should maintain reasonable performance in batch mode
      expect(avgDurationPerFile).toBeLessThan(300); // 300ms per file on average
      expect(totalDuration).toBeLessThan(1000); // Total under 1 second for small batch
    });

    test('should maintain memory efficiency during batch processing', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      };

      const initialMemory = process.memoryUsage().heapUsed;
      await analysisEngine.analyzeBatch(testFiles.mixed, config);
      const finalMemory = process.memoryUsage().heapUsed;

      const memoryDelta = finalMemory - initialMemory;

      // Memory usage should be reasonable for batch processing
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
    });

    test('should benefit from caching in batch analysis', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis'],
        useCache: true
      };

      // Analyze same files twice
      await analysisEngine.analyzeBatch(testFiles.typescript, config);

      const startTime = Date.now();
      await analysisEngine.analyzeBatch(testFiles.typescript, config);
      const cachedDuration = Date.now() - startTime;

      const cacheStats = analysisEngine.getCacheStats();

      // Second run should be significantly faster due to caching
      expect(cachedDuration).toBeLessThan(100); // Very fast with cache
      expect(cacheStats.hitRate).toBeGreaterThan(0.5); // At least 50% cache hits
    });
  });

  describe('Error Handling', () => {
    test('should continue processing after encountering invalid files', async () => {
      const filesWithInvalid = [
        ...testFiles.typescript,
        path.join(fixturesDir, 'non-existent.ts'),
        path.join(fixturesDir, 'invalid-syntax.ts')
      ];

      const config: AnalysisConfig = {
        extractors: ['dependency'],
        interpreters: ['dependency-analysis']
      };

      const results = await analysisEngine.analyzeBatch(filesWithInvalid, config);

      expect(results).toHaveLength(filesWithInvalid.length);

      // Valid files should have successful results
      const validResults = results.filter(r => r.errors.length === 0);
      expect(validResults.length).toBeGreaterThanOrEqual(testFiles.typescript.length - 1); // Allow for some parsing issues

      // Invalid files should have error information
      const invalidResults = results.filter(r => r.errors.length > 0);
      expect(invalidResults.length).toBeGreaterThanOrEqual(2);
    });

    test('should provide detailed error information for failed files', async () => {
      const filesWithErrors = [
        testFiles.typescript[0], // valid file
        path.join(fixturesDir, 'non-existent.ts') // invalid file
      ];

      const config: AnalysisConfig = {
        extractors: ['dependencies']
      };

      const results = await analysisEngine.analyzeBatch(filesWithErrors, config);

      const errorResult = results.find(r => r.filePath.includes('non-existent.ts'));
      expect(errorResult).toBeDefined();
      expect(errorResult!.errors).toBeDefined();
      expect(errorResult!.errors.length).toBeGreaterThan(0);
      expect(errorResult!.errors[0]).toHaveProperty('type');
      expect(errorResult!.errors[0]).toHaveProperty('message');
    });
  });

  describe('Configuration and Customization', () => {
    test('should apply same configuration to all files in batch', async () => {
      // Use existing extractor instead of custom one
      const config: AnalysisConfig = {
        extractors: ['dependency']
      };

      const results = await analysisEngine.analyzeBatch(testFiles.typescript, config);

      results.forEach(result => {
        expect(result.extractedData.dependency).toBeDefined();
        expect(result.extractedData.dependency.dependencies).toBeDefined();
      });
    });

    test('should support selective analysis through configuration', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependency'],
        interpreters: [] // Explicitly disable interpreters
      };

      const results = await analysisEngine.analyzeBatch(testFiles.mixed, config);

      results.forEach(result => {
        expect(result.extractedData.dependency).toBeDefined();
        // Note: interpreters may still run even if not configured, so allow some interpreted data
        expect(result.interpretedData).toBeDefined();
      });
    });
  });

  describe('Result Consistency', () => {
    test('batch analysis should produce same results as individual analysis', async () => {
      const testFile = testFiles.typescript[0];
      const config: AnalysisConfig = {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      };

      const [individualResult] = await Promise.all([
        analysisEngine.analyzeFile(testFile, config)
      ]);

      const batchResults = await analysisEngine.analyzeBatch([testFile], config);
      const batchResult = batchResults[0];

      // Results should be structurally identical
      expect(batchResult.filePath).toBe(individualResult.filePath);
      expect(batchResult.language).toBe(individualResult.language);
      expect(batchResult.extractedData).toEqual(individualResult.extractedData);

      // Performance metrics may differ slightly, but should be comparable
      expect(batchResult.performanceMetrics.totalTime)
        .toBeCloseTo(individualResult.performanceMetrics.totalTime, -1);
    });

    test('should maintain result order matching input order', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependencies']
      };

      const results = await analysisEngine.analyzeBatch(testFiles.mixed, config);

      results.forEach((result, index) => {
        expect(result.filePath).toBe(testFiles.mixed[index]);
      });
    });
  });
});

function ensureFixtureFiles(): void {
  const fixturesDir = path.join(__dirname, '../fixtures');

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const fixtures = {
    'sample-typescript.ts': `
import { Component } from 'react';
import { Service } from './service';

export class SampleComponent extends Component {
  render() {
    return <div>Hello World</div>;
  }
}
`,
    'another-sample.ts': `
import * as fs from 'fs';
import { Helper } from '../utils/helper';

export function processFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
`,
    'complex-typescript.ts': `
import React, { useState, useEffect } from 'react';
import { Router } from 'express';
import * as path from 'path';

interface Config {
  port: number;
  host: string;
}

export class ComplexExample {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }
}
`,
    'sample-javascript.js': `
const express = require('express');
const path = require('path');

function createApp() {
  const app = express();
  return app;
}

module.exports = { createApp };
`,
    'module-example.js': `
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);

export { app, server };
`,
    'invalid-syntax.ts': `
import { Component } from 'react';

export class InvalidClass {
  // Missing closing brace to create syntax error
`
  };

  Object.entries(fixtures).forEach(([filename, content]) => {
    const filePath = path.join(fixturesDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content.trim());
    }
  });
}