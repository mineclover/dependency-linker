/**
 * Integration Tests for Notion API Infrastructure
 * Tests complete infrastructure layer integration with external Notion API
 */

import { 
  describe, 
  it, 
  expect, 
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi
} from 'vitest';
import { NotionApiService } from '../../../src/infrastructure/notion/core/NotionApiService.js';
import { NotionClientFactory } from '../../../src/infrastructure/notion/core/NotionClientFactory.js';
import { 
  TestConfigFactory, 
  TestEnvironment,
  IntegrationTestHelpers,
  TestAssertions
} from '../../setup/test-framework.js';
import type { ProcessedConfig } from '../../../src/shared/types/index.js';

describe('Notion API Infrastructure Integration', () => {
  let config: ProcessedConfig;
  let notionService: NotionApiService;
  let tempDir: string;
  let mockNotionResponses: {
    createPage: any;
    queryDatabase: any;
    retrieveDatabase: any;
    updateDatabase: any;
  };

  beforeAll(async () => {
    TestEnvironment.setupEnvironment({
      NOTION_API_KEY: 'integration_test_key_mock',
      NODE_ENV: 'test'
    });

    tempDir = await IntegrationTestHelpers.createTempProject({
      'package.json': JSON.stringify({
        name: 'test-integration-project',
        version: '1.0.0',
        type: 'module'
      }),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'es2020',
          module: 'esnext'
        }
      }),
      'src/index.ts': 'export const main = () => console.log("test");'
    });

    await TestEnvironment.setupTestDatabase(tempDir);
  });

  beforeEach(async () => {
    config = TestConfigFactory.createFullConfig();
    config.project.path = tempDir;

    // Mock Notion API responses for integration testing
    mockNotionResponses = {
      createPage: {
        id: 'test-page-id-123',
        url: 'https://notion.so/test-page-123',
        properties: {
          Name: {
            title: [{ text: { content: 'Test Integration Page' } }]
          }
        },
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString()
      },
      queryDatabase: {
        results: [
          {
            id: 'existing-page-1',
            properties: {
              Name: { title: [{ text: { content: 'Existing Page' } }] }
            }
          }
        ],
        has_more: false,
        next_cursor: null
      },
      retrieveDatabase: {
        id: 'test-database-id',
        title: [{ text: { content: 'Test Database' } }],
        properties: {
          Name: { type: 'title' },
          Status: { type: 'select' },
          Created: { type: 'created_time' }
        }
      },
      updateDatabase: {
        id: 'test-database-id',
        title: [{ text: { content: 'Updated Database' } }]
      }
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    TestEnvironment.restoreEnvironment();
    await IntegrationTestHelpers.cleanupTempProject(tempDir);
    await TestEnvironment.cleanupTestDatabase(tempDir);
  });

  describe('Service Initialization Integration', () => {
    it('should initialize complete service stack with real configuration', async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      expect(notionService).toBeInstanceOf(NotionApiService);
      
      // Test service health
      const healthCheck = await notionService.healthCheck();
      expect(healthCheck.healthy).toBeDefined();
      expect(healthCheck.details).toBeDefined();
    });

    it('should handle configuration validation during initialization', async () => {
      const invalidConfig = {
        ...config,
        notion: {
          ...config.notion,
          apiKey: '' // Invalid empty API key
        }
      };

      expect(() => {
        NotionClientFactory.createClient({
          apiKey: invalidConfig.notion.apiKey,
          workspaceUrl: invalidConfig.notion.workspaceUrl,
          parentPageId: invalidConfig.notion.parentPageId,
          projectPath: invalidConfig.project.path
        });
      }).toThrow('Notion API key is required');
    });

    it('should establish proper dependency injection chain', async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      // Verify dependency chain integrity
      expect(notionService['clientInstance']).toBeDefined();
      expect(notionService['requestHandler']).toBeDefined();
      expect(notionService['client']).toBeDefined();
    });
  });

  describe('End-to-End API Operations', () => {
    beforeEach(async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      // Mock the underlying Notion client
      vi.spyOn(notionService['client'].pages, 'create')
        .mockResolvedValue(mockNotionResponses.createPage);
      
      vi.spyOn(notionService['client'].databases, 'query')
        .mockResolvedValue(mockNotionResponses.queryDatabase);
      
      vi.spyOn(notionService['client'].databases, 'retrieve')
        .mockResolvedValue(mockNotionResponses.retrieveDatabase);
      
      vi.spyOn(notionService['client'].databases, 'update')
        .mockResolvedValue(mockNotionResponses.updateDatabase);
    });

    it('should complete full page creation workflow', async () => {
      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: {
            title: [{ text: { content: 'Integration Test Page' } }]
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: 'Test content' } }]
            }
          }
        ]
      };

      const result = await notionService.createPage(pageData);

      TestAssertions.assertSuccessfulResult(result);
      expect(result.data.id).toBe('test-page-id-123');
      expect(result.data.url).toBe('https://notion.so/test-page-123');

      // Verify the actual API call was made with correct parameters
      expect(notionService['client'].pages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: { page_id: config.notion.parentPageId },
          properties: expect.objectContaining({
            Name: expect.objectContaining({
              title: expect.arrayContaining([
                expect.objectContaining({
                  text: { content: 'Integration Test Page' }
                })
              ])
            })
          })
        })
      );
    });

    it('should handle database operations with proper error handling', async () => {
      const databaseId = config.notion.databases.files;

      // Test successful database retrieval
      const retrieveResult = await notionService.retrieveDatabase(databaseId);
      TestAssertions.assertSuccessfulResult(retrieveResult);
      expect(retrieveResult.data.id).toBe('test-database-id');

      // Test database query with filters
      const queryResult = await notionService.queryDatabase(databaseId, {
        filter: {
          property: 'Status',
          select: { equals: 'Active' }
        }
      });

      TestAssertions.assertSuccessfulResult(queryResult);
      expect(queryResult.data.results).toHaveLength(1);
    });

    it('should implement proper retry logic for transient failures', async () => {
      // Mock transient failure followed by success
      let attempts = 0;
      vi.spyOn(notionService['client'].pages, 'create')
        .mockImplementation(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Service temporarily unavailable');
          }
          return mockNotionResponses.createPage;
        });

      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: 'Retry Test Page' } }] }
        }
      };

      const result = await notionService.createPage(pageData);

      TestAssertions.assertSuccessfulResult(result);
      expect(attempts).toBe(3);
      expect(result.data.id).toBe('test-page-id-123');
    });

    it('should respect rate limiting and circuit breaker patterns', async () => {
      // Mock rate limit exceeded response
      const rateLimitError = new Error('Rate limited') as any;
      rateLimitError.code = 'rate_limited';
      rateLimitError.status = 429;

      vi.spyOn(notionService['client'].pages, 'create')
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockNotionResponses.createPage);

      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: 'Rate Limit Test' } }] }
        }
      };

      const startTime = Date.now();
      const result = await notionService.createPage(pageData);
      const duration = Date.now() - startTime;

      TestAssertions.assertSuccessfulResult(result);
      // Should have waited before retry
      expect(duration).toBeGreaterThan(1000); // At least 1 second delay
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    beforeEach(async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);
    });

    it('should handle authentication failures gracefully', async () => {
      const authError = new Error('Unauthorized') as any;
      authError.code = 'unauthorized';
      authError.status = 401;

      vi.spyOn(notionService['client'].pages, 'create')
        .mockRejectedValue(authError);

      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: 'Auth Test' } }] }
        }
      };

      const result = await notionService.createPage(pageData);

      TestAssertions.assertFailedResult(result, 'Unauthorized');
      expect(result.error?.code).toBe('NOTION_AUTH_ERROR');
      expect(result.error?.details).toMatchObject({
        originalError: expect.objectContaining({
          code: 'unauthorized',
          status: 401
        })
      });
    });

    it('should handle validation errors with detailed context', async () => {
      const validationError = new Error('Invalid page properties') as any;
      validationError.code = 'validation_error';
      validationError.status = 400;

      vi.spyOn(notionService['client'].pages, 'create')
        .mockRejectedValue(validationError);

      const invalidPageData = {
        parent: { page_id: 'invalid-parent-id' },
        properties: {
          InvalidProperty: { invalid_type: 'test' }
        }
      };

      const result = await notionService.createPage(invalidPageData as any);

      TestAssertions.assertFailedResult(result, 'Invalid page properties');
      expect(result.error?.code).toBe('NOTION_VALIDATION_ERROR');
      expect(result.error?.context).toMatchObject({
        operation: 'createPage',
        requestData: expect.objectContaining({
          parent: { page_id: 'invalid-parent-id' }
        })
      });
    });

    it('should implement circuit breaker for repeated failures', async () => {
      const serverError = new Error('Internal server error') as any;
      serverError.code = 'internal_server_error';
      serverError.status = 500;

      // Mock repeated failures
      vi.spyOn(notionService['client'].pages, 'create')
        .mockRejectedValue(serverError);

      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: 'Circuit Breaker Test' } }] }
        }
      };

      // Multiple failures should trigger circuit breaker
      const results = await Promise.all([
        notionService.createPage(pageData),
        notionService.createPage(pageData),
        notionService.createPage(pageData),
        notionService.createPage(pageData),
        notionService.createPage(pageData)
      ]);

      // Later requests should fail fast due to circuit breaker
      const lastResult = results[results.length - 1];
      expect(lastResult.success).toBe(false);
      expect(lastResult.error?.code).toBe('CIRCUIT_BREAKER_OPEN');
    });
  });

  describe('Performance and Scalability Integration', () => {
    beforeEach(async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      vi.spyOn(notionService['client'].pages, 'create')
        .mockResolvedValue(mockNotionResponses.createPage);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(10).fill(null).map((_, i) => ({
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: `Concurrent Test Page ${i}` } }] }
        }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map(pageData => notionService.createPage(pageData))
      );
      const duration = Date.now() - startTime;

      // All requests should succeed
      results.forEach(result => {
        TestAssertions.assertSuccessfulResult(result);
      });

      // Should complete within reasonable time (not purely sequential)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should implement request batching for bulk operations', async () => {
      const batchSize = 5;
      const pages = Array(20).fill(null).map((_, i) => ({
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: `Batch Test Page ${i}` } }] }
        }
      }));

      const results = await notionService.createPageBatch(pages, { batchSize });

      expect(results.success).toBe(true);
      expect(results.data.successful).toBe(20);
      expect(results.data.failed).toBe(0);
      expect(results.data.results).toHaveLength(20);

      // Verify batching was used (should be fewer API calls than total pages)
      const createCalls = (notionService['client'].pages.create as any).mock.calls;
      expect(createCalls.length).toBeLessThanOrEqual(Math.ceil(pages.length / batchSize));
    });

    it('should monitor and report performance metrics', async () => {
      const pageData = {
        parent: { page_id: config.notion.parentPageId },
        properties: {
          Name: { title: [{ text: { content: 'Performance Test Page' } }] }
        }
      };

      await notionService.createPage(pageData);

      const healthCheck = await notionService.healthCheck();

      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.details).toMatchObject({
        apiConnection: true,
        circuitBreakerOpen: false,
        queueSize: expect.any(Number),
        averageResponseTime: expect.any(Number),
        requestCount: expect.any(Number)
      });
    });
  });

  describe('Clean Architecture Integration Compliance', () => {
    it('should maintain proper layer boundaries', async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      // Infrastructure layer should not know about domain/application concerns
      const serviceString = notionService.constructor.toString();
      expect(serviceString).not.toMatch(/ProjectExploration/);
      expect(serviceString).not.toMatch(/DataCollection/);
      expect(serviceString).not.toMatch(/UploadService/);
    });

    it('should provide standardized interfaces across the layer', async () => {
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      notionService = new NotionApiService(clientInstance);

      vi.spyOn(notionService['client'].pages, 'create')
        .mockResolvedValue(mockNotionResponses.createPage);

      // All operations should return consistent result structures
      const pageResult = await notionService.createPage({
        parent: { page_id: config.notion.parentPageId },
        properties: { Name: { title: [{ text: { content: 'Test' } }] } }
      });

      const dbResult = await notionService.retrieveDatabase(config.notion.databases.files);

      // Both should follow the same result pattern
      expect(pageResult).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Object),
        error: expect.anything()
      });

      expect(dbResult).toMatchObject({
        success: expect.any(Boolean),
        data: expect.any(Object),
        error: expect.anything()
      });
    });

    it('should integrate properly with dependency injection container', async () => {
      // Test that service can be properly injected and resolved
      const clientInstance = NotionClientFactory.createClient({
        apiKey: config.notion.apiKey,
        workspaceUrl: config.notion.workspaceUrl,
        parentPageId: config.notion.parentPageId,
        projectPath: config.project.path
      });

      const service1 = new NotionApiService(clientInstance);
      const service2 = new NotionApiService(clientInstance);

      // Should maintain singleton-like behavior when using same client instance
      expect(service1['client']).toBe(service2['client']);
      expect(service1['clientInstance']).toBe(service2['clientInstance']);
    });
  });
});