/**
 * Unit tests for FileAnalyzer
 */

import { FileAnalyzer } from '../../../src/services/FileAnalyzer';
import { TypeScriptParser } from '../../../src/services/TypeScriptParser';
import { DependencyAnalyzer } from '../../../src/services/DependencyAnalyzer';
import { FileAnalysisRequest, AnalysisOptions } from '../../../src/models/FileAnalysisRequest';
import { AnalysisResult } from '../../../src/models/AnalysisResult';
import { AnalysisException } from '../../../src/models/AnalysisResult';

// Mock tree-sitter and related modules to avoid native build issues
jest.mock('tree-sitter', () => jest.fn());
jest.mock('tree-sitter-typescript', () => ({
  typescript: jest.fn(),
  tsx: jest.fn()
}));

// Mock dependencies
jest.mock('../../../src/parsers/TypeScriptParserEnhanced');
jest.mock('../../../src/services/TypeScriptParser');
jest.mock('../../../src/services/DependencyAnalyzer');

// Mock fs with proper typing
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn()
  },
  constants: {
    F_OK: 0
  }
}));

const fs = require('fs');

describe('FileAnalyzer', () => {
  let fileAnalyzer: FileAnalyzer;
  let mockParser: jest.Mocked<TypeScriptParser>;
  let mockDependencyAnalyzer: jest.Mocked<DependencyAnalyzer>;

  beforeEach(() => {
    mockParser = {
      parseFile: jest.fn()
    } as any;

    mockDependencyAnalyzer = {
      classifyDependencies: jest.fn(),
      generateReport: jest.fn()
    } as any;

    (TypeScriptParser as jest.Mock).mockImplementation(() => mockParser);
    (DependencyAnalyzer as jest.Mock).mockImplementation(() => mockDependencyAnalyzer);

    fileAnalyzer = new FileAnalyzer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeFile', () => {
    const validRequest: FileAnalysisRequest = {
      filePath: '/test/file.ts',
      options: {
        parseTimeout: 5000
      }
    };

    beforeEach(() => {
      // Mock successful file operations by default
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.readFile.mockResolvedValue('export const test = 1;');
    });

    test('should successfully analyze a valid TypeScript file', async () => {
      const mockParseResult: AnalysisResult = {
        success: true,
        filePath: '/test/file.ts',
        parseTime: 100,
        dependencies: [
          { source: 'lodash', type: 'external', location: { line: 1, column: 0, offset: 0 } }
        ],
        imports: [],
        exports: []
      };

      const classifiedDeps = [
        { 
          source: 'lodash', 
          type: 'external', 
          location: { line: 1, column: 0, offset: 0 },
          isNodeBuiltin: false,
          isScopedPackage: false,
          packageName: 'lodash'
        }
      ];

      mockParser.parseFile.mockResolvedValue(mockParseResult);
      mockDependencyAnalyzer.classifyDependencies.mockResolvedValue(classifiedDeps as any);

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.dependencies).toEqual(classifiedDeps);
      expect(mockParser.parseFile).toHaveBeenCalledWith('/test/file.ts', 'export const test = 1;');
      expect(mockDependencyAnalyzer.classifyDependencies).toHaveBeenCalledWith(
        [{ source: 'lodash', type: 'external', location: { line: 1, column: 0, offset: 0 } }],
        '/test/file.ts'
      );
    });

    test('should handle file not found', async () => {
      fs.promises.access.mockRejectedValue(new Error('File not found'));

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
      expect(result.error?.message).toContain('File not found');
    });

    test('should handle non-TypeScript files', async () => {
      const jsRequest = { ...validRequest, filePath: '/test/file.js' };

      const result = await fileAnalyzer.analyzeFile(jsRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_FILE_TYPE');
      expect(result.error?.message).toContain('Only TypeScript files');
    });

    test('should handle invalid request validation', async () => {
      const invalidRequest: FileAnalysisRequest = {
        filePath: '',
        options: {}
      };

      const result = await fileAnalyzer.analyzeFile(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('Invalid request');
    });

    test('should handle file read permission errors', async () => {
      const permissionError = new Error('Permission denied') as any;
      permissionError.code = 'EACCES';
      fs.promises.readFile.mockRejectedValue(permissionError);

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });

    test('should handle file read ENOENT errors', async () => {
      const notFoundError = new Error('File not found') as any;
      notFoundError.code = 'ENOENT';
      fs.promises.readFile.mockRejectedValue(notFoundError);

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
    });

    test('should handle parsing timeout', async () => {
      const timeoutRequest = { ...validRequest, options: { parseTimeout: 1 } };

      // Make parser hang longer than timeout
      mockParser.parseFile.mockImplementation(() => 
        new Promise(() => {}) // Never resolves to simulate timeout
      );

      const result = await fileAnalyzer.analyzeFile(timeoutRequest);

      expect(result.success).toBe(false);
      // Note: The timeout logic in the original code has issues, 
      // but we test the expected behavior
    });

    test('should handle parser failure', async () => {
      const failedParseResult: AnalysisResult = {
        success: false,
        filePath: '/test/file.ts',
        parseTime: 50,
        dependencies: [],
        imports: [],
        exports: [],
        error: {
          code: 'PARSE_ERROR',
          message: 'Syntax error'
        }
      };

      mockParser.parseFile.mockResolvedValue(failedParseResult);

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result).toEqual(failedParseResult);
      expect(mockDependencyAnalyzer.classifyDependencies).not.toHaveBeenCalled();
    });

    test('should handle AnalysisException', async () => {
      const analysisException = new AnalysisException({
        code: 'PARSE_ERROR',
        message: 'Custom analysis error'
      });

      mockParser.parseFile.mockRejectedValue(analysisException);

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toBe('Custom analysis error');
    });

    test('should handle generic errors', async () => {
      mockParser.parseFile.mockRejectedValue(new Error('Generic error'));

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('Analysis failed: Generic error');
    });

    test('should handle non-Error exceptions', async () => {
      mockParser.parseFile.mockRejectedValue('String error');

      const result = await fileAnalyzer.analyzeFile(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('Analysis failed: String error');
    });
  });

  describe('analyzeFiles', () => {
    test('should analyze multiple files with default concurrency', async () => {
      const requests: FileAnalysisRequest[] = [
        { filePath: '/test/file1.ts', options: {} },
        { filePath: '/test/file2.ts', options: {} }
      ];

      const mockResults: AnalysisResult[] = [
        { success: true, filePath: '/test/file1.ts', parseTime: 100, dependencies: [], imports: [], exports: [] },
        { success: true, filePath: '/test/file2.ts', parseTime: 150, dependencies: [], imports: [], exports: [] }
      ];

      jest.spyOn(fileAnalyzer, 'analyzeFile')
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const results = await fileAnalyzer.analyzeFiles(requests);

      expect(results).toEqual(mockResults);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledTimes(2);
    });

    test('should analyze files with custom concurrency', async () => {
      const requests: FileAnalysisRequest[] = Array.from({ length: 10 }, (_, i) => ({
        filePath: `/test/file${i}.ts`,
        options: {}
      }));

      const mockResult: AnalysisResult = {
        success: true,
        filePath: '',
        parseTime: 100,
        dependencies: [],
        imports: [],
        exports: []
      };

      jest.spyOn(fileAnalyzer, 'analyzeFile').mockResolvedValue(mockResult);

      const results = await fileAnalyzer.analyzeFiles(requests, 3);

      expect(results).toHaveLength(10);
      expect(fileAnalyzer.analyzeFile).toHaveBeenCalledTimes(10);
    });

    test('should handle empty requests array', async () => {
      const results = await fileAnalyzer.analyzeFiles([]);
      expect(results).toEqual([]);
    });
  });

  describe('getAnalysisStats', () => {
    test('should return correct statistics', () => {
      const result: AnalysisResult = {
        success: true,
        filePath: '/test/file.ts',
        parseTime: 123,
        dependencies: [
          { source: 'lodash', type: 'external', location: { line: 1, column: 0, offset: 0 } },
          { source: './utils', type: 'relative', location: { line: 2, column: 0, offset: 0 } }
        ],
        imports: [
          { source: 'lodash', specifiers: [], isTypeOnly: false, location: { line: 1, column: 0, offset: 0 } }
        ],
        exports: [
          { name: 'test', type: 'named', isTypeOnly: false, location: { line: 5, column: 0, offset: 0 } }
        ]
      };

      const stats = fileAnalyzer.getAnalysisStats(result);

      expect(stats.dependencies).toBe(2);
      expect(stats.imports).toBe(1);
      expect(stats.exports).toBe(1);
      expect(stats.parseTime).toBe(123);
      expect(stats.success).toBe(true);
    });
  });

  describe('validateFile', () => {
    beforeEach(() => {
      fs.promises.stat.mockResolvedValue({
        size: 1000
      } as any);
    });

    test('should validate a good TypeScript file', async () => {
      fs.promises.access.mockResolvedValue(undefined);

      const validation = await fileAnalyzer.validateFile('/test/file.ts');

      expect(validation.canAnalyze).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should reject invalid file path', async () => {
      const validation = await fileAnalyzer.validateFile('');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('File path is required');
    });

    test('should reject non-TypeScript files', async () => {
      fs.promises.access.mockResolvedValue(undefined);

      const validation = await fileAnalyzer.validateFile('/test/file.js');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('File must be a TypeScript file (.ts or .tsx)');
    });

    test('should reject non-existent files', async () => {
      fs.promises.access.mockRejectedValue(new Error('File not found'));

      const validation = await fileAnalyzer.validateFile('/test/file.ts');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('File does not exist');
    });

    test('should reject files that are too large', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({
        size: 15 * 1024 * 1024 // 15MB
      } as any);

      const validation = await fileAnalyzer.validateFile('/test/file.ts');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('File is too large (>10MB)');
    });

    test('should reject empty files', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockResolvedValue({
        size: 0
      } as any);

      const validation = await fileAnalyzer.validateFile('/test/file.ts');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });

    test('should handle stat errors', async () => {
      fs.promises.access.mockResolvedValue(undefined);
      fs.promises.stat.mockRejectedValue(new Error('Permission denied'));

      const validation = await fileAnalyzer.validateFile('/test/file.ts');

      expect(validation.canAnalyze).toBe(false);
      expect(validation.errors).toContain('Cannot access file: Permission denied');
    });
  });

  describe('generateDependencyReport', () => {
    test('should generate report for successful analysis', () => {
      const result: AnalysisResult = {
        success: true,
        filePath: '/test/file.ts',
        parseTime: 100,
        dependencies: [
          { source: 'lodash', type: 'external', location: { line: 1, column: 0, offset: 0 } }
        ] as any,
        imports: [],
        exports: []
      };

      const mockReport = '# Dependency Report\nExternal: lodash';
      mockDependencyAnalyzer.generateReport.mockReturnValue(mockReport);

      const report = fileAnalyzer.generateDependencyReport(result);

      expect(report).toBe(mockReport);
      expect(mockDependencyAnalyzer.generateReport).toHaveBeenCalledWith(result.dependencies);
    });

    test('should generate error report for failed analysis', () => {
      const result: AnalysisResult = {
        success: false,
        filePath: '/test/file.ts',
        parseTime: 50,
        dependencies: [],
        imports: [],
        exports: [],
        error: {
          code: 'PARSE_ERROR',
          message: 'Syntax error in file'
        }
      };

      const report = fileAnalyzer.generateDependencyReport(result);

      expect(report).toContain('# Analysis Failed');
      expect(report).toContain('Error: Syntax error in file');
      expect(mockDependencyAnalyzer.generateReport).not.toHaveBeenCalled();
    });

    test('should handle result without error message', () => {
      const result: AnalysisResult = {
        success: false,
        filePath: '/test/file.ts',
        parseTime: 50,
        dependencies: [],
        imports: [],
        exports: []
      };

      const report = fileAnalyzer.generateDependencyReport(result);

      expect(report).toContain('# Analysis Failed');
      expect(report).toContain('Error: Unknown error');
    });
  });

  describe('getVersion', () => {
    test('should return version information', () => {
      const version = fileAnalyzer.getVersion();

      expect(version.parser).toContain('TypeScript Parser');
      expect(version.treeSitter).toContain('tree-sitter');
      expect(version.analyzer).toContain('File Analyzer');
    });
  });
});