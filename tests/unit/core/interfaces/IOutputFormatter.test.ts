import { IOutputFormatter } from '../../../../src/core/interfaces/IOutputFormatter';
import { AnalysisResult } from '../../../../src/models/AnalysisResult';
import { OutputFormat } from '../../../../src/models/FileAnalysisRequest';

describe('IOutputFormatter Interface Contract', () => {
  // Mock implementation for testing the interface contract
  class MockOutputFormatter implements IOutputFormatter {
    format(result: AnalysisResult, format: OutputFormat): string {
      switch (format) {
        case 'json':
          return JSON.stringify(result, null, 2);
        case 'compact':
          return JSON.stringify(result);
        case 'summary':
          return `${result.dependencies.length} dependencies found`;
        case 'table':
          return 'File\tDependencies\n' + `${result.filePath}\t${result.dependencies.length}`;
        case 'csv':
          return 'file,dependencies,success\n' + `${result.filePath},${result.dependencies.length},${result.success}`;
        case 'deps-only':
          return result.dependencies.map(dep => dep.source).join('\n');
        default:
          throw new Error(`UnsupportedFormatError: Format '${format}' is not supported`);
      }
    }

    getFormatHeader(format: OutputFormat): string {
      switch (format) {
        case 'csv':
          return 'file,dependencies,success';
        case 'table':
          return 'File\tDependencies';
        default:
          return '';
      }
    }
  }

  let formatter: IOutputFormatter;
  let sampleResult: AnalysisResult;

  beforeEach(() => {
    formatter = new MockOutputFormatter();
    sampleResult = {
      filePath: '/test/sample.ts',
      success: true,
      imports: [],
      exports: [],
      dependencies: [
        { source: 'react', type: 'external', location: { line: 1, column: 1, offset: 0 } },
        { source: './utils', type: 'relative', location: { line: 2, column: 1, offset: 50 } }
      ],
      parseTime: 150
    };
  });

  describe('format method contract', () => {
    it('should accept AnalysisResult and OutputFormat parameters', () => {
      const result = formatter.format(sampleResult, 'json');
      expect(typeof result).toBe('string');
      expect(result).toBeDefined();
    });

    it('should return string for all valid output formats', () => {
      const validFormats: OutputFormat[] = [
        'json', 'compact', 
        'summary', 'table', 'csv', 'deps-only'
      ];

      validFormats.forEach(format => {
        const result = formatter.format(sampleResult, format);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('JSON format validation', () => {
      it('should return valid JSON for json format', () => {
        const result = formatter.format(sampleResult, 'json');
        expect(() => JSON.parse(result)).not.toThrow();
        
        const parsed = JSON.parse(result);
        expect(parsed.filePath).toBe(sampleResult.filePath);
        expect(parsed.success).toBe(sampleResult.success);
      });

      it('should return valid JSON for compact format', () => {
        const result = formatter.format(sampleResult, 'compact');
        expect(() => JSON.parse(result)).not.toThrow();
        
        const parsed = JSON.parse(result);
        expect(parsed.filePath).toBe(sampleResult.filePath);
      });
    });

    describe('Text format validation', () => {
      it('should return summary information for summary format', () => {
        const result = formatter.format(sampleResult, 'summary');
        expect(result).toContain('dependencies');
        expect(result).toContain('found');
      });
    });

    describe('Structured format validation', () => {
      it('should return tab-separated values for table format', () => {
        const result = formatter.format(sampleResult, 'table');
        expect(result).toContain('\t');
        expect(result).toContain('File');
        expect(result).toContain('Dependencies');
      });

      it('should return comma-separated values for csv format', () => {
        const result = formatter.format(sampleResult, 'csv');
        const lines = result.split('\n');
        expect(lines).toHaveLength(2); // Header + data
        expect(lines[0]).toContain(',');
        expect(lines[1]).toContain(',');
      });

      it('should return only dependencies for deps-only format', () => {
        const result = formatter.format(sampleResult, 'deps-only');
        const lines = result.split('\n');
        expect(lines).toHaveLength(2); // Two dependencies
        expect(result).toContain('react');
        expect(result).toContain('./utils');
      });
    });

    describe('error handling for invalid formats', () => {
      it('should throw UnsupportedFormatError for invalid format', () => {
        const invalidFormat = 'invalid-format' as OutputFormat;
        
        expect(() => formatter.format(sampleResult, invalidFormat))
          .toThrow('UnsupportedFormatError');
      });

      it('should handle edge cases in format names', () => {
        const edgeCases = ['', ' ', 'JSON', 'CSV'];
        
        edgeCases.forEach(format => {
          expect(() => formatter.format(sampleResult, format as OutputFormat))
            .toThrow('UnsupportedFormatError');
        });
      });
    });

    describe('format consistency validation', () => {
      it('should produce consistent output for same input', () => {
        const format: OutputFormat = 'json';
        const result1 = formatter.format(sampleResult, format);
        const result2 = formatter.format(sampleResult, format);
        
        expect(result1).toBe(result2);
      });

      it('should handle empty arrays gracefully', () => {
        const emptyResult: AnalysisResult = {
          ...sampleResult,
          imports: [],
          exports: [],
          dependencies: []
        };

        const formats: OutputFormat[] = ['json', 'csv', 'deps-only'];
        formats.forEach(format => {
          const result = formatter.format(emptyResult, format);
          expect(typeof result).toBe('string');
        });
      });

      it('should handle error results appropriately', () => {
        const errorResult: AnalysisResult = {
          filePath: '/error/test.ts',
          success: false,
          imports: [],
          exports: [],
          dependencies: [],
          parseTime: 0,
          error: {
            message: 'Parse failed',
            code: 'PARSE_ERROR',
            details: 'Syntax error on line 5'
          }
        };

        const result = formatter.format(errorResult, 'json');
        expect(result).toContain('error');
        expect(result).toContain('Parse failed');
      });
    });
  });

  describe('getFormatHeader method contract', () => {
    it('should accept OutputFormat parameter', () => {
      const header = formatter.getFormatHeader('csv');
      expect(typeof header).toBe('string');
    });

    it('should return string for all output formats', () => {
      const allFormats: OutputFormat[] = [
        'json', 'compact', 
        'summary', 'table', 'csv', 'deps-only'
      ];

      allFormats.forEach(format => {
        const header = formatter.getFormatHeader(format);
        expect(typeof header).toBe('string');
      });
    });

    it('should return appropriate header for csv format', () => {
      const header = formatter.getFormatHeader('csv');
      expect(header).toContain('file');
      expect(header).toContain('dependencies');
      expect(header).toContain(',');
    });

    it('should return appropriate header for table format', () => {
      const header = formatter.getFormatHeader('table');
      expect(header).toContain('File');
      expect(header).toContain('Dependencies');
      expect(header).toContain('\t');
    });

    it('should return empty string for formats without headers', () => {
      const noHeaderFormats: OutputFormat[] = [
        'json', 'compact', 'summary', 'deps-only'
      ];

      noHeaderFormats.forEach(format => {
        const header = formatter.getFormatHeader(format);
        expect(header).toBe('');
      });
    });
  });

  describe('method signature validation', () => {
    it('should have correct format method signature', () => {
      expect(typeof formatter.format).toBe('function');
      expect(formatter.format.length).toBe(2); // Should accept 2 parameters
    });

    it('should have correct getFormatHeader method signature', () => {
      expect(typeof formatter.getFormatHeader).toBe('function');
      expect(formatter.getFormatHeader.length).toBe(1); // Should accept 1 parameter
    });
  });

  describe('integration patterns', () => {
    it('should work with header and format together for structured formats', () => {
      const header = formatter.getFormatHeader('csv');
      const content = formatter.format(sampleResult, 'csv');
      
      const combinedOutput = header ? `${header}\n${content}` : content;
      const lines = combinedOutput.split('\n');
      
      // Should have header + data lines
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain(','); // Header has commas
      expect(lines[1]).toContain(','); // Data has commas
    });

    it('should maintain consistency between format and header structure', () => {
      const csvHeader = formatter.getFormatHeader('csv');
      const csvContent = formatter.format(sampleResult, 'csv');
      
      if (csvHeader) {
        const headerColumns = csvHeader.split(',').length;
        const contentColumns = csvContent.split('\n')[1].split(',').length;
        expect(headerColumns).toBe(contentColumns);
      }
    });
  });

  describe('performance and memory characteristics', () => {
    it('should handle large analysis results efficiently', () => {
      const largeResult: AnalysisResult = {
        ...sampleResult,
        dependencies: Array.from({ length: 1000 }, (_, i) => ({
          source: `dependency-${i}`,
          type: 'external' as const,
          location: { line: i + 1, column: 1, offset: i * 50 }
        }))
      };

      const startTime = Date.now();
      const result = formatter.format(largeResult, 'json');
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should not mutate input analysis result', () => {
      const originalResult = { ...sampleResult };
      
      formatter.format(sampleResult, 'json');
      
      expect(sampleResult).toEqual(originalResult);
    });
  });
});