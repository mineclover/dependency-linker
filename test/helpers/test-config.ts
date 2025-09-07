/**
 * 테스트 설정과 유틸리티
 */

import { ConfigurationService } from '../../src/services/config/ConfigurationService.js';
// import { NotionDocumentTracker } from '../../src/utils/notionDocumentTracker.js';
// import { EnhancedMarkdownProcessor } from '../../src/shared/utils/markdownProcessor.js';
import * as fs from 'fs';
import * as path from 'path';

export interface TestConfig {
  notion: {
    apiKey: string;
    testDatabaseId: string;
    testParentPageId: string;
  };
  files: {
    tempDir: string;
    fixturesDir: string;
  };
}

export class TestEnvironment {
  private config: TestConfig;
  private configManager?: ConfigManager;
  private documentTracker?: NotionDocumentTracker;
  private markdownProcessor?: EnhancedMarkdownProcessor;
  
  constructor() {
    this.config = {
      notion: {
        apiKey: process.env.NOTION_API_KEY || '',
        testDatabaseId: process.env.TEST_DATABASE_ID || '',
        testParentPageId: process.env.TEST_PARENT_PAGE_ID || ''
      },
      files: {
        tempDir: path.join(process.cwd(), 'test', 'temp'),
        fixturesDir: path.join(process.cwd(), 'test', 'fixtures')
      }
    };
  }

  async setup(): Promise<void> {
    // 임시 디렉토리 생성
    if (!fs.existsSync(this.config.files.tempDir)) {
      fs.mkdirSync(this.config.files.tempDir, { recursive: true });
    }

    // 설정 관리자 초기화
    this.configManager = new ConfigManager();
    await this.configManager.loadConfig();

    // 문서 추적기 초기화
    this.documentTracker = new NotionDocumentTracker(this.configManager);

    // 마크다운 프로세서 초기화
    this.markdownProcessor = new EnhancedMarkdownProcessor();
  }

  async cleanup(): Promise<void> {
    // 임시 파일 정리
    if (fs.existsSync(this.config.files.tempDir)) {
      const files = fs.readdirSync(this.config.files.tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.config.files.tempDir, file));
      }
    }
  }

  getFixturePath(filename: string): string {
    return path.join(this.config.files.fixturesDir, filename);
  }

  getTempPath(filename: string): string {
    return path.join(this.config.files.tempDir, filename);
  }

  getDocumentTracker(): NotionDocumentTracker {
    if (!this.documentTracker) {
      throw new Error('Test environment not set up. Call setup() first.');
    }
    return this.documentTracker;
  }

  getMarkdownProcessor(): EnhancedMarkdownProcessor {
    if (!this.markdownProcessor) {
      throw new Error('Test environment not set up. Call setup() first.');
    }
    return this.markdownProcessor;
  }

  getConfig(): TestConfig {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(
      this.config.notion.apiKey && 
      this.config.notion.testDatabaseId && 
      this.config.notion.testParentPageId
    );
  }
}

export const testEnv = new TestEnvironment();