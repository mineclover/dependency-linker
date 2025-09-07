/**
 * Unit Tests for DataCollectionRules Domain Entity
 * Tests business rules and validation logic for data collection constraints
 */

import { 
  describe, 
  it, 
  expect, 
  beforeEach,
  vi
} from 'vitest';
import { DataCollectionRules } from '../../../src/domain/entities/DataCollectionRules.js';
import { TestConfigFactory } from '../../setup/test-framework.js';
import type { ProcessedConfig } from '../../../src/shared/types/index.js';

describe('DataCollectionRules Domain Entity', () => {
  let config: ProcessedConfig;
  let rules: DataCollectionRules;

  beforeEach(() => {
    config = TestConfigFactory.createMinimalConfig();
    rules = new DataCollectionRules(config);
    vi.clearAllMocks();
  });

  describe('File Size Validation', () => {
    it('should enforce maximum file size limits', () => {
      const largeFile = {
        path: '/test/project/large.ts',
        name: 'large.ts',
        extension: '.ts',
        size: 2097152 // 2MB
      };

      const isValid = rules.validateFileSize(largeFile);
      
      expect(isValid).toBe(false);
    });

    it('should accept files within size limits', () => {
      const normalFile = {
        path: '/test/project/normal.ts',
        name: 'normal.ts',
        extension: '.ts',
        size: 51200 // 50KB
      };

      const isValid = rules.validateFileSize(normalFile);
      
      expect(isValid).toBe(true);
    });

    it('should handle files without size information', () => {
      const fileWithoutSize = {
        path: '/test/project/unknown.ts',
        name: 'unknown.ts',
        extension: '.ts'
      };

      const isValid = rules.validateFileSize(fileWithoutSize);
      
      // Should default to allowing files without size info
      expect(isValid).toBe(true);
    });

    it('should validate size boundary conditions', () => {
      const exactLimitFile = {
        path: '/test/project/exact.ts',
        name: 'exact.ts',
        extension: '.ts',
        size: 1048576 // Exactly 1MB
      };

      const isValid = rules.validateFileSize(exactLimitFile);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Collection Quotas', () => {
    it('should enforce maximum function collection limits', () => {
      const mockFunctions = Array(15).fill(null).map((_, i) => ({
        name: `function${i}`,
        params: [],
        returnType: 'void'
      }));

      const allowedCount = rules.enforceCollectionQuotas('functions', mockFunctions);
      
      expect(allowedCount).toBeLessThanOrEqual(10); // Default max from test config
      expect(allowedCount).toBeGreaterThan(0);
    });

    it('should enforce maximum dependency collection limits', () => {
      const mockDependencies = Array(15).fill(null).map((_, i) => ({
        source: `package${i}`,
        type: 'import'
      }));

      const allowedCount = rules.enforceCollectionQuotas('dependencies', mockDependencies);
      
      expect(allowedCount).toBeLessThanOrEqual(10);
      expect(allowedCount).toBeGreaterThan(0);
    });

    it('should handle empty collections gracefully', () => {
      const allowedCount = rules.enforceCollectionQuotas('functions', []);
      
      expect(allowedCount).toBe(0);
    });

    it('should prioritize high-quality items when enforcing quotas', () => {
      const mockFunctions = [
        { name: 'criticalFunction', params: ['param1'], returnType: 'string', importance: 'high' },
        { name: 'utilityFunction', params: [], returnType: 'void', importance: 'low' },
        { name: 'coreFunction', params: ['param1', 'param2'], returnType: 'object', importance: 'high' }
      ];

      const result = rules.prioritizeItems('functions', mockFunctions);
      
      // High importance items should be prioritized
      expect(result[0].importance).toBe('high');
    });
  });

  describe('Content Filtering Rules', () => {
    it('should apply sensitive content filtering', () => {
      const sensitiveContent = `
        const API_KEY = "secret-key-12345";
        const DATABASE_PASSWORD = "super-secret";
        function normalFunction() { return "hello"; }
      `;

      const filteredContent = rules.filterSensitiveContent(sensitiveContent);
      
      expect(filteredContent).not.toContain('secret-key-12345');
      expect(filteredContent).not.toContain('super-secret');
      expect(filteredContent).toContain('normalFunction');
    });

    it('should preserve non-sensitive code structures', () => {
      const cleanContent = `
        export function calculateSum(a: number, b: number): number {
          return a + b;
        }
        
        interface UserData {
          name: string;
          email: string;
        }
      `;

      const filteredContent = rules.filterSensitiveContent(cleanContent);
      
      expect(filteredContent).toContain('calculateSum');
      expect(filteredContent).toContain('UserData');
      expect(filteredContent).toBe(cleanContent);
    });

    it('should mask different types of sensitive patterns', () => {
      const contentWithSecrets = `
        const token = "jwt-token-abcd1234";
        const connectionString = "mongodb://user:pass@localhost:27017";
        const creditCard = "4111-1111-1111-1111";
      `;

      const filteredContent = rules.filterSensitiveContent(contentWithSecrets);
      
      expect(filteredContent).toContain('[FILTERED]');
      expect(filteredContent).not.toContain('jwt-token-abcd1234');
      expect(filteredContent).not.toContain('user:pass@localhost');
      expect(filteredContent).not.toContain('4111-1111-1111-1111');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce collection rate limits', () => {
      const startTime = Date.now();
      
      // Simulate rapid collection attempts
      for (let i = 0; i < 5; i++) {
        const canCollect = rules.checkRateLimit('file-analysis');
        if (i < 3) {
          expect(canCollect).toBe(true);
        }
      }
    });

    it('should reset rate limits after time window', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        rules.checkRateLimit('file-analysis');
      }

      // Mock time passage
      vi.useFakeTimers();
      vi.advanceTimersByTime(60000); // 1 minute

      const canCollect = rules.checkRateLimit('file-analysis');
      
      expect(canCollect).toBe(true);
      
      vi.useRealTimers();
    });

    it('should track different rate limit categories independently', () => {
      // Exhaust one category
      for (let i = 0; i < 10; i++) {
        rules.checkRateLimit('file-analysis');
      }

      // Other category should still be available
      const canUpload = rules.checkRateLimit('notion-upload');
      
      expect(canUpload).toBe(true);
    });
  });

  describe('Privacy Compliance', () => {
    it('should validate data retention policies', () => {
      const retentionPolicy = rules.getDataRetentionPolicy('analysis-cache');
      
      expect(retentionPolicy.maxAge).toBeDefined();
      expect(retentionPolicy.maxAge).toBeGreaterThan(0);
    });

    it('should enforce minimum data collection', () => {
      const fileData = {
        path: '/test/project/src/user.ts',
        content: 'sensitive user data here',
        metadata: {
          author: 'john.doe@company.com',
          createdAt: '2024-01-01',
          personalInfo: 'confidential'
        }
      };

      const minimizedData = rules.minimizeDataCollection(fileData);
      
      expect(minimizedData).not.toHaveProperty('metadata.author');
      expect(minimizedData).not.toHaveProperty('metadata.personalInfo');
      expect(minimizedData).toHaveProperty('path');
    });

    it('should anonymize file paths containing personal information', () => {
      const personalPaths = [
        '/Users/john.doe/project/src/index.ts',
        '/home/jane-smith/code/app.js',
        'C:\\Users\\Bob.Wilson\\Documents\\project\\main.py'
      ];

      personalPaths.forEach(path => {
        const anonymized = rules.anonymizeFilePath(path);
        
        expect(anonymized).not.toContain('john.doe');
        expect(anonymized).not.toContain('jane-smith');
        expect(anonymized).not.toContain('Bob.Wilson');
        expect(anonymized).toMatch(/\/[PROJECT_ROOT]\/.*\.(ts|js|py)$/);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce single responsibility for data collection', () => {
      // Test that rules only handle collection constraints
      expect(typeof rules.validateFileSize).toBe('function');
      expect(typeof rules.enforceCollectionQuotas).toBe('function');
      expect(typeof rules.filterSensitiveContent).toBe('function');
      
      // Should not handle unrelated concerns
      expect(rules).not.toHaveProperty('uploadToNotion');
      expect(rules).not.toHaveProperty('parseSourceCode');
    });

    it('should maintain consistent validation results', () => {
      const testFile = {
        path: '/test/project/consistent.ts',
        name: 'consistent.ts',
        extension: '.ts',
        size: 1024
      };

      const result1 = rules.validateFileSize(testFile);
      const result2 = rules.validateFileSize(testFile);
      
      expect(result1).toBe(result2);
    });

    it('should handle configuration changes dynamically', () => {
      const originalValid = rules.validateFileSize({
        path: '/test/large.ts',
        name: 'large.ts',
        extension: '.ts',
        size: 500000 // 500KB
      });

      // Update configuration with stricter limits
      const stricterConfig = {
        ...config,
        parser: {
          ...config.parser,
          maxFileSize: 100000 // 100KB
        }
      };

      const stricterRules = new DataCollectionRules(stricterConfig);
      const stricterValid = stricterRules.validateFileSize({
        path: '/test/large.ts',
        name: 'large.ts',
        extension: '.ts',
        size: 500000
      });

      expect(originalValid).toBe(true);
      expect(stricterValid).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => rules.validateFileSize(null as any)).not.toThrow();
      expect(() => rules.enforceCollectionQuotas('functions', null as any)).not.toThrow();
      expect(() => rules.filterSensitiveContent(null as any)).not.toThrow();
      
      // Should return safe defaults
      expect(rules.validateFileSize(null as any)).toBe(false);
      expect(rules.enforceCollectionQuotas('functions', null as any)).toBe(0);
      expect(rules.filterSensitiveContent(null as any)).toBe('');
    });

    it('should provide meaningful error contexts', () => {
      const invalidFile = {
        path: '',
        name: '',
        extension: '',
        size: -1
      };

      const validationResult = rules.validateFileSize(invalidFile);
      
      expect(validationResult).toBe(false);
    });

    it('should handle concurrent validation requests', async () => {
      const testFile = {
        path: '/test/concurrent.ts',
        name: 'concurrent.ts',
        extension: '.ts',
        size: 1024
      };

      const promises = Array(10).fill(null).map(() => 
        Promise.resolve(rules.validateFileSize(testFile))
      );

      const results = await Promise.all(promises);
      
      // All results should be consistent
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should maintain thread safety for rate limiting', () => {
      // Simulate concurrent rate limit checks
      const results = Array(5).fill(null).map(() => 
        rules.checkRateLimit('concurrent-test')
      );

      // Should handle concurrent access without corruption
      expect(results).toEqual(expect.arrayContaining([true, true, true, true, true]));
    });
  });

  describe('Configuration Compliance', () => {
    it('should respect configuration-driven limits', () => {
      const customConfig = {
        ...config,
        parser: {
          ...config.parser,
          maxFileSize: 2048, // 2KB limit
          maxFunctions: 5,
          maxDependencies: 3
        }
      };

      const customRules = new DataCollectionRules(customConfig);

      const largeFile = { path: '/test.ts', name: 'test.ts', extension: '.ts', size: 4096 };
      expect(customRules.validateFileSize(largeFile)).toBe(false);

      const functions = Array(8).fill({ name: 'func', params: [], returnType: 'void' });
      expect(customRules.enforceCollectionQuotas('functions', functions)).toBe(5);
    });

    it('should validate configuration at initialization', () => {
      const invalidConfig = {
        ...config,
        parser: {
          ...config.parser,
          maxFileSize: -1 // Invalid negative size
        }
      };

      expect(() => {
        new DataCollectionRules(invalidConfig);
      }).toThrow('Invalid configuration: maxFileSize must be positive');
    });
  });
});