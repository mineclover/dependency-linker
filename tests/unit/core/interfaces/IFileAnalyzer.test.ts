import { IFileAnalyzer } from '../../../../src/core/interfaces/IFileAnalyzer';
import { FileAnalysisRequest } from '../../../../src/models/FileAnalysisRequest';
import { AnalysisResult } from '../../../../src/models/AnalysisResult';
import { ValidationResult } from '../../../../src/core/types/ParseTypes';

describe('IFileAnalyzer Interface Contract', () => {
  // Mock implementation for testing the interface contract
  class MockFileAnalyzer implements IFileAnalyzer {
    async analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult> {
      return {
        filePath: request.filePath,
        success: true,
        imports: [],
        exports: [],
        dependencies: [],
        parseTime: 100
      };
    }

    async validateFile(filePath: string): Promise<ValidationResult> {
      return {
        isValid: true,
        filePath,
        canAnalyze: true,
        errors: [],
        fileInfo: {
          size: 1000,
          extension: '.ts',
          lastModified: new Date()
        }
      };
    }
  }

  let analyzer: IFileAnalyzer;

  beforeEach(() => {
    analyzer = new MockFileAnalyzer();
  });

  describe('analyzeFile method contract', () => {
    it('should accept valid FileAnalysisRequest parameter', async () => {
      const request: FileAnalysisRequest = {
        filePath: '/path/to/test.ts',
        options: {
          format: 'json',
          includeSources: true,
          parseTimeout: 5000
        }
      };

      const result = await analyzer.analyzeFile(request);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should return Promise<AnalysisResult>', async () => {
      const request: FileAnalysisRequest = {
        filePath: '/path/to/test.ts'
      };

      const result = await analyzer.analyzeFile(request);
      
      // Validate AnalysisResult structure
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('parseTime');

      expect(typeof result.filePath).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.imports)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(typeof result.parseTime).toBe('number');
    });

    it('should handle minimum required request properties', async () => {
      const minimalRequest: FileAnalysisRequest = {
        filePath: '/minimal/test.ts'
      };

      const result = await analyzer.analyzeFile(minimalRequest);
      expect(result).toBeDefined();
      expect(result.filePath).toBe(minimalRequest.filePath);
    });

    it('should handle request with all options', async () => {
      const fullRequest: FileAnalysisRequest = {
        filePath: '/full/test.ts',
        options: {
          format: 'json',
          includeSources: true,
          parseTimeout: 5000
        }
      };

      const result = await analyzer.analyzeFile(fullRequest);
      expect(result).toBeDefined();
      expect(result.filePath).toBe(fullRequest.filePath);
    });
  });

  describe('validateFile method contract', () => {
    it('should accept string filePath parameter', async () => {
      const filePath = '/path/to/validate.ts';
      
      const result = await analyzer.validateFile(filePath);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should return Promise<ValidationResult>', async () => {
      const filePath = '/path/to/validate.ts';
      
      const result = await analyzer.validateFile(filePath);
      
      // Validate ValidationResult structure
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('canAnalyze');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('fileInfo');

      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.filePath).toBe('string');
      expect(typeof result.canAnalyze).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should validate return type for valid file', async () => {
      const result = await analyzer.validateFile('/valid/test.ts');
      
      expect(result.isValid).toBe(true);
      expect(result.canAnalyze).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling contract expectations', () => {
    // Mock implementation that throws specific errors for testing
    class ErrorThrowingAnalyzer implements IFileAnalyzer {
      private errorType: string;

      constructor(errorType: string) {
        this.errorType = errorType;
      }

      async analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult> {
        switch (this.errorType) {
          case 'FileNotFoundError':
            throw new Error('FileNotFoundError: File does not exist');
          case 'InvalidFileTypeError':
            throw new Error('InvalidFileTypeError: File is not TypeScript');
          case 'ParseTimeoutError':
            throw new Error('ParseTimeoutError: Parsing exceeded timeout');
          default:
            throw new Error('Unknown error');
        }
      }

      async validateFile(filePath: string): Promise<ValidationResult> {
        return { 
          isValid: false,
          filePath,
          canAnalyze: false, 
          errors: [this.errorType] 
        };
      }
    }

    it('should handle FileNotFoundError appropriately', async () => {
      const errorAnalyzer = new ErrorThrowingAnalyzer('FileNotFoundError');
      const request: FileAnalysisRequest = { filePath: '/nonexistent/file.ts' };

      await expect(errorAnalyzer.analyzeFile(request))
        .rejects.toThrow('FileNotFoundError');
    });

    it('should handle InvalidFileTypeError appropriately', async () => {
      const errorAnalyzer = new ErrorThrowingAnalyzer('InvalidFileTypeError');
      const request: FileAnalysisRequest = { filePath: '/invalid/file.js' };

      await expect(errorAnalyzer.analyzeFile(request))
        .rejects.toThrow('InvalidFileTypeError');
    });

    it('should handle ParseTimeoutError appropriately', async () => {
      const errorAnalyzer = new ErrorThrowingAnalyzer('ParseTimeoutError');
      const request: FileAnalysisRequest = { 
        filePath: '/timeout/file.ts',
        options: { parseTimeout: 100 }
      };

      await expect(errorAnalyzer.analyzeFile(request))
        .rejects.toThrow('ParseTimeoutError');
    });
  });

  describe('async operation patterns', () => {
    it('should support concurrent analyzeFile calls', async () => {
      const requests: FileAnalysisRequest[] = [
        { filePath: '/test1.ts' },
        { filePath: '/test2.ts' },
        { filePath: '/test3.ts' }
      ];

      const promises = requests.map(request => analyzer.analyzeFile(request));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.filePath).toBe(requests[index].filePath);
      });
    });

    it('should support concurrent validateFile calls', async () => {
      const filePaths = ['/test1.ts', '/test2.ts', '/test3.ts'];

      const promises = filePaths.map(filePath => analyzer.validateFile(filePath));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.canAnalyze).toBeDefined();
      });
    });
  });

  describe('method signature validation', () => {
    it('should have correct analyzeFile method signature', () => {
      expect(typeof analyzer.analyzeFile).toBe('function');
      expect(analyzer.analyzeFile.length).toBe(1); // Should accept 1 parameter
    });

    it('should have correct validateFile method signature', () => {
      expect(typeof analyzer.validateFile).toBe('function');
      expect(analyzer.validateFile.length).toBe(1); // Should accept 1 parameter
    });
  });
});