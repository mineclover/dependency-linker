/**
 * Test Framework Setup - Clean Architecture Testing Foundation
 * Comprehensive testing utilities for domain, infrastructure, and application layers
 */

import { vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { NotionApiService } from '../../src/infrastructure/notion/core/NotionApiService.js';
import type { ConfigurationService } from '../../src/services/config/ConfigurationService.js';
import type { ProcessedConfig } from '../../src/shared/types/index.js';

/**
 * Test Configuration Factory
 */
export class TestConfigFactory {
  static createMinimalConfig(): ProcessedConfig {
    return {
      project: {
        name: 'test-project',
        path: '/test/project',
        type: 'typescript',
        version: '1.0.0'
      },
      notion: {
        apiKey: 'test-api-key',
        workspaceUrl: 'https://notion.so/test-workspace',
        parentPageId: 'test-parent-page-id',
        databases: {
          files: 'test-files-db',
          functions: 'test-functions-db',
          dependencies: 'test-dependencies-db',
          libraries: 'test-libraries-db',
          classes: 'test-classes-db'
        },
        workspaceInfo: {
          userId: 'test-user-id',
          projectName: 'test-project',
          setupDate: '2024-01-01T00:00:00.000Z',
          workspaceUrl: 'https://notion.so/test-workspace'
        },
        git: {
          enabled: false,
          autoSync: false,
          watchBranches: [],
          ignorePatterns: []
        }
      },
      features: {
        sqliteIndexing: true,
        notionUpload: true,
        gitIntegration: false,
        autoSync: false
      },
      environment: 'test',
      parser: {
        extensions: ['.ts', '.js'],
        ignorePatterns: ['node_modules/**', '*.test.ts']
      }
    };
  }

  static createFullConfig(): ProcessedConfig {
    const base = this.createMinimalConfig();
    return {
      ...base,
      notion: {
        ...base.notion,
        git: {
          enabled: true,
          autoSync: true,
          watchBranches: ['main', 'develop'],
          ignorePatterns: ['node_modules/**', '.git/**', 'dist/**']
        }
      },
      features: {
        ...base.features,
        gitIntegration: true,
        autoSync: true
      }
    };
  }
}

/**
 * Mock Service Factory
 */
export class MockServiceFactory {
  static createMockConfigurationService(config?: ProcessedConfig): {
    service: ConfigurationService;
    mocks: {
      loadAndProcessConfig: MockInstance;
      validateConfig: MockInstance;
      getCachedConfig: MockInstance;
      clearCache: MockInstance;
      applyBusinessRules: MockInstance;
    };
  } {
    const testConfig = config || TestConfigFactory.createMinimalConfig();
    
    const mocks = {
      loadAndProcessConfig: vi.fn().mockResolvedValue(testConfig),
      validateConfig: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      }),
      getCachedConfig: vi.fn().mockReturnValue(testConfig),
      clearCache: vi.fn().mockReturnValue(undefined),
      applyBusinessRules: vi.fn().mockReturnValue(testConfig)
    };

    const service = {
      ...mocks
    } as unknown as ConfigurationService;

    return { service, mocks };
  }

  static createMockNotionApiService(): {
    service: NotionApiService;
    mocks: {
      createPage: MockInstance;
      updateDatabase: MockInstance;
      retrieveDatabase: MockInstance;
      queryDatabase: MockInstance;
      validateConnection: MockInstance;
      healthCheck: MockInstance;
    };
  } {
    const mocks = {
      createPage: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-page-id', url: 'https://notion.so/test-page' }
      }),
      updateDatabase: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-db-id' }
      }),
      retrieveDatabase: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'test-db-id', properties: {} }
      }),
      queryDatabase: vi.fn().mockResolvedValue({
        success: true,
        data: { results: [] }
      }),
      validateConnection: vi.fn().mockResolvedValue({
        isValid: true
      }),
      healthCheck: vi.fn().mockResolvedValue({
        healthy: true,
        details: {
          apiConnection: true,
          circuitBreakerOpen: false,
          queueSize: 0
        }
      })
    };

    const service = {
      ...mocks
    } as unknown as NotionApiService;

    return { service, mocks };
  }
}

/**
 * Test Data Factory
 */
export class TestDataFactory {
  static createProjectFile(overrides: Partial<any> = {}) {
    return {
      path: '/test/project/src/example.ts',
      name: 'example.ts',
      extension: '.ts',
      size: 1024,
      content: 'export const example = "test";',
      lastModified: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides
    };
  }

  static createAnalysisResult(overrides: Partial<any> = {}) {
    return {
      filePath: '/test/project/src/example.ts',
      language: 'TypeScript',
      dependencies: [
        { source: 'lodash', type: 'import' },
        { source: './utils', type: 'import' }
      ],
      functions: [
        { name: 'example', params: [], returnType: 'string' }
      ],
      classes: [],
      analysisTime: 100,
      ...overrides
    };
  }

  static createNotionPage(overrides: Partial<any> = {}) {
    return {
      id: 'test-page-id',
      url: 'https://notion.so/test-page',
      properties: {
        Name: { title: [{ text: { content: 'Test Page' } }] }
      },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      ...overrides
    };
  }
}

/**
 * Test Environment Setup
 */
export class TestEnvironment {
  private static originalEnv: Record<string, string | undefined> = {};

  /**
   * Setup test environment with option to use real API key
   */
  static setupEnvironment(env: Record<string, string> = {}, useRealApi: boolean = false): void {
    // Backup original environment
    const allEnvKeys = [...Object.keys(env), 'NODE_ENV', 'NOTION_API_KEY', 'DEPLINK_ENVIRONMENT'];
    allEnvKeys.forEach(key => {
      this.originalEnv[key] = process.env[key];
    });

    // Load real environment variables if requested
    let realApiKey = 'test-api-key';
    let realParentPageId = 'test-parent-page-id';
    
    if (useRealApi) {
      try {
        // Try to load from .env.test first, then .env
        const fs = require('fs');
        const path = require('path');
        
        const envTestPath = path.join(process.cwd(), '.env.test');
        const envPath = path.join(process.cwd(), '.env');
        
        let envContent = '';
        if (fs.existsSync(envTestPath)) {
          envContent = fs.readFileSync(envTestPath, 'utf8');
        } else if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        if (envContent) {
          const apiKeyMatch = envContent.match(/NOTION_API_KEY=(.+)/);
          const parentPageMatch = envContent.match(/NOTION_PARENT_PAGE_ID=(.+)/);
          
          if (apiKeyMatch) realApiKey = apiKeyMatch[1].trim();
          if (parentPageMatch) realParentPageId = parentPageMatch[1].trim();
        }
      } catch (error) {
        console.warn('⚠️ Could not load real API key, using test key:', error);
      }
    }

    // Set test environment
    const testEnv = {
      NODE_ENV: 'test',
      NOTION_API_KEY: realApiKey,
      NOTION_PARENT_PAGE_ID: realParentPageId,
      DEPLINK_ENVIRONMENT: 'test',
      ...env
    };

    Object.entries(testEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    if (useRealApi && realApiKey !== 'test-api-key') {
      console.log('✅ Using real Notion API key for testing');
    }
  }

  /**
   * Setup environment specifically for integration tests with real API
   */
  static setupIntegrationEnvironment(env: Record<string, string> = {}): void {
    this.setupEnvironment({
      NOTION_PARENT_PAGE_ID: '267485837460816fb3a5c8b64fa7846f', // Test workspace page
      NOTION_TEST_FILES_DB_ID: '76a4b221-f887-47f3-9d11-49d6df1c759c',
      NOTION_TEST_FUNCTIONS_DB_ID: '10f72c0f-b9a6-4984-871d-ca5a37a12f7b',
      NOTION_TEST_DOCS_DB_ID: '5be6d1be-89cd-4a16-8aa4-10f43c973aba',
      ...env
    }, true); // Use real API key
  }

  static restoreEnvironment(): void {
    Object.entries(this.originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    this.originalEnv = {};
  }

  static async setupTestDatabase(tempDir: string): Promise<void> {
    // Setup SQLite test database in temporary directory
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const dbDir = path.join(tempDir, '.deplink');
    await fs.mkdir(dbDir, { recursive: true });
    
    // Initialize empty database - use bun:sqlite directly for testing
    let db: any;
    try {
      // Try Bun SQLite first
      const { Database } = await import('bun:sqlite');
      db = new Database(path.join(dbDir, 'test.db'));
    } catch (error) {
      // For non-Bun environments, create a mock database
      console.warn('bun:sqlite not available, creating mock database for testing');
      db = {
        exec: () => {},
        prepare: () => ({
          get: () => undefined,
          all: () => [],
          run: () => ({ changes: 0, lastInsertRowid: 0 })
        }),
        close: () => {}
      };
    }
    
    // Create test tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        content_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    db.close();
  }

  static async cleanupTestDatabase(tempDir: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      await fs.rm(path.join(tempDir, '.deplink'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Assertion Helpers
 */
export class TestAssertions {
  static assertValidConfig(config: any): void {
    expect(config).toBeDefined();
    expect(config.project).toBeDefined();
    expect(config.project.path).toBeDefined();
    expect(config.notion).toBeDefined();
    expect(config.notion.apiKey).toBeDefined();
  }

  static assertSuccessfulResult(result: any): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }

  static assertFailedResult(result: any, expectedErrorMessage?: string): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    if (expectedErrorMessage) {
      expect(result.error.message).toContain(expectedErrorMessage);
    }
  }

  static assertCleanArchitectureCompliance(module: any): void {
    // Verify no direct dependencies on infrastructure from domain layer
    expect(module).toBeDefined();
    
    // Check that imports follow Clean Architecture rules
    const moduleString = module.toString();
    
    // Domain layer should not import from infrastructure
    if (moduleString.includes('domain/')) {
      expect(moduleString).not.toMatch(/from.*infrastructure/);
      expect(moduleString).not.toMatch(/import.*infrastructure/);
    }
    
    // Application layer should not import from infrastructure details
    if (moduleString.includes('services/')) {
      expect(moduleString).not.toMatch(/from.*notion\/client/);
    }
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{
    result: T;
    duration: number;
  }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    return { result, duration };
  }

  static assertPerformanceThreshold(duration: number, thresholdMs: number): void {
    expect(duration).toBeLessThan(thresholdMs);
  }

  static async runLoadTest<T>(
    operation: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    results: T[];
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
  }> {
    const durations: number[] = [];
    const results: T[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const { result, duration } = await this.measureExecutionTime(operation);
        durations.push(duration);
        results.push(result);
        successCount++;
      } catch (error) {
        durations.push(0);
        results.push(null as T);
      }
    }

    return {
      results,
      averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      successRate: successCount / iterations
    };
  }
}

/**
 * Integration Test Helpers
 */
export class IntegrationTestHelpers {
  static async createTempProject(projectStructure: Record<string, string>): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deplink-test-'));
    
    for (const [filePath, content] of Object.entries(projectStructure)) {
      const fullPath = path.join(tempDir, filePath);
      const dirPath = path.dirname(fullPath);
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
    
    return tempDir;
  }

  static async cleanupTempProject(tempDir: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

export {
  vi,
  expect,
  describe,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll
} from 'vitest';