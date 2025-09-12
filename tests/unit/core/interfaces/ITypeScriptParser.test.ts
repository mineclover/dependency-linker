import { ITypeScriptParser } from '../../../../src/core/interfaces/ITypeScriptParser';
import { ParseOptions, ParseResult } from '../../../../src/core/types/ParseTypes';

describe('ITypeScriptParser Interface Contract', () => {
  // Mock implementation for testing the interface contract
  class MockTypeScriptParser implements ITypeScriptParser {
    async parseSource(source: string, options?: ParseOptions): Promise<ParseResult> {
      return {
        imports: [],
        exports: [],
        dependencies: [],
        hasParseErrors: false
      };
    }

    async parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
      return {
        imports: [],
        exports: [],
        dependencies: [],
        hasParseErrors: false
      };
    }
  }

  let parser: ITypeScriptParser;

  beforeEach(() => {
    parser = new MockTypeScriptParser();
  });

  describe('parseSource method contract', () => {
    it('should accept string source parameter', async () => {
      const source = 'export const test = "hello";';
      
      const result = await parser.parseSource(source);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should accept optional ParseOptions parameter', async () => {
      const source = 'import React from "react";';
      const options: ParseOptions = {
        timeout: 1000,
        includeSourceLocations: true,
        includeTypeImports: false
      };
      
      const result = await parser.parseSource(source, options);
      expect(result).toBeDefined();
    });

    it('should return Promise<ParseResult>', async () => {
      const source = 'const x = 1;';
      
      const result = await parser.parseSource(source);
      
      // Validate ParseResult structure
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('hasParseErrors');

      expect(Array.isArray(result.imports)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(typeof result.hasParseErrors).toBe('boolean');
    });

    it('should handle empty source code', async () => {
      const result = await parser.parseSource('');
      expect(result).toBeDefined();
      expect(result.hasParseErrors).toBe(false);
    });

    it('should handle complex TypeScript source', async () => {
      const complexSource = `
        import React, { useState, useEffect } from 'react';
        import { ApiClient } from '../api/client';
        
        interface Props {
          id: number;
          name?: string;
        }
        
        export const Component: React.FC<Props> = ({ id, name }) => {
          const [data, setData] = useState<string[]>([]);
          
          useEffect(() => {
            ApiClient.fetch(id).then(setData);
          }, [id]);
          
          return <div>{name || 'Default'}</div>;
        };
        
        export default Component;
      `;
      
      const result = await parser.parseSource(complexSource);
      expect(result).toBeDefined();
      expect(result.hasParseErrors).toBe(false);
    });
  });

  describe('parseFile method contract', () => {
    it('should accept string filePath parameter', async () => {
      const filePath = '/path/to/test.ts';
      
      const result = await parser.parseFile(filePath);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should accept optional ParseOptions parameter', async () => {
      const filePath = '/path/to/test.tsx';
      const options: ParseOptions = {
        timeout: 10000,
        includeSourceLocations: false,
        includeTypeImports: true
      };
      
      const result = await parser.parseFile(filePath, options);
      expect(result).toBeDefined();
    });

    it('should return Promise<ParseResult>', async () => {
      const filePath = '/path/to/component.ts';
      
      const result = await parser.parseFile(filePath);
      
      // Validate ParseResult structure (same as parseSource)
      expect(result).toHaveProperty('imports');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('hasParseErrors');
    });

    it('should handle various TypeScript file extensions', async () => {
      const extensions = ['.ts', '.tsx', '.d.ts'];
      
      for (const ext of extensions) {
        const filePath = `/test/file${ext}`;
        const result = await parser.parseFile(filePath);
        expect(result).toBeDefined();
      }
    });
  });

  describe('ParseOptions contract', () => {
    it('should handle timeout option', async () => {
      const options: ParseOptions = { timeout: 1000 };
      
      const result = await parser.parseSource('const x = 1;', options);
      expect(result).toBeDefined();
    });

    it('should handle includeSourceLocations option', async () => {
      const options: ParseOptions = { includeSourceLocations: true };
      
      const source = '// Comment\nconst x = 1; /* Block comment */';
      const result = await parser.parseSource(source, options);
      expect(result).toBeDefined();
    });

    it('should handle includeTypeImports option', async () => {
      const options: ParseOptions = { includeTypeImports: false };
      
      const result = await parser.parseSource('const   x   =   1  ;', options);
      expect(result).toBeDefined();
    });

    it('should handle all options together', async () => {
      const options: ParseOptions = {
        timeout: 5000,
        includeSourceLocations: true,
        includeTypeImports: false
      };
      
      const result = await parser.parseSource('const x = 1;', options);
      expect(result).toBeDefined();
    });
  });

  describe('error handling contract expectations', () => {
    // Mock implementation that throws specific errors for testing
    class ErrorThrowingParser implements ITypeScriptParser {
      private errorType: string;

      constructor(errorType: string) {
        this.errorType = errorType;
      }

      async parseSource(source: string, options?: ParseOptions): Promise<ParseResult> {
        switch (this.errorType) {
          case 'ParseTimeoutError':
            throw new Error('ParseTimeoutError: Parsing exceeded timeout');
          case 'SyntaxError':
            throw new Error('SyntaxError: Invalid TypeScript syntax');
          default:
            throw new Error('Unknown parse error');
        }
      }

      async parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
        switch (this.errorType) {
          case 'FileNotFoundError':
            throw new Error('FileNotFoundError: File does not exist');
          case 'ParseTimeoutError':
            throw new Error('ParseTimeoutError: Parsing exceeded timeout');
          default:
            throw new Error('Unknown file parse error');
        }
      }
    }

    it('should handle ParseTimeoutError in parseSource', async () => {
      const errorParser = new ErrorThrowingParser('ParseTimeoutError');
      
      await expect(errorParser.parseSource('const x = 1;', { timeout: 100 }))
        .rejects.toThrow('ParseTimeoutError');
    });

    it('should handle SyntaxError in parseSource', async () => {
      const errorParser = new ErrorThrowingParser('SyntaxError');
      
      await expect(errorParser.parseSource('const x = ;'))
        .rejects.toThrow('SyntaxError');
    });

    it('should handle FileNotFoundError in parseFile', async () => {
      const errorParser = new ErrorThrowingParser('FileNotFoundError');
      
      await expect(errorParser.parseFile('/nonexistent/file.ts'))
        .rejects.toThrow('FileNotFoundError');
    });

    it('should handle ParseTimeoutError in parseFile', async () => {
      const errorParser = new ErrorThrowingParser('ParseTimeoutError');
      
      await expect(errorParser.parseFile('/large/file.ts', { timeout: 100 }))
        .rejects.toThrow('ParseTimeoutError');
    });
  });

  describe('async operation patterns', () => {
    it('should support concurrent parseSource calls', async () => {
      const sources = [
        'const a = 1;',
        'const b = 2;',
        'const c = 3;'
      ];
      
      const promises = sources.map(source => parser.parseSource(source));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.hasParseErrors).toBe(false);
      });
    });

    it('should support concurrent parseFile calls', async () => {
      const filePaths = ['/test1.ts', '/test2.ts', '/test3.ts'];
      
      const promises = filePaths.map(filePath => parser.parseFile(filePath));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.hasParseErrors).toBe(false);
      });
    });

    it('should support mixed parseSource and parseFile calls', async () => {
      const parseSourcePromise = parser.parseSource('const x = 1;');
      const parseFilePromise = parser.parseFile('/test.ts');
      
      const [sourceResult, fileResult] = await Promise.all([
        parseSourcePromise,
        parseFilePromise
      ]);
      
      expect(sourceResult).toBeDefined();
      expect(fileResult).toBeDefined();
    });
  });

  describe('method signature validation', () => {
    it('should have correct parseSource method signature', () => {
      expect(typeof parser.parseSource).toBe('function');
      expect(parser.parseSource.length).toBe(2); // Should accept 2 parameters (source, options?)
    });

    it('should have correct parseFile method signature', () => {
      expect(typeof parser.parseFile).toBe('function');  
      expect(parser.parseFile.length).toBe(2); // Should accept 2 parameters (filePath, options?)
    });
  });

  describe('performance characteristics', () => {
    it('should handle parsing without errors', async () => {
      const result = await parser.parseSource('const x = 1;');
      
      expect(result.hasParseErrors).toBe(false);
    });

    it('should handle timeout option appropriately', async () => {
      const startTime = Date.now();
      const result = await parser.parseSource('const x = 1;', { timeout: 10000 });
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});