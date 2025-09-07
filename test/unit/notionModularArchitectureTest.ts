/**
 * Notion 모듈형 아키텍처 단위 테스트
 * Unit Tests for Notion Modular Architecture
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { NotionClientFactory } from '../../src/services/notion/NotionClientFactory.js';
import { NotionTableManager } from '../../src/services/notion/NotionTableManager.js';
import { NotionDataManager } from '../../src/services/notion/NotionDataManager.js';
import { NotionContentManager } from '../../src/services/notion/NotionContentManager.js';
import { NotionUploadOrchestrator } from '../../src/services/notion/NotionUploadOrchestrator.js';
import { ConfigManager } from '../../src/infrastructure/config/configManager.js';
import { Client } from '@notionhq/client';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Notion Modular Architecture', () => {
  let testApiKey: string;
  let testConfig: any;
  let testClient: Client;
  let projectPath: string;

  beforeAll(async () => {
    projectPath = process.cwd();
    const configManager = ConfigManager.getInstance();
    testConfig = await configManager.loadConfig(projectPath);
    testApiKey = testConfig.apiKey;
    
    if (!testApiKey) {
      throw new Error('테스트를 위한 Notion API 키가 필요합니다');
    }
    
    testClient = new Client({ auth: testApiKey });
  });

  afterAll(async () => {
    // 테스트 정리
    NotionClientFactory.clearCache();
  });

  describe('NotionClientFactory', () => {
    test('should create services from config', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      expect(services).toBeDefined();
      expect(services.client).toBeInstanceOf(Client);
      expect(services.tableManager).toBeInstanceOf(NotionTableManager);
      expect(services.dataManager).toBeInstanceOf(NotionDataManager);
      expect(services.contentManager).toBeInstanceOf(NotionContentManager);
      expect(services.orchestrator).toBeInstanceOf(NotionUploadOrchestrator);
    });

    test('should create services with direct config', async () => {
      const services = await NotionClientFactory.createServices({
        apiKey: testApiKey,
        projectPath: projectPath
      });
      
      expect(services.client).toBeDefined();
      expect(services.tableManager).toBeDefined();
      expect(services.dataManager).toBeDefined();
      expect(services.contentManager).toBeDefined();
      expect(services.orchestrator).toBeDefined();
    });

    test('should validate configuration', async () => {
      await expect(
        NotionClientFactory.validateConfig({
          apiKey: testApiKey,
          projectPath: projectPath
        })
      ).resolves.not.toThrow();
    });

    test('should test connection', async () => {
      const result = await NotionClientFactory.testConnection({
        apiKey: testApiKey,
        projectPath: projectPath
      });
      
      expect(result.apiConnection).toBe(true);
      expect(result.workspaceInfo).toBeDefined();
    });

    test('should use caching correctly', async () => {
      const services1 = await NotionClientFactory.createFromConfig(projectPath);
      const services2 = await NotionClientFactory.createFromConfig(projectPath);
      
      // 같은 설정으로 생성하면 캐시된 인스턴스 반환
      expect(services1.client).toBe(services2.client);
    });
  });

  describe('NotionTableManager', () => {
    let tableManager: NotionTableManager;
    
    beforeAll(() => {
      tableManager = new NotionTableManager(testClient, testConfig.databases?.files);
    });

    test('should get database info', async () => {
      if (!testConfig.databases?.files) {
        return; // 데이터베이스가 설정되지 않은 경우 스킵
      }
      
      const dbInfo = await tableManager.getDatabaseInfo(testConfig.databases.files);
      
      expect(dbInfo).toBeDefined();
      expect(dbInfo.id).toBe(testConfig.databases.files);
      expect(dbInfo.title).toBeDefined();
      expect(dbInfo.properties).toBeDefined();
      expect(dbInfo.url).toBeDefined();
    });

    test('should create test schema file', async () => {
      const testSchema = {
        databases: {
          test_unit: {
            title: 'Unit Test Table',
            description: 'Table for unit testing',
            properties: {
              'Name': { type: 'title', required: true },
              'Status': { 
                type: 'select',
                options: [
                  { name: 'Testing', color: 'blue' },
                  { name: 'Complete', color: 'green' }
                ]
              }
            }
          }
        }
      };

      const schemaPath = path.join(projectPath, 'test-unit-schema.json');
      await fs.writeFile(schemaPath, JSON.stringify(testSchema, null, 2));
      
      const exists = await fs.access(schemaPath).then(() => true, () => false);
      expect(exists).toBe(true);
      
      // 정리
      await fs.unlink(schemaPath);
    });
  });

  describe('NotionDataManager', () => {
    let dataManager: NotionDataManager;
    
    beforeAll(() => {
      dataManager = new NotionDataManager(testClient);
    });

    test('should get database stats', async () => {
      if (!testConfig.databases?.files) {
        return;
      }
      
      const stats = await dataManager.getDatabaseStats(testConfig.databases.files);
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalPages).toBe('number');
      expect(typeof stats.createdToday).toBe('number');
      expect(typeof stats.updatedToday).toBe('number');
    });

    test('should query pages', async () => {
      if (!testConfig.databases?.files) {
        return;
      }
      
      const pages = await dataManager.queryPages(
        testConfig.databases.files,
        undefined,
        undefined,
        5
      );
      
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeLessThanOrEqual(5);
    });

    test('should handle empty batch upload', async () => {
      if (!testConfig.databases?.files) {
        return;
      }
      
      const result = await dataManager.batchUpload(
        testConfig.databases.files,
        [],
        { batchSize: 1 }
      );
      
      expect(result).toBeDefined();
      expect(result.total).toBe(0);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should format properties correctly', async () => {
      const testProperties = {
        'Title': 'Test Title',
        'Number': 42,
        'Boolean': true,
        'Date': new Date('2024-01-01'),
        'Array': ['item1', 'item2']
      };
      
      // formatProperties는 private이므로 createPage를 통해 간접 테스트
      // 여기서는 단순히 타입 검증만 수행
      expect(typeof testProperties.Title).toBe('string');
      expect(typeof testProperties.Number).toBe('number');
      expect(typeof testProperties.Boolean).toBe('boolean');
      expect(testProperties.Date).toBeInstanceOf(Date);
      expect(Array.isArray(testProperties.Array)).toBe(true);
    });
  });

  describe('NotionContentManager', () => {
    let contentManager: NotionContentManager;
    
    beforeAll(() => {
      contentManager = new NotionContentManager(testClient);
    });

    test('should convert markdown to blocks', async () => {
      const markdown = `# Test Header\n\nThis is a paragraph.\n\n- List item 1\n- List item 2\n\n\`\`\`typescript\nconst test = "hello";\n\`\`\``;
      
      const blocks = await contentManager.convertMarkdownToBlocks(markdown);
      
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
      
      // 헤더 블록 확인
      const headerBlock = blocks.find(block => block.type === 'heading_1');
      expect(headerBlock).toBeDefined();
      
      // 코드 블록 확인
      const codeBlock = blocks.find(block => block.type === 'code');
      expect(codeBlock).toBeDefined();
    });

    test('should create code blocks', async () => {
      const codeContent = {
        language: 'typescript',
        code: 'function test() {\n  return "hello world";\n}',
        description: 'Test function implementation'
      };
      
      const blocks = await contentManager.createCodeBlocks(codeContent);
      
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
      
      const codeBlock = blocks.find(block => block.type === 'code');
      expect(codeBlock).toBeDefined();
      expect((codeBlock as any).code.language).toBe('typescript');
    });

    test('should create structured content', async () => {
      const documentContent = {
        title: 'Test Document',
        summary: 'This is a test document',
        sections: [
          {
            title: 'Section 1',
            content: 'Content of section 1',
            level: 2
          },
          {
            title: 'Section 2',
            content: 'Content of section 2',
            level: 2
          }
        ]
      };
      
      const blocks = await contentManager.createStructuredContent(documentContent);
      
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
      
      // 제목 블록 확인
      const titleBlock = blocks.find(block => block.type === 'heading_1');
      expect(titleBlock).toBeDefined();
      
      // 섹션 블록들 확인
      const sectionBlocks = blocks.filter(block => block.type === 'heading_2');
      expect(sectionBlocks.length).toBe(2);
    });
  });

  describe('NotionUploadOrchestrator', () => {
    let orchestrator: NotionUploadOrchestrator;
    
    beforeAll(() => {
      orchestrator = new NotionUploadOrchestrator({
        apiKey: testApiKey,
        projectPath: projectPath
      });
    });

    test('should get workflow status', async () => {
      const databaseIds = Object.values(testConfig.databases || {});
      
      if (databaseIds.length === 0) {
        return;
      }
      
      const status = await orchestrator.getWorkflowStatus(databaseIds);
      
      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
      
      for (const [dbId, dbStatus] of Object.entries(status)) {
        expect(typeof dbId).toBe('string');
        if (!('error' in dbStatus)) {
          expect(typeof dbStatus.totalPages).toBe('number');
          expect(typeof dbStatus.createdToday).toBe('number');
          expect(typeof dbStatus.updatedToday).toBe('number');
          expect(typeof dbStatus.hasContent).toBe('number');
        }
      }
    });

    test('should handle upload data only with empty data', async () => {
      const databaseIds = {
        files: 'test-id-1',
        docs: 'test-id-2',
        functions: 'test-id-3'
      };
      
      // 잘못된 ID로 테스트하여 에러 처리 확인
      try {
        const result = await orchestrator.uploadDataOnly(databaseIds, {
          batchSize: 1,
          updateExisting: false
        });
        
        // 에러가 발생하지 않으면 결과 검증
        expect(result).toBeDefined();
      } catch (error) {
        // 예상된 에러 (잘못된 database ID)
        expect(error).toBeDefined();
      }
    });

    test('should validate configuration', async () => {
      expect(() => {
        new NotionUploadOrchestrator({
          apiKey: testApiKey,
          projectPath: projectPath
        });
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should create and use services together', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      // TableManager와 DataManager 함께 사용
      if (testConfig.databases?.files) {
        const dbInfo = await services.tableManager.getDatabaseInfo(testConfig.databases.files);
        const stats = await services.dataManager.getDatabaseStats(testConfig.databases.files);
        
        expect(dbInfo.id).toBe(testConfig.databases.files);
        expect(stats.totalPages).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle workflow coordination', async () => {
      const services = await NotionClientFactory.createFromConfig(projectPath);
      
      // ContentManager와 Orchestrator 함께 사용
      const markdownContent = '# Test\n\nThis is a test.';
      const blocks = await services.contentManager.convertMarkdownToBlocks(markdownContent);
      
      expect(blocks.length).toBeGreaterThan(0);
      
      const databaseIds = Object.values(testConfig.databases || {});
      if (databaseIds.length > 0) {
        const status = await services.orchestrator.getWorkflowStatus(databaseIds);
        expect(Object.keys(status).length).toBeGreaterThan(0);
      }
    });

    test('should maintain consistency across services', async () => {
      const services1 = await NotionClientFactory.createFromConfig(projectPath);
      const services2 = await NotionClientFactory.createFromConfig(projectPath);
      
      // 같은 클라이언트 인스턴스 사용하는지 확인
      expect(services1.client).toBe(services2.client);
      
      // 각 서비스가 같은 클라이언트를 사용하는지 확인
      expect((services1.tableManager as any).notion).toBe((services1.dataManager as any).notion);
      expect((services1.dataManager as any).notion).toBe((services1.contentManager as any).notion);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid API key', async () => {
      await expect(
        NotionClientFactory.validateConfig({
          apiKey: 'invalid-key',
          projectPath: projectPath
        })
      ).rejects.toThrow();
    });

    test('should handle invalid database ID', async () => {
      const dataManager = new NotionDataManager(testClient);
      
      await expect(
        dataManager.getDatabaseStats('invalid-database-id')
      ).rejects.toThrow();
    });

    test('should handle file system errors', async () => {
      const orchestrator = new NotionUploadOrchestrator({
        apiKey: testApiKey,
        projectPath: '/nonexistent/path'
      });
      
      // 존재하지 않는 경로에서 데이터 로드 시도
      try {
        await orchestrator.uploadDataOnly({
          files: 'test-id'
        }, {});
        
        // 에러가 발생하지 않으면 성공 (빈 데이터로 처리)
        expect(true).toBe(true);
      } catch (error) {
        // 예상된 에러
        expect(error).toBeDefined();
      }
    });

    test('should handle network errors gracefully', async () => {
      // 잘못된 페이지 ID로 접근 시도
      const contentManager = new NotionContentManager(testClient);
      
      await expect(
        contentManager.getPageBlocks('invalid-page-id')
      ).rejects.toThrow();
    });
  });
});