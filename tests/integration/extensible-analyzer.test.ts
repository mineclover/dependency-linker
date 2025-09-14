/**
 * Integration test for extensible analyzer functionality
 * Validates that the analysis engine properly supports extensibility through plugins
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AnalysisEngine } from '../../src/services/AnalysisEngine';
import { TypeScriptParser } from '../../src/parsers/TypeScriptParser';
import { GoParser } from '../../src/parsers/GoParser';
import { JavaParser } from '../../src/parsers/JavaParser';
import { AnalysisConfig } from '../../src/models/AnalysisConfig';
import { IDataExtractor } from '../../src/extractors/IDataExtractor';
import { IDataInterpreter } from '../../src/interpreters/IDataInterpreter';
import * as path from 'path';

describe('Extensible Analyzer', () => {
  let analysisEngine: AnalysisEngine;

  beforeEach(() => {
    analysisEngine = new AnalysisEngine();

    // Register multiple language parsers
    analysisEngine.registerParser('typescript', new TypeScriptParser());
    analysisEngine.registerParser('go', new GoParser());
    analysisEngine.registerParser('java', new JavaParser());
  });

  describe('Multi-Language Parser Extension', () => {
    test('should support TypeScript file analysis', async () => {
      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({ extractors: ['dependencies'] });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.language).toBe('typescript');
      expect(result.extractedData).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    test('should support Go file analysis', async () => {
      const testFile = path.join(__dirname, '../fixtures/sample-go.go');
      const config = new AnalysisConfig({ extractors: ['dependencies'] });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.language).toBe('go');
      expect(result.extractedData).toBeDefined();
    });

    test('should support Java file analysis', async () => {
      const testFile = path.join(__dirname, '../fixtures/sample-java.java');
      const config = new AnalysisConfig({ extractors: ['dependencies'] });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.language).toBe('java');
      expect(result.extractedData).toBeDefined();
    });
  });

  describe('Custom Extractor Extension', () => {
    test('should accept and use custom extractors', async () => {
      const customExtractor: IDataExtractor<{ customMetrics: number[] }> = {
        extract: (ast: any, filePath: string) => {
          return {
            customMetrics: [1, 2, 3, 4, 5]
          };
        },
        supports: (language: string) => ['typescript', 'javascript'].includes(language)
      };

      analysisEngine.registerExtractor('custom-metrics', customExtractor);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['custom-metrics']
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.extractedData['custom-metrics']).toBeDefined();
      expect(result.extractedData['custom-metrics'].customMetrics).toEqual([1, 2, 3, 4, 5]);
    });

    test('should support multiple custom extractors simultaneously', async () => {
      const metricsExtractor: IDataExtractor<{ complexity: number }> = {
        extract: () => ({ complexity: 42 }),
        supports: () => true
      };

      const commentsExtractor: IDataExtractor<{ commentCount: number }> = {
        extract: () => ({ commentCount: 10 }),
        supports: () => true
      };

      analysisEngine.registerExtractor('metrics', metricsExtractor);
      analysisEngine.registerExtractor('comments', commentsExtractor);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['metrics', 'comments']
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.extractedData.metrics).toEqual({ complexity: 42 });
      expect(result.extractedData.comments).toEqual({ commentCount: 10 });
    });
  });

  describe('Custom Interpreter Extension', () => {
    test('should accept and use custom interpreters', async () => {
      const customInterpreter: IDataInterpreter<any, { processedData: string }> = {
        interpret: (data: any, context: any) => {
          return {
            processedData: `Processed data for ${context.filePath}`
          };
        },
        supports: () => true
      };

      // Set up basic extraction
      const basicExtractor: IDataExtractor<{ rawData: string }> = {
        extract: () => ({ rawData: 'test data' }),
        supports: () => true
      };

      analysisEngine.registerExtractor('basic', basicExtractor);
      analysisEngine.registerInterpreter('custom-processor', customInterpreter);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['basic'],
        interpreters: ['custom-processor']
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.interpretedData['custom-processor']).toBeDefined();
      expect(result.interpretedData['custom-processor'].processedData).toContain(testFile);
    });

    test('should chain interpreters with extracted data', async () => {
      const dataExtractor: IDataExtractor<{ items: string[] }> = {
        extract: () => ({ items: ['a', 'b', 'c'] }),
        supports: () => true
      };

      const countInterpreter: IDataInterpreter<{ items: string[] }, { count: number }> = {
        interpret: (data) => ({ count: data.items.length }),
        supports: (dataType) => dataType === 'basic-data'
      };

      analysisEngine.registerExtractor('basic-data', dataExtractor);
      analysisEngine.registerInterpreter('counter', countInterpreter);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['basic-data'],
        interpreters: ['counter']
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.extractedData['basic-data'].items).toEqual(['a', 'b', 'c']);
      expect(result.interpretedData.counter.count).toBe(3);
    });
  });

  describe('Plugin Registry Integration', () => {
    test('should list registered extractors', () => {
      const extractor: IDataExtractor<any> = {
        extract: () => ({}),
        supports: () => true
      };

      analysisEngine.registerExtractor('test-extractor', extractor);

      const registeredExtractors = analysisEngine.getRegisteredExtractors();
      expect(registeredExtractors).toContain('test-extractor');
    });

    test('should list registered interpreters', () => {
      const interpreter: IDataInterpreter<any, any> = {
        interpret: (data) => data,
        supports: () => true
      };

      analysisEngine.registerInterpreter('test-interpreter', interpreter);

      const registeredInterpreters = analysisEngine.getRegisteredInterpreters();
      expect(registeredInterpreters).toContain('test-interpreter');
    });

    test('should handle plugin conflicts gracefully', () => {
      const extractor1: IDataExtractor<any> = {
        extract: () => ({ version: 1 }),
        supports: () => true
      };

      const extractor2: IDataExtractor<any> = {
        extract: () => ({ version: 2 }),
        supports: () => true
      };

      // Register same name twice - should replace
      analysisEngine.registerExtractor('conflicting', extractor1);
      analysisEngine.registerExtractor('conflicting', extractor2);

      expect(() => {
        analysisEngine.registerExtractor('conflicting', extractor2);
      }).not.toThrow();
    });
  });

  describe('Language Support Extension', () => {
    test('should auto-detect language and select appropriate parser', async () => {
      const tsFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const goFile = path.join(__dirname, '../fixtures/sample-go.go');

      const [tsResult, goResult] = await Promise.all([
        analysisEngine.analyzeFile(tsFile),
        analysisEngine.analyzeFile(goFile)
      ]);

      expect(tsResult.language).toBe('typescript');
      expect(goResult.language).toBe('go');
    });

    test('should handle unsupported file types gracefully', async () => {
      const unknownFile = path.join(__dirname, '../fixtures/sample.unknown');
      const result = await analysisEngine.analyzeFile(unknownFile);

      expect(result.errors).toBeDefined();
      expect(result.errors.some(e => e.type.includes('UnsupportedLanguage'))).toBe(true);
    });
  });

  describe('Plugin Configuration', () => {
    test('should respect extractor configuration in AnalysisConfig', async () => {
      const extractor1: IDataExtractor<{ name: string }> = {
        extract: () => ({ name: 'extractor1' }),
        supports: () => true
      };

      const extractor2: IDataExtractor<{ name: string }> = {
        extract: () => ({ name: 'extractor2' }),
        supports: () => true
      };

      analysisEngine.registerExtractor('ext1', extractor1);
      analysisEngine.registerExtractor('ext2', extractor2);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['ext1'] // Only run ext1
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.extractedData.ext1).toBeDefined();
      expect(result.extractedData.ext2).toBeUndefined();
    });

    test('should respect interpreter configuration in AnalysisConfig', async () => {
      const extractor: IDataExtractor<{ data: string }> = {
        extract: () => ({ data: 'test' }),
        supports: () => true
      };

      const interpreter1: IDataInterpreter<any, { processed: string }> = {
        interpret: () => ({ processed: 'interpreter1' }),
        supports: () => true
      };

      const interpreter2: IDataInterpreter<any, { processed: string }> = {
        interpret: () => ({ processed: 'interpreter2' }),
        supports: () => true
      };

      analysisEngine.registerExtractor('data-ext', extractor);
      analysisEngine.registerInterpreter('int1', interpreter1);
      analysisEngine.registerInterpreter('int2', interpreter2);

      const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');
      const config = new AnalysisConfig({
        extractors: ['data-ext'],
        interpreters: ['int1'] // Only run int1
      });

      const result = await analysisEngine.analyzeFile(testFile, config);

      expect(result.interpretedData.int1).toBeDefined();
      expect(result.interpretedData.int2).toBeUndefined();
    });
  });
});