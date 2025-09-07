/**
 * Unit Tests for ProjectExplorationService Domain Service
 * Tests orchestration of domain entities and business workflow execution
 */

import { 
  describe, 
  it, 
  expect, 
  beforeEach,
  vi,
  MockInstance
} from 'vitest';
import { ProjectExplorationService } from '../../../src/domain/services/ProjectExplorationService.js';
import { TestConfigFactory, MockServiceFactory } from '../../setup/test-framework.js';
import type { ProcessedConfig } from '../../../src/shared/types/index.js';

describe('ProjectExplorationService Domain Service', () => {
  let config: ProcessedConfig;
  let service: ProjectExplorationService;
  let mockFs: {
    readdir: MockInstance;
    stat: MockInstance;
    readFile: MockInstance;
  };

  beforeEach(() => {
    config = TestConfigFactory.createMinimalConfig();
    service = new ProjectExplorationService(config);
    
    // Mock filesystem operations
    mockFs = {
      readdir: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn()
    };

    vi.clearAllMocks();
  });

  describe('Service Orchestration', () => {
    it('should orchestrate complete project exploration workflow', async () => {
      // Mock filesystem responses
      mockFs.readdir.mockResolvedValue([
        'src', 'test', 'package.json', 'tsconfig.json', 'README.md'
      ]);

      mockFs.stat.mockImplementation((path: string) => {
        if (path.includes('package.json') || path.includes('tsconfig.json')) {
          return Promise.resolve({ isDirectory: () => false, size: 1024 });
        }
        if (path.includes('src') || path.includes('test')) {
          return Promise.resolve({ isDirectory: () => true, size: 0 });
        }
        return Promise.resolve({ isDirectory: () => false, size: 512 });
      });

      // Mock file reading for TypeScript files
      mockFs.readFile.mockResolvedValue(`
        import { Component } from 'react';
        
        export class TestComponent extends Component {
          render() {
            return <div>Test</div>;
          }
        }
      `);

      // Execute workflow
      const result = await service.exploreProject('/test/project', {
        includeContent: true,
        maxDepth: 3,
        followSymlinks: false
      });

      expect(result.success).toBe(true);
      expect(result.data.projectType.type).toBe('typescript');
      expect(result.data.files.length).toBeGreaterThan(0);
      expect(result.data.statistics.totalFiles).toBeGreaterThan(0);
    });

    it('should handle exploration errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.exploreProject('/test/inaccessible', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Permission denied');
      expect(result.error?.context).toBeDefined();
    });

    it('should apply business rules during exploration', async () => {
      // Setup mock with files that should be filtered
      mockFs.readdir.mockResolvedValue([
        'src', 'node_modules', 'build', 'index.ts', 'large-file.ts'
      ]);

      mockFs.stat.mockImplementation((path: string) => {
        if (path.includes('large-file.ts')) {
          return Promise.resolve({ isDirectory: () => false, size: 2097152 }); // 2MB
        }
        if (path.includes('node_modules') || path.includes('build')) {
          return Promise.resolve({ isDirectory: () => true, size: 0 });
        }
        return Promise.resolve({ isDirectory: () => false, size: 1024 });
      });

      const result = await service.exploreProject('/test/project', {
        respectGitignore: true,
        maxFileSize: 1048576 // 1MB limit
      });

      expect(result.success).toBe(true);
      
      // Should exclude node_modules, build directory, and large files
      const filePaths = result.data.files.map(f => f.path);
      expect(filePaths).not.toContain(expect.stringContaining('node_modules'));
      expect(filePaths).not.toContain(expect.stringContaining('large-file.ts'));
    });
  });

  describe('Domain Entity Integration', () => {
    it('should properly integrate ProjectExploration entity', async () => {
      mockFs.readdir.mockResolvedValue(['src', 'package.json', 'tsconfig.json']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 1024 });

      const result = await service.exploreProject('/test/project', {});

      expect(result.data.projectType).toBeDefined();
      expect(result.data.projectType.type).toBeDefined();
      expect(result.data.projectType.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data.projectType.indicators).toBeDefined();
    });

    it('should properly integrate DataCollectionRules entity', async () => {
      const largeContent = 'x'.repeat(2097152); // 2MB content
      
      mockFs.readdir.mockResolvedValue(['large.ts']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 2097152 });
      mockFs.readFile.mockResolvedValue(largeContent);

      const result = await service.exploreProject('/test/project', {
        includeContent: true
      });

      // Large files should be excluded or truncated based on rules
      expect(result.success).toBe(true);
      if (result.data.files.length > 0) {
        const file = result.data.files[0];
        if (file.content) {
          expect(file.content.length).toBeLessThan(largeContent.length);
        }
      }
    });

    it('should coordinate between domain entities correctly', async () => {
      mockFs.readdir.mockResolvedValue([
        'src/index.ts', 'src/config.json', 'test/unit.test.ts', 'node_modules/lib.js'
      ]);
      
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 1024 });

      const result = await service.exploreProject('/test/project', {});

      // ProjectExploration should detect TypeScript
      expect(result.data.projectType.type).toBe('typescript');
      
      // DataCollectionRules should filter out test files and node_modules
      const includedFiles = result.data.files.map(f => f.name);
      expect(includedFiles).toContain('index.ts');
      expect(includedFiles).not.toContain('unit.test.ts');
      expect(includedFiles).not.toContain('lib.js');
    });
  });

  describe('Business Workflow Execution', () => {
    it('should execute workflows in correct order', async () => {
      const executionOrder: string[] = [];
      
      // Mock service to track execution order
      const originalExplore = service['exploreDirectory'];
      const originalDetect = service['detectProjectType'];
      const originalFilter = service['applyCollectionRules'];

      service['exploreDirectory'] = vi.fn().mockImplementation(async (...args) => {
        executionOrder.push('exploreDirectory');
        return originalExplore.call(service, ...args);
      });

      service['detectProjectType'] = vi.fn().mockImplementation((...args) => {
        executionOrder.push('detectProjectType');
        return originalDetect.call(service, ...args);
      });

      service['applyCollectionRules'] = vi.fn().mockImplementation((...args) => {
        executionOrder.push('applyCollectionRules');
        return originalFilter.call(service, ...args);
      });

      mockFs.readdir.mockResolvedValue(['src/index.ts']);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 1024 });

      await service.exploreProject('/test/project', {});

      expect(executionOrder).toEqual([
        'exploreDirectory',
        'detectProjectType',
        'applyCollectionRules'
      ]);
    });

    it('should maintain transactional consistency', async () => {
      // Simulate failure during workflow
      mockFs.readdir.mockResolvedValue(['src/index.ts']);
      mockFs.stat.mockRejectedValueOnce(new Error('Filesystem error'));

      const result = await service.exploreProject('/test/project', {});

      // Should fail gracefully without partial state
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should respect workflow cancellation', async () => {
      const abortController = new AbortController();
      
      mockFs.readdir.mockImplementation(async () => {
        // Simulate long operation
        await new Promise(resolve => setTimeout(resolve, 100));
        if (abortController.signal.aborted) {
          throw new Error('Operation cancelled');
        }
        return ['index.ts'];
      });

      // Cancel after short delay
      setTimeout(() => abortController.abort(), 50);

      const result = await service.exploreProject('/test/project', {
        signal: abortController.signal
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('cancelled');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large directory structures efficiently', async () => {
      // Mock large directory structure
      const largeDirStructure = Array(1000).fill(null).map((_, i) => `file${i}.ts`);
      mockFs.readdir.mockResolvedValue(largeDirStructure);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 1024 });

      const startTime = Date.now();
      const result = await service.exploreProject('/test/large-project', {
        maxFileCount: 100 // Limit for performance
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.data.files.length).toBeLessThanOrEqual(100);
    });

    it('should implement parallel processing for large projects', async () => {
      const files = Array(50).fill(null).map((_, i) => `src/file${i}.ts`);
      mockFs.readdir.mockResolvedValue(files);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 1024 });
      mockFs.readFile.mockResolvedValue('export const test = true;');

      const result = await service.exploreProject('/test/project', {
        includeContent: true,
        parallelism: true
      });

      expect(result.success).toBe(true);
      expect(result.data.files.length).toBe(files.length);
      
      // Should complete faster than sequential processing
      expect(result.data.statistics.processingTime).toBeLessThan(1000);
    });

    it('should implement memory-efficient streaming for content reading', async () => {
      const largeFiles = Array(10).fill(null).map((_, i) => `large${i}.ts`);
      mockFs.readdir.mockResolvedValue(largeFiles);
      mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 500000 }); // 500KB each
      mockFs.readFile.mockResolvedValue('x'.repeat(500000));

      const result = await service.exploreProject('/test/project', {
        includeContent: true,
        streamLargeFiles: true
      });

      expect(result.success).toBe(true);
      // Should not consume excessive memory
      expect(process.memoryUsage().heapUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide detailed error contexts', async () => {
      mockFs.readdir.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await service.exploreProject('/test/restricted', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('EACCES');
      expect(result.error?.context).toMatchObject({
        operation: 'exploreProject',
        path: '/test/restricted',
        stage: expect.stringContaining('directory_scan')
      });
    });

    it('should implement retry logic for transient failures', async () => {
      let attempt = 0;
      mockFs.readdir.mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Network timeout');
        }
        return ['index.ts'];
      });

      const result = await service.exploreProject('/test/project', {
        retryAttempts: 3,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(attempt).toBe(3);
    });

    it('should handle partial failures gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['good.ts', 'bad.ts', 'another.ts']);
      
      mockFs.stat.mockImplementation(async (path: string) => {
        if (path.includes('bad.ts')) {
          throw new Error('File corrupted');
        }
        return { isDirectory: () => false, size: 1024 };
      });

      const result = await service.exploreProject('/test/project', {
        continueOnError: true
      });

      expect(result.success).toBe(true);
      expect(result.data.files.length).toBe(2); // good.ts and another.ts
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Clean Architecture Compliance', () => {
    it('should maintain dependency inversion principle', () => {
      // Service should depend on abstractions, not concretions
      expect(service).toBeInstanceOf(ProjectExplorationService);
      
      // Should not directly couple to infrastructure concerns
      const serviceString = service.constructor.toString();
      expect(serviceString).not.toMatch(/require.*fs/);
      expect(serviceString).not.toMatch(/import.*fs/);
    });

    it('should follow single responsibility principle', () => {
      // Test that service only handles project exploration orchestration
      const serviceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      
      serviceMethods.forEach(method => {
        if (method !== 'constructor') {
          expect(method).toMatch(/explore|detect|apply|validate/);
        }
      });
    });

    it('should maintain immutable service state', () => {
      const originalConfig = { ...config };
      
      service.exploreProject('/test/project', {});
      
      expect(config).toEqual(originalConfig);
    });

    it('should provide consistent interfaces', async () => {
      const result1 = await service.exploreProject('/test/empty', {});
      const result2 = await service.exploreProject('/test/empty', {});

      expect(typeof result1).toBe(typeof result2);
      expect(result1).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Object),
        error: expect.anything()
      });
    });
  });
});