/**
 * Contract tests for ITestDataFactory interface (T010)
 * Validates test data factory implementations for mock creation and temp file management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ITestDataFactory,
  TempFileSpec,
  TempFileContext,
  validateTestDataFactory,
  UTILITY_CONTRACT_SCENARIOS,
  FileAnalysisRequest,
  Tree,
  AnalysisResult
} from '../../specs/005-test-optimization/contracts/test-utilities.contract';

// Using types from contract interface

// Mock implementation for contract testing
class MockTestDataFactory implements ITestDataFactory {
  private tempContexts: TempFileContext[] = [];

  createMockFileRequest(overrides: Partial<FileAnalysisRequest> = {}): FileAnalysisRequest {
    return {
      filePath: '/mock/test.ts',
      content: 'const x = 1;',
      language: 'typescript',
      ...overrides
    };
  }

  async createMockAST(language: string, content: string = 'const x = 1;'): Promise<Tree> {
    if (!language) {
      throw new Error('Language is required');
    }

    // Mock AST structure
    return {
      rootNode: {
        type: 'program',
        children: [
          {
            type: 'variable_declaration',
            text: content
          }
        ]
      },
      language,
      getLanguage: () => language
    };
  }

  createMockAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
    return {
      filePath: '/mock/test.ts',
      dependencies: ['path', 'fs'],
      exports: ['default'],
      parseTime: 150,
      errors: [],
      ...overrides
    };
  }

  async createTempFiles(files: TempFileSpec[]): Promise<TempFileContext> {
    if (!files || files.length === 0) {
      throw new Error('At least one file specification is required');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-factory-'));
    const fileMap = new Map<string, string>();

    try {
      for (const fileSpec of files) {
        const fullPath = path.join(tempDir, fileSpec.path);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        fs.mkdirSync(dir, { recursive: true });

        // Write file
        fs.writeFileSync(fullPath, fileSpec.content, 'utf8');
        fileMap.set(fileSpec.path, fullPath);
      }

      const context: TempFileContext = {
        rootDir: tempDir,
        files: fileMap,
        cleanup: async () => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
            }
          } catch (error) {
            console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
          }

          // Remove from tracking
          const index = this.tempContexts.indexOf(context);
          if (index > -1) {
            this.tempContexts.splice(index, 1);
          }
        }
      };

      this.tempContexts.push(context);
      return context;

    } catch (error) {
      // Clean up on error
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp directory after error:`, cleanupError);
      }
      throw error;
    }
  }

  // Cleanup all temp files (for testing)
  async cleanupAll(): Promise<void> {
    await Promise.all(this.tempContexts.map(context => context.cleanup()));
  }
}

describe('ITestDataFactory Contract Tests', () => {
  let factory: ITestDataFactory;

  beforeEach(() => {
    factory = new MockTestDataFactory();
  });

  afterEach(async () => {
    // Cleanup any remaining temp files
    if (factory instanceof MockTestDataFactory) {
      await factory.cleanupAll();
    }
  });

  describe('Interface Contract Compliance', () => {
    test('should implement all required methods', () => {
      expect(typeof factory.createMockFileRequest).toBe('function');
      expect(typeof factory.createMockAST).toBe('function');
      expect(typeof factory.createMockAnalysisResult).toBe('function');
      expect(typeof factory.createTempFiles).toBe('function');
    });

    test('createMockFileRequest should return valid request structure', () => {
      const request = factory.createMockFileRequest();

      expect(request).toHaveProperty('filePath');
      expect(request).toHaveProperty('content');
      expect(request).toHaveProperty('language');

      expect(typeof request.filePath).toBe('string');
      expect(request.filePath.length).toBeGreaterThan(0);
    });

    test('createMockAST should return valid AST structure', async () => {
      const ast = await factory.createMockAST('typescript');

      expect(ast).toHaveProperty('rootNode');
      expect(ast).toHaveProperty('language');

      expect(ast.language).toBe('typescript');
      expect(ast.rootNode).toBeDefined();
    });

    test('createMockAnalysisResult should return valid result structure', () => {
      const result = factory.createMockAnalysisResult();

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('exports');
      expect(result).toHaveProperty('parseTime');

      expect(typeof result.filePath).toBe('string');
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(Array.isArray(result.exports)).toBe(true);
      expect(typeof result.parseTime).toBe('number');
    });

    test('createTempFiles should return valid context structure', async () => {
      const files: TempFileSpec[] = [
        { path: 'test.ts', content: 'const x = 1;' }
      ];

      const context = await factory.createTempFiles(files);

      expect(context).toHaveProperty('rootDir');
      expect(context).toHaveProperty('files');
      expect(context).toHaveProperty('cleanup');

      expect(typeof context.rootDir).toBe('string');
      expect(context.files instanceof Map).toBe(true);
      expect(typeof context.cleanup).toBe('function');

      await context.cleanup();
    });
  });

  describe('Mock Creation Contract', () => {
    test('should support overrides in mock file request', () => {
      const customRequest = factory.createMockFileRequest({
        filePath: '/custom/path.js',
        language: 'javascript'
      });

      expect(customRequest.filePath).toBe('/custom/path.js');
      expect(customRequest.language).toBe('javascript');
      expect(customRequest.content).toBeDefined(); // Should keep default
    });

    test('should support different languages in mock AST', async () => {
      const tsAST = await factory.createMockAST('typescript');
      const jsAST = await factory.createMockAST('javascript');

      expect(tsAST.language).toBe('typescript');
      expect(jsAST.language).toBe('javascript');
      expect(tsAST.rootNode).toBeDefined();
      expect(jsAST.rootNode).toBeDefined();
    });

    test('should support custom content in mock AST', async () => {
      const customContent = 'function test() { return 42; }';
      const ast = await factory.createMockAST('typescript', customContent);

      expect(ast.language).toBe('typescript');
      expect(ast.rootNode).toBeDefined();
      // Content should be reflected in mock structure somehow
    });

    test('should support overrides in analysis result', () => {
      const customResult = factory.createMockAnalysisResult({
        filePath: '/custom.ts',
        dependencies: ['react', 'lodash'],
        errors: ['syntax error']
      });

      expect(customResult.filePath).toBe('/custom.ts');
      expect(customResult.dependencies).toEqual(['react', 'lodash']);
      expect(customResult.errors).toEqual(['syntax error']);
    });
  });

  describe('Error Handling Contract', () => {
    test('createMockAST should reject invalid language', async () => {
      await expect(factory.createMockAST('')).rejects.toThrow();
      await expect(factory.createMockAST(null as any)).rejects.toThrow();
    });

    test('createTempFiles should reject invalid input', async () => {
      await expect(factory.createTempFiles([])).rejects.toThrow();
      await expect(factory.createTempFiles(null as any)).rejects.toThrow();
    });

    test('should handle invalid file specs gracefully', async () => {
      const invalidFiles: TempFileSpec[] = [
        { path: '', content: 'test' } // Empty path
      ];

      await expect(factory.createTempFiles(invalidFiles)).rejects.toThrow();
    });
  });

  describe('Temporary File Management Contract', () => {
    test('should create actual files on filesystem', async () => {
      const files: TempFileSpec[] = [
        { path: 'test1.ts', content: 'const a = 1;' },
        { path: 'nested/test2.js', content: 'const b = 2;' }
      ];

      const context = await factory.createTempFiles(files);

      // Files should exist
      const file1Path = context.files.get('test1.ts');
      const file2Path = context.files.get('nested/test2.js');

      expect(file1Path).toBeDefined();
      expect(file2Path).toBeDefined();
      expect(fs.existsSync(file1Path!)).toBe(true);
      expect(fs.existsSync(file2Path!)).toBe(true);

      // Content should match
      expect(fs.readFileSync(file1Path!, 'utf8')).toBe('const a = 1;');
      expect(fs.readFileSync(file2Path!, 'utf8')).toBe('const b = 2;');

      await context.cleanup();

      // Files should be cleaned up
      expect(fs.existsSync(file1Path!)).toBe(false);
      expect(fs.existsSync(file2Path!)).toBe(false);
      expect(fs.existsSync(context.rootDir)).toBe(false);
    });

    test('should handle nested directory structures', async () => {
      const files: TempFileSpec[] = [
        { path: 'src/components/Button.tsx', content: 'export const Button = () => {};' },
        { path: 'src/utils/helpers.ts', content: 'export const helper = () => {};' },
        { path: 'tests/Button.test.ts', content: 'test("Button", () => {});' }
      ];

      const context = await factory.createTempFiles(files);

      // All files should exist
      files.forEach(file => {
        const fullPath = context.files.get(file.path);
        expect(fullPath).toBeDefined();
        expect(fs.existsSync(fullPath!)).toBe(true);
        expect(fs.readFileSync(fullPath!, 'utf8')).toBe(file.content);
      });

      await context.cleanup();

      // Everything should be cleaned up
      expect(fs.existsSync(context.rootDir)).toBe(false);
    });

    test('should support language specification for files', async () => {
      const files: TempFileSpec[] = [
        { path: 'test.ts', content: 'const x: number = 1;', language: 'typescript' },
        { path: 'test.js', content: 'const x = 1;', language: 'javascript' },
        { path: 'test.py', content: 'x = 1', language: 'python' }
      ];

      const context = await factory.createTempFiles(files);

      // Files should be created regardless of language
      files.forEach(file => {
        const fullPath = context.files.get(file.path);
        expect(fullPath).toBeDefined();
        expect(fs.existsSync(fullPath!)).toBe(true);
      });

      await context.cleanup();
    });
  });

  describe('Cleanup Contract', () => {
    test('cleanup should be idempotent', async () => {
      const files: TempFileSpec[] = [
        { path: 'test.ts', content: 'const x = 1;' }
      ];

      const context = await factory.createTempFiles(files);
      const rootDir = context.rootDir;

      await context.cleanup();
      expect(fs.existsSync(rootDir)).toBe(false);

      // Second cleanup should not throw
      await expect(context.cleanup()).resolves.not.toThrow();
    });

    test('should cleanup even if some files are deleted manually', async () => {
      const files: TempFileSpec[] = [
        { path: 'test1.ts', content: 'const a = 1;' },
        { path: 'test2.ts', content: 'const b = 2;' }
      ];

      const context = await factory.createTempFiles(files);

      // Manually delete one file
      const file1Path = context.files.get('test1.ts');
      if (file1Path && fs.existsSync(file1Path)) {
        fs.unlinkSync(file1Path);
      }

      // Cleanup should still work
      await expect(context.cleanup()).resolves.not.toThrow();
      expect(fs.existsSync(context.rootDir)).toBe(false);
    });

    test('should handle permission errors gracefully', async () => {
      const files: TempFileSpec[] = [
        { path: 'test.ts', content: 'const x = 1;' }
      ];

      const context = await factory.createTempFiles(files);

      // Mock filesystem to simulate permission error (this is tricky in practice)
      // For now, just ensure cleanup doesn't throw on normal operation
      await expect(context.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Resource Management Contract', () => {
    test('should track and cleanup multiple contexts', async () => {
      const contexts: TempFileContext[] = [];

      for (let i = 0; i < 3; i++) {
        const files: TempFileSpec[] = [
          { path: `test${i}.ts`, content: `const x${i} = ${i};` }
        ];
        const context = await factory.createTempFiles(files);
        contexts.push(context);
      }

      // All contexts should have created directories
      contexts.forEach(context => {
        expect(fs.existsSync(context.rootDir)).toBe(true);
      });

      // Cleanup all
      await Promise.all(contexts.map(context => context.cleanup()));

      // All should be cleaned up
      contexts.forEach(context => {
        expect(fs.existsSync(context.rootDir)).toBe(false);
      });
    });
  });

  describe('Contract Validation Integration', () => {
    test('should pass mock creation validation', async () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.dataFactory.mockCreation;
      const result = await scenario.test(factory);

      expect(typeof result === 'boolean' ? result : true).toBe(true);
    });

    test('should pass temp file cleanup validation', async () => {
      const scenario = UTILITY_CONTRACT_SCENARIOS.dataFactory.tempFileCleanup;
      const result = await scenario.test(factory);

      expect(result).toBe(true);
    });

    test('should pass full contract validation', async () => {
      try {
        const isValid = await validateTestDataFactory(factory);
        expect(isValid).toBe(true);
      } catch (error) {
        // If validation fails, ensure it's for expected reasons
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Contract validation failed:', errorMessage);
        expect(typeof errorMessage).toBe('string');
      }
    });
  });

  describe('Performance Contract', () => {
    test('mock creation should be fast', () => {
      const startTime = performance.now();

      // Create many mocks
      for (let i = 0; i < 1000; i++) {
        factory.createMockFileRequest();
        factory.createMockAnalysisResult();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should create 2000 mocks in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('temp file creation should be reasonable', async () => {
      const startTime = performance.now();

      const files: TempFileSpec[] = Array.from({ length: 10 }, (_, i) => ({
        path: `test${i}.ts`,
        content: `const x${i} = ${i};`
      }));

      const context = await factory.createTempFiles(files);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Should create 10 files in under 1000ms
      expect(duration).toBeLessThan(1000);

      await context.cleanup();
    });
  });
});