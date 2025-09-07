/**
 * Database Command Factory - 공통 서비스 생성 로직
 */

import { getServiceContainer } from '../../../infrastructure/container/serviceRegistration.js';
import type { IConfigurationService } from '../../../domain/interfaces/IConfigurationService.js';
import type { INotionApiService } from '../../../domain/interfaces/INotionApiService.js';
import type { NotionApiService } from '../../../infrastructure/notion/core/NotionApiService.js';
import { DatabaseSchemaManager } from '../../../infrastructure/notion/DatabaseSchemaManager.js';

/**
 * 공통 서비스 팩토리
 */
export class DatabaseCommandFactory {
  private static instance: DatabaseCommandFactory;
  
  /**
   * 팩토리 인스턴스 가져오기
   */
  static getInstance(): DatabaseCommandFactory {
    if (!DatabaseCommandFactory.instance) {
      DatabaseCommandFactory.instance = new DatabaseCommandFactory();
    }
    return DatabaseCommandFactory.instance;
  }

  /**
   * NotionApiService 인스턴스 생성
   */
  static async createNotionService(): Promise<NotionApiService> {
    const container = getServiceContainer();
    const configService = container.resolve<IConfigurationService>('configurationService');
    const config = await configService.loadAndProcessConfig(process.cwd());
    
    if (!config.apiKey) {
      throw new Error('Notion API key not found in configuration');
    }

    // Direct import and instantiation to avoid service registration issues
    const { NotionApiService } = await import('../../../infrastructure/notion/core/NotionApiService.js');
    const { NotionClientFactory } = await import('../../../infrastructure/notion/core/NotionClientFactory.js');
    
    // Use the proper factory to create a full client instance with apiQueue
    const clientInstance = NotionClientFactory.createClient({
      apiKey: config.apiKey,
      workspaceUrl: config.workspaceInfo?.workspaceUrl,
      projectPath: process.cwd()
    });
    
    return new NotionApiService(clientInstance);
  }

  /**
   * DatabaseSchemaManager 인스턴스 생성
   */
  static async createSchemaManager(): Promise<DatabaseSchemaManager> {
    return new DatabaseSchemaManager(process.cwd());
  }

  /**
   * 설정 서비스와 설정 정보 조회
   */
  static async getConfigService() {
    const container = getServiceContainer();
    const configService = container.resolve<IConfigurationService>('configurationService');
    const config = await configService.loadAndProcessConfig(process.cwd());
    return { configService, config };
  }
}