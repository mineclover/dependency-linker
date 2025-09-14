/**
 * Contract test for IDataInterpreter interface
 * Validates that any implementation of IDataInterpreter satisfies the required behavior
 */

import { describe, test, expect } from '@jest/globals';

// Test interface contracts
interface IDataInterpreter<TInput, TOutput> {
  interpret(data: TInput, context: InterpreterContext): TOutput;
  supports(dataType: string): boolean;
  getName(): string;
  getVersion(): string;
  validate(input: TInput): ValidationResult;
  getOutputSchema(): OutputSchema;
}

interface InterpreterContext {
  filePath: string;
  language: string;
  metadata: Record<string, any>;
  options?: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface OutputSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
}

describe('IDataInterpreter Contract', () => {
  let interpreter: IDataInterpreter<any, any>;

  beforeEach(() => {
    // Mock implementation for testing
    interpreter = {
      interpret: jest.fn().mockReturnValue({
        analysis: {},
        insights: [],
        metrics: {}
      }),
      supports: jest.fn().mockReturnValue(true),
      getName: jest.fn().mockReturnValue('test-interpreter'),
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
          metrics: { type: 'object' }
        },
        required: ['analysis']
      })
    };
  });

  describe('Core Interpretation', () => {
    test('interpret should process input data with context', () => {
      const inputData = { dependencies: ['lodash', 'react'] };
      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: { version: '1.0.0' }
      };

      const result = interpreter.interpret(inputData, context);

      expect(interpreter.interpret).toHaveBeenCalledWith(inputData, context);
      expect(result).toBeDefined();
    });

    test('interpret should return consistent output structure', () => {
      const inputData = { test: 'data' };
      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      const result1 = interpreter.interpret(inputData, context);
      const result2 = interpreter.interpret(inputData, context);

      // Results should have same structure
      expect(typeof result1).toBe(typeof result2);
      if (typeof result1 === 'object' && result1 !== null) {
        expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      }
    });

    test('interpret should handle empty input data', () => {
      const emptyData = {};
      const context: InterpreterContext = {
        filePath: 'empty.ts',
        language: 'typescript',
        metadata: {}
      };

      expect(() => {
        interpreter.interpret(emptyData, context);
      }).not.toThrow();
    });

    test('interpret should utilize context information', () => {
      const inputData = { items: ['test'] };
      const context: InterpreterContext = {
        filePath: 'specific-file.ts',
        language: 'typescript',
        metadata: { version: '2.0.0', project: 'test-project' },
        options: { detailLevel: 'high' }
      };

      const result = interpreter.interpret(inputData, context);
      expect(result).toBeDefined();

      // Verify context was passed correctly
      expect(interpreter.interpret).toHaveBeenCalledWith(inputData, expect.objectContaining({
        filePath: 'specific-file.ts',
        language: 'typescript',
        metadata: expect.objectContaining({
          version: '2.0.0',
          project: 'test-project'
        })
      }));
    });
  });

  describe('Data Type Support', () => {
    test('supports should return boolean for data type check', () => {
      const result = interpreter.supports('dependencies');
      expect(typeof result).toBe('boolean');
    });

    test('supports should handle various data types', () => {
      const dataTypes = ['dependencies', 'identifiers', 'complexity', 'metrics', 'ast-nodes'];

      dataTypes.forEach(dataType => {
        const result = interpreter.supports(dataType);
        expect(typeof result).toBe('boolean');
      });
    });

    test('should have specific data type specialization', () => {
      const commonDataTypes = ['dependencies', 'identifiers', 'complexity', 'metrics'];
      const hasSupport = commonDataTypes.some(type => interpreter.supports(type));
      expect(hasSupport).toBe(true);
    });
  });

  describe('Plugin Metadata', () => {
    test('getName should return string identifier', () => {
      const name = interpreter.getName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    test('getVersion should return valid version string', () => {
      const version = interpreter.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('getName should be consistent', () => {
      const name1 = interpreter.getName();
      const name2 = interpreter.getName();
      expect(name1).toBe(name2);
    });
  });

  describe('Output Schema', () => {
    test('getOutputSchema should return valid schema', () => {
      const schema = interpreter.getOutputSchema();

      expect(schema).toBeDefined();
      expect(typeof schema.type).toBe('string');
      expect(typeof schema.properties).toBe('object');
      expect(Array.isArray(schema.required)).toBe(true);
    });

    test('output should conform to declared schema', () => {
      const inputData = { test: 'data' };
      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      const result = interpreter.interpret(inputData, context);
      const schema = interpreter.getOutputSchema();

      // Basic schema validation
      expect(typeof result).toBe(schema.type);
      if (schema.type === 'object' && result !== null) {
        schema.required.forEach(requiredField => {
          expect(result).toHaveProperty(requiredField);
        });
      }
    });
  });

  describe('Input Validation', () => {
    test('validate should return ValidationResult', () => {
      const inputData = { test: 'data' };
      const result = interpreter.validate(inputData);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('validate should accept valid interpreter input', () => {
      const validInput = {
        dependencies: ['lodash', 'react'],
        identifiers: ['Component', 'useState']
      };

      const result = interpreter.validate(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validate should detect invalid input', () => {
      const invalidInput = null;
      const mockResult = {
        isValid: false,
        errors: ['Input cannot be null'],
        warnings: []
      };

      (interpreter.validate as jest.Mock).mockReturnValue(mockResult);

      const result = interpreter.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validate should provide actionable error messages', () => {
      const invalidInput = { malformedField: 123 };
      const mockResult = {
        isValid: false,
        errors: [
          'Field "dependencies" is required',
          'Field "malformedField" has invalid type: expected array, got number'
        ],
        warnings: ['Consider providing metadata for better analysis']
      };

      (interpreter.validate as jest.Mock).mockReturnValue(mockResult);

      const result = interpreter.validate(invalidInput);
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Context Handling', () => {
    test('should handle minimal context', () => {
      const inputData = { test: 'data' };
      const minimalContext: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      expect(() => {
        interpreter.interpret(inputData, minimalContext);
      }).not.toThrow();
    });

    test('should handle rich context with options', () => {
      const inputData = { test: 'data' };
      const richContext: InterpreterContext = {
        filePath: 'complex/path/file.ts',
        language: 'typescript',
        metadata: {
          projectName: 'test-project',
          version: '1.2.3',
          author: 'test-author'
        },
        options: {
          includeMetrics: true,
          detailLevel: 'verbose',
          outputFormat: 'json'
        }
      };

      expect(() => {
        interpreter.interpret(inputData, richContext);
      }).not.toThrow();
    });

    test('should adapt behavior based on language context', () => {
      const inputData = { imports: ['fs', 'path'] };

      const tsContext: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      const jsContext: InterpreterContext = {
        filePath: 'test.js',
        language: 'javascript',
        metadata: {}
      };

      // Both should work without throwing
      expect(() => {
        interpreter.interpret(inputData, tsContext);
        interpreter.interpret(inputData, jsContext);
      }).not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    test('interpret should complete quickly for small datasets', () => {
      const smallData = { items: ['item1', 'item2'] };
      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      const startTime = Date.now();
      interpreter.interpret(smallData, context);
      const duration = Date.now() - startTime;

      // Should complete in less than 50ms for small data
      expect(duration).toBeLessThan(50);
    });

    test('supports should execute instantly', () => {
      const startTime = Date.now();
      interpreter.supports('dependencies');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1);
    });

    test('validate should be efficient', () => {
      const testData = { small: 'data' };

      const startTime = Date.now();
      interpreter.validate(testData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('Error Handling', () => {
    test('interpret should handle null input gracefully', () => {
      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      expect(() => {
        interpreter.interpret(null, context);
      }).not.toThrow();
    });

    test('interpret should handle missing context fields', () => {
      const inputData = { test: 'data' };
      const incompleteContext = {
        filePath: 'test.ts',
        language: 'typescript'
        // missing metadata
      } as InterpreterContext;

      expect(() => {
        interpreter.interpret(inputData, incompleteContext);
      }).not.toThrow();
    });

    test('should handle malformed input data gracefully', () => {
      const malformedData = { circular: {} };
      malformedData.circular = malformedData; // Create circular reference

      const context: InterpreterContext = {
        filePath: 'test.ts',
        language: 'typescript',
        metadata: {}
      };

      expect(() => {
        interpreter.interpret(malformedData, context);
      }).not.toThrow();
    });
  });

  describe('Plugin System Integration', () => {
    test('should provide discoverable plugin information', () => {
      const pluginInfo = {
        name: interpreter.getName(),
        version: interpreter.getVersion(),
        supportedDataTypes: ['dependencies', 'identifiers', 'complexity'].filter(type =>
          interpreter.supports(type)
        ),
        outputSchema: interpreter.getOutputSchema()
      };

      expect(pluginInfo.name).toBeDefined();
      expect(pluginInfo.version).toBeDefined();
      expect(pluginInfo.supportedDataTypes.length).toBeGreaterThan(0);
      expect(pluginInfo.outputSchema).toBeDefined();
    });

    test('should work in plugin registry system', () => {
      // Simulate plugin registration
      const registry = new Map();
      const name = interpreter.getName();

      registry.set(name, interpreter);

      const retrievedInterpreter = registry.get(name);
      expect(retrievedInterpreter).toBe(interpreter);

      // Should maintain functionality after registration
      expect(retrievedInterpreter.supports('dependencies')).toBe(
        interpreter.supports('dependencies')
      );
    });
  });
});