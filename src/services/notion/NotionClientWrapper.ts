/**
 * NotionClientWrapper - CLI호환 Notion 클라이언트 래퍼
 * 기존 CLI 코드와의 호환성을 위한 브리지 클래스
 */

import { Client } from '@notionhq/client';
import { configManager } from '../../infrastructure/config/configManager.js';

export class NotionClientWrapper {
  private client: Client;
  private isInitialized: boolean = false;

  constructor() {
    // 초기화는 지연 로딩으로 처리
    this.client = new Client({ auth: '' });
  }

  /**
   * 클라이언트 초기화 (지연 로딩)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const config = await configManager.loadConfig();
      const apiKey = config.notion?.apiKey || process.env.NOTION_API_KEY;
      
      if (!apiKey) {
        throw new Error('Notion API key not found in configuration or environment');
      }

      this.client = new Client({ auth: apiKey });
      this.isInitialized = true;
      console.log('NotionClientWrapper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotionClientWrapper:', error);
      throw error;
    }
  }

  /**
   * 원본 Notion 클라이언트 반환
   */
  async getClient(): Promise<Client> {
    await this.ensureInitialized();
    return this.client;
  }

  /**
   * 데이터베이스 조회
   */
  async getDatabase(databaseId: string) {
    await this.ensureInitialized();
    return await this.client.databases.retrieve({ database_id: databaseId });
  }

  /**
   * 데이터베이스 스키마 업데이트
   */
  async updateDatabaseSchema(databaseId: string, properties: any) {
    await this.ensureInitialized();
    return await this.client.databases.update({
      database_id: databaseId,
      properties
    });
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      await this.client.users.me();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 페이지 생성
   */
  async createPage(databaseType: string, properties: any) {
    await this.ensureInitialized();
    
    const config = configManager.getNotionConfig();
    const databaseId = config.databases[databaseType as keyof typeof config.databases];
    
    if (!databaseId) {
      throw new Error(`Database ID not found for type: ${databaseType}`);
    }

    return await this.client.pages.create({
      parent: { database_id: databaseId },
      properties
    });
  }

  /**
   * 완전한 Files 데이터베이스 생성 (호환성 메서드)
   */
  async createCompleteFilesDatabase(parentPageId: string): Promise<string> {
    await this.ensureInitialized();
    
    const response = await this.client.databases.create({
      parent: { page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'FILES (dependency-linker)' } }],
      properties: {
        'Name': { title: {} },
        'File Path': { rich_text: {} },
        'Extension': {
          select: {
            options: [
              { name: '.ts', color: 'blue' },
              { name: '.js', color: 'yellow' },
              { name: '.py', color: 'green' },
              { name: '.go', color: 'purple' },
              { name: '.rs', color: 'red' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: 'Uploaded', color: 'green' },
              { name: 'Updated', color: 'blue' },
              { name: 'Error', color: 'red' }
            ]
          }
        },
        'Project': {
          select: {
            options: [{ name: 'dependency-linker', color: 'blue' }]
          }
        }
      }
    });

    return response.id;
  }

  /**
   * 스키마 기반 데이터베이스 생성 (호환성 메서드)
   */
  async createCompleteDatabaseWithSchema(type: string, parentPageId: string): Promise<string> {
    await this.ensureInitialized();
    
    // 기본 스키마로 데이터베이스 생성
    const response = await this.client.databases.create({
      parent: { page_id: parentPageId },
      title: [{ type: 'text', text: { content: `${type.toUpperCase()} (dependency-linker)` } }],
      properties: {
        'Name': { title: {} },
        'Status': {
          select: {
            options: [
              { name: 'Active', color: 'green' },
              { name: 'Inactive', color: 'red' }
            ]
          }
        }
      }
    });

    return response.id;
  }
}

// 싱글톤 인스턴스 생성
export const notionClient = new NotionClientWrapper();