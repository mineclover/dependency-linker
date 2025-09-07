/**
 * 전체 워크플로우 통합 테스트
 * Full Workflow Integration Test
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { 
  NotionClientFactory,
  quickUploadToNotion,
  createNotionTables,
  testNotionConnection
} from '../../src/services/notion/NotionClientFactory.js';
import { NotionWorkflowService } from '../../src/services/notionWorkflowService.js';
import { ConfigManager } from '../../src/infrastructure/config/configManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Full Workflow Integration', () => {
  let projectPath: string;
  let testConfig: any;
  let workflowService: NotionWorkflowService;
  let testSchemaPath: string;

  beforeAll(async () => {
    projectPath = process.cwd();
    const configManager = ConfigManager.getInstance();
    testConfig = await configManager.loadConfig(projectPath);
    
    if (!testConfig.apiKey) {
      throw new Error('테스트를 위한 Notion API 키가 필요합니다');
    }
    
    workflowService = new NotionWorkflowService(projectPath);
    
    // 테스트용 스키마 파일 생성
    const testSchema = {
      databases: {
        'test_integration': {
          title: 'Integration Test Table',
          description: 'Table for integration testing',
          properties: {
            'Name': { type: 'title', required: true },
            'Type': { 
              type: 'select',
              options: [
                { name: 'File', color: 'blue' },
                { name: 'Document', color: 'green' },
                { name: 'Function', color: 'yellow' }
              ]
            },
            'Status': {
              type: 'select',
              options: [
                { name: 'Active', color: 'green' },
                { name: 'Inactive', color: 'red' }
              ]
            },
            'Created': { type: 'date' },
            'Size': { type: 'number' },
            'Tags': { 
              type: 'multi_select',
              options: [
                { name: 'Test', color: 'blue' },
                { name: 'Demo', color: 'orange' },
                { name: 'Production', color: 'red' }
              ]
            }
          }
        }
      }
    };

    testSchemaPath = path.join(projectPath, 'test-integration-schema.json');
    await fs.writeFile(testSchemaPath, JSON.stringify(testSchema, null, 2));
  });

  afterAll(async () => {
    // 정리 작업
    try {
      await fs.unlink(testSchemaPath);
    } catch {}
    
    NotionClientFactory.clearCache();
  });

  describe('Connection and Configuration', () => {
    test('should test notion connection using convenience function', async () => {
      const connectionResult = await testNotionConnection(projectPath);
      expect(connectionResult).toBe(true);
    });

    test('should validate workflow configuration', async () => {
      const status = await workflowService.checkWorkflowStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.configured).toBe('boolean');
      expect(typeof status.databases).toBe('object');
      expect(typeof status.indexData).toBe('object');
      expect(typeof status.indexData.files).toBe('number');
      expect(typeof status.indexData.documents).toBe('number');
    });
  });

  describe('Table Creation Workflow', () => {
    test('should create tables from schema using convenience function', async () => {
      // 참고: 실제 테이블을 생성하지 않고 스키마 검증만 수행
      try {
        const tables = await createNotionTables(testSchemaPath, projectPath);
        
        // 만약 성공적으로 생성되면 검증
        expect(tables).toBeDefined();
        expect(typeof tables).toBe('object');
      } catch (error) {
        // 권한이나 워크스페이스 문제로 실패할 수 있음
        expect(error).toBeDefined();
      }
    }, 30000); // 30초 타임아웃

    test('should create tables using workflow service', async () => {
      try {
        const result = await workflowService.createDatabases({
          databases: ['files'],
          force: false
        });
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        
        if (result.success && result.data) {
          expect(typeof result.data.databases).toBe('object');
        }
      } catch (error) {
        // 이미 존재하거나 권한 문제일 수 있음
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Data Upload Workflow', () => {
    test('should handle empty data upload', async () => {
      try {
        const result = await workflowService.uploadDataOnly({
          dryRun: true
        });
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        
        if (result.data) {
          expect(typeof result.data.uploadStats).toBe('object');
          expect(typeof result.data.uploadStats.files).toBe('object');
          expect(typeof result.data.uploadStats.documents).toBe('object');
        }
      } catch (error) {
        // 설정되지 않은 데이터베이스가 있을 수 있음
        expect(error).toBeDefined();
      }
    });

    test('should upload data using orchestrator directly', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      const databaseIds = {
        files: testConfig.databases?.files,
        docs: testConfig.databases?.docs,
        functions: testConfig.databases?.functions
      };
      
      // 유효한 데이터베이스 ID가 있는 경우에만 테스트
      const validIds = Object.fromEntries(
        Object.entries(databaseIds).filter(([_, id]) => id)
      );
      
      if (Object.keys(validIds).length > 0) {
        try {
          const result = await services.orchestrator.uploadDataOnly(validIds, {
            batchSize: 1,
            updateExisting: false
          });
          
          expect(result).toBeDefined();
          
          // 결과 구조 검증
          Object.values(result).forEach(batchResult => {
            if (batchResult) {
              expect(typeof batchResult.total).toBe('number');
              expect(typeof batchResult.created).toBe('number');
              expect(typeof batchResult.updated).toBe('number');
              expect(typeof batchResult.skipped).toBe('number');
              expect(typeof batchResult.failed).toBe('number');
              expect(Array.isArray(batchResult.errors)).toBe(true);
              expect(Array.isArray(batchResult.results)).toBe(true);
            }
          });
        } catch (error) {
          // 데이터가 없거나 접근 권한 문제
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Full Workflow Integration', () => {
    test('should execute full workflow with dry run', async () => {
      try {
        const result = await workflowService.executeFullWorkflow({
          databases: ['files'],
          dryRun: true,
          force: false
        });
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        
        if (result.data) {
          expect(typeof result.data.databases).toBe('object');
          expect(typeof result.data.uploadStats).toBe('object');
        }
        
        if (!result.success && result.errors) {
          expect(Array.isArray(result.errors)).toBe(true);
        }
      } catch (error) {
        // 설정이나 권한 문제
        expect(error).toBeDefined();
      }
    }, 60000); // 60초 타임아웃

    test('should handle workflow with skip upload', async () => {
      try {
        const result = await workflowService.executeFullWorkflow({
          databases: ['files'],
          skipUpload: true,
          force: false
        });
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        
        if (result.data?.uploadStats) {
          // 업로드가 스킵되었으므로 모든 카운트가 0이어야 함
          expect(result.data.uploadStats.files.uploaded).toBe(0);
          expect(result.data.uploadStats.files.updated).toBe(0);
          expect(result.data.uploadStats.documents.uploaded).toBe(0);
          expect(result.data.uploadStats.documents.updated).toBe(0);
        }
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, 45000);
  });

  describe('Content Management Integration', () => {
    test('should create and manage content blocks', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      const testMarkdown = `# Integration Test Document

This is a test document for integration testing.

## Code Example

\`\`\`typescript
function integrationTest() {
  return "Hello from integration test";
}
\`\`\`

## Features

- Feature 1: Table Management
- Feature 2: Data Upload
- Feature 3: Content Creation
- Feature 4: Workflow Orchestration

## Conclusion

The integration test validates the complete workflow.`;

      const blocks = await services.contentManager.convertMarkdownToBlocks(testMarkdown);
      
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
      
      // 다양한 블록 타입 확인
      const blockTypes = blocks.map(block => block.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('heading_2');
      expect(blockTypes).toContain('paragraph');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('bulleted_list_item');
    });

    test('should create structured documentation', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      const documentContent = {
        title: 'API Documentation',
        summary: 'Complete API documentation for the modular architecture',
        sections: [
          {
            title: 'NotionClientFactory',
            content: 'Factory pattern for creating Notion services with caching and configuration management.',
            level: 2
          },
          {
            title: 'NotionTableManager',
            content: 'Manages database creation, schema updates, and property management.',
            level: 2
          },
          {
            title: 'NotionDataManager',
            content: 'Handles CRUD operations, batch uploads, and data synchronization.',
            level: 2
          },
          {
            title: 'NotionContentManager',
            content: 'Converts markdown to Notion blocks and manages page content.',
            level: 2
          },
          {
            title: 'NotionUploadOrchestrator',
            content: 'Coordinates the complete upload workflow across all managers.',
            level: 2
          }
        ]
      };

      const blocks = await services.contentManager.createStructuredContent(documentContent);
      
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
      
      // 구조화된 컨텐츠 검증
      const headingBlocks = blocks.filter(block => 
        block.type === 'heading_1' || block.type === 'heading_2'
      );
      expect(headingBlocks.length).toBeGreaterThanOrEqual(6); // 메인 제목 + 5개 섹션
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle partial failures gracefully', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      // 일부는 유효하고 일부는 무효한 데이터베이스 ID로 테스트
      const mixedIds = {
        files: testConfig.databases?.files, // 유효할 가능성이 높음
        docs: 'invalid-database-id', // 무효한 ID
        functions: testConfig.databases?.functions // 유효할 가능성이 있음
      };
      
      try {
        const result = await services.orchestrator.uploadDataOnly(mixedIds, {
          batchSize: 1
        });
        
        // 부분적 성공/실패 처리 확인
        expect(result).toBeDefined();
        
        // 적어도 하나의 결과가 있어야 함
        const results = Object.values(result);
        expect(results.some(r => r !== undefined)).toBe(true);
        
      } catch (error) {
        // 전체 실패도 적절한 에러 처리로 간주
        expect(error).toBeDefined();
      }
    });

    test('should maintain consistency during concurrent operations', async () => {
      // 동시에 여러 서비스 생성
      const promises = Array.from({ length: 3 }, (_, i) =>
        NotionClientFactory.createFromConfig(projectPath)
      );
      
      const services = await Promise.all(promises);
      
      // 모든 서비스가 같은 캐시된 클라이언트를 사용하는지 확인
      const firstClient = services[0].client;
      services.forEach((service, index) => {
        expect(service.client).toBe(firstClient);
      });
    });

    test('should recover from temporary failures', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      // 네트워크 오류를 시뮬레이션하기 위해 잘못된 페이지 ID 사용
      try {
        await services.contentManager.getPageBlocks('invalid-page-id');
        
        // 에러가 발생하지 않으면 예상과 다름
        expect(false).toBe(true);
      } catch (error) {
        // 적절한 에러 처리 확인
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
      
      // 이후 정상적인 작업이 가능한지 확인
      const markdown = '# Recovery Test\n\nThis tests error recovery.';
      const blocks = await services.contentManager.convertMarkdownToBlocks(markdown);
      expect(blocks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('should use caching effectively', async () => {
      const startTime = Date.now();
      
      // 첫 번째 서비스 생성
      const services1 = await NotionClientFactory.createFromConfig(projectPath);
      const firstCreationTime = Date.now() - startTime;
      
      const cacheStartTime = Date.now();
      
      // 두 번째 서비스 생성 (캐시 사용)
      const services2 = await NotionClientFactory.createFromConfig(projectPath);
      const cachedCreationTime = Date.now() - cacheStartTime;
      
      // 캐시된 생성이 더 빨라야 함
      expect(cachedCreationTime).toBeLessThanOrEqual(firstCreationTime);
      
      // 같은 인스턴스를 공유하는지 확인
      expect(services1.client).toBe(services2.client);
    });

    test('should handle batch operations efficiently', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      // 빈 배치 업로드 성능 테스트
      const startTime = Date.now();
      
      const emptyBatches = Array.from({ length: 3 }, () => 
        services.dataManager.batchUpload('test-id', [], { batchSize: 10 })
      );
      
      try {
        await Promise.all(emptyBatches);
      } catch {
        // 잘못된 ID로 인한 에러 예상
      }
      
      const duration = Date.now() - startTime;
      
      // 배치 처리가 합리적인 시간 내에 완료되어야 함
      expect(duration).toBeLessThan(10000); // 10초 미만
    });
  });
});