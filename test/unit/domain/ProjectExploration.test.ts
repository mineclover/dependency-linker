/**
 * Unit Tests for ProjectExploration Domain Entity
 * Tests business rules and validation logic for project exploration
 */

import { 
  describe, 
  it, 
  expect, 
  beforeEach,
  vi
} from 'vitest';
import { ProjectExploration } from '../../../src/domain/entities/ProjectExploration.js';
import { TestConfigFactory } from '../../setup/test-framework.js';
import type { ProcessedConfig } from '../../../src/shared/types/index.js';

describe('ProjectExploration Domain Entity', () => {
  let config: ProcessedConfig;

  beforeEach(() => {
    config = TestConfigFactory.createMinimalConfig();
    vi.clearAllMocks();
  });

  describe('Project Detection', () => {
    it('should validate TypeScript project structure', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/package.json', name: 'package.json', extension: '.json' },
        { path: '/test/project/tsconfig.json', name: 'tsconfig.json', extension: '.json' },
        { path: '/test/project/src/index.ts', name: 'index.ts', extension: '.ts' }
      ];

      const result = exploration.detectProjectType(mockFiles);
      
      expect(result.type).toBe('typescript');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.indicators).toContain('tsconfig.json');
    });

    it('should validate JavaScript project structure', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/package.json', name: 'package.json', extension: '.json' },
        { path: '/test/project/src/index.js', name: 'index.js', extension: '.js' }
      ];

      const result = exploration.detectProjectType(mockFiles);
      
      expect(result.type).toBe('javascript');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.indicators).toContain('package.json');
    });

    it('should handle unknown project types gracefully', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/README.md', name: 'README.md', extension: '.md' }
      ];

      const result = exploration.detectProjectType(mockFiles);
      
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.indicators).toHaveLength(0);
    });

    it('should enforce minimum confidence threshold', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/random.txt', name: 'random.txt', extension: '.txt' }
      ];

      const result = exploration.detectProjectType(mockFiles);
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.type).toBe('unknown');
    });
  });

  describe('File Filtering Rules', () => {
    it('should apply ignore patterns from configuration', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/src/index.ts', name: 'index.ts', extension: '.ts' },
        { path: '/test/project/node_modules/lib.js', name: 'lib.js', extension: '.js' },
        { path: '/test/project/test/unit.test.ts', name: 'unit.test.ts', extension: '.ts' }
      ];

      const result = exploration.filterProjectFiles(mockFiles);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('index.ts');
    });

    it('should respect file extension whitelist', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/src/index.ts', name: 'index.ts', extension: '.ts' },
        { path: '/test/project/src/styles.css', name: 'styles.css', extension: '.css' },
        { path: '/test/project/src/config.json', name: 'config.json', extension: '.json' }
      ];

      const result = exploration.filterProjectFiles(mockFiles);
      
      expect(result).toHaveLength(1);
      expect(result[0].extension).toBe('.ts');
    });

    it('should handle empty file lists', () => {
      const exploration = new ProjectExploration(config);
      
      const result = exploration.filterProjectFiles([]);
      
      expect(result).toHaveLength(0);
    });

    it('should validate file size limits', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/small.ts', name: 'small.ts', extension: '.ts', size: 1024 },
        { path: '/test/project/large.ts', name: 'large.ts', extension: '.ts', size: 2097152 } // 2MB
      ];

      const result = exploration.filterProjectFiles(mockFiles);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('small.ts');
    });
  });

  describe('Exploration Strategy', () => {
    it('should determine exploration depth based on project size', () => {
      const exploration = new ProjectExploration(config);
      
      // Small project
      const smallProject = Array(50).fill(null).map((_, i) => ({
        path: `/test/project/src/file${i}.ts`,
        name: `file${i}.ts`,
        extension: '.ts'
      }));

      const smallStrategy = exploration.determineExplorationStrategy(smallProject);
      
      expect(smallStrategy.depth).toBe('comprehensive');
      expect(smallStrategy.parallelism).toBe('sequential');
    });

    it('should use parallel processing for large projects', () => {
      const exploration = new ProjectExploration(config);
      
      // Large project
      const largeProject = Array(500).fill(null).map((_, i) => ({
        path: `/test/project/src/file${i}.ts`,
        name: `file${i}.ts`,
        extension: '.ts'
      }));

      const largeStrategy = exploration.determineExplorationStrategy(largeProject);
      
      expect(largeStrategy.depth).toBe('shallow');
      expect(largeStrategy.parallelism).toBe('parallel');
      expect(largeStrategy.batchSize).toBeGreaterThan(1);
    });

    it('should validate batch size constraints', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = Array(1000).fill(null).map((_, i) => ({
        path: `/test/project/src/file${i}.ts`,
        name: `file${i}.ts`,
        extension: '.ts'
      }));

      const strategy = exploration.determineExplorationStrategy(mockFiles);
      
      expect(strategy.batchSize).toBeLessThanOrEqual(50);
      expect(strategy.batchSize).toBeGreaterThan(0);
    });
  });

  describe('Validation Rules', () => {
    it('should enforce project path validation', () => {
      expect(() => {
        new ProjectExploration({ 
          ...config, 
          project: { ...config.project, path: '' } 
        });
      }).toThrow('Project path cannot be empty');
    });

    it('should validate configuration completeness', () => {
      const exploration = new ProjectExploration(config);
      
      const isValid = exploration.validateConfiguration();
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid parser extensions', () => {
      const invalidConfig = {
        ...config,
        parser: {
          ...config.parser,
          extensions: []
        }
      };

      expect(() => {
        new ProjectExploration(invalidConfig);
      }).toThrow('At least one file extension must be configured');
    });

    it('should validate ignore pattern format', () => {
      const exploration = new ProjectExploration(config);
      
      const invalidPatterns = ['', null, undefined];
      
      invalidPatterns.forEach(pattern => {
        expect(() => {
          exploration.validateIgnorePattern(pattern as any);
        }).toThrow('Invalid ignore pattern');
      });
    });
  });

  describe('Business Logic Compliance', () => {
    it('should follow Single Responsibility Principle', () => {
      const exploration = new ProjectExploration(config);
      
      // Test that the class only handles project exploration concerns
      expect(typeof exploration.detectProjectType).toBe('function');
      expect(typeof exploration.filterProjectFiles).toBe('function');
      expect(typeof exploration.determineExplorationStrategy).toBe('function');
      
      // Should not have unrelated methods
      expect(exploration).not.toHaveProperty('uploadFiles');
      expect(exploration).not.toHaveProperty('syncWithNotion');
    });

    it('should maintain immutable state', () => {
      const exploration = new ProjectExploration(config);
      
      const originalConfig = { ...config };
      
      // Any operations should not mutate the original config
      exploration.validateConfiguration();
      
      expect(config).toEqual(originalConfig);
    });

    it('should handle edge cases gracefully', () => {
      const exploration = new ProjectExploration(config);
      
      // Test with null/undefined inputs
      expect(() => exploration.detectProjectType(null as any)).not.toThrow();
      expect(() => exploration.filterProjectFiles(undefined as any)).not.toThrow();
      
      // Should return safe defaults
      const nullResult = exploration.detectProjectType(null as any);
      expect(nullResult.type).toBe('unknown');
      expect(nullResult.confidence).toBe(0);
    });

    it('should provide consistent results for same inputs', () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/src/index.ts', name: 'index.ts', extension: '.ts' },
        { path: '/test/project/package.json', name: 'package.json', extension: '.json' }
      ];

      const result1 = exploration.detectProjectType(mockFiles);
      const result2 = exploration.detectProjectType(mockFiles);
      
      expect(result1).toEqual(result2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed file objects', () => {
      const exploration = new ProjectExploration(config);
      
      const malformedFiles = [
        { path: '/test/file1.ts' }, // Missing name and extension
        { name: 'file2.ts' }, // Missing path
        {} // Empty object
      ] as any;

      expect(() => {
        exploration.filterProjectFiles(malformedFiles);
      }).not.toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        new ProjectExploration({ 
          ...config, 
          project: { ...config.project, path: '' } 
        });
      } catch (error: any) {
        expect(error.message).toContain('Project path cannot be empty');
        expect(error.message).toBe('Project path cannot be empty');
      }
    });

    it('should handle concurrent access safely', async () => {
      const exploration = new ProjectExploration(config);
      
      const mockFiles = [
        { path: '/test/project/src/index.ts', name: 'index.ts', extension: '.ts' }
      ];

      // Simulate concurrent calls
      const promises = Array(10).fill(null).map(() => 
        Promise.resolve(exploration.detectProjectType(mockFiles))
      );

      const results = await Promise.all(promises);
      
      // All results should be consistent
      results.forEach(result => {
        expect(result.type).toBe('typescript');
      });
    });
  });
});