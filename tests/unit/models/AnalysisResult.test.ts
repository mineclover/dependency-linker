/**
 * Unit tests for AnalysisResult model
 */

import { 
  AnalysisResult, 
  AnalysisError,
  AnalysisException,
  createSuccessResult, 
  createErrorResult,
  createFileNotFoundError,
  createInvalidFileTypeError,
  createPermissionDeniedError,
  createParseError,
  createTimeoutError,
  isValidAnalysisResult
} from '../../../src/models/AnalysisResult';
import { DependencyInfo, createDependencyInfo } from '../../../src/models/DependencyInfo';
import { ImportInfo, createImportInfo, createDefaultImportSpecifier } from '../../../src/models/ImportInfo';
import { ExportInfo, createDefaultExport } from '../../../src/models/ExportInfo';
import { SourceLocation } from '../../../src/models/SourceLocation';

describe('AnalysisResult Model', () => {
  const mockLocation: SourceLocation = {
    line: 1,
    column: 0,
    offset: 0
  };
  describe('AnalysisError interface', () => {
    test('should create valid error object', () => {
      const error: AnalysisError = {
        code: 'PARSE_ERROR',
        message: 'Failed to parse file',
        details: { line: 5, column: 10 }
      };

      expect(error.code).toBe('PARSE_ERROR');
      expect(error.message).toBe('Failed to parse file');
      expect(error.details).toEqual({ line: 5, column: 10 });
    });

    test('should work without details', () => {
      const error: AnalysisError = {
        code: 'FILE_NOT_FOUND',
        message: 'File not found'
      };

      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.message).toBe('File not found');
      expect(error.details).toBeUndefined();
    });
  });

  describe('createSuccessResult', () => {
    test('should create successful result', () => {
      const dependencies: DependencyInfo[] = [
        createDependencyInfo('react', mockLocation)
      ];
      const imports: ImportInfo[] = [
        createImportInfo('react', [createDefaultImportSpecifier('React')], mockLocation)
      ];
      const exports: ExportInfo[] = [
        createDefaultExport('Component', mockLocation)
      ];

      const result = createSuccessResult(
        '/test/file.ts',
        100,
        dependencies,
        imports,
        exports
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.parseTime).toBe(100);
      expect(result.dependencies).toEqual(dependencies);
      expect(result.imports).toEqual(imports);
      expect(result.exports).toEqual(exports);
      expect(result.error).toBeUndefined();
    });
  });

  describe('createErrorResult', () => {
    test('should create error result', () => {
      const error: AnalysisError = {
        code: 'PARSE_ERROR',
        message: 'Syntax error'
      };

      const result = createErrorResult('/test/file.ts', error, 50);

      expect(result.success).toBe(false);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.parseTime).toBe(50);
      expect(result.error).toEqual(error);
      expect(result.dependencies).toEqual([]);
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });
  });

  describe('error factory functions', () => {
    test('createFileNotFoundError should create correct error', () => {
      const error = createFileNotFoundError('/missing/file.ts');

      expect(error.analysisError.code).toBe('FILE_NOT_FOUND');
      expect(error.analysisError.message).toContain('/missing/file.ts');
    });

    test('createInvalidFileTypeError should create correct error', () => {
      const error = createInvalidFileTypeError('.txt');

      expect(error.code).toBe('INVALID_FILE_TYPE');
      expect(error.message).toContain('.txt');
    });

    test('createPermissionDeniedError should create correct error', () => {
      const error = createPermissionDeniedError('/protected/file.ts');

      expect(error.analysisError.code).toBe('PERMISSION_DENIED');
      expect(error.analysisError.message).toContain('/protected/file.ts');
    });

    test('createParseError should create correct error', () => {
      const originalError = new Error('Syntax error at line 5');
      const error = createParseError(originalError);

      expect(error.code).toBe('PARSE_ERROR');
      expect(error.message).toContain('Syntax error at line 5');
      expect(error.details).toBeDefined();
    });

    test('createTimeoutError should create correct error', () => {
      const error = createTimeoutError(5000);

      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toContain('5000');
    });
  });

  describe('AnalysisResult structure validation', () => {
    test('should have all required properties for success', () => {
      const result = createSuccessResult('/test.ts', 100, [], [], []);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('parseTime');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(isValidAnalysisResult(result)).toBe(true);
    });

    test('should have all required properties for error', () => {
      const error = { code: 'PARSE_ERROR' as const, message: 'Error' };
      const result = createErrorResult('/test.ts', error);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('parseTime');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('error');
      expect(isValidAnalysisResult(result)).toBe(true);
    });

    test('should validate AnalysisException usage', () => {
      const exception = createFileNotFoundError('/missing.ts');
      expect(exception).toBeInstanceOf(AnalysisException);
      expect(exception.name).toBe('AnalysisException');
      expect(exception.analysisError.code).toBe('FILE_NOT_FOUND');
    });
  });
});