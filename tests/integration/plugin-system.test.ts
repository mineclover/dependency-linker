/**
 * Plugin System Integration Test
 * Tests the dynamic plugin system functionality including registration,
 * execution, and interaction between extractors and interpreters
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AnalysisEngine } from '../../src/services/AnalysisEngine';
import type { IDataExtractor } from '../../src/extractors/IDataExtractor';
import type { IDataInterpreter } from '../../src/interpreters/IDataInterpreter';
import type { AnalysisConfig } from '../../src/models/AnalysisConfig';

// Mock custom extractor for testing
class CustomTestExtractor implements IDataExtractor<any> {
  extract(ast: any, filePath: string): any {
    return {
      customData: `extracted from ${filePath}`,
      nodeCount: this.countNodes(ast),
      timestamp: new Date().toISOString()
    };
  }

  supports(language: string): boolean {
    return ['typescript', 'javascript'].includes(language);
  }

  getName(): string {
    return 'custom-test-extractor';
  }

  getVersion(): string {
    return '1.0.0';
  }

  validate(data: any): any {
    return { isValid: true, errors: [], warnings: [] };
  }

  getMetadata(): any {
    return {
      name: this.getName(),
      version: this.getVersion(),
      description: 'Custom test extractor',
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
        customData: { type: 'string' },
        nodeCount: { type: 'number' },
        timestamp: { type: 'string' }
      }
    };
  }

  dispose(): void {
    // Cleanup logic
  }

  private countNodes(ast: any): number {
    if (!ast) return 0;
    let count = 1;
    if (ast.children && Array.isArray(ast.children)) {
      for (const child of ast.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }
}

// Mock custom interpreter for testing
class CustomTestInterpreter implements IDataInterpreter<any, any> {
  interpret(data: any, context: any): any {
    return {
      processedData: data,
      contextSummary: {
        filePath: context.filePath,
        language: context.language,
        hasCustomData: !!data['custom-test-extractor']
      },
      analysis: this.analyzeData(data),
      timestamp: new Date().toISOString()
    };
  }

  supports(dataType: string): boolean {
    return dataType === 'custom-test' || dataType === 'mixed';
  }

  getName(): string {
    return 'custom-test-interpreter';
  }

  getVersion(): string {
    return '1.0.0';
  }

  validate(input: any): any {
    return { isValid: true, errors: [], warnings: [] };
  }

  getOutputSchema(): any {
    return {
      type: 'object',
      properties: {
        processedData: { type: 'any' },
        contextSummary: { type: 'object' },
        analysis: { type: 'object' },
        timestamp: { type: 'string' }
      }
    };
  }

  getMetadata(): any {
    return {
      name: this.getName(),
      version: this.getVersion(),
      description: 'Custom test interpreter',
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

  getSupportedDataTypes(): string[] {
    return ['custom-test', 'mixed'];
  }

  getDependencies(): any[] {
    return [];
  }

  dispose(): void {
    // Cleanup logic
  }

  private analyzeData(data: any): any {
    const extractorCount = Object.keys(data).length;
    const hasBuiltinData = !!(data.dependency || data.identifier);
    const hasCustomData = !!data['custom-test'];

    return {
      extractorCount,
      hasBuiltinData,
      hasCustomData,
      complexity: extractorCount > 2 ? 'high' : 'low'
    };
  }
}

describe('Plugin System Integration', () => {
  let engine: AnalysisEngine;
  let customExtractor: CustomTestExtractor;
  let customInterpreter: CustomTestInterpreter;

  beforeEach(() => {
    engine = new AnalysisEngine();
    customExtractor = new CustomTestExtractor();
    customInterpreter = new CustomTestInterpreter();
  });

  describe('Plugin Registration', () => {
    test('should register custom extractor successfully', () => {
      expect(() => {
        engine.registerExtractor('custom-test', customExtractor);
      }).not.toThrow();

      const extractors = engine.getRegisteredExtractors();
      expect(extractors.has('custom-test')).toBe(true);
      expect(extractors.get('custom-test')).toBe(customExtractor);
    });

    test('should register custom interpreter successfully', () => {
      expect(() => {
        engine.registerInterpreter('custom-test', customInterpreter);
      }).not.toThrow();

      const interpreters = engine.getRegisteredInterpreters();
      expect(interpreters.has('custom-test')).toBe(true);
      expect(interpreters.get('custom-test')).toBe(customInterpreter);
    });

    test('should allow registration of multiple custom plugins', () => {
      const extractor2 = new CustomTestExtractor();
      const interpreter2 = new CustomTestInterpreter();

      engine.registerExtractor('custom-1', customExtractor);
      engine.registerExtractor('custom-2', extractor2);
      engine.registerInterpreter('custom-1', customInterpreter);
      engine.registerInterpreter('custom-2', interpreter2);

      const extractors = engine.getRegisteredExtractors();
      const interpreters = engine.getRegisteredInterpreters();

      expect(extractors.size).toBeGreaterThanOrEqual(5); // 3 built-in + 2 custom
      expect(interpreters.size).toBeGreaterThanOrEqual(4); // 2 built-in + 2 custom
    });
  });

  describe('Plugin Execution', () => {
    beforeEach(() => {
      engine.registerExtractor('custom-test', customExtractor);
      engine.registerInterpreter('custom-test', customInterpreter);
    });

    test('should execute custom extractor during analysis', async () => {
      const config: AnalysisConfig = {
        extractors: ['custom-test'],
        interpreters: []
      };

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', config);

      expect(result.extractedData).toBeDefined();
      expect(result.extractedData['custom-test']).toBeDefined();
      expect(result.extractedData['custom-test'].customData).toContain('tests/fixtures/sample-typescript.ts');
      expect(typeof result.extractedData['custom-test'].nodeCount).toBe('number');
    });

    test('should execute custom interpreter during analysis', async () => {
      const config: AnalysisConfig = {
        extractors: ['custom-test'],
        interpreters: ['custom-test']
      };

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', config);

      expect(result.interpretedData).toBeDefined();
      expect(result.interpretedData['custom-test']).toBeDefined();
      expect(result.interpretedData['custom-test'].contextSummary).toBeDefined();
      expect(result.interpretedData['custom-test'].contextSummary.filePath).toBe('tests/fixtures/sample-typescript.ts');
      expect(result.interpretedData['custom-test'].contextSummary.language).toBe('typescript');
    });

    test('should execute both built-in and custom plugins together', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependency', 'custom-test'],
        interpreters: ['dependency-analysis', 'custom-test']
      };

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', config);

      // Check that both built-in and custom extractors ran
      expect(result.extractedData.dependency).toBeDefined();
      expect(result.extractedData['custom-test']).toBeDefined();

      // Check that both built-in and custom interpreters ran
      expect(result.interpretedData['dependency-analysis']).toBeDefined();
      expect(result.interpretedData['custom-test']).toBeDefined();

      // Check that custom interpreter analyzed the mixed data
      expect(result.interpretedData['custom-test'].analysis.hasBuiltinData).toBe(true);
      expect(result.interpretedData['custom-test'].analysis.hasCustomData).toBe(true);
    });
  });

  describe('Plugin Interaction', () => {
    beforeEach(() => {
      engine.registerExtractor('custom-test', customExtractor);
      engine.registerInterpreter('custom-test', customInterpreter);
    });

    test('should pass extractor data to interpreters correctly', async () => {
      const config: AnalysisConfig = {
        extractors: ['dependency', 'identifier', 'custom-test'],
        interpreters: ['custom-test']
      };

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', config);

      const interpretedData = result.interpretedData['custom-test'];
      expect(interpretedData.processedData).toBeDefined();
      expect(interpretedData.processedData.dependency).toBeDefined();
      expect(interpretedData.processedData.identifier).toBeDefined();
      expect(interpretedData.processedData['custom-test']).toBeDefined();

      expect(interpretedData.analysis.extractorCount).toBe(3);
      expect(interpretedData.analysis.complexity).toBe('high');
    });

    test('should handle cross-plugin data dependencies', async () => {
      // Create an interpreter that depends on specific extractor output
      class DependentInterpreter implements IDataInterpreter<any, any> {
        interpret(data: any, context: any): any {
          const dependencies = data.dependency?.dependencies || [];
          const customData = data['custom-test']?.customData || '';

          return {
            combinedAnalysis: {
              dependencyCount: dependencies.length,
              customDataExists: !!customData,
              crossReference: `${dependencies.length} deps in ${customData}`
            }
          };
        }

        supports(): boolean { return true; }
        getName(): string { return 'dependent-interpreter'; }
        getVersion(): string { return '1.0.0'; }

        validate(input: any): any {
          return { isValid: true, errors: [], warnings: [] };
        }

        getOutputSchema(): any {
          return {
            type: 'object',
            properties: {
              combinedAnalysis: { type: 'object', description: 'Combined analysis result' }
            },
            required: ['combinedAnalysis'],
            version: '1.0.0'
          };
        }

        getMetadata(): any {
          return {
            name: 'dependent-interpreter',
            version: '1.0.0',
            description: 'Test interpreter with cross-plugin dependencies',
            supportedDataTypes: ['mixed'],
            outputType: 'object',
            dependencies: [],
            performance: {
              averageTimePerItem: 5,
              memoryUsage: 'low',
              timeComplexity: 'constant',
              scalability: 'excellent',
              maxRecommendedDataSize: 1000000
            },
            quality: {
              accuracy: 0.95,
              consistency: 0.98,
              completeness: 0.90,
              reliability: 0.95
            }
          };
        }

        configure(options: any): void {
          // Mock configuration
        }

        getConfiguration(): any {
          return { enabled: true };
        }

        getSupportedDataTypes(): string[] {
          return ['mixed'];
        }

        getDependencies(): any[] {
          return [];
        }

        dispose(): void {
          // Mock cleanup
        }
      }

      engine.registerInterpreter('dependent', new DependentInterpreter());

      const config: AnalysisConfig = {
        extractors: ['dependency', 'custom-test'],
        interpreters: ['dependent']
      };

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', config);

      expect(result.interpretedData.dependent).toBeDefined();
      expect(result.interpretedData.dependent.combinedAnalysis).toBeDefined();
      expect(typeof result.interpretedData.dependent.combinedAnalysis.dependencyCount).toBe('number');
      expect(typeof result.interpretedData.dependent.combinedAnalysis.customDataExists).toBe('boolean');
    });
  });

  describe('Plugin Lifecycle Management', () => {
    test('should unregister plugins successfully', () => {
      engine.registerExtractor('temp-extractor', customExtractor);
      engine.registerInterpreter('temp-interpreter', customInterpreter);

      expect(engine.getRegisteredExtractors().has('temp-extractor')).toBe(true);
      expect(engine.getRegisteredInterpreters().has('temp-interpreter')).toBe(true);

      const extractorUnregistered = engine.unregisterExtractor('temp-extractor');
      const interpreterUnregistered = engine.unregisterInterpreter('temp-interpreter');

      expect(extractorUnregistered).toBe(true);
      expect(interpreterUnregistered).toBe(true);
      expect(engine.getRegisteredExtractors().has('temp-extractor')).toBe(false);
      expect(engine.getRegisteredInterpreters().has('temp-interpreter')).toBe(false);
    });

    test('should handle unregistering non-existent plugins', () => {
      const extractorResult = engine.unregisterExtractor('non-existent');
      const interpreterResult = engine.unregisterInterpreter('non-existent');

      expect(extractorResult).toBe(false);
      expect(interpreterResult).toBe(false);
    });

    test('should maintain plugin state after cache operations', async () => {
      engine.registerExtractor('persistent-extractor', customExtractor);

      // Analyze a file to populate cache
      await engine.analyzeFile('tests/fixtures/sample-typescript.ts', {
        extractors: ['persistent-extractor']
      });

      // Clear cache
      engine.clearCache();

      // Plugin should still be registered
      expect(engine.getRegisteredExtractors().has('persistent-extractor')).toBe(true);

      // Should still work after cache clear
      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', {
        extractors: ['persistent-extractor']
      });

      expect(result.extractedData['persistent-extractor']).toBeDefined();
    });
  });

  describe('Plugin Error Handling', () => {
    test('should handle extractor errors gracefully', async () => {
      class ErrorExtractor implements IDataExtractor<any> {
        extract(): any {
          throw new Error('Test extractor error');
        }
        supports(): boolean { return true; }
        getName(): string { return 'error-extractor'; }
        getVersion(): string { return '1.0.0'; }
        validate(data: any): any {
          return { isValid: true, errors: [], warnings: [] };
        }
        getMetadata(): any {
          return {
            name: 'error-extractor',
            version: '1.0.0',
            description: 'Test error extractor'
          };
        }
        configure(options: any): void {}
        getConfiguration(): any { return {}; }
        getOutputSchema(): any {
          return {
            type: 'object',
            properties: {},
            required: [],
            version: '1.0.0'
          };
        }
        dispose(): void {}
      }

      engine.registerExtractor('error-test', new ErrorExtractor());

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', {
        extractors: ['dependency', 'error-test'],
        interpreters: []
      });

      // Should have some errors but still complete
      expect(result.errors.length).toBeGreaterThan(0);
      // Other extractors should still work
      expect(result.extractedData.dependency).toBeDefined();
    });

    test('should handle interpreter errors gracefully', async () => {
      class ErrorInterpreter implements IDataInterpreter<any, any> {
        interpret(): any {
          throw new Error('Test interpreter error');
        }
        supports(): boolean { return true; }
        getName(): string { return 'error-interpreter'; }
        getVersion(): string { return '1.0.0'; }
        validate(input: any): any {
          return { isValid: true, errors: [], warnings: [] };
        }
        getOutputSchema(): any {
          return {
            type: 'object',
            properties: {},
            required: [],
            version: '1.0.0'
          };
        }
        getMetadata(): any {
          return {
            name: 'error-interpreter',
            version: '1.0.0',
            description: 'Test error interpreter',
            supportedDataTypes: ['any'],
            outputType: 'object',
            dependencies: [],
            performance: {
              averageTimePerItem: 1,
              memoryUsage: 'low',
              timeComplexity: 'constant',
              scalability: 'excellent',
              maxRecommendedDataSize: 1000000
            },
            quality: {
              accuracy: 0.0,
              consistency: 0.0,
              completeness: 0.0,
              reliability: 0.0
            }
          };
        }
        configure(options: any): void {}
        getConfiguration(): any { return {}; }
        getSupportedDataTypes(): string[] { return ['any']; }
        getDependencies(): any[] { return []; }
        dispose(): void {}
      }

      engine.registerInterpreter('error-test', new ErrorInterpreter());

      const result = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', {
        extractors: ['dependency'],
        interpreters: ['dependency-analysis', 'error-test']
      });

      // Should have some errors but still complete
      expect(result.errors.length).toBeGreaterThan(0);
      // Other interpreters should still work
      expect(result.interpretedData['dependency-analysis']).toBeDefined();
    });
  });

  describe('Plugin Discovery and Metadata', () => {
    test('should provide plugin metadata', () => {
      engine.registerExtractor('meta-test', customExtractor);
      engine.registerInterpreter('meta-test', customInterpreter);

      const extractor = engine.getRegisteredExtractors().get('meta-test');
      const interpreter = engine.getRegisteredInterpreters().get('meta-test');

      expect(extractor?.getName()).toBe('custom-test-extractor');
      expect(extractor?.getVersion()).toBe('1.0.0');
      expect(interpreter?.getName()).toBe('custom-test-interpreter');
      expect(interpreter?.getVersion()).toBe('1.0.0');
    });

    test('should support language-specific plugin activation', async () => {
      class LanguageSpecificExtractor implements IDataExtractor<any> {
        extract(): any {
          return { languageSpecific: 'typescript-only' };
        }
        supports(language: string): boolean {
          return language === 'typescript';
        }
        getName(): string { return 'ts-specific'; }
        getVersion(): string { return '1.0.0'; }
        validate(data: any): any {
          return { isValid: true, errors: [], warnings: [] };
        }
        getMetadata(): any {
          return {
            name: 'ts-specific',
            version: '1.0.0',
            description: 'TypeScript-specific extractor'
          };
        }
        configure(options: any): void {}
        getConfiguration(): any { return {}; }
        getOutputSchema(): any {
          return {
            type: 'object',
            properties: {
              languageSpecific: { type: 'string' }
            },
            required: ['languageSpecific'],
            version: '1.0.0'
          };
        }
        dispose(): void {}
      }

      engine.registerExtractor('ts-only', new LanguageSpecificExtractor());

      // Should work with TypeScript
      const tsResult = await engine.analyzeFile('tests/fixtures/sample-typescript.ts', {
        extractors: ['ts-only']
      });
      expect(tsResult.extractedData['ts-only']).toBeDefined();

      // Should handle other languages appropriately
      const jsResult = await engine.analyzeFile('tests/fixtures/sample.js', {
        extractors: ['ts-only']
      });
      // Plugin should not execute for unsupported language, but analysis should continue
      expect(jsResult).toBeDefined();
    });
  });
});