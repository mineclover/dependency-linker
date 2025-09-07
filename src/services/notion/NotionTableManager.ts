/**
 * NotionTableManager - 테이블 생성 및 스키마 관리 전용 서비스
 * 
 * 역할:
 * - Notion 데이터베이스 생성
 * - 스키마 정의 및 업데이트
 * - 데이터베이스 속성 관리
 * - 관계형 속성 설정
 */

import type { INotionApiService } from '../../domain/interfaces/INotionApiService.js';
import { logger } from '../../shared/utils/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DatabaseSchema {
  title: string;
  description?: string;
  properties: Record<string, PropertySchema>;
  icon?: { type: 'emoji' | 'external'; emoji?: string; external?: { url: string } };
}

export interface PropertySchema {
  type: string;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; color?: string }>;
  relationDatabase?: string;
  rollupProperty?: string;
  rollupFunction?: string;
  formula?: string;
}

export interface TableCreationResult {
  id: string;
  title: string;
  url: string;
  properties: Record<string, any>;
}

export class NotionTableManager {
  constructor(
    private readonly notionApiService: INotionApiService,
    private readonly parentPageId?: string
  ) {}

  /**
   * 스키마 파일에서 데이터베이스 생성
   */
  async createDatabaseFromSchema(
    schemaPath: string,
    databaseName: string
  ): Promise<TableCreationResult> {
    try {
      logger.info(`📋 Creating database: ${databaseName}`, 'TABLE');
      
      const schema = await this.loadSchema(schemaPath, databaseName);
      const database = await this.createDatabase(schema);
      
      logger.success(`✅ Database created: ${database.title} (${database.id})`);
      return database;
    } catch (error) {
      logger.error(`❌ Failed to create database ${databaseName}: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 스키마에서 여러 데이터베이스 일괄 생성
   */
  async createDatabasesFromSchema(schemaPath: string): Promise<Record<string, TableCreationResult>> {
    try {
      logger.info(`🏗️ Creating databases from schema: ${schemaPath}`, 'TABLE');
      
      const schemaData = await this.loadSchemaFile(schemaPath);
      const results: Record<string, TableCreationResult> = {};
      
      // 데이터베이스 순차 생성
      for (const [dbName, schema] of Object.entries(schemaData.databases || {})) {
        try {
          const database = await this.createDatabase(schema as DatabaseSchema);
          results[dbName] = database;
          
          // 생성 간 지연 (API 레이트 리밋 방지)
          await this.delay(500);
        } catch (error) {
          logger.error(`❌ Failed to create database ${dbName}: ` + (error instanceof Error ? error.message : String(error)));
          throw error;
        }
      }
      
      // 관계형 속성 설정 (모든 데이터베이스 생성 후)
      await this.setupRelationships(schemaData, results);
      
      logger.success(`🎉 Created ${Object.keys(results).length} databases`);
      return results;
    } catch (error) {
      logger.error(`❌ Failed to create databases from schema: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 기존 데이터베이스 스키마 업데이트
   */
  async updateDatabaseSchema(
    databaseId: string,
    schemaUpdates: Partial<DatabaseSchema>
  ): Promise<void> {
    try {
      logger.info(`🔄 Updating database schema: ${databaseId}`, 'TABLE');
      
      if (schemaUpdates.title || schemaUpdates.description) {
        await this.updateDatabaseInfo(databaseId, schemaUpdates);
      }
      
      if (schemaUpdates.properties) {
        await this.updateDatabaseProperties(databaseId, schemaUpdates.properties);
      }
      
      logger.success(`✅ Database schema updated: ${databaseId}`);
    } catch (error) {
      logger.error(`❌ Failed to update database schema: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 데이터베이스 속성 추가
   */
  async addDatabaseProperty(
    databaseId: string,
    propertyName: string,
    propertySchema: PropertySchema
  ): Promise<void> {
    try {
      logger.info(`➕ Adding property: ${propertyName} to ${databaseId}`, 'TABLE');
      
      const propertyConfig = this.buildPropertyConfig(propertySchema);
      
      await this.notionApiService.updateDatabase(databaseId, {
        properties: {
          [propertyName]: propertyConfig
        }
      });
      
      logger.success(`✅ Property added: ${propertyName}`);
    } catch (error) {
      logger.error(`❌ Failed to add property ${propertyName}: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 데이터베이스 속성 제거
   */
  async removeDatabaseProperty(
    databaseId: string,
    propertyName: string
  ): Promise<void> {
    try {
      logger.info(`➖ Removing property: ${propertyName} from ${databaseId}`, 'TABLE');
      
      await this.notionApiService.updateDatabase(databaseId, {
        properties: {
          [propertyName]: null
        }
      });
      
      logger.success(`✅ Property removed: ${propertyName}`);
    } catch (error) {
      logger.error(`❌ Failed to remove property ${propertyName}: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 관계형 속성 설정
   */
  async setupRelationProperty(
    fromDatabaseId: string,
    toDatabaseId: string,
    propertyName: string,
    bidirectional: boolean = false
  ): Promise<void> {
    try {
      logger.info(`🔗 Setting up relation: ${propertyName}`, 'TABLE');
      
      const relationConfig = {
        type: 'relation',
        relation: {
          database_id: toDatabaseId,
          type: bidirectional ? 'dual_property' : 'single_property'
        }
      };
      
      await this.notionApiService.updateDatabase(fromDatabaseId, {
        properties: {
          [propertyName]: relationConfig
        }
      });
      
      logger.success(`✅ Relation property set up: ${propertyName}`);
    } catch (error) {
      logger.error(`❌ Failed to setup relation property: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 데이터베이스 정보 조회
   */
  async getDatabaseInfo(databaseId: string): Promise<any> {
    try {
      const response = await this.notionApiService.retrieveDatabase(databaseId);
      
      return {
        id: response.id,
        title: (response as any).title[0]?.plain_text || 'Untitled',
        properties: response.properties,
        url: response.url,
        createdTime: response.created_time,
        lastEditedTime: response.last_edited_time
      };
    } catch (error) {
      logger.error(`❌ Failed to get database info: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  // === Private Methods ===

  private async createDatabase(schema: DatabaseSchema): Promise<TableCreationResult> {
    const properties: Record<string, any> = {};
    
    // 속성 구성
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      properties[propName] = this.buildPropertyConfig(propSchema);
    }
    
    const createData: any = {
      parent: this.parentPageId 
        ? { page_id: this.parentPageId }
        : { type: 'page_id', page_id: 'workspace' },
      title: [{ text: { content: schema.title } }],
      properties
    };
    
    if (schema.description) {
      createData.description = [{ text: { content: schema.description } }];
    }
    
    if (schema.icon) {
      createData.icon = schema.icon;
    }
    
    const response = await this.notionApiService.createDatabase(createData);
    
    return {
      id: response.id,
      title: schema.title,
      url: response.url,
      properties: response.properties
    };
  }

  private buildPropertyConfig(schema: PropertySchema): any {
    const config: any = { type: schema.type };
    
    switch (schema.type) {
      case 'title':
        config.title = {};
        break;
      case 'rich_text':
        config.rich_text = {};
        break;
      case 'number':
        config.number = { format: 'number' };
        break;
      case 'select':
        config.select = {
          options: schema.options?.map(opt => ({
            name: opt.name,
            color: opt.color || 'default'
          })) || []
        };
        break;
      case 'multi_select':
        config.multi_select = {
          options: schema.options?.map(opt => ({
            name: opt.name,
            color: opt.color || 'default'
          })) || []
        };
        break;
      case 'date':
        config.date = {};
        break;
      case 'checkbox':
        config.checkbox = {};
        break;
      case 'url':
        config.url = {};
        break;
      case 'email':
        config.email = {};
        break;
      case 'phone_number':
        config.phone_number = {};
        break;
      case 'people':
        config.people = {};
        break;
      case 'files':
        config.files = {};
        break;
      case 'formula':
        config.formula = { expression: schema.formula || '' };
        break;
      default:
        config[schema.type] = {};
    }
    
    return config;
  }

  private async loadSchema(schemaPath: string, databaseName: string): Promise<DatabaseSchema> {
    const schemaData = await this.loadSchemaFile(schemaPath);
    const schema = schemaData.databases?.[databaseName];
    
    if (!schema) {
      throw new Error(`Database schema not found: ${databaseName}`);
    }
    
    return schema as DatabaseSchema;
  }

  private async loadSchemaFile(schemaPath: string): Promise<any> {
    try {
      const fullPath = path.resolve(schemaPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`❌ Failed to load schema file: ${schemaPath} ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  private async updateDatabaseInfo(
    databaseId: string,
    updates: Partial<DatabaseSchema>
  ): Promise<void> {
    const updateData: any = {};
    
    if (updates.title) {
      updateData.title = [{ text: { content: updates.title } }];
    }
    
    if (updates.description) {
      updateData.description = [{ text: { content: updates.description } }];
    }
    
    if (updates.icon) {
      updateData.icon = updates.icon;
    }
    
    await this.notionApiService.updateDatabase(databaseId, updateData);
  }

  private async updateDatabaseProperties(
    databaseId: string,
    properties: Record<string, PropertySchema>
  ): Promise<void> {
    const propertyUpdates: Record<string, any> = {};
    
    for (const [propName, propSchema] of Object.entries(properties)) {
      propertyUpdates[propName] = this.buildPropertyConfig(propSchema);
    }
    
    await this.notionApiService.updateDatabase(databaseId, {
      properties: propertyUpdates
    });
  }

  private async setupRelationships(
    schemaData: any,
    databases: Record<string, TableCreationResult>
  ): Promise<void> {
    // 관계형 속성이 있는 데이터베이스 찾기 및 설정
    for (const [dbName, schema] of Object.entries(schemaData.databases || {})) {
      const dbSchema = schema as DatabaseSchema;
      const database = databases[dbName];
      
      if (!database) continue;
      
      for (const [propName, propSchema] of Object.entries(dbSchema.properties)) {
        if (propSchema.type === 'relation' && propSchema.relationDatabase) {
          const targetDb = databases[propSchema.relationDatabase];
          if (targetDb) {
            await this.setupRelationProperty(database.id, targetDb.id, propName, true);
            await this.delay(300); // API 레이트 리밋 방지
          }
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}