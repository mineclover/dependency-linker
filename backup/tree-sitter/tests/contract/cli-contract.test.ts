/**
 * CLI Contract Test
 * Tests the command-line interface behavior according to the OpenAPI contract
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('CLI Contract Tests', () => {
  const testFilesDir = path.join(__dirname, '../fixtures');
  const sampleTsFile = path.join(testFilesDir, 'sample.ts');
  const sampleTsxFile = path.join(testFilesDir, 'sample.tsx');
  const invalidFile = path.join(testFilesDir, 'invalid.txt');
  const nonExistentFile = path.join(testFilesDir, 'nonexistent.ts');

  beforeAll(async () => {
    // Create test fixtures directory
    await fs.promises.mkdir(testFilesDir, { recursive: true });

    // Create sample TypeScript file
    await fs.promises.writeFile(sampleTsFile, `
import React from 'react';
import { useState } from 'react';
import utils from './utils';
import '../styles/main.css';

export interface Props {
  name: string;
}

export const Component: React.FC<Props> = ({ name }) => {
  const [count, setCount] = useState(0);
  return <div>{name}: {count}</div>;
};

export default Component;
`);

    // Create sample TSX file
    await fs.promises.writeFile(sampleTsxFile, `
import * as React from 'react';
import type { ComponentProps } from 'react';

const App: React.FC = () => {
  return <div>Hello World</div>;
};

export default App;
`);

    // Create invalid file (non-TypeScript)
    await fs.promises.writeFile(invalidFile, 'This is not TypeScript code');
  });

  afterAll(async () => {
    // Clean up test fixtures
    await fs.promises.rm(testFilesDir, { recursive: true, force: true });
  });

  describe('Basic CLI functionality', () => {
    test('should show help when --help flag is provided', async () => {
      const { stdout } = await execAsync('node dist/cli/analyze-file.js --help');
      expect(stdout).toContain('analyze-file');
      expect(stdout).toContain('--file');
      expect(stdout).toContain('--format');
    });

    test('should show version when --version flag is provided', async () => {
      const { stdout } = await execAsync('node dist/cli/analyze-file.js --version');
      expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Version pattern
    });
  });

  describe('File analysis - Success cases (200)', () => {
    test('should analyze TypeScript file with default JSON format', async () => {
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsFile}"`);
      const result = JSON.parse(stdout);

      // Validate AnalysisResult structure
      expect(result).toMatchObject({
        filePath: sampleTsFile,
        success: true,
        dependencies: expect.any(Array),
        imports: expect.any(Array),
        exports: expect.any(Array),
        parseTime: expect.any(Number)
      });

      // Validate dependencies found
      expect(result.dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'react',
            type: 'external',
            location: expect.objectContaining({
              line: expect.any(Number),
              column: expect.any(Number),
              offset: expect.any(Number)
            })
          }),
          expect.objectContaining({
            source: './utils',
            type: 'relative',
            location: expect.any(Object)
          })
        ])
      );

      // Validate imports structure
      expect(result.imports).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'react',
            specifiers: expect.arrayContaining([
              expect.objectContaining({
                imported: expect.any(String),
                local: expect.any(String),
                type: expect.any(String)
              })
            ]),
            isTypeOnly: expect.any(Boolean),
            location: expect.any(Object)
          })
        ])
      );

      // Validate exports
      expect(result.exports).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            type: expect.stringMatching(/^(default|named|namespace)$/),
            isTypeOnly: expect.any(Boolean),
            location: expect.any(Object)
          })
        ])
      );
    });

    test('should analyze TSX file successfully', async () => {
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsxFile}" --format json`);
      const result = JSON.parse(stdout);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(sampleTsxFile);
      expect(result.dependencies).toBeDefined();
    });

    test('should support text format output', async () => {
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsFile}" --format text`);
      
      expect(stdout).toContain('File:');
      expect(stdout).toContain('Dependencies:');
      expect(stdout).toContain('Exports:');
      expect(stdout).not.toContain('{'); // Should not contain JSON
    });

    test('should include source locations when requested', async () => {
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsFile}" --include-sources`);
      const result = JSON.parse(stdout);

      expect(result.dependencies[0].location).toMatchObject({
        line: expect.any(Number),
        column: expect.any(Number),
        offset: expect.any(Number)
      });
    });
  });

  describe('Error cases (400)', () => {
    test('should return error for non-existent file', async () => {
      try {
        await execAsync(`node dist/cli/analyze-file.js --file "${nonExistentFile}"`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1); // Process exit code
        const result = JSON.parse(error.stdout || '{}');
        expect(result).toMatchObject({
          error: {
            code: 'FILE_NOT_FOUND',
            message: expect.stringContaining('does not exist')
          }
        });
      }
    });

    test('should return error for non-TypeScript file', async () => {
      try {
        await execAsync(`node dist/cli/analyze-file.js --file "${invalidFile}"`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        const result = JSON.parse(error.stdout || '{}');
        expect(result).toMatchObject({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: expect.stringContaining('.ts or .tsx extension')
          }
        });
      }
    });

    test('should return error when --file argument is missing', async () => {
      try {
        await execAsync('node dist/cli/analyze-file.js');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain('--file');
      }
    });
  });

  describe('Timeout and performance (500)', () => {
    test('should respect parse timeout setting', async () => {
      // This test would require a very large or complex file that takes >timeout to parse
      // For now, just verify the timeout parameter is accepted
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsFile}" --parse-timeout 1000`);
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
    });

    test('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      const { stdout } = await execAsync(`node dist/cli/analyze-file.js --file "${sampleTsFile}"`);
      const endTime = Date.now();
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second max
      expect(result.parseTime).toBeLessThan(1000); // 1 second parse time max
    });
  });
});