/**
 * File Analysis Integration Test
 * Tests single file analysis functionality end-to-end
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileAnalyzer } from '../../src/services/FileAnalyzer';
import { FileAnalysisRequest, AnalysisOptions } from '../../src/models/FileAnalysisRequest';
import { AnalysisResult } from '../../src/models/AnalysisResult';
import { DependencyInfo } from '../../src/models/DependencyInfo';
import { ImportInfo } from '../../src/models/ImportInfo';

describe('File Analysis Integration', () => {
  let fileAnalyzer: FileAnalyzer;
  const testFilesDir = path.join(__dirname, '../fixtures');

  beforeAll(async () => {
    fileAnalyzer = new FileAnalyzer();
    
    // Create test fixtures directory
    await fs.promises.mkdir(testFilesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up only temporary test files, not the permanent fixtures
    const tempFiles = ['simple.ts', 'complex.ts', 'empty.ts'];
    for (const file of tempFiles) {
      const filePath = path.join(testFilesDir, file);
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        // Ignore file not found errors
      }
    }
  });

  describe('Single file analysis workflow', () => {
    test('should analyze simple TypeScript file completely', async () => {
      const testFile = path.join(testFilesDir, 'simple.ts');
      await fs.promises.writeFile(testFile, `
// Simple TypeScript file for testing
import { readFileSync } from 'fs';
import utils from './utils';
import '../styles.css';

export interface User {
  id: number;
  name: string;
}

export const getUser = (id: number): User => {
  return { id, name: 'Test User' };
};

export default getUser;
`);

      const request: FileAnalysisRequest = {
        filePath: testFile,
        options: {
          format: 'json',
          includeSources: true,
          parseTimeout: 5000
        }
      };

      const result: AnalysisResult = await fileAnalyzer.analyzeFile(request);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(testFile);
      expect(result.parseTime).toBeGreaterThan(0);
      expect(result.parseTime).toBeLessThan(1000);

      // Verify dependencies
      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'fs',
            type: 'external'
          }),
          expect.objectContaining({
            source: './utils',
            type: 'relative'
          }),
          expect.objectContaining({
            source: '../styles.css',
            type: 'relative'
          })
        ])
      );

      // Verify imports
      expect(result.imports).toHaveLength(3);
      expect(result.imports[0]).toMatchObject({
        source: 'fs',
        specifiers: [
          {
            imported: 'readFileSync',
            local: 'readFileSync',
            type: 'named'
          }
        ],
        isTypeOnly: false,
        location: expect.objectContaining({
          line: expect.any(Number),
          column: expect.any(Number),
          offset: expect.any(Number)
        })
      });

      // Verify exports
      expect(result.exports).toHaveLength(3); // interface User, getUser function, default export
      expect(result.exports).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'User',
            type: 'named',
            isTypeOnly: true
          }),
          expect.objectContaining({
            name: 'getUser',
            type: 'named',
            isTypeOnly: false
          }),
          expect.objectContaining({
            name: 'default',
            type: 'default',
            isTypeOnly: false
          })
        ])
      );
    });

    test('should analyze complex React component file', async () => {
      const testFile = path.join(testFilesDir, 'complex-component.tsx');
      await fs.promises.writeFile(testFile, `
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@mui/material';
import type { ComponentProps } from 'react';
import styled from 'styled-components';
import { api } from '../api/client';
import { UserData, ApiResponse } from '../types/user';

interface Props extends ComponentProps<'div'> {
  userId: string;
  onUserLoad?: (user: UserData) => void;
}

const Container = styled.div\`
  padding: 16px;
  background: white;
\`;

export const UserProfile: React.FC<Props> = ({ userId, onUserLoad, ...props }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const response: ApiResponse<UserData> = await api.getUser(userId);
      setUser(response.data);
      onUserLoad?.(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, onUserLoad]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <Container {...props}>
      <h1>{user.name}</h1>
      <Button onClick={loadUser}>Refresh</Button>
    </Container>
  );
};

export default UserProfile;
`);

      const request: FileAnalysisRequest = {
        filePath: testFile,
        options: {
          format: 'json',
          includeSources: false,
          parseTimeout: 5000
        }
      };

      const result: AnalysisResult = await fileAnalyzer.analyzeFile(request);

      // Verify success and performance
      expect(result.success).toBe(true);
      expect(result.parseTime).toBeLessThan(1000);

      // Verify dependencies are correctly categorized
      const externalDeps = result.dependencies.filter((d: DependencyInfo) => d.type === 'external');
      const relativeDeps = result.dependencies.filter((d: DependencyInfo) => d.type === 'relative');

      expect(externalDeps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: 'react' }),
          expect.objectContaining({ source: '@mui/material' }),
          expect.objectContaining({ source: 'styled-components' })
        ])
      );

      expect(relativeDeps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: '../api/client' }),
          expect.objectContaining({ source: '../types/user' })
        ])
      );

      // Verify imports with specifiers
      const reactImport = result.imports.find((i: ImportInfo) => i.source === 'react');
      expect(reactImport?.specifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ imported: 'useState', type: 'named' }),
          expect.objectContaining({ imported: 'useEffect', type: 'named' }),
          expect.objectContaining({ imported: 'useCallback', type: 'named' })
        ])
      );

      // Verify type-only imports
      const typeImport = result.imports.find((i: ImportInfo) => i.source === 'react' && i.isTypeOnly === true);
      expect(typeImport?.specifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ imported: 'ComponentProps', type: 'named' })
        ])
      );
    });

    test('should handle files with no dependencies', async () => {
      const testFile = path.join(testFilesDir, 'standalone.ts');
      await fs.promises.writeFile(testFile, `
// Standalone TypeScript file
export const PI = 3.14159;

export function calculateCircleArea(radius: number): number {
  return PI * radius * radius;
}

export default { PI, calculateCircleArea };
`);

      const request: FileAnalysisRequest = {
        filePath: testFile,
        options: { format: 'json' }
      };

      const result: AnalysisResult = await fileAnalyzer.analyzeFile(request);

      expect(result.success).toBe(true);
      expect(result.dependencies).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(3); // PI, calculateCircleArea, default
    });
  });

  describe('Analysis options', () => {
    test('should respect parseTimeout option', async () => {
      const testFile = path.join(testFilesDir, 'timeout-test.ts');
      await fs.promises.writeFile(testFile, 'export const test = "timeout";');

      const request: FileAnalysisRequest = {
        filePath: testFile,
        options: {
          format: 'json',
          parseTimeout: 100 // Very short timeout
        }
      };

      const result = await fileAnalyzer.analyzeFile(request);
      
      // Should complete successfully since file is simple
      expect(result.success).toBe(true);
    });

    test('should provide detailed location info when includeSources is true', async () => {
      const testFile = path.join(testFilesDir, 'location-test.ts');
      await fs.promises.writeFile(testFile, `import { test } from 'module';
export const value = 42;`);

      const request: FileAnalysisRequest = {
        filePath: testFile,
        options: {
          format: 'json',
          includeSources: true
        }
      };

      const result = await fileAnalyzer.analyzeFile(request);

      expect(result.success).toBe(true);
      expect(result.dependencies[0].location).toMatchObject({
        line: 1,
        column: expect.any(Number),
        offset: expect.any(Number)
      });
      expect(result.imports[0].location).toBeDefined();
      expect(result.exports[0].location).toBeDefined();
    });
  });
});