/**
 * Unit Tests for Migration Utilities
 * Tests for version negotiation and migration planning
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import {
  MigrationUtility,
  migrationUtility,
  parseVersion,
  isCompatible,
  createAdapter,
  CurrentVersionAdapter,
  V1CompatibilityAdapter
} from '../../../src/lib/migration';
import { AnalysisEngine } from '../../../src/services/AnalysisEngine';
import { AnalysisConfig } from '../../../src/models/AnalysisConfig';
import { TypeScriptAnalyzer } from '../../../src/lib/TypeScriptAnalyzer';
import type { ApiVersion, MigrationPlan } from '../../../src/lib/migration';

describe('Migration Utility Functions', () => {
  describe('Version Parsing', () => {
    it('should parse standard semantic versions', () => {
      const testCases = [
        { input: '1.0.0', expected: { major: 1, minor: 0, patch: 0 } },
        { input: '2.5.10', expected: { major: 2, minor: 5, patch: 10 } },
        { input: '0.1.0', expected: { major: 0, minor: 1, patch: 0 } }
      ];

      testCases.forEach(({ input, expected }) => {
        const version = parseVersion(input);
        expect(version.major).toBe(expected.major);
        expect(version.minor).toBe(expected.minor);
        expect(version.patch).toBe(expected.patch);
        expect(version.prerelease).toBeUndefined();
      });
    });

    it('should parse prerelease versions', () => {
      const testCases = [
        { input: '2.0.0-alpha', expected: { major: 2, minor: 0, patch: 0, prerelease: 'alpha' } },
        { input: '1.5.0-beta.2', expected: { major: 1, minor: 5, patch: 0, prerelease: 'beta.2' } },
        { input: '3.0.0-rc.1', expected: { major: 3, minor: 0, patch: 0, prerelease: 'rc.1' } }
      ];

      testCases.forEach(({ input, expected }) => {
        const version = parseVersion(input);
        expect(version.major).toBe(expected.major);
        expect(version.minor).toBe(expected.minor);
        expect(version.patch).toBe(expected.patch);
        expect(version.prerelease).toBe(expected.prerelease);
      });
    });

    it('should reject invalid version formats', () => {
      const invalidVersions = [
        'invalid',
        '1.0',
        '1',
        'a.b.c',
        '1.0.0.0',
        '1.0.0-',
        '',
        null,
        undefined
      ];

      invalidVersions.forEach(invalid => {
        expect(() => parseVersion(invalid as any)).toThrow();
      });
    });
  });

  describe('Version Comparison', () => {
    let utility: MigrationUtility;

    beforeEach(() => {
      utility = new MigrationUtility();
    });

    it('should compare versions correctly', () => {
      const testCases = [
        { v1: '1.0.0', v2: '1.0.0', expected: 0 },
        { v1: '1.0.0', v2: '1.0.1', expected: -1 },
        { v1: '1.0.1', v2: '1.0.0', expected: 1 },
        { v1: '1.0.0', v2: '1.1.0', expected: -1 },
        { v1: '1.1.0', v2: '1.0.0', expected: 1 },
        { v1: '1.0.0', v2: '2.0.0', expected: -1 },
        { v1: '2.0.0', v2: '1.0.0', expected: 1 }
      ];

      testCases.forEach(({ v1, v2, expected }) => {
        const version1 = parseVersion(v1);
        const version2 = parseVersion(v2);
        const result = utility.compareVersions(version1, version2);
        expect(result).toBe(expected);
      });
    });

    it('should handle prerelease comparison', () => {
      const testCases = [
        { v1: '1.0.0-alpha', v2: '1.0.0', expected: -1 },
        { v1: '1.0.0', v2: '1.0.0-alpha', expected: 1 },
        { v1: '1.0.0-alpha', v2: '1.0.0-beta', expected: -1 },
        { v1: '1.0.0-beta', v2: '1.0.0-alpha', expected: 1 },
        { v1: '1.0.0-alpha', v2: '1.0.0-alpha', expected: 0 }
      ];

      testCases.forEach(({ v1, v2, expected }) => {
        const version1 = parseVersion(v1);
        const version2 = parseVersion(v2);
        const result = utility.compareVersions(version1, version2);
        expect(Math.sign(result)).toBe(Math.sign(expected));
      });
    });
  });

  describe('Compatibility Checking', () => {
    it('should check version compatibility correctly', () => {
      const testCases = [
        // Same major version - compatible
        { client: '2.0.0', server: '2.0.0', expected: true },
        { client: '2.0.0', server: '2.1.0', expected: true },
        { client: '2.1.0', server: '2.0.0', expected: false }, // Client newer minor

        // Different major version - not compatible
        { client: '1.0.0', server: '2.0.0', expected: false },
        { client: '2.0.0', server: '1.0.0', expected: false },

        // Minor version compatibility
        { client: '2.0.0', server: '2.5.0', expected: true },
        { client: '2.5.0', server: '2.0.0', expected: false }
      ];

      testCases.forEach(({ client, server, expected }) => {
        const result = isCompatible(client, server);
        expect(result).toBe(expected);
      });
    });
  });
});

describe('Migration Planning', () => {
  let utility: MigrationUtility;

  beforeEach(() => {
    utility = new MigrationUtility();
  });

  describe('Same Version Migration', () => {
    it('should handle identical versions', () => {
      const version = parseVersion('2.0.0');
      const plan = utility.getMigrationPlan(version, version);

      expect(plan.steps).toEqual([]);
      expect(plan.automatable).toBe(true);
      expect(plan.breakingChanges).toEqual([]);
      expect(plan.estimatedEffort).toBe('low');
      expect(plan.description).toContain('No migration needed');
    });
  });

  describe('Major Version Migration', () => {
    it('should generate migration plan for v1 to v2', () => {
      const fromVersion = parseVersion('1.0.0');
      const toVersion = parseVersion('2.0.0');
      const plan = utility.getMigrationPlan(fromVersion, toVersion);

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.breakingChanges.length).toBeGreaterThan(0);
      expect(plan.automatable).toBe(false);
      expect(plan.estimatedEffort).toBe('high');

      // Check for expected migration steps
      const stepIds = plan.steps.map(step => step.id);
      expect(stepIds).toContain('replace-typescript-analyzer');
      expect(stepIds).toContain('update-analyze-method');
      expect(stepIds).toContain('configure-extractors');

      // Check breaking changes
      const components = plan.breakingChanges.map(change => change.component);
      expect(components).toContain('TypeScriptAnalyzer');
    });

    it('should provide detailed migration steps', () => {
      const fromVersion = parseVersion('1.0.0');
      const toVersion = parseVersion('2.0.0');
      const plan = utility.getMigrationPlan(fromVersion, toVersion);

      plan.steps.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.type).toMatch(/^(replace|add|remove|configure)$/);
        expect(typeof step.automated).toBe('boolean');

        if (step.automated && step.codeChange) {
          expect(step.codeChange.find).toBeDefined();
          expect(step.codeChange.replace).toBeDefined();
          expect(step.codeChange.filePatter).toBeDefined();
        }

        if (!step.automated) {
          expect(step.manualInstructions).toBeDefined();
        }
      });
    });

    it('should classify breaking changes properly', () => {
      const fromVersion = parseVersion('1.0.0');
      const toVersion = parseVersion('2.0.0');
      const plan = utility.getMigrationPlan(fromVersion, toVersion);

      plan.breakingChanges.forEach(change => {
        expect(change.component).toBeDefined();
        expect(change.type).toMatch(/^(api-change|behavior-change|removed-feature)$/);
        expect(change.description).toBeDefined();
        expect(change.impact).toMatch(/^(high|medium|low)$/);
      });
    });
  });

  describe('Minor Version Migration', () => {
    it('should handle minor version updates', () => {
      const fromVersion = parseVersion('2.0.0');
      const toVersion = parseVersion('2.1.0');
      const plan = utility.getMigrationPlan(fromVersion, toVersion);

      expect(plan.steps).toEqual([]);
      expect(plan.automatable).toBe(true);
      expect(plan.breakingChanges).toEqual([]);
      expect(plan.estimatedEffort).toBe('low');
      expect(plan.description).toContain('Minor version update');
    });
  });

  describe('Invalid Migration Scenarios', () => {
    it('should reject downgrade attempts', () => {
      const fromVersion = parseVersion('2.0.0');
      const toVersion = parseVersion('1.0.0');

      expect(() => utility.getMigrationPlan(fromVersion, toVersion))
        .toThrow('Cannot migrate from newer version to older version');
    });
  });
});

describe('Migration Execution', () => {
  let utility: MigrationUtility;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    utility = new MigrationUtility();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should execute dry run migration', async () => {
    const fromVersion = parseVersion('1.0.0');
    const toVersion = parseVersion('2.0.0');
    const plan = utility.getMigrationPlan(fromVersion, toVersion);

    const result = await utility.executeMigration(plan, { dryRun: true });

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.stepsCompleted).toBeGreaterThanOrEqual(0);
    expect(result.stepsTotal).toBe(plan.steps.length);
    expect(result.errors).toBeDefined();
    expect(result.warnings).toBeDefined();
    expect(result.filesModified).toBeDefined();
  });

  it('should handle manual steps in migration', async () => {
    const fromVersion = parseVersion('1.0.0');
    const toVersion = parseVersion('2.0.0');
    const plan = utility.getMigrationPlan(fromVersion, toVersion);

    const result = await utility.executeMigration(plan);

    // Should have warnings for manual steps
    const manualSteps = plan.steps.filter(s => !s.automated);
    expect(result.warnings.length).toBe(manualSteps.length);

    manualSteps.forEach(step => {
      const warning = result.warnings.find(w => w.includes(step.description));
      expect(warning).toBeDefined();
    });
  });
});

describe('Compatibility Adapters', () => {
  describe('Current Version Adapter', () => {
    let adapter: CurrentVersionAdapter;

    beforeEach(() => {
      adapter = new CurrentVersionAdapter();
    });

    it('should have correct version', () => {
      expect(adapter.version.major).toBe(2);
      expect(adapter.version.minor).toBe(0);
      expect(adapter.version.patch).toBe(0);
    });

    it('should adapt analysis results without change', () => {
      const mockResult = {} as any;
      const adapted = adapter.adaptAnalysisResult(mockResult);
      expect(adapted).toBe(mockResult);
    });

    it('should convert options to AnalysisConfig', () => {
      const options = {
        timeout: 5000,
        useCache: false,
        extractors: ['dependency'],
        interpreters: ['dependency-analysis']
      };

      const config = adapter.adaptAnalysisOptions(options);

      expect(config).toBeInstanceOf(AnalysisConfig);
      expect(config.timeout).toBe(5000);
      expect(config.useCache).toBe(false);
      expect(config.extractors).toEqual(['dependency']);
      expect(config.interpreters).toEqual(['dependency-analysis']);
    });

    it('should handle AnalysisConfig input', () => {
      const existingConfig = AnalysisConfig.createDefault();
      const adapted = adapter.adaptAnalysisOptions(existingConfig);
      expect(adapted).toBe(existingConfig);
    });

    it('should create AnalysisEngine', () => {
      const analyzer = adapter.createAnalyzer();
      expect(analyzer).toBeInstanceOf(AnalysisEngine);
    });
  });

  describe('V1 Compatibility Adapter', () => {
    let adapter: V1CompatibilityAdapter;

    beforeEach(() => {
      adapter = new V1CompatibilityAdapter();
    });

    it('should have correct version', () => {
      expect(adapter.version.major).toBe(1);
      expect(adapter.version.minor).toBe(0);
      expect(adapter.version.patch).toBe(0);
    });

    it('should convert new results to legacy format', () => {
      const mockNewResult = {
        filePath: '/test.ts',
        language: 'typescript',
        extractedData: {},
        interpretedData: {},
        performanceMetrics: { parsing: 100 },
        cacheMetadata: {},
        errors: [],
        metadata: {}
      } as any;

      const adapted = adapter.adaptAnalysisResult(mockNewResult);

      expect(adapted.filePath).toBe('/test.ts');
      expect(adapted.parseTime).toBe(100);
      expect(adapted.dependencies).toBeDefined();
      expect(adapted.imports).toBeDefined();
      expect(adapted.exports).toBeDefined();
    });

    it('should adapt v1 options to v2 config', () => {
      const v1Options = {
        defaultTimeout: 8000,
        enableCache: true,
        cacheSize: 500
      };

      const config = adapter.adaptAnalysisOptions(v1Options);

      expect(config).toBeInstanceOf(AnalysisConfig);
      expect(config.timeout).toBe(8000);
      expect(config.useCache).toBe(true);
      expect(config.extractors).toEqual(['dependency', 'identifier']);
    });

    it('should create TypeScriptAnalyzer', () => {
      const analyzer = adapter.createAnalyzer();
      expect(analyzer).toBeInstanceOf(TypeScriptAnalyzer);
    });
  });

  describe('Adapter Factory', () => {
    it('should create correct adapter for v2', () => {
      const adapter = createAdapter('2.0.0');
      expect(adapter).toBeInstanceOf(CurrentVersionAdapter);
    });

    it('should create correct adapter for v1', () => {
      const adapter = createAdapter('1.0.0');
      expect(adapter).toBeInstanceOf(V1CompatibilityAdapter);
    });

    it('should throw for unsupported versions', () => {
      expect(() => createAdapter('3.0.0')).toThrow('Unsupported target version');
      expect(() => createAdapter('0.9.0')).toThrow('Unsupported target version');
    });
  });
});

describe('Integration Tests', () => {
  it('should work with global migration utility', () => {
    const version = parseVersion('2.0.0');
    expect(version.major).toBe(2);

    const compatible = isCompatible('2.0.0', '2.1.0');
    expect(compatible).toBe(true);

    const adapter = createAdapter('2.0.0');
    expect(adapter.version.major).toBe(2);
  });

  it('should format version strings consistently', () => {
    const utility = new MigrationUtility();
    const version1 = parseVersion('2.1.0-beta.1');
    const version2 = parseVersion('2.1.0');

    // Versions should be comparable
    const comparison = utility.compareVersions(version1, version2);
    expect(comparison).toBeLessThan(0); // prerelease < release
  });
});