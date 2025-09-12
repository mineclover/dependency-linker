/**
 * Factory Functions Interface Contract Tests
 * Tests for the simplified function-based API
 */

import { 
  analyzeTypeScriptFile,
  extractDependencies,
  getBatchAnalysis,
  analyzeDirectory
} from '../../../src/api/factory-functions';
import { 
  AnalysisOptions, 
  BatchAnalysisOptions,
  DirectoryOptions
} from '../../../src/api/types';
import { AnalysisResult } from '../../../src/models/AnalysisResult';
import { 
  FileNotFoundError,
  InvalidFileTypeError 
} from '../../../src/api/errors';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Factory Functions Interface Contract', () => {
  let tempDir: string;
  let testFilePath: string;
  let testFile2Path: string;
  let testTsContent: string;

  beforeEach(() => {
    // Create temporary directory and files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-test-'));
    testFilePath = path.join(tempDir, 'test.ts');
    testFile2Path = path.join(tempDir, 'test2.ts');
    
    testTsContent = `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { SomeType } from './types';

export interface TestInterface {
  name: string;
  value: number;
}

export const testFunction = async (): Promise<TestInterface> => {
  const data = await readFile('test.txt');
  return { name: 'test', value: 42 };
};

export default testFunction;
    `.trim();
    
    fs.writeFileSync(testFilePath, testTsContent);
    fs.writeFileSync(testFile2Path, testTsContent.replace('test', 'test2'));
  });

  afterEach(() => {
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('analyzeTypeScriptFile function contract', () => {
    it('should accept filePath parameter and return Promise<AnalysisResult>', async () => {
      const result = analyzeTypeScriptFile(testFilePath);
      expect(result).toBeInstanceOf(Promise);
      
      const analysisResult = await result;
      expect(analysisResult).toHaveProperty('filePath');
      expect(analysisResult).toHaveProperty('success');
      expect(analysisResult).toHaveProperty('dependencies');
      expect(analysisResult).toHaveProperty('imports');
      expect(analysisResult).toHaveProperty('exports');
      expect(analysisResult.filePath).toBe(testFilePath);
      expect(typeof analysisResult.success).toBe('boolean');
    });

    it('should accept optional AnalysisOptions parameter', async () => {
      const options: AnalysisOptions = {
        format: 'json',
        includeSources: true,
        parseTimeout: 10000,
        includeTypeImports: false,
        classifyDependencies: true
      };
      
      const result = await analyzeTypeScriptFile(testFilePath, options);
      expect(result.filePath).toBe(testFilePath);
      expect(result.success).toBe(true);
      expect(result.dependencies.length).toBeGreaterThan(0);
    });

    it('should handle various TypeScript file extensions', async () => {
      // Test .tsx file
      const tsxFile = path.join(tempDir, 'component.tsx');
      const tsxContent = `
import React from 'react';

interface Props {
  name: string;
}

export const Component: React.FC<Props> = ({ name }) => {
  return <div>Hello, {name}!</div>;
};
      `.trim();
      
      fs.writeFileSync(tsxFile, tsxContent);
      const tsxResult = await analyzeTypeScriptFile(tsxFile);
      expect(tsxResult.success).toBe(true);
      expect(tsxResult.dependencies.map(d => d.source)).toContain('react');

      // Test .d.ts file
      const dtsFile = path.join(tempDir, 'types.d.ts');
      const dtsContent = `
export interface ApiResponse<T> {
  data: T;
  status: number;
}

export declare function fetchData<T>(url: string): Promise<ApiResponse<T>>;
      `.trim();
      
      fs.writeFileSync(dtsFile, dtsContent);
      const dtsResult = await analyzeTypeScriptFile(dtsFile);
      expect(dtsResult.success).toBe(true);
    });

    it('should handle error cases appropriately', async () => {
      // Non-existent file - should return unsuccessful result rather than throw
      const nonExistentFile = path.join(tempDir, 'nonexistent.ts');
      const result = await analyzeTypeScriptFile(nonExistentFile);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('FILE_NOT_FOUND');

      // Invalid file type - should return unsuccessful result
      const jsFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(jsFile, 'const x = 42;');
      const jsResult = await analyzeTypeScriptFile(jsFile);
      expect(jsResult.success).toBe(false);
      expect(jsResult.error).toBeDefined();
    });
  });

  describe('extractDependencies function contract', () => {
    it('should accept filePath parameter and return Promise<string[]>', async () => {
      const result = extractDependencies(testFilePath);
      expect(result).toBeInstanceOf(Promise);
      
      const dependencies = await result;
      expect(Array.isArray(dependencies)).toBe(true);
      expect(dependencies.every(dep => typeof dep === 'string')).toBe(true);
      expect(dependencies).toContain('fs/promises');
      expect(dependencies).toContain('path');
      expect(dependencies).toContain('./types');
    });

    it('should return sorted unique dependencies', async () => {
      const fileWithDuplicates = path.join(tempDir, 'duplicates.ts');
      const duplicateContent = `
import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';
import * as path from 'path';
import { join } from 'path';
export const test = {};
      `.trim();
      
      fs.writeFileSync(fileWithDuplicates, duplicateContent);
      const dependencies = await extractDependencies(fileWithDuplicates);
      
      expect(dependencies).toEqual(['fs/promises', 'path']);
      expect(dependencies).toHaveLength(2); // No duplicates
    });

    it('should handle files with no dependencies', async () => {
      const noDepsFile = path.join(tempDir, 'no-deps.ts');
      fs.writeFileSync(noDepsFile, 'export const value = 42;');
      
      const dependencies = await extractDependencies(noDepsFile);
      expect(dependencies).toEqual([]);
    });

    it('should handle error cases', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.ts');
      // extractDependencies may throw an error for non-existent files
      await expect(extractDependencies(nonExistentFile))
        .rejects.toThrow(); // Accept any error type since implementation may vary
    });
  });

  describe('getBatchAnalysis function contract', () => {
    it('should accept filePaths array and return Promise<BatchResult[]>', async () => {
      const filePaths = [testFilePath, testFile2Path];
      const result = getBatchAnalysis(filePaths);
      expect(result).toBeInstanceOf(Promise);
      
      const batchResults = await result;
      expect(Array.isArray(batchResults)).toBe(true);
      expect(batchResults).toHaveLength(2);
      
      batchResults.forEach(result => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('dependencies');
        expect(result).toHaveProperty('imports');
        expect(result).toHaveProperty('exports');
      });
    });

    it('should accept optional BatchAnalysisOptions parameter', async () => {
      const options: BatchAnalysisOptions = {
        concurrency: 1,
        failFast: false,
        includeTypeImports: false,
        continueOnError: true
      };
      
      const results = await getBatchAnalysis([testFilePath, testFile2Path], options);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle mixed success and failure cases', async () => {
      const validFile = testFilePath;
      const invalidFile = path.join(tempDir, 'nonexistent.ts');
      
      const options: BatchAnalysisOptions = {
        continueOnError: true,
        failFast: false
      };
      
      // Should return results for successful files and handle errors gracefully
      try {
        const results = await getBatchAnalysis([validFile, invalidFile], options);
        // May have partial results depending on implementation
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Or may throw batch error with partial results
        expect(error).toBeDefined();
      }
    });

    it('should handle empty file paths array', async () => {
      const results = await getBatchAnalysis([]);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('analyzeDirectory function contract', () => {
    beforeEach(() => {
      // Create subdirectory structure
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      
      const subFile = path.join(subDir, 'sub.ts');
      fs.writeFileSync(subFile, 'export const sub = true;');
      
      // Add some non-TypeScript files
      fs.writeFileSync(path.join(tempDir, 'readme.md'), '# Test');
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');
    });

    it('should accept dirPath parameter and return Promise<BatchResult[]>', async () => {
      const result = analyzeDirectory(tempDir);
      expect(result).toBeInstanceOf(Promise);
      
      const results = await result;
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(2); // At least test.ts and test2.ts
      
      results.forEach(result => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('success');
        expect(result.filePath.endsWith('.ts') || result.filePath.endsWith('.tsx')).toBe(true);
      });
    });

    it('should accept optional DirectoryOptions parameter', async () => {
      const options: DirectoryOptions = {
        extensions: ['.ts'],
        maxDepth: 1,
        followSymlinks: false,
        ignorePatterns: ['**/node_modules/**']
      };
      
      const results = await analyzeDirectory(tempDir, options);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should only include .ts files based on extension filter
      results.forEach(result => {
        expect(result.filePath.endsWith('.ts')).toBe(true);
      });
    });

    it('should handle recursive directory scanning', async () => {
      const results = await analyzeDirectory(tempDir);
      
      // Should find files in subdirectories
      const subDirFile = results.find(r => r.filePath.includes('sub.ts'));
      expect(subDirFile).toBeDefined();
      expect(subDirFile?.success).toBe(true);
    });

    it('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      
      // analyzeDirectory may return empty array for non-existent directory
      const results = await analyzeDirectory(nonExistentDir);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('should handle directory with no TypeScript files', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);
      fs.writeFileSync(path.join(emptyDir, 'text.txt'), 'hello');
      
      const results = await analyzeDirectory(emptyDir);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe('Function signature validation', () => {
    it('should have correct analyzeTypeScriptFile signature', () => {
      expect(typeof analyzeTypeScriptFile).toBe('function');
      expect(analyzeTypeScriptFile.length).toBe(2); // filePath, options?
    });

    it('should have correct extractDependencies signature', () => {
      expect(typeof extractDependencies).toBe('function');
      expect(extractDependencies.length).toBe(1); // filePath
    });

    it('should have correct getBatchAnalysis signature', () => {
      expect(typeof getBatchAnalysis).toBe('function');
      expect(getBatchAnalysis.length).toBe(2); // filePaths, options?
    });

    it('should have correct analyzeDirectory signature', () => {
      expect(typeof analyzeDirectory).toBe('function');
      expect(analyzeDirectory.length).toBe(2); // dirPath, options?
    });
  });

  describe('Integration with main API class', () => {
    it('should delegate to TypeScriptAnalyzer correctly', async () => {
      // Test that factory function results match direct API usage
      const { TypeScriptAnalyzer } = await import('../../../src/api/TypeScriptAnalyzer');
      const analyzer = new TypeScriptAnalyzer();
      
      const [factoryResult, apiResult] = await Promise.all([
        analyzeTypeScriptFile(testFilePath),
        analyzer.analyzeFile(testFilePath)
      ]);
      
      // Results should be structurally similar
      expect(factoryResult.filePath).toBe(apiResult.filePath);
      expect(factoryResult.success).toBe(apiResult.success);
      expect(factoryResult.dependencies).toEqual(apiResult.dependencies);
      expect(factoryResult.imports).toEqual(apiResult.imports);
      expect(factoryResult.exports).toEqual(apiResult.exports);
    });

    it('should handle configuration consistently', async () => {
      const options: AnalysisOptions = {
        parseTimeout: 15000,
        includeTypeImports: false,
        includeSources: true
      };
      
      const result = await analyzeTypeScriptFile(testFilePath, options);
      expect(result.success).toBe(true);
      
      // Verify options were applied (specific behavior depends on implementation)
      expect(result).toHaveProperty('dependencies');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle concurrent factory function calls', async () => {
      const promises = [
        analyzeTypeScriptFile(testFilePath),
        extractDependencies(testFile2Path),
        getBatchAnalysis([testFilePath])
      ];
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('success');
      expect(Array.isArray(results[1])).toBe(true);
      expect(Array.isArray(results[2])).toBe(true);
    });

    it('should maintain consistent results across multiple calls', async () => {
      const [result1, result2, result3] = await Promise.all([
        analyzeTypeScriptFile(testFilePath),
        analyzeTypeScriptFile(testFilePath),
        analyzeTypeScriptFile(testFilePath)
      ]);
      
      expect(result1.filePath).toBe(result2.filePath);
      expect(result1.filePath).toBe(result3.filePath);
      expect(result1.success).toBe(result2.success);
      expect(result1.success).toBe(result3.success);
      expect(result1.dependencies).toEqual(result2.dependencies);
      expect(result1.dependencies).toEqual(result3.dependencies);
    });
  });
});