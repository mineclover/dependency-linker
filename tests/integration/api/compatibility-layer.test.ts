/**
 * Compatibility Layer Integration Tests
 * Tests for API compatibility between old and new implementations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

import { TypeScriptAnalyzer as LegacyAnalyzer } from '../../../src/lib/TypeScriptAnalyzer';
import { TypeScriptAnalyzer as CurrentAnalyzer } from '../../../src/api/TypeScriptAnalyzer';
import { AnalysisEngine } from '../../../src/services/AnalysisEngine';
import { AnalysisConfig } from '../../../src/models/AnalysisConfig';
import {
  toLegacyAnalysisResult,
  fromLegacyAnalysisResult,
  adaptAnalysisResult,
  isLegacyAnalysisResult
} from '../../../src/lib/compatibility';
import {
  migrationUtility,
  parseVersion,
  isCompatible,
  createAdapter
} from '../../../src/lib/migration';
import type { LegacyAnalysisResult, AnalysisResult } from '../../../src/models/AnalysisResult';

const testFilePath = join(__dirname, 'test-file.ts');
const testContent = `
import { Component } from '@angular/core';
import * as fs from 'fs';

export interface User {
  id: number;
  name: string;
}

export class UserService {
  getUser(id: number): User {
    return { id, name: 'Test User' };
  }
}

export default UserService;
`;

describe('API Compatibility Layer', () => {
  beforeEach(() => {
    writeFileSync(testFilePath, testContent);
  });

  afterEach(() => {
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  describe('Legacy API Compatibility', () => {
    it('should maintain backward compatibility with v1 API', async () => {
      const analyzer = new LegacyAnalyzer();

      const result = await analyzer.analyzeFile(testFilePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(testFilePath);
      expect(result.success).toBe(true);
      expect(result.dependencies).toBeDefined();
      expect(result.imports).toBeDefined();
      expect(result.exports).toBeDefined();
      expect(typeof result.parseTime).toBe('number');
    });

    it('should show deprecation warnings for legacy methods', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const analyzer = new LegacyAnalyzer();
      await analyzer.analyzeFile(testFilePath);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION')
      );

      consoleSpy.mockRestore();
    });

    it('should provide access to new engine through compatibility facade', () => {
      const analyzer = new LegacyAnalyzer();
      const engine = analyzer.getEngine();

      expect(engine).toBeInstanceOf(AnalysisEngine);
    });
  });

  describe('Current API with New Engine', () => {
    it('should use new engine by default in current API', async () => {
      const analyzer = new CurrentAnalyzer({ useNewEngine: true });

      const result = await analyzer.analyzeFile(testFilePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(testFilePath);
      expect(result.success).toBe(true);
    });

    it('should fallback to legacy implementation when configured', async () => {
      const analyzer = new CurrentAnalyzer({ useNewEngine: false });

      const result = await analyzer.analyzeFile(testFilePath);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Result Format Conversion', () => {
    it('should convert new AnalysisResult to legacy format', async () => {
      const engine = new AnalysisEngine();
      const newResult = await engine.analyzeFile(testFilePath);

      const legacyResult = toLegacyAnalysisResult(newResult);

      expect(isLegacyAnalysisResult(legacyResult)).toBe(true);
      expect(legacyResult.filePath).toBe(testFilePath);
      expect(legacyResult.success).toBeDefined();
      expect(legacyResult.dependencies).toBeDefined();
      expect(legacyResult.imports).toBeDefined();
      expect(legacyResult.exports).toBeDefined();
      expect(typeof legacyResult.parseTime).toBe('number');
    });

    it('should convert legacy AnalysisResult to new format', async () => {
      const legacyAnalyzer = new LegacyAnalyzer();
      const legacyResult = await legacyAnalyzer.analyzeFile(testFilePath);

      const newResult = fromLegacyAnalysisResult(legacyResult);

      expect(newResult.filePath).toBe(testFilePath);
      expect(newResult.language).toBeDefined();
      expect(newResult.extractedData).toBeDefined();
      expect(newResult.performanceMetrics).toBeDefined();
      expect(newResult.metadata).toBeDefined();
    });

    it('should adapt results bidirectionally', async () => {
      const engine = new AnalysisEngine();
      const originalResult = await engine.analyzeFile(testFilePath);

      const adapted = adaptAnalysisResult(originalResult);

      expect(adapted.new).toBeDefined();
      expect(adapted.legacy).toBeDefined();
      expect(adapted.new.filePath).toBe(adapted.legacy.filePath);
    });
  });

  describe('Batch Processing Compatibility', () => {
    it('should maintain batch processing compatibility', async () => {
      const analyzer = new LegacyAnalyzer();

      const result = await analyzer.analyzeFiles([testFilePath]);

      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBe(1);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle empty file arrays', async () => {
      const analyzer = new LegacyAnalyzer();

      const result = await analyzer.analyzeFiles([]);

      expect(result.results).toEqual([]);
      expect(result.summary.totalFiles).toBe(0);
    });
  });

  describe('Source Analysis Compatibility', () => {
    it('should analyze source code directly', async () => {
      const analyzer = new LegacyAnalyzer();

      const result = await analyzer.analyzeSource(testContent, {
        contextPath: '<test-source>'
      });

      expect(result.filePath).toBe('<test-source>');
      expect(result.success).toBe(true);
      expect(result.dependencies).toBeDefined();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle file not found errors consistently', async () => {
      const analyzer = new LegacyAnalyzer();

      await expect(analyzer.analyzeFile('non-existent-file.ts'))
        .rejects.toThrow();
    });

    it('should handle syntax errors gracefully', async () => {
      const invalidFilePath = join(__dirname, 'invalid.ts');
      writeFileSync(invalidFilePath, 'invalid typescript syntax {[}]');

      try {
        const analyzer = new LegacyAnalyzer();
        const result = await analyzer.analyzeFile(invalidFilePath);

        // Should still return a result, possibly with errors
        expect(result).toBeDefined();
        expect(result.filePath).toBe(invalidFilePath);
      } finally {
        if (existsSync(invalidFilePath)) {
          unlinkSync(invalidFilePath);
        }
      }
    });
  });
});

describe('Version Management and Migration', () => {
  describe('Version Parsing', () => {
    it('should parse standard semantic versions', () => {
      const version = parseVersion('2.1.0');

      expect(version.major).toBe(2);
      expect(version.minor).toBe(1);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBeUndefined();
    });

    it('should parse prerelease versions', () => {
      const version = parseVersion('2.1.0-beta.1');

      expect(version.major).toBe(2);
      expect(version.minor).toBe(1);
      expect(version.patch).toBe(0);
      expect(version.prerelease).toBe('beta.1');
    });

    it('should throw on invalid version format', () => {
      expect(() => parseVersion('invalid')).toThrow();
    });
  });

  describe('Version Compatibility', () => {
    it('should check version compatibility correctly', () => {
      expect(isCompatible('2.0.0', '2.1.0')).toBe(true);
      expect(isCompatible('2.1.0', '2.0.0')).toBe(false);
      expect(isCompatible('1.0.0', '2.0.0')).toBe(false);
      expect(isCompatible('2.0.0', '2.0.0')).toBe(true);
    });
  });

  describe('Migration Planning', () => {
    it('should generate migration plan for major version upgrade', () => {
      const fromVersion = parseVersion('1.0.0');
      const toVersion = parseVersion('2.0.0');

      const plan = migrationUtility.getMigrationPlan(fromVersion, toVersion);

      expect(plan.breakingChanges.length).toBeGreaterThan(0);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedEffort).toBe('high');
    });

    it('should handle same version migration', () => {
      const version = parseVersion('2.0.0');

      const plan = migrationUtility.getMigrationPlan(version, version);

      expect(plan.steps).toEqual([]);
      expect(plan.automatable).toBe(true);
      expect(plan.estimatedEffort).toBe('low');
    });

    it('should reject downgrade attempts', () => {
      const fromVersion = parseVersion('2.0.0');
      const toVersion = parseVersion('1.0.0');

      expect(() => migrationUtility.getMigrationPlan(fromVersion, toVersion))
        .toThrow('Cannot migrate from newer version to older version');
    });
  });

  describe('Compatibility Adapters', () => {
    it('should create v1 compatibility adapter', () => {
      const adapter = createAdapter('1.0.0');

      expect(adapter.version.major).toBe(1);

      const analyzer = adapter.createAnalyzer();
      expect(analyzer).toBeInstanceOf(LegacyAnalyzer);
    });

    it('should create current version adapter', () => {
      const adapter = createAdapter('2.0.0');

      expect(adapter.version.major).toBe(2);

      const analyzer = adapter.createAnalyzer();
      expect(analyzer).toBeInstanceOf(AnalysisEngine);
    });

    it('should adapt analysis options correctly', () => {
      const v1Adapter = createAdapter('1.0.0');

      const legacyOptions = {
        defaultTimeout: 5000,
        enableCache: false
      };

      const config = v1Adapter.adaptAnalysisOptions(legacyOptions);

      expect(config).toBeInstanceOf(AnalysisConfig);
      expect(config.timeout).toBe(5000);
      expect(config.useCache).toBe(false);
    });
  });
});

describe('Performance and Memory', () => {
  it('should not have significant performance regression', async () => {
    const legacyAnalyzer = new LegacyAnalyzer();
    const currentAnalyzer = new CurrentAnalyzer();

    const iterations = 5;
    let legacyTime = 0;
    let currentTime = 0;

    // Measure legacy performance
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await legacyAnalyzer.analyzeFile(testFilePath);
      legacyTime += Date.now() - start;
    }

    // Measure current performance
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await currentAnalyzer.analyzeFile(testFilePath);
      currentTime += Date.now() - start;
    }

    const legacyAvg = legacyTime / iterations;
    const currentAvg = currentTime / iterations;

    // Current implementation should not be more than 50% slower
    expect(currentAvg).toBeLessThan(legacyAvg * 1.5);

    console.log(`Performance comparison:
      Legacy average: ${legacyAvg.toFixed(2)}ms
      Current average: ${currentAvg.toFixed(2)}ms
      Ratio: ${(currentAvg / legacyAvg).toFixed(2)}x`);
  });

  it('should clean up resources properly', async () => {
    const analyzer = new LegacyAnalyzer();

    // Process multiple files
    for (let i = 0; i < 10; i++) {
      await analyzer.analyzeFile(testFilePath);
    }

    // Clear cache
    analyzer.clearCache();

    // Verify cache is cleared
    const state = analyzer.getState();
    expect(state.cacheStats.entryCount).toBe(0);
  });
});

describe('Integration with Real Projects', () => {
  it('should handle complex TypeScript files', async () => {
    const complexContent = `
// Complex TypeScript file with various constructs
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, filter, catchError } from 'rxjs/operators';
import type { User, ApiResponse } from './types';
import * as utils from '../utils';

export interface ServiceConfig {
  timeout: number;
  retries: number;
}

export abstract class BaseService<T> {
  protected abstract endpoint: string;

  abstract getData(): Observable<T>;
}

export class UserService extends BaseService<User> {
  protected endpoint = '/api/users';

  private userSubject = new BehaviorSubject<User[]>([]);

  constructor(private config: ServiceConfig) {
    super();
  }

  getData(): Observable<User[]> {
    return this.userSubject.asObservable().pipe(
      map(users => users.filter(u => u.active)),
      catchError(err => {
        console.error('Error:', err);
        return [];
      })
    );
  }

  async fetchUsers(): Promise<ApiResponse<User[]>> {
    const response = await fetch(this.endpoint);
    return response.json();
  }
}

export default UserService;
export { BaseService };
export type { ServiceConfig };
`;

    const complexFilePath = join(__dirname, 'complex.ts');
    writeFileSync(complexFilePath, complexContent);

    try {
      const analyzer = new LegacyAnalyzer();
      const result = await analyzer.analyzeFile(complexFilePath);

      expect(result.success).toBe(true);
      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.exports.length).toBeGreaterThan(0);

      // Verify we captured RxJS imports
      const rxjsImports = result.dependencies.filter(dep =>
        dep.source.includes('rxjs')
      );
      expect(rxjsImports.length).toBeGreaterThan(0);

    } finally {
      if (existsSync(complexFilePath)) {
        unlinkSync(complexFilePath);
      }
    }
  });
});