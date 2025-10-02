/**
 * Single File Analysis Tests
 */

import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  SingleFileAnalyzer,
  analyzeSingleFile,
  analyzeMultipleFiles,
  SingleFileAnalysisError,
} from '../../src/integration/SingleFileAnalysis';

describe('SingleFileAnalyzer', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    // 임시 디렉토리 생성
    tempDir = mkdtempSync(join(tmpdir(), 'single-file-test-'));

    // 테스트 파일 생성
    testFile = join(tempDir, 'test.ts');
    writeFileSync(
      testFile,
      `
import { foo } from './foo';
import * as bar from 'bar';

export class TestClass {
  method() {
    foo();
  }
}

export function testFunction() {
  return 'test';
}
`
    );
  });

  afterEach(() => {
    // 임시 디렉토리 삭제
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('analyze', () => {
    it('should analyze single file and store in graph DB', async () => {
      const analyzer = new SingleFileAnalyzer();

      const result = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      expect(result.filePath).toBe(testFile);
      expect(result.language).toBe('typescript');
      expect(result.parseResult).toBeDefined();
      expect(result.storageResult).toBeDefined();
      expect(result.stats.nodesCreated).toBeGreaterThan(0);
      expect(result.stats.processingTime).toBeGreaterThan(0);

      await analyzer.close();
    });

    it('should extract internal dependencies correctly', async () => {
      const analyzer = new SingleFileAnalyzer();

      const result = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      // Verify internal imports are extracted
      expect(result.parseResult.internal).toHaveLength(1);
      expect(result.parseResult.internal[0]).toBe('./foo');

      await analyzer.close();
    });

    it('should extract external dependencies correctly', async () => {
      const analyzer = new SingleFileAnalyzer();

      const result = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      // Verify external imports are extracted
      expect(result.parseResult.external).toHaveLength(1);
      expect(result.parseResult.external[0]).toBe('bar');

      await analyzer.close();
    });

    it('should classify builtin modules correctly', async () => {
      const nodeFile = join(tempDir, 'node-test.ts');
      writeFileSync(
        nodeFile,
        `
import { readFileSync } from 'fs';
import * as path from 'path';
import { MyClass } from './my-class';
`
      );

      const analyzer = new SingleFileAnalyzer();
      const result = await analyzer.analyze(nodeFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      expect(result.parseResult.builtin).toContain('fs');
      expect(result.parseResult.builtin).toContain('path');
      expect(result.parseResult.internal).toContain('./my-class');

      await analyzer.close();
    });

    it('should detect language from file extension', async () => {
      const tsxFile = join(tempDir, 'test.tsx');
      writeFileSync(
        tsxFile,
        `
import React from 'react';
export const Component = () => <div>Test</div>;
`
      );

      const analyzer = new SingleFileAnalyzer();
      const result = await analyzer.analyze(tsxFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      expect(result.language).toBe('tsx');

      await analyzer.close();
    });

    it('should compute inference when enabled', async () => {
      const analyzer = new SingleFileAnalyzer();

      const result = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
        enableInference: true,
      });

      expect(result.inferenceCount).toBeDefined();

      await analyzer.close();
    });

    it('should not compute inference when disabled', async () => {
      const analyzer = new SingleFileAnalyzer();

      const result = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
        enableInference: false,
      });

      expect(result.inferenceCount).toBeUndefined();

      await analyzer.close();
    });

    it('should throw error for non-absolute path', async () => {
      const analyzer = new SingleFileAnalyzer();

      await expect(
        analyzer.analyze('relative/path/file.ts')
      ).rejects.toThrow(SingleFileAnalysisError);

      await analyzer.close();
    });

    it('should throw error for non-existent file', async () => {
      const analyzer = new SingleFileAnalyzer();

      await expect(
        analyzer.analyze(join(tempDir, 'nonexistent.ts'))
      ).rejects.toThrow(SingleFileAnalysisError);

      await analyzer.close();
    });

    it('should throw error for directory path', async () => {
      const analyzer = new SingleFileAnalyzer();

      await expect(analyzer.analyze(tempDir)).rejects.toThrow(
        SingleFileAnalysisError
      );

      await analyzer.close();
    });

    it('should throw error for unsupported file type', async () => {
      const txtFile = join(tempDir, 'test.txt');
      writeFileSync(txtFile, 'text content');

      const analyzer = new SingleFileAnalyzer();

      await expect(analyzer.analyze(txtFile)).rejects.toThrow(
        SingleFileAnalysisError
      );

      await analyzer.close();
    });

    it('should replace existing file data when replaceExisting is true', async () => {
      const analyzer = new SingleFileAnalyzer();

      // 첫 번째 분석
      const result1 = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
        replaceExisting: true,
      });

      // 파일 수정
      writeFileSync(
        testFile,
        `
import { newImport } from './new';
export const newExport = 'new';
`
      );

      // 두 번째 분석
      const result2 = await analyzer.analyze(testFile, {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
        replaceExisting: true,
      });

      expect(result2.stats.nodesCreated).toBeGreaterThan(0);

      await analyzer.close();
    });

    it('should reuse GraphAnalysisSystem instance when provided', async () => {
      const { createGraphAnalysisSystem } = await import('../../src/database');

      const graphSystem = createGraphAnalysisSystem({
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      const analyzer = new SingleFileAnalyzer(graphSystem);

      const result1 = await analyzer.analyze(testFile);
      const result2 = await analyzer.analyze(testFile);

      expect(result1.filePath).toBe(testFile);
      expect(result2.filePath).toBe(testFile);

      await analyzer.close();
      await graphSystem.close();
    });
  });

  describe('analyzeMultiple', () => {
    it('should analyze multiple files', async () => {
      const file2 = join(tempDir, 'test2.ts');
      writeFileSync(
        file2,
        `
import { TestClass } from './test';
export const instance = new TestClass();
`
      );

      const analyzer = new SingleFileAnalyzer();

      const results = await analyzer.analyzeMultiple([testFile, file2], {
        projectRoot: tempDir,
        dbPath: join(tempDir, 'test.db'),
      });

      expect(results).toHaveLength(2);
      expect(results[0].filePath).toBe(testFile);
      expect(results[1].filePath).toBe(file2);
      expect(results[0].stats.nodesCreated).toBeGreaterThan(0);
      expect(results[1].stats.nodesCreated).toBeGreaterThan(0);

      await analyzer.close();
    });

    it('should continue on individual file errors', async () => {
      const file2 = join(tempDir, 'test2.ts');
      writeFileSync(file2, `export const valid = true;`);

      const analyzer = new SingleFileAnalyzer();

      const results = await analyzer.analyzeMultiple(
        [
          testFile,
          join(tempDir, 'nonexistent.ts'), // This will fail
          file2,
        ],
        {
          projectRoot: tempDir,
          dbPath: join(tempDir, 'test.db'),
        }
      );

      // Should have results for testFile and file2, skipping nonexistent
      expect(results.length).toBeGreaterThan(0);

      await analyzer.close();
    });
  });
});

describe('analyzeSingleFile helper function', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'helper-test-'));
    testFile = join(tempDir, 'helper.ts');
    writeFileSync(
      testFile,
      `
import { helper } from './utils';
export const test = 'helper';
`
    );
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should analyze file and auto-close', async () => {
    const result = await analyzeSingleFile(testFile, {
      projectRoot: tempDir,
      dbPath: join(tempDir, 'helper.db'),
    });

    expect(result.filePath).toBe(testFile);
    expect(result.language).toBe('typescript');
    expect(result.stats.nodesCreated).toBeGreaterThan(0);
  });

  it('should work with minimal options', async () => {
    const result = await analyzeSingleFile(testFile);

    expect(result.filePath).toBe(testFile);
    expect(result.stats.processingTime).toBeGreaterThan(0);
  });
});

describe('analyzeMultipleFiles helper function', () => {
  let tempDir: string;
  let files: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'multi-test-'));

    files = [
      join(tempDir, 'file1.ts'),
      join(tempDir, 'file2.ts'),
      join(tempDir, 'file3.ts'),
    ];

    files.forEach((file, index) => {
      writeFileSync(
        file,
        `
import { dep } from './dep';
export const file${index + 1} = 'test';
`
      );
    });
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should analyze multiple files and auto-close', async () => {
    const results = await analyzeMultipleFiles(files, {
      projectRoot: tempDir,
      dbPath: join(tempDir, 'multi.db'),
    });

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.filePath).toBe(files[index]);
      expect(result.stats.nodesCreated).toBeGreaterThan(0);
    });
  });
});

describe('SingleFileAnalysisError', () => {
  it('should create error with code and filePath', () => {
    const error = new SingleFileAnalysisError(
      'Test error',
      'TEST_CODE',
      '/path/to/file.ts'
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.filePath).toBe('/path/to/file.ts');
    expect(error.name).toBe('SingleFileAnalysisError');
  });
});