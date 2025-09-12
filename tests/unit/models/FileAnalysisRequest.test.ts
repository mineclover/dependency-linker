/**
 * Unit tests for FileAnalysisRequest model
 */

import { 
  FileAnalysisRequest,
  AnalysisOptions,
  validateFileAnalysisRequest,
  normalizeAnalysisOptions,
  isTypeScriptFile
} from '../../../src/models/FileAnalysisRequest';

describe('FileAnalysisRequest Model', () => {
  describe('AnalysisOptions interface', () => {
    test('should create valid options object', () => {
      const options: AnalysisOptions = {
        format: 'json',
        includeSources: true,
        parseTimeout: 5000
      };

      expect(options.format).toBe('json');
      expect(options.includeSources).toBe(true);
      expect(options.parseTimeout).toBe(5000);
    });

    test('should work with minimal options', () => {
      const options: Partial<AnalysisOptions> = {
        format: 'text'
      };

      expect(options.format).toBe('text');
      expect(options.includeSources).toBeUndefined();
      expect(options.parseTimeout).toBeUndefined();
    });
  });

  describe('FileAnalysisRequest interface', () => {
    test('should create valid request', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts',
        options: {
          format: 'json',
          includeSources: false
        }
      };

      expect(request.filePath).toBe('/test/file.ts');
      expect(request.options?.format).toBe('json');
      expect(request.options?.includeSources).toBe(false);
    });

    test('should work without options', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts'
      };

      expect(request.filePath).toBe('/test/file.ts');
      expect(request.options).toBeUndefined();
    });
  });

  describe('validateFileAnalysisRequest', () => {
    test('should validate valid request', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts',
        options: { format: 'json' }
      };

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject request without filePath', () => {
      const request = {} as FileAnalysisRequest;

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('filePath is required and must be a string');
    });

    test('should reject empty filePath', () => {
      const request: FileAnalysisRequest = {
        filePath: '   ', // whitespace only
        options: { format: 'json' }
      };

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('filePath cannot be empty');
    });

    test('should reject invalid format', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts',
        options: { format: 'invalid' as any }
      };

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('format must be one of: json, text, compact, summary, csv, deps-only, table');
    });

    test('should reject invalid parseTimeout', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts',
        options: { 
          format: 'json',
          parseTimeout: -100
        }
      };

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('parseTimeout must be a positive number');
    });

    test('should accept request without options', () => {
      const request: FileAnalysisRequest = {
        filePath: '/test/file.ts'
      };

      const result = validateFileAnalysisRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('normalizeAnalysisOptions', () => {
    test('should provide defaults for undefined options', () => {
      const normalized = normalizeAnalysisOptions(undefined);

      expect(normalized.format).toBe('json');
      expect(normalized.includeSources).toBe(false);
      expect(normalized.parseTimeout).toBe(5000);
    });

    test('should provide defaults for missing properties', () => {
      const options: Partial<AnalysisOptions> = {
        format: 'text'
      };

      const normalized = normalizeAnalysisOptions(options);

      expect(normalized.format).toBe('text');
      expect(normalized.includeSources).toBe(false);
      expect(normalized.parseTimeout).toBe(5000);
    });

    test('should preserve provided values', () => {
      const options: AnalysisOptions = {
        format: 'json',
        includeSources: true,
        parseTimeout: 5000
      };

      const normalized = normalizeAnalysisOptions(options);

      expect(normalized.format).toBe('json');
      expect(normalized.includeSources).toBe(true);
      expect(normalized.parseTimeout).toBe(5000);
    });
  });

  describe('isTypeScriptFile', () => {
    test('should return true for .ts files', () => {
      expect(isTypeScriptFile('/test/file.ts')).toBe(true);
      expect(isTypeScriptFile('component.ts')).toBe(true);
      expect(isTypeScriptFile('./utils.ts')).toBe(true);
    });

    test('should return true for .tsx files', () => {
      expect(isTypeScriptFile('/test/Component.tsx')).toBe(true);
      expect(isTypeScriptFile('App.tsx')).toBe(true);
      expect(isTypeScriptFile('./Button.tsx')).toBe(true);
    });

    test('should return false for non-TypeScript files', () => {
      expect(isTypeScriptFile('/test/file.js')).toBe(false);
      expect(isTypeScriptFile('component.jsx')).toBe(false);
      expect(isTypeScriptFile('styles.css')).toBe(false);
      expect(isTypeScriptFile('README.md')).toBe(false);
      expect(isTypeScriptFile('package.json')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isTypeScriptFile('')).toBe(false);
      expect(isTypeScriptFile('.ts')).toBe(true);
      expect(isTypeScriptFile('.tsx')).toBe(true);
      expect(isTypeScriptFile('file')).toBe(false);
      expect(isTypeScriptFile('file.')).toBe(false);
    });
  });
});