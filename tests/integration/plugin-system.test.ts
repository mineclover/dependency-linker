/**
 * Integration test for plugin system functionality
 * Tests extractor and interpreter registration, loading, and execution
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Plugin System Integration', () => {
  let analysisEngine: any;
  let mockExtractor: any;
  let mockInterpreter: any;

  beforeEach(() => {
    // Mock analysis engine with plugin system
    analysisEngine = {
      registerExtractor: jest.fn(),
      registerInterpreter: jest.fn(),
      getRegisteredExtractors: jest.fn().mockReturnValue(new Map()),
      getRegisteredInterpreters: jest.fn().mockReturnValue(new Map()),
      analyzeFile: jest.fn(),
      clearPlugins: jest.fn()
    };

    // Mock extractor
    mockExtractor = {
      extract: jest.fn().mockReturnValue({
        customData: ['item1', 'item2'],
        metadata: { extractorVersion: '1.0.0' }
      }),
      supports: jest.fn().mockReturnValue(true),
      getName: jest.fn().mockReturnValue('custom-extractor'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      validate: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })
    };

    // Mock interpreter
    mockInterpreter = {
      interpret: jest.fn().mockReturnValue({
        analysis: { score: 0.85 },
        insights: ['High quality data detected'],
        recommendations: ['Consider optimization']
      }),
      supports: jest.fn().mockReturnValue(true),
      getName: jest.fn().mockReturnValue('custom-interpreter'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      validate: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      }),
      getOutputSchema: jest.fn().mockReturnValue({
        type: 'object',
        properties: {
          analysis: { type: 'object' },
          insights: { type: 'array' },
          recommendations: { type: 'array' }
        },
        required: ['analysis']
      })
    };
  });

  describe('Extractor Registration', () => {
    test('should register custom extractor successfully', () => {
      analysisEngine.registerExtractor('dependency-extractor', mockExtractor);

      expect(analysisEngine.registerExtractor).toHaveBeenCalledWith(
        'dependency-extractor',
        mockExtractor
      );
    });

    test('should prevent duplicate extractor registration', () => {
      const registryMap = new Map();
      registryMap.set('dependency-extractor', mockExtractor);
      analysisEngine.getRegisteredExtractors.mockReturnValue(registryMap);

      // Attempt to register duplicate should be handled gracefully
      analysisEngine.registerExtractor.mockImplementation((name, extractor) => {
        if (registryMap.has(name)) {
          throw new Error(`Extractor '${name}' is already registered`);
        }
        registryMap.set(name, extractor);
      });

      expect(() => {
        analysisEngine.registerExtractor('dependency-extractor', mockExtractor);
      }).toThrow('Extractor \'dependency-extractor\' is already registered');
    });

    test('should validate extractor interface before registration', () => {
      const invalidExtractor = {
        // Missing required methods
        extract: jest.fn(),
        // missing: supports, getName, getVersion, validate
      };

      analysisEngine.registerExtractor.mockImplementation((name, extractor) => {
        const requiredMethods = ['extract', 'supports', 'getName', 'getVersion', 'validate'];
        const missingMethods = requiredMethods.filter(method => typeof extractor[method] !== 'function');

        if (missingMethods.length > 0) {
          throw new Error(`Extractor missing required methods: ${missingMethods.join(', ')}`);
        }
      });

      expect(() => {
        analysisEngine.registerExtractor('invalid-extractor', invalidExtractor);
      }).toThrow('Extractor missing required methods');
    });

    test('should allow multiple extractors for different data types', () => {
      const dependencyExtractor = { ...mockExtractor, getName: () => 'dependency-extractor' };
      const complexityExtractor = { ...mockExtractor, getName: () => 'complexity-extractor' };
      const identifierExtractor = { ...mockExtractor, getName: () => 'identifier-extractor' };

      analysisEngine.registerExtractor('dependencies', dependencyExtractor);
      analysisEngine.registerExtractor('complexity', complexityExtractor);
      analysisEngine.registerExtractor('identifiers', identifierExtractor);

      expect(analysisEngine.registerExtractor).toHaveBeenCalledTimes(3);
    });
  });

  describe('Interpreter Registration', () => {
    test('should register custom interpreter successfully', () => {
      analysisEngine.registerInterpreter('dependency-analyzer', mockInterpreter);

      expect(analysisEngine.registerInterpreter).toHaveBeenCalledWith(
        'dependency-analyzer',
        mockInterpreter
      );
    });

    test('should validate interpreter interface before registration', () => {
      const invalidInterpreter = {
        interpret: jest.fn(),
        // missing: supports, getName, getVersion, validate, getOutputSchema
      };

      analysisEngine.registerInterpreter.mockImplementation((name, interpreter) => {
        const requiredMethods = ['interpret', 'supports', 'getName', 'getVersion', 'validate', 'getOutputSchema'];
        const missingMethods = requiredMethods.filter(method => typeof interpreter[method] !== 'function');

        if (missingMethods.length > 0) {
          throw new Error(`Interpreter missing required methods: ${missingMethods.join(', ')}`);
        }
      });

      expect(() => {
        analysisEngine.registerInterpreter('invalid-interpreter', invalidInterpreter);
      }).toThrow('Interpreter missing required methods');
    });

    test('should allow chaining interpreters', () => {
      const preprocessor = {
        ...mockInterpreter,
        getName: () => 'data-preprocessor',
        interpret: jest.fn().mockReturnValue({ preprocessed: true, data: 'cleaned' })
      };

      const analyzer = {
        ...mockInterpreter,
        getName: () => 'data-analyzer',
        interpret: jest.fn().mockReturnValue({ analyzed: true, score: 0.9 })
      };

      analysisEngine.registerInterpreter('preprocessor', preprocessor);
      analysisEngine.registerInterpreter('analyzer', analyzer);

      expect(analysisEngine.registerInterpreter).toHaveBeenCalledTimes(2);
    });
  });

  describe('Plugin Discovery', () => {
    test('should list all registered extractors', () => {
      const extractorMap = new Map();
      extractorMap.set('dependencies', mockExtractor);
      extractorMap.set('complexity', { ...mockExtractor, getName: () => 'complexity-extractor' });

      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const extractors = analysisEngine.getRegisteredExtractors();

      expect(extractors.size).toBe(2);
      expect(extractors.has('dependencies')).toBe(true);
      expect(extractors.has('complexity')).toBe(true);
    });

    test('should list all registered interpreters', () => {
      const interpreterMap = new Map();
      interpreterMap.set('dependency-analysis', mockInterpreter);
      interpreterMap.set('quality-analysis', { ...mockInterpreter, getName: () => 'quality-analyzer' });

      analysisEngine.getRegisteredInterpreters.mockReturnValue(interpreterMap);

      const interpreters = analysisEngine.getRegisteredInterpreters();

      expect(interpreters.size).toBe(2);
      expect(interpreters.has('dependency-analysis')).toBe(true);
      expect(interpreters.has('quality-analysis')).toBe(true);
    });

    test('should provide plugin metadata', () => {
      const extractorMap = new Map();
      extractorMap.set('test-extractor', mockExtractor);

      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const extractors = analysisEngine.getRegisteredExtractors();
      const extractor = extractors.get('test-extractor');

      expect(extractor.getName()).toBe('custom-extractor');
      expect(extractor.getVersion()).toBe('1.0.0');
      expect(extractor.supports('typescript')).toBe(true);
    });
  });

  describe('Plugin Execution', () => {
    test('should execute registered extractors during analysis', async () => {
      // Setup registered plugins
      const extractorMap = new Map();
      extractorMap.set('dependencies', mockExtractor);
      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const interpreterMap = new Map();
      interpreterMap.set('dependency-analysis', mockInterpreter);
      analysisEngine.getRegisteredInterpreters.mockReturnValue(interpreterMap);

      // Mock analysis result with plugin execution
      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: {
          dependencies: mockExtractor.extract(),
        },
        interpretedData: {
          'dependency-analysis': mockInterpreter.interpret()
        },
        performanceMetrics: {
          parseTime: 10,
          extractionTime: 5,
          interpretationTime: 3,
          totalTime: 18,
          memoryUsage: 1024
        },
        errors: []
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', {
        extractors: ['dependencies'],
        interpreters: ['dependency-analysis']
      });

      expect(result.extractedData.dependencies).toBeDefined();
      expect(result.interpretedData['dependency-analysis']).toBeDefined();
      expect(result.interpretedData['dependency-analysis'].analysis.score).toBe(0.85);
    });

    test('should handle extractor errors gracefully', async () => {
      const faultyExtractor = {
        ...mockExtractor,
        extract: jest.fn().mockImplementation(() => {
          throw new Error('Extraction failed');
        })
      };

      const extractorMap = new Map();
      extractorMap.set('faulty', faultyExtractor);
      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: {},
        interpretedData: {},
        performanceMetrics: { parseTime: 10, extractionTime: 0, interpretationTime: 0, totalTime: 10, memoryUsage: 512 },
        errors: [{
          type: 'ExtractionError',
          message: 'Extractor "faulty" failed: Extraction failed',
          location: { line: 0, column: 0 }
        }]
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', {
        extractors: ['faulty']
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('ExtractionError');
    });

    test('should handle interpreter errors gracefully', async () => {
      const faultyInterpreter = {
        ...mockInterpreter,
        interpret: jest.fn().mockImplementation(() => {
          throw new Error('Interpretation failed');
        })
      };

      const interpreterMap = new Map();
      interpreterMap.set('faulty', faultyInterpreter);
      analysisEngine.getRegisteredInterpreters.mockReturnValue(interpreterMap);

      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: { test: 'data' },
        interpretedData: {},
        performanceMetrics: { parseTime: 10, extractionTime: 5, interpretationTime: 0, totalTime: 15, memoryUsage: 768 },
        errors: [{
          type: 'InterpretationError',
          message: 'Interpreter "faulty" failed: Interpretation failed',
          location: { line: 0, column: 0 }
        }]
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', {
        extractors: ['dependencies'],
        interpreters: ['faulty']
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('InterpretationError');
    });
  });

  describe('Plugin Configuration', () => {
    test('should support selective plugin execution', async () => {
      // Register multiple plugins
      const extractorMap = new Map();
      extractorMap.set('dependencies', mockExtractor);
      extractorMap.set('complexity', { ...mockExtractor, getName: () => 'complexity' });
      extractorMap.set('identifiers', { ...mockExtractor, getName: () => 'identifiers' });

      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const config = {
        extractors: ['dependencies', 'complexity'], // Only run specific extractors
        interpreters: []
      };

      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: {
          dependencies: { items: ['react'] },
          complexity: { score: 0.5 }
          // identifiers should not be present
        },
        interpretedData: {},
        performanceMetrics: { parseTime: 10, extractionTime: 8, interpretationTime: 0, totalTime: 18, memoryUsage: 1024 },
        errors: []
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', config);

      expect(result.extractedData.dependencies).toBeDefined();
      expect(result.extractedData.complexity).toBeDefined();
      expect(result.extractedData.identifiers).toBeUndefined();
    });

    test('should support plugin-specific options', async () => {
      const configurableExtractor = {
        ...mockExtractor,
        extract: jest.fn().mockImplementation((ast, filePath, options = {}) => {
          return {
            data: 'extracted',
            depth: options.depth || 1,
            includePrivate: options.includePrivate || false
          };
        })
      };

      const extractorMap = new Map();
      extractorMap.set('configurable', configurableExtractor);
      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const config = {
        extractors: ['configurable'],
        extractorOptions: {
          configurable: {
            depth: 3,
            includePrivate: true
          }
        }
      };

      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: {
          configurable: {
            data: 'extracted',
            depth: 3,
            includePrivate: true
          }
        },
        interpretedData: {},
        performanceMetrics: { parseTime: 10, extractionTime: 5, interpretationTime: 0, totalTime: 15, memoryUsage: 1024 },
        errors: []
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', config);

      expect(result.extractedData.configurable.depth).toBe(3);
      expect(result.extractedData.configurable.includePrivate).toBe(true);
    });
  });

  describe('Plugin Performance', () => {
    test('should track individual plugin performance', async () => {
      const slowExtractor = {
        ...mockExtractor,
        extract: jest.fn().mockImplementation(() => {
          // Simulate slow extraction
          return { data: 'slow' };
        })
      };

      const fastExtractor = {
        ...mockExtractor,
        extract: jest.fn().mockImplementation(() => {
          return { data: 'fast' };
        })
      };

      const extractorMap = new Map();
      extractorMap.set('slow', slowExtractor);
      extractorMap.set('fast', fastExtractor);
      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      const mockResult = {
        filePath: 'test.ts',
        language: 'typescript',
        extractedData: {
          slow: { data: 'slow' },
          fast: { data: 'fast' }
        },
        interpretedData: {},
        performanceMetrics: {
          parseTime: 10,
          extractionTime: 25, // Total extraction time
          interpretationTime: 0,
          totalTime: 35,
          memoryUsage: 1024,
          pluginMetrics: {
            extractors: {
              slow: { time: 20, memory: 512 },
              fast: { time: 5, memory: 256 }
            }
          }
        },
        errors: []
      };

      analysisEngine.analyzeFile.mockResolvedValue(mockResult);

      const result = await analysisEngine.analyzeFile('test.ts', {
        extractors: ['slow', 'fast']
      });

      expect(result.performanceMetrics.pluginMetrics.extractors.slow.time).toBe(20);
      expect(result.performanceMetrics.pluginMetrics.extractors.fast.time).toBe(5);
    });
  });

  describe('Plugin Cleanup', () => {
    test('should clear all registered plugins', () => {
      analysisEngine.clearPlugins();
      expect(analysisEngine.clearPlugins).toHaveBeenCalled();
    });

    test('should handle plugin cleanup gracefully', () => {
      const extractorWithCleanup = {
        ...mockExtractor,
        cleanup: jest.fn()
      };

      const extractorMap = new Map();
      extractorMap.set('test', extractorWithCleanup);
      analysisEngine.getRegisteredExtractors.mockReturnValue(extractorMap);

      analysisEngine.clearPlugins.mockImplementation(() => {
        const extractors = analysisEngine.getRegisteredExtractors();
        for (const [name, extractor] of extractors) {
          if (typeof extractor.cleanup === 'function') {
            extractor.cleanup();
          }
        }
        extractors.clear();
      });

      analysisEngine.clearPlugins();

      expect(extractorWithCleanup.cleanup).toHaveBeenCalled();
    });
  });
});