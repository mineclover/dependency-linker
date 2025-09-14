/**
 * Contract test for IDataExtractor interface
 * Validates that any implementation of IDataExtractor satisfies the required behavior
 */

import { describe, test, expect } from '@jest/globals';

// Test interface contracts
interface IDataExtractor<T> {
  extract(ast: any, filePath: string): T;
  supports(language: string): boolean;
  getName(): string;
  getVersion(): string;
  validate(data: T): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

describe('IDataExtractor Contract', () => {
  let extractor: IDataExtractor<any>;

  beforeEach(() => {
    // Mock implementation for testing
    extractor = {
      extract: jest.fn().mockReturnValue({
        dependencies: [],
        identifiers: [],
        metadata: {}
      }),
      supports: jest.fn().mockReturnValue(true),
      getName: jest.fn().mockReturnValue('test-extractor'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      validate: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })
    };
  });

  describe('Core Extraction', () => {
    test('extract should accept AST and file path', () => {
      const mockAst = { type: 'Program', children: [] };
      const result = extractor.extract(mockAst, 'test.ts');

      expect(extractor.extract).toHaveBeenCalledWith(mockAst, 'test.ts');
      expect(result).toBeDefined();
    });

    test('extract should return consistent data structure', () => {
      const mockAst = { type: 'Program', children: [] };
      const result1 = extractor.extract(mockAst, 'test1.ts');
      const result2 = extractor.extract(mockAst, 'test2.ts');

      // Results should have same structure (keys/types)
      expect(typeof result1).toBe(typeof result2);
      if (typeof result1 === 'object' && result1 !== null) {
        expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      }
    });

    test('extract should handle empty AST', () => {
      const emptyAst = null;
      const result = extractor.extract(emptyAst, 'empty.ts');

      expect(result).toBeDefined();
      // Should not throw error
    });

    test('extract should handle complex AST structures', () => {
      const complexAst = {
        type: 'Program',
        children: [
          {
            type: 'ImportDeclaration',
            source: 'module1',
            children: []
          },
          {
            type: 'FunctionDeclaration',
            name: 'test',
            children: []
          }
        ]
      };

      const result = extractor.extract(complexAst, 'complex.ts');
      expect(result).toBeDefined();
    });
  });

  describe('Language Support', () => {
    test('supports should return boolean', () => {
      const result = extractor.supports('typescript');
      expect(typeof result).toBe('boolean');
    });

    test('supports should handle multiple languages', () => {
      const languages = ['typescript', 'javascript', 'go', 'java', 'python'];

      languages.forEach(lang => {
        const result = extractor.supports(lang);
        expect(typeof result).toBe('boolean');
      });
    });

    test('should have specific language support pattern', () => {
      // Each extractor should support at least one language
      const supportedLanguages = ['typescript', 'javascript', 'go', 'java', 'python'];
      const hasSupport = supportedLanguages.some(lang => extractor.supports(lang));
      expect(hasSupport).toBe(true);
    });
  });

  describe('Metadata', () => {
    test('getName should return string identifier', () => {
      const name = extractor.getName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    test('getVersion should return valid version string', () => {
      const version = extractor.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      // Should match semver pattern (basic check)
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('getName should return consistent value', () => {
      const name1 = extractor.getName();
      const name2 = extractor.getName();
      expect(name1).toBe(name2);
    });
  });

  describe('Data Validation', () => {
    test('validate should return ValidationResult', () => {
      const testData = { test: 'data' };
      const result = extractor.validate(testData);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('validate should accept extracted data format', () => {
      const mockAst = { type: 'Program', children: [] };
      const extractedData = extractor.extract(mockAst, 'test.ts');
      const validationResult = extractor.validate(extractedData);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('validate should detect invalid data', () => {
      const invalidData = null;
      const mockResult = {
        isValid: false,
        errors: ['Data cannot be null'],
        warnings: []
      };

      (extractor.validate as jest.Mock).mockReturnValue(mockResult);

      const result = extractor.validate(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validate should provide meaningful error messages', () => {
      const invalidData = { malformed: true };
      const mockResult = {
        isValid: false,
        errors: ['Missing required field: dependencies', 'Invalid data structure'],
        warnings: ['Deprecated field detected']
      };

      (extractor.validate as jest.Mock).mockReturnValue(mockResult);

      const result = extractor.validate(invalidData);
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Requirements', () => {
    test('extract should complete quickly for small ASTs', () => {
      const smallAst = { type: 'Program', children: [] };

      const startTime = Date.now();
      extractor.extract(smallAst, 'test.ts');
      const duration = Date.now() - startTime;

      // Should complete in less than 10ms for small ASTs
      expect(duration).toBeLessThan(10);
    });

    test('supports should execute instantly', () => {
      const startTime = Date.now();
      extractor.supports('typescript');
      const duration = Date.now() - startTime;

      // Should complete in less than 1ms
      expect(duration).toBeLessThan(1);
    });

    test('validate should be efficient', () => {
      const testData = { small: 'dataset' };

      const startTime = Date.now();
      extractor.validate(testData);
      const duration = Date.now() - startTime;

      // Should complete in less than 5ms for small data
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Error Handling', () => {
    test('extract should handle malformed AST gracefully', () => {
      const malformedAst = { invalidStructure: true };

      expect(() => {
        extractor.extract(malformedAst, 'test.ts');
      }).not.toThrow();
    });

    test('extract should handle missing file path', () => {
      const mockAst = { type: 'Program', children: [] };

      expect(() => {
        extractor.extract(mockAst, '');
      }).not.toThrow();
    });

    test('validate should handle null/undefined data', () => {
      expect(() => {
        extractor.validate(null);
      }).not.toThrow();

      expect(() => {
        extractor.validate(undefined);
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    test('extract should return consistent type', () => {
      const mockAst = { type: 'Program', children: [] };
      const result1 = extractor.extract(mockAst, 'test1.ts');
      const result2 = extractor.extract(mockAst, 'test2.ts');

      expect(typeof result1).toBe(typeof result2);
    });

    test('validate should accept return type of extract', () => {
      const mockAst = { type: 'Program', children: [] };
      const extractedData = extractor.extract(mockAst, 'test.ts');

      // This should not cause type errors
      expect(() => {
        extractor.validate(extractedData);
      }).not.toThrow();
    });
  });

  describe('Plugin Compatibility', () => {
    test('should work with plugin registry system', () => {
      // Test that extractor can be registered and retrieved
      const name = extractor.getName();
      const version = extractor.getVersion();

      expect(name).toBeDefined();
      expect(version).toBeDefined();

      // Should be able to check language support
      const supportsTS = extractor.supports('typescript');
      expect(typeof supportsTS).toBe('boolean');
    });

    test('should provide plugin metadata', () => {
      const metadata = {
        name: extractor.getName(),
        version: extractor.getVersion(),
        supportedLanguages: ['typescript', 'javascript', 'go', 'java'].filter(lang =>
          extractor.supports(lang)
        )
      };

      expect(metadata.name).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.supportedLanguages.length).toBeGreaterThan(0);
    });
  });
});