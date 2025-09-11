/**
 * Unit tests for TypeScriptParser
 */

import { TypeScriptParser } from '../../../src/services/TypeScriptParser';
import { AnalysisResult } from '../../../src/models/AnalysisResult';
import { TypeScriptParserEnhanced } from '../../../src/parsers/TypeScriptParserEnhanced';

// Mock the enhanced parser
jest.mock('../../../src/parsers/TypeScriptParserEnhanced');
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;
  let mockEnhancedParser: jest.Mocked<TypeScriptParserEnhanced>;

  beforeEach(() => {
    mockEnhancedParser = {
      parseFile: jest.fn()
    } as any;
    
    (TypeScriptParserEnhanced as jest.Mock).mockImplementation(() => mockEnhancedParser);
    
    parser = new TypeScriptParser();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFile', () => {
    test('should return successful result for valid TypeScript', async () => {
      const mockParseResult = {
        dependencies: [
          { source: 'lodash', type: 'external' as const, location: { line: 1, column: 0, offset: 0 } }
        ],
        imports: [
          { 
            source: 'lodash', 
            specifiers: [{ imported: 'default', local: 'lodash', type: 'default' as const }],
            isTypeOnly: false,
            location: { line: 1, column: 0, offset: 0 }
          }
        ],
        exports: [],
        hasParseErrors: false
      };

      mockEnhancedParser.parseFile.mockReturnValue(mockParseResult);

      const result = await parser.parseFile('/test/file.ts', 'import lodash from "lodash";');

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.dependencies).toHaveLength(1);
      expect(result.imports).toHaveLength(1);
      expect(result.exports).toHaveLength(0);
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    test('should handle parse errors with no results', async () => {
      const mockParseResult = {
        dependencies: [],
        imports: [],
        exports: [],
        hasParseErrors: true
      };

      mockEnhancedParser.parseFile.mockReturnValue(mockParseResult);

      const result = await parser.parseFile('/test/file.ts', 'invalid syntax {{{');

      expect(result.success).toBe(false);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('parse TypeScript content');
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle partial parsing success with errors', async () => {
      const mockParseResult = {
        dependencies: [
          { source: 'lodash', type: 'external' as const, location: { line: 1, column: 0, offset: 0 } }
        ],
        imports: [
          { 
            source: 'lodash', 
            specifiers: [{ imported: 'default', local: 'lodash', type: 'default' as const }],
            isTypeOnly: false,
            location: { line: 1, column: 0, offset: 0 }
          }
        ],
        exports: [],
        hasParseErrors: true
      };

      mockEnhancedParser.parseFile.mockReturnValue(mockParseResult);

      const result = await parser.parseFile('/test/file.ts', 'import lodash from "lodash"; invalid syntax');

      expect(result.success).toBe(true); // Still successful because we got results
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.dependencies).toHaveLength(1);
      expect(result.imports).toHaveLength(1);
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('partial analysis was possible');
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle enhanced parser throwing exception', async () => {
      mockEnhancedParser.parseFile.mockImplementation(() => {
        throw new Error('Parser initialization failed');
      });

      const result = await parser.parseFile('/test/file.ts', 'some content');

      expect(result.success).toBe(false);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('Parser initialization failed');
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle non-Error exceptions', async () => {
      mockEnhancedParser.parseFile.mockImplementation(() => {
        throw 'String error';
      });

      const result = await parser.parseFile('/test/file.ts', 'some content');

      expect(result.success).toBe(false);
      expect(result.filePath).toBe('/test/file.ts');
      expect(result.error?.code).toBe('PARSE_ERROR');
      expect(result.error?.message).toContain('String error');
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });

    test('should measure parse time correctly', async () => {
      const mockParseResult = {
        dependencies: [],
        imports: [],
        exports: [],
        hasParseErrors: false
      };

      // Mock a delay in parsing
      mockEnhancedParser.parseFile.mockImplementation(() => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for 10ms
        }
        return mockParseResult;
      });

      const result = await parser.parseFile('/test/file.ts', 'export const test = 1;');

      expect(result.parseTime).toBeGreaterThanOrEqual(10);
    });

    test('should handle complex TypeScript with multiple elements', async () => {
      const mockParseResult = {
        dependencies: [
          { source: 'react', type: 'external' as const, location: { line: 1, column: 0, offset: 0 } },
          { source: './types', type: 'relative' as const, location: { line: 2, column: 0, offset: 0 } },
          { source: 'src/utils', type: 'internal' as const, location: { line: 3, column: 0, offset: 0 } }
        ],
        imports: [
          { 
            source: 'react', 
            specifiers: [
              { imported: 'default', local: 'React', type: 'default' as const },
              { imported: 'useState', local: 'useState', type: 'named' as const }
            ],
            isTypeOnly: false,
            location: { line: 1, column: 0, offset: 0 }
          },
          { 
            source: './types', 
            specifiers: [{ imported: 'User', local: 'User', type: 'named' as const }],
            isTypeOnly: true,
            location: { line: 2, column: 0, offset: 0 }
          }
        ],
        exports: [
          { name: 'UserComponent', type: 'named' as const, isTypeOnly: false, location: { line: 10, column: 0, offset: 0 } },
          { name: 'default', type: 'default' as const, isTypeOnly: false, location: { line: 15, column: 0, offset: 0 } }
        ],
        hasParseErrors: false
      };

      mockEnhancedParser.parseFile.mockReturnValue(mockParseResult);

      const complexTsContent = `
        import React, { useState } from 'react';
        import type { User } from './types';
        import { utils } from 'src/utils';

        export const UserComponent = () => {
          const [user, setUser] = useState<User>();
          return <div>{user?.name}</div>;
        };

        export default UserComponent;
      `;

      const result = await parser.parseFile('/test/component.tsx', complexTsContent);

      expect(result.success).toBe(true);
      expect(result.dependencies).toHaveLength(3);
      expect(result.imports).toHaveLength(2);
      expect(result.exports).toHaveLength(2);
      
      // Check dependencies
      expect(result.dependencies[0].source).toBe('react');
      expect(result.dependencies[0].type).toBe('external');
      expect(result.dependencies[1].source).toBe('./types');
      expect(result.dependencies[1].type).toBe('relative');
      expect(result.dependencies[2].source).toBe('src/utils');
      expect(result.dependencies[2].type).toBe('internal');

      // Check imports
      expect(result.imports[0].source).toBe('react');
      expect(result.imports[0].isTypeOnly).toBe(false);
      expect(result.imports[0].specifiers).toHaveLength(2);
      expect(result.imports[1].source).toBe('./types');
      expect(result.imports[1].isTypeOnly).toBe(true);

      // Check exports
      expect(result.exports[0].name).toBe('UserComponent');
      expect(result.exports[0].type).toBe('named');
      expect(result.exports[1].name).toBe('default');
      expect(result.exports[1].type).toBe('default');
    });

    test('should call enhanced parser with correct content', async () => {
      const mockParseResult = {
        dependencies: [],
        imports: [],
        exports: [],
        hasParseErrors: false
      };

      mockEnhancedParser.parseFile.mockReturnValue(mockParseResult);

      const content = 'export const test = 1;';
      await parser.parseFile('/test/file.ts', content);

      expect(mockEnhancedParser.parseFile).toHaveBeenCalledWith(content);
      expect(mockEnhancedParser.parseFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('constructor', () => {
    test('should initialize with enhanced parser', () => {
      expect(TypeScriptParserEnhanced).toHaveBeenCalled();
      expect(parser).toBeInstanceOf(TypeScriptParser);
    });
  });
});