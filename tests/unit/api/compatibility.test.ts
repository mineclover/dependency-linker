/**
 * Unit Tests for Compatibility Functions
 * Tests for the compatibility bridge between old and new API formats
 */

import { describe, it, expect } from '@jest/globals';

import {
  toLegacyAnalysisResult,
  fromLegacyAnalysisResult,
  adaptAnalysisResult,
  isLegacyAnalysisResult
} from '../../../src/lib/compatibility';
import { AnalysisResult, AnalysisResultFactory } from '../../../src/models/AnalysisResult';
import type { LegacyAnalysisResult } from '../../../src/models/AnalysisResult';

describe('Compatibility Bridge Functions', () => {
  describe('toLegacyAnalysisResult', () => {
    it('should convert new AnalysisResult to legacy format', () => {
      const newResult = AnalysisResultFactory.create('/test/file.ts', 'typescript');

      // Add some test data
      newResult.extractedData = {
        dependency: {
          dependencies: [
            {
              source: 'react',
              specifiers: ['Component'],
              type: 'import',
              isTypeOnly: false,
              location: { line: 1, column: 1, endLine: 1, endColumn: 20 }
            },
            {
              source: './types',
              specifiers: ['User'],
              type: 'import',
              isTypeOnly: true,
              location: { line: 2, column: 1, endLine: 2, endColumn: 15 }
            }
          ],
          totalCount: 2,
          importCount: 2,
          exportCount: 0,
          dynamicImportCount: 0,
          typeOnlyImportCount: 1
        },
        identifier: {
          identifiers: [
            {
              name: 'UserComponent',
              type: 'class',
              visibility: 'public',
              isExported: true,
              location: { line: 5, column: 1, endLine: 10, endColumn: 1 }
            }
          ],
          totalCount: 1,
          exportedCount: 1
        }
      };

      const legacy = toLegacyAnalysisResult(newResult);

      expect(legacy.filePath).toBe('/test/file.ts');
      expect(legacy.success).toBe(true);
      expect(legacy.dependencies).toHaveLength(2);
      expect(legacy.imports).toHaveLength(2);
      expect(legacy.exports).toHaveLength(1);

      // Check dependency mapping
      expect(legacy.dependencies[0].source).toBe('react');
      expect(legacy.dependencies[0].type).toBe('internal');
      expect(legacy.dependencies[0].isTypeOnly).toBe(false);
      expect(legacy.dependencies[0].line).toBe(1);

      expect(legacy.dependencies[1].source).toBe('./types');
      expect(legacy.dependencies[1].isTypeOnly).toBe(true);
      expect(legacy.dependencies[1].line).toBe(2);

      // Check export mapping
      expect(legacy.exports[0].name).toBe('UserComponent');
      expect(legacy.exports[0].type).toBe('class');
      expect(legacy.exports[0].line).toBe(5);
    });

    it('should handle results with errors', () => {
      const newResult = AnalysisResultFactory.create('/test/error.ts', 'typescript');
      newResult.errors = [{
        severity: 'error',
        category: 'parsing',
        message: 'Syntax error',
        context: { line: 5 },
        location: { line: 5, column: 1, endLine: 5, endColumn: 10 },
        timestamp: new Date()
      }];

      const legacy = toLegacyAnalysisResult(newResult);

      expect(legacy.success).toBe(false);
      expect(legacy.error).toBeDefined();
      expect(legacy.error!.code).toBe('PARSE_ERROR');
      expect(legacy.error!.message).toBe('Syntax error');
      expect(legacy.error!.details).toEqual({ line: 5 });
    });

    it('should handle empty results', () => {
      const newResult = AnalysisResultFactory.create('/test/empty.ts', 'typescript');

      const legacy = toLegacyAnalysisResult(newResult);

      expect(legacy.filePath).toBe('/test/empty.ts');
      expect(legacy.success).toBe(true);
      expect(legacy.dependencies).toEqual([]);
      expect(legacy.imports).toEqual([]);
      expect(legacy.exports).toEqual([]);
      expect(legacy.parseTime).toBe(0);
    });
  });

  describe('fromLegacyAnalysisResult', () => {
    it('should convert legacy AnalysisResult to new format', () => {
      const legacy: LegacyAnalysisResult = {
        filePath: '/test/file.ts',
        success: true,
        dependencies: [
          {
            source: 'lodash',
            type: 'external',
            line: 1,
            column: 1,
            isTypeOnly: false
          },
          {
            source: './utils',
            type: 'internal',
            line: 2,
            column: 1,
            isTypeOnly: true
          }
        ],
        imports: [
          {
            source: 'lodash',
            importClause: '{ map }',
            line: 1,
            column: 1,
            isTypeOnly: false
          }
        ],
        exports: [
          {
            name: 'processData',
            type: 'function',
            line: 10,
            column: 1,
            isDefault: false
          }
        ],
        parseTime: 150
      };

      const newResult = fromLegacyAnalysisResult(legacy);

      expect(newResult.filePath).toBe('/test/file.ts');
      expect(newResult.language).toBe('typescript');
      expect(newResult.errors).toEqual([]);

      // Check performance metrics
      expect(newResult.performanceMetrics.parsing).toBe(150);
      expect(newResult.performanceMetrics.total).toBe(150);

      // Check extracted data
      expect(newResult.extractedData.dependency).toBeDefined();
      expect(newResult.extractedData.dependency.dependencies).toHaveLength(2);
      expect(newResult.extractedData.dependency.totalCount).toBe(2);
      expect(newResult.extractedData.dependency.typeOnlyImportCount).toBe(1);

      expect(newResult.extractedData.identifier).toBeDefined();
      expect(newResult.extractedData.identifier.identifiers).toHaveLength(1);
      expect(newResult.extractedData.identifier.exportedCount).toBe(1);
    });

    it('should handle legacy errors', () => {
      const legacy: LegacyAnalysisResult = {
        filePath: '/test/error.ts',
        success: false,
        dependencies: [],
        imports: [],
        exports: [],
        parseTime: 0,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
          details: { path: '/test/error.ts' }
        }
      };

      const newResult = fromLegacyAnalysisResult(legacy);

      expect(newResult.errors).toHaveLength(1);
      expect(newResult.errors[0].category).toBe('file');
      expect(newResult.errors[0].message).toBe('File not found');
      expect(newResult.errors[0].context).toEqual({ path: '/test/error.ts' });
    });

    it('should detect language from file path', () => {
      const testCases = [
        { path: '/test/file.ts', expected: 'typescript' },
        { path: '/test/file.tsx', expected: 'tsx' },
        { path: '/test/file.js', expected: 'javascript' },
        { path: '/test/file.jsx', expected: 'jsx' },
        { path: '/test/file.go', expected: 'go' },
        { path: '/test/file.java', expected: 'java' },
        { path: '/test/file.unknown', expected: 'unknown' }
      ];

      testCases.forEach(({ path, expected }) => {
        const legacy: LegacyAnalysisResult = {
          filePath: path,
          success: true,
          dependencies: [],
          imports: [],
          exports: [],
          parseTime: 0
        };

        const newResult = fromLegacyAnalysisResult(legacy);
        expect(newResult.language).toBe(expected);
      });
    });
  });

  describe('isLegacyAnalysisResult', () => {
    it('should identify legacy results correctly', () => {
      const legacy: LegacyAnalysisResult = {
        filePath: '/test.ts',
        success: true,
        dependencies: [],
        imports: [],
        exports: [],
        parseTime: 0
      };

      expect(isLegacyAnalysisResult(legacy)).toBe(true);
    });

    it('should identify new results correctly', () => {
      const newResult = AnalysisResultFactory.create('/test.ts', 'typescript');

      expect(isLegacyAnalysisResult(newResult)).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(isLegacyAnalysisResult(null)).toBe(false);
      expect(isLegacyAnalysisResult(undefined)).toBe(false);
      expect(isLegacyAnalysisResult({})).toBe(false);
      expect(isLegacyAnalysisResult('string')).toBe(false);
      expect(isLegacyAnalysisResult(123)).toBe(false);
    });
  });

  describe('adaptAnalysisResult', () => {
    it('should adapt legacy result to both formats', () => {
      const legacy: LegacyAnalysisResult = {
        filePath: '/test.ts',
        success: true,
        dependencies: [],
        imports: [],
        exports: [],
        parseTime: 100
      };

      const adapted = adaptAnalysisResult(legacy);

      expect(adapted.legacy).toBe(legacy);
      expect(adapted.new).toBeDefined();
      expect(adapted.new.filePath).toBe('/test.ts');
    });

    it('should adapt new result to both formats', () => {
      const newResult = AnalysisResultFactory.create('/test.ts', 'typescript');

      const adapted = adaptAnalysisResult(newResult);

      expect(adapted.new).toBe(newResult);
      expect(adapted.legacy).toBeDefined();
      expect(adapted.legacy.filePath).toBe('/test.ts');
    });

    it('should maintain data consistency across formats', () => {
      const original: LegacyAnalysisResult = {
        filePath: '/test.ts',
        success: true,
        dependencies: [
          {
            source: 'react',
            type: 'external',
            line: 1,
            column: 1,
            isTypeOnly: false
          }
        ],
        imports: [
          {
            source: 'react',
            importClause: '{ Component }',
            line: 1,
            column: 1,
            isTypeOnly: false
          }
        ],
        exports: [
          {
            name: 'MyComponent',
            type: 'class',
            line: 5,
            column: 1,
            isDefault: false
          }
        ],
        parseTime: 200
      };

      const adapted = adaptAnalysisResult(original);
      const backConverted = toLegacyAnalysisResult(adapted.new);

      // Key data should be preserved
      expect(backConverted.filePath).toBe(original.filePath);
      expect(backConverted.success).toBe(original.success);
      expect(backConverted.dependencies.length).toBe(original.dependencies.length);
      expect(backConverted.imports.length).toBe(original.imports.length);
      expect(backConverted.exports.length).toBe(original.exports.length);
    });
  });

  describe('Error Mapping', () => {
    it('should map error codes correctly between formats', () => {
      const errorMappings = [
        { legacy: 'PARSE_ERROR', new: 'parsing' },
        { legacy: 'FILE_NOT_FOUND', new: 'file' },
        { legacy: 'PERMISSION_DENIED', new: 'permission' },
        { legacy: 'TIMEOUT', new: 'timeout' },
        { legacy: 'INVALID_FILE_TYPE', new: 'validation' }
      ];

      errorMappings.forEach(({ legacy: legacyCode, new: newCategory }) => {
        const legacy: LegacyAnalysisResult = {
          filePath: '/test.ts',
          success: false,
          dependencies: [],
          imports: [],
          exports: [],
          parseTime: 0,
          error: {
            code: legacyCode as any,
            message: 'Test error',
            details: {}
          }
        };

        const newResult = fromLegacyAnalysisResult(legacy);
        expect(newResult.errors[0].category).toBe(newCategory);

        const backConverted = toLegacyAnalysisResult(newResult);
        expect(backConverted.error?.code).toBe(legacyCode);
      });
    });
  });
});