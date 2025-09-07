/**
 * Schema Update Service - Notion 데이터베이스 스키마 업데이트
 * data source create를 사용하여 실제 스키마 속성을 적용
 */

import { Client } from '@notionhq/client';
import { readFile } from 'fs/promises';
import path from 'path';
import { logger } from '../shared/utils/index.js';

interface DatabaseSchema {
  title: string;
  description: string;
  properties: Record<string, any>;
}

interface DatabaseSchemas {
  databases: Record<string, DatabaseSchema>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface DatabaseSnapshot {
  id: string;
  title: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
}

export class SchemaUpdateService {
  private notionClient: Client;
  private snapshots: Map<string, DatabaseSnapshot> = new Map();

  constructor(notionClient: Client) {
    this.notionClient = notionClient;
  }

  /**
   * 모든 데이터베이스의 스키마를 업데이트
   */
  async updateAllDatabaseSchemas(
    databases: Record<string, string>, 
    projectPath: string
  ): Promise<void> {
    logger.info('🔄 Starting database schema updates...');

    try {
      // 스키마 JSON 파일 로드
      const schemaData = await this.loadSchemaFromJson(projectPath);
      
      // 업데이트 전 스냅샷 생성
      await this.createDatabaseSnapshots(databases);
      
      // 각 데이터베이스별로 스키마 업데이트
      for (const [dbName, dbId] of Object.entries(databases)) {
        if (schemaData.databases[dbName]) {
          await this.updateDatabaseSchema(
            dbId,
            dbName,
            schemaData.databases[dbName]
          );
        } else {
          logger.warning(`⚠️ Schema not found for database: ${dbName}`);
        }
      }

      // 업데이트 후 검증
      await this.validateDatabaseUpdates(databases, schemaData);

      logger.success('✅ All database schemas updated successfully!');
    } catch (error) {
      logger.error('❌ Failed to update database schemas: ' + (error instanceof Error ? error.message : String(error)));
      
      // 롤백 시도
      await this.attemptRollback(databases);
      throw error;
    }
  }

  /**
   * 개별 데이터베이스 스키마 업데이트
   */
  private async updateDatabaseSchema(
    databaseId: string,
    dbName: string,
    schema: DatabaseSchema
  ): Promise<void> {
    logger.info(`🔧 Updating schema for ${dbName} database...`);

    try {
      // 업데이트 전 데이터베이스 상태 확인
      const currentDatabase = await this.notionClient.databases.retrieve({
        database_id: databaseId
      });

      // 스키마 검증
      const validation = await this.validateSchemaBeforeUpdate(
        databaseId,
        dbName,
        schema,
        currentDatabase
      );

      if (!validation.isValid) {
        logger.error(`❌ Schema validation failed for ${dbName}:`);
        validation.errors.forEach(error => logger.error(`   ${error}`));
        throw new Error(`Schema validation failed for ${dbName}: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warning(`⚠️ ${warning}`));
      }

      // Notion properties 변환
      const notionProperties = this.convertJsonSchemaToNotionProperties(schema.properties);
      
      logger.info(`📊 Converting ${Object.keys(schema.properties).length} properties for ${dbName}`);
      logger.debug(`Properties to update:`, Object.keys(notionProperties));

      // 데이터베이스 속성 업데이트
      const response = await this.notionClient.databases.update({
        database_id: databaseId,
        properties: notionProperties
      });

      // 업데이트 후 즉시 검증
      await this.verifyDatabaseUpdate(databaseId, dbName, notionProperties);

      logger.success(`✅ ${dbName} database schema updated (${databaseId})`);
      logger.success(`   Properties updated: ${Object.keys(notionProperties).length}`);

    } catch (error: any) {
      logger.error(`❌ Failed to update ${dbName} database schema: ` + (error instanceof Error ? error.message : String(error)));
      if (error.body) {
        logger.error('API Error Details: ' + JSON.stringify(error.body, null, 2));
      }
      throw error;
    }
  }

  /**
   * JSON 스키마를 Notion 속성 형식으로 변환
   */
  private convertJsonSchemaToNotionProperties(jsonProperties: Record<string, any>): Record<string, any> {
    const notionProperties: Record<string, any> = {};

    for (const [propName, propConfig] of Object.entries(jsonProperties)) {
      switch (propConfig.type) {
        case 'title':
          notionProperties[propName] = {
            title: {}
          };
          break;

        case 'rich_text':
          notionProperties[propName] = {
            rich_text: {}
          };
          break;

        case 'number':
          notionProperties[propName] = {
            number: {
              format: 'number'
            }
          };
          break;

        case 'date':
          notionProperties[propName] = {
            date: {}
          };
          break;

        case 'select':
          if (propConfig.options && Array.isArray(propConfig.options)) {
            notionProperties[propName] = {
              select: {
                options: propConfig.options.map((option: any) => ({
                  name: option.name,
                  color: option.color
                }))
              }
            };
          }
          break;

        case 'multi_select':
          if (propConfig.options && Array.isArray(propConfig.options)) {
            notionProperties[propName] = {
              multi_select: {
                options: propConfig.options.map((option: any) => ({
                  name: option.name,
                  color: option.color
                }))
              }
            };
          }
          break;

        case 'relation':
          // 관계형 속성은 target database ID가 필요하므로 별도 처리
          if (propConfig.target === 'self') {
            // 자기 참조 관계
            notionProperties[propName] = {
              relation: {
                database_id: '', // 이 값은 런타임에 설정됨
                type: 'dual_property',
                dual_property: {
                  synced_property_name: propConfig.sync_property || 'Related'
                }
              }
            };
          }
          break;

        default:
          logger.warning(`⚠️ Unsupported property type: ${propConfig.type} for ${propName}`);
          break;
      }
    }

    return notionProperties;
  }

  /**
   * 관계형 속성을 별도로 업데이트 (다른 데이터베이스 ID 필요)
   */
  async updateRelationProperties(
    databases: Record<string, string>,
    projectPath: string
  ): Promise<void> {
    logger.info('🔗 Updating relation properties...');

    try {
      const schemaData = await this.loadSchemaFromJson(projectPath);

      for (const [dbName, dbId] of Object.entries(databases)) {
        const schema = schemaData.databases[dbName];
        if (!schema) continue;

        const relationProperties: Record<string, any> = {};

        for (const [propName, propConfig] of Object.entries(schema.properties)) {
          if (propConfig.type === 'relation') {
            if (propConfig.target === 'self') {
              // 자기 참조
              relationProperties[propName] = {
                relation: {
                  database_id: dbId,
                  type: 'dual_property',
                  dual_property: {
                    synced_property_name: propConfig.sync_property || 'Related'
                  }
                }
              };
            } else if (propConfig.target && databases[propConfig.target]) {
              // 다른 데이터베이스 참조
              relationProperties[propName] = {
                relation: {
                  database_id: databases[propConfig.target],
                  type: propConfig.bidirectional ? 'dual_property' : 'single_property',
                  ...(propConfig.bidirectional && {
                    dual_property: {
                      synced_property_name: propConfig.sync_property || 'Related'
                    }
                  })
                }
              };
            }
          }
        }

        if (Object.keys(relationProperties).length > 0) {
          await this.notionClient.databases.update({
            database_id: dbId,
            properties: relationProperties
          });

          logger.success(`✅ ${dbName} relation properties updated`);
        }
      }

      logger.success('✅ All relation properties updated!');
    } catch (error) {
      logger.error('❌ Failed to update relation properties: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 스키마 JSON 파일 로드
   */
  private async loadSchemaFromJson(projectPath: string): Promise<DatabaseSchemas> {
    const possiblePaths = [
      path.join(projectPath, 'src', 'infrastructure', 'database', 'schemas', 'database-schemas.json'),
      path.join(projectPath, 'schemas', 'database-schemas.json'),
      path.join(projectPath, 'src', 'schemas', 'database-schemas.json'),
      path.join(projectPath, 'database-schemas.json')
    ];

    for (const schemaPath of possiblePaths) {
      try {
        const content = await readFile(schemaPath, 'utf-8');
        const parsed = JSON.parse(content);
        logger.success(`✅ Schema loaded from: ${schemaPath}`);
        return parsed;
      } catch (error) {
        continue; // 다음 경로 시도
      }
    }

    throw new Error('Schema JSON file not found in any of the expected locations');
  }

  /**
   * 업데이트 전 스키마 검증
   */
  private async validateSchemaBeforeUpdate(
    databaseId: string,
    dbName: string,
    schema: DatabaseSchema,
    currentDatabase: any
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. 데이터베이스가 존재하고 접근 가능한지 확인
      if (!currentDatabase || !currentDatabase.id) {
        errors.push(`Database ${dbName} (${databaseId}) not found or not accessible`);
        return { isValid: false, errors, warnings };
      }

      // 2. 데이터베이스가 올바른 타입인지 확인
      if (currentDatabase.object !== 'database') {
        errors.push(`${dbName} is not a database object (type: ${currentDatabase.object})`);
      }

      // 3. Properties가 해당 테이블에 소속되는지 확인
      const currentProperties = currentDatabase.properties || {};
      const schemaProperties = schema.properties || {};

      // 4. 기존 속성과 충돌 여부 확인
      for (const [propName, propConfig] of Object.entries(schemaProperties)) {
        if (currentProperties[propName]) {
          const currentType = currentProperties[propName].type;
          const newType = propConfig.type;

          if (currentType !== newType) {
            warnings.push(`Property "${propName}" type will change from ${currentType} to ${newType}`);
          }
        }
      }

      // 5. 필수 타이틀 속성 확인
      const titleProperties = Object.entries(schemaProperties).filter(([_, config]) => config.type === 'title');
      if (titleProperties.length === 0) {
        warnings.push(`No title property found in schema for ${dbName}`);
      } else if (titleProperties.length > 1) {
        errors.push(`Multiple title properties found in schema for ${dbName}. Only one title property is allowed.`);
      }

      // 6. Select/Multi-select 옵션 검증
      for (const [propName, propConfig] of Object.entries(schemaProperties)) {
        if ((propConfig.type === 'select' || propConfig.type === 'multi_select') && propConfig.options) {
          if (!Array.isArray(propConfig.options)) {
            errors.push(`Property "${propName}" has invalid options format`);
          } else if (propConfig.options.length === 0) {
            warnings.push(`Property "${propName}" has no options defined`);
          } else {
            // 옵션 이름 중복 확인
            const optionNames = propConfig.options.map((opt: any) => opt.name);
            const uniqueNames = new Set(optionNames);
            if (optionNames.length !== uniqueNames.size) {
              errors.push(`Property "${propName}" has duplicate option names`);
            }
          }
        }
      }

      // 7. 관계 속성 검증
      for (const [propName, propConfig] of Object.entries(schemaProperties)) {
        if (propConfig.type === 'relation') {
          if (!propConfig.target) {
            errors.push(`Relation property "${propName}" missing target database`);
          }
        }
      }

      logger.debug(`✅ Schema validation completed for ${dbName}: ${errors.length} errors, ${warnings.length} warnings`);

    } catch (validationError) {
      errors.push(`Validation error for ${dbName}: ${validationError}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 업데이트 후 데이터베이스 검증
   */
  private async verifyDatabaseUpdate(
    databaseId: string,
    dbName: string,
    expectedProperties: Record<string, any>
  ): Promise<void> {
    try {
      logger.info(`🔍 Verifying update for ${dbName}...`);
      
      // 업데이트된 데이터베이스 조회
      const updatedDatabase = await this.notionClient.databases.retrieve({
        database_id: databaseId
      });

      const actualProperties = updatedDatabase.properties || {};
      const expectedPropertyNames = Object.keys(expectedProperties);
      const actualPropertyNames = Object.keys(actualProperties);

      logger.info(`   Expected properties: ${expectedPropertyNames.length}`);
      logger.info(`   Actual properties: ${actualPropertyNames.length}`);

      // 누락된 속성 확인
      const missingProperties = expectedPropertyNames.filter(
        name => !actualPropertyNames.includes(name)
      );

      if (missingProperties.length > 0) {
        logger.warning(`⚠️ Missing properties in ${dbName}: ${missingProperties.join(', ')}`);
      }

      // 추가된 속성 확인 (예상보다 많은 경우)
      const extraProperties = actualPropertyNames.filter(
        name => !expectedPropertyNames.includes(name)
      );

      if (extraProperties.length > 0) {
        logger.info(`ℹ️ Additional properties in ${dbName}: ${extraProperties.join(', ')}`);
      }

      // 속성 타입 확인
      for (const propName of expectedPropertyNames) {
        if (actualProperties[propName]) {
          const expectedType = this.extractPropertyType(expectedProperties[propName]);
          const actualType = actualProperties[propName].type;

          if (expectedType !== actualType) {
            logger.warning(`⚠️ Property "${propName}" type mismatch: expected ${expectedType}, got ${actualType}`);
          } else {
            logger.debug(`✅ Property "${propName}" type verified: ${actualType}`);
          }
        }
      }

      if (missingProperties.length === 0) {
        logger.success(`✅ ${dbName} update verification passed`);
      } else {
        logger.warning(`⚠️ ${dbName} update verification completed with warnings`);
      }

    } catch (verificationError) {
      logger.error(`❌ Failed to verify ${dbName} update: ` + (verificationError instanceof Error ? verificationError.message : String(verificationError)));
      // 검증 실패해도 전체 프로세스는 계속 진행
    }
  }

  /**
   * Notion property 객체에서 타입 추출
   */
  private extractPropertyType(propertyConfig: any): string {
    if (propertyConfig.title) return 'title';
    if (propertyConfig.rich_text) return 'rich_text';
    if (propertyConfig.number) return 'number';
    if (propertyConfig.select) return 'select';
    if (propertyConfig.multi_select) return 'multi_select';
    if (propertyConfig.date) return 'date';
    if (propertyConfig.relation) return 'relation';
    if (propertyConfig.checkbox) return 'checkbox';
    if (propertyConfig.url) return 'url';
    if (propertyConfig.email) return 'email';
    if (propertyConfig.phone_number) return 'phone_number';
    if (propertyConfig.files) return 'files';
    return 'unknown';
  }

  /**
   * 데이터베이스 스냅샷 생성
   */
  private async createDatabaseSnapshots(databases: Record<string, string>): Promise<void> {
    logger.info('📸 Creating database snapshots...');

    for (const [dbName, dbId] of Object.entries(databases)) {
      try {
        const database = await this.notionClient.databases.retrieve({
          database_id: dbId
        });

        const snapshot: DatabaseSnapshot = {
          id: database.id,
          title: database.title[0]?.plain_text || '',
          properties: database.properties || {},
          created_time: database.created_time,
          last_edited_time: database.last_edited_time
        };

        this.snapshots.set(dbId, snapshot);
        logger.debug(`📸 Snapshot created for ${dbName}`);

      } catch (error) {
        logger.warning(`⚠️ Failed to create snapshot for ${dbName}:`, error);
      }
    }

    logger.success(`✅ Created ${this.snapshots.size} database snapshots`);
  }

  /**
   * 업데이트 후 검증
   */
  private async validateDatabaseUpdates(
    databases: Record<string, string>,
    schemaData: DatabaseSchemas
  ): Promise<void> {
    logger.info('🔍 Validating database updates...');

    for (const [dbName, dbId] of Object.entries(databases)) {
      if (schemaData.databases[dbName]) {
        const schema = schemaData.databases[dbName];
        const expectedProperties = this.convertJsonSchemaToNotionProperties(schema.properties);
        
        await this.verifyDatabaseUpdate(dbId, dbName, expectedProperties);
      }
    }

    logger.success('✅ Database update validation completed');
  }

  /**
   * 롤백 시도
   */
  private async attemptRollback(databases: Record<string, string>): Promise<void> {
    if (this.snapshots.size === 0) {
      logger.warning('⚠️ No snapshots available for rollback');
      return;
    }

    logger.info('🔄 Attempting to rollback database changes...');

    for (const [dbName, dbId] of Object.entries(databases)) {
      const snapshot = this.snapshots.get(dbId);
      if (!snapshot) {
        logger.warning(`⚠️ No snapshot found for ${dbName}, skipping rollback`);
        continue;
      }

      try {
        // 속성을 원래 상태로 복원 시도
        await this.notionClient.databases.update({
          database_id: dbId,
          properties: snapshot.properties
        });

        logger.info(`✅ Rollback successful for ${dbName}`);
      } catch (rollbackError) {
        logger.error(`❌ Rollback failed for ${dbName}: ` + (rollbackError instanceof Error ? rollbackError.message : String(rollbackError)));
      }
    }

    logger.info('🔄 Rollback attempt completed');
  }

  /**
   * 데이터베이스 현재 속성 확인
   */
  async checkDatabaseProperties(
    databases: Record<string, string>
  ): Promise<void> {
    logger.info('🔍 Checking current database properties...');

    for (const [dbName, dbId] of Object.entries(databases)) {
      try {
        const database = await this.notionClient.databases.retrieve({
          database_id: dbId
        });

        logger.info(`\n=== ${dbName.toUpperCase()} Database ===`);
        logger.info(`Title: ${database.title[0]?.plain_text || 'No title'}`);
        logger.info('Properties:');

        for (const [propName, propConfig] of Object.entries(database.properties)) {
          const config = propConfig as any;
          logger.info(`  - "${propName}": ${config.type}`);
          
          if (config.type === 'select' && config.select?.options) {
            logger.info(`    Options: ${config.select.options.map((opt: any) => opt.name).join(', ')}`);
          }
          
          if (config.type === 'multi_select' && config.multi_select?.options) {
            logger.info(`    Options: ${config.multi_select.options.map((opt: any) => opt.name).join(', ')}`);
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to retrieve ${dbName} database: ` + (error instanceof Error ? error.message : String(error)));
      }
    }
  }
}