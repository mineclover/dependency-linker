/**
 * Data Source Schema Service - Notion Data Source 아키텍처 기반 스키마 관리
 * MCP Notion 서버를 통한 스키마 업데이트
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { logger } from '../shared/utils/index.js';

interface DataSourceInfo {
  id: string;
  name: string;
  url: string;
  schema: Record<string, any>;
}

interface DatabaseSchemas {
  databases: Record<string, DatabaseSchema>;
}

interface DatabaseSchema {
  title: string;
  description: string;
  properties: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DataSourceSchemaService {
  private mcpNotionFetch: any;
  private mcpNotionCreatePages: any;
  private mcpNotionUpdateDatabase: any;

  constructor(
    mcpNotionFetch: any,
    mcpNotionCreatePages: any,
    mcpNotionUpdateDatabase: any
  ) {
    this.mcpNotionFetch = mcpNotionFetch;
    this.mcpNotionCreatePages = mcpNotionCreatePages;
    this.mcpNotionUpdateDatabase = mcpNotionUpdateDatabase;
  }

  /**
   * 모든 데이터베이스의 Data Source 스키마 업데이트
   */
  async updateAllDataSourceSchemas(
    databases: Record<string, string>,
    projectPath: string
  ): Promise<void> {
    logger.info('🔄 Starting Data Source schema updates...');

    try {
      // 스키마 JSON 파일 로드
      const schemaData = await this.loadSchemaFromJson(projectPath);
      
      // 각 데이터베이스의 Data Source 정보 수집
      const dataSourceInfos = await this.gatherDataSourceInfo(databases);
      
      // 각 데이터베이스별로 스키마 업데이트
      for (const [dbName, dbId] of Object.entries(databases)) {
        if (schemaData.databases[dbName]) {
          const dataSourceInfo = dataSourceInfos.get(dbId);
          if (dataSourceInfo) {
            await this.updateDataSourceSchema(
              dataSourceInfo,
              dbName,
              schemaData.databases[dbName]
            );
          } else {
            logger.warning(`⚠️ Data source info not found for database: ${dbName}`);
          }
        } else {
          logger.warning(`⚠️ Schema not found for database: ${dbName}`);
        }
      }

      logger.success('✅ All Data Source schemas updated successfully!');
    } catch (error) {
      logger.error('❌ Failed to update Data Source schemas: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 데이터베이스의 Data Source 정보 수집
   */
  private async gatherDataSourceInfo(
    databases: Record<string, string>
  ): Promise<Map<string, DataSourceInfo>> {
    logger.info('📊 Gathering Data Source information...');
    
    const dataSourceInfos = new Map<string, DataSourceInfo>();

    for (const [dbName, dbId] of Object.entries(databases)) {
      try {
        logger.info(`🔍 Fetching ${dbName} database structure...`);
        
        const dbInfo = await this.mcpNotionFetch({ id: dbId });
        
        if (dbInfo && dbInfo.text) {
          const dataSourceInfo = this.parseDataSourceFromText(dbInfo.text);
          if (dataSourceInfo) {
            dataSourceInfos.set(dbId, dataSourceInfo);
            logger.success(`✅ Data source info collected for ${dbName}: ${dataSourceInfo.id}`);
          } else {
            logger.warning(`⚠️ Could not parse data source from ${dbName}`);
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to gather data source info for ${dbName}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }

    logger.success(`✅ Collected ${dataSourceInfos.size} data source infos`);
    return dataSourceInfos;
  }

  /**
   * Notion MCP 응답에서 Data Source 정보 파싱
   */
  private parseDataSourceFromText(text: string): DataSourceInfo | null {
    try {
      // <data-source url="collection://..." 패턴에서 URL 추출
      const urlMatch = text.match(/collection:\/\/([a-f0-9-]+)/);
      if (!urlMatch) return null;

      const collectionId = urlMatch[1];
      const fullUrl = `collection://${collectionId}`;

      // <data-source-state> 섹션에서 스키마 추출
      const stateMatch = text.match(/<data-source-state>\s*({.*?})\s*<\/data-source-state>/s);
      if (!stateMatch) return null;

      const stateData = JSON.parse(stateMatch[1]);
      
      return {
        id: collectionId,
        name: stateData.name || 'Unknown',
        url: fullUrl,
        schema: stateData.schema || {}
      };
    } catch (error) {
      logger.error('Failed to parse data source info: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 개별 Data Source 스키마 업데이트
   */
  private async updateDataSourceSchema(
    dataSourceInfo: DataSourceInfo,
    dbName: string,
    schema: DatabaseSchema
  ): Promise<void> {
    logger.info(`🔧 Updating Data Source schema for ${dbName}...`);
    logger.info(`   Data Source ID: ${dataSourceInfo.id}`);
    logger.info(`   Current schema: ${Object.keys(dataSourceInfo.schema).join(', ')}`);

    try {
      // 스키마 검증
      const validation = await this.validateDataSourceSchema(
        dataSourceInfo,
        dbName,
        schema
      );

      if (!validation.isValid) {
        logger.error(`❌ Data Source schema validation failed for ${dbName}:`);
        validation.errors.forEach(error => logger.error(`   ${error}`));
        throw new Error(`Schema validation failed for ${dbName}: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => logger.warning(`⚠️ ${warning}`));
      }

      // 새로운 스키마 속성 생성
      const newProperties = this.convertJsonSchemaToDataSourceProperties(schema.properties);
      
      logger.info(`📊 Converting ${Object.keys(schema.properties).length} properties for ${dbName}`);
      logger.info(`   New properties: ${Object.keys(newProperties).join(', ')}`);

      // MCP를 통한 데이터베이스 업데이트
      // Note: 실제로는 Data Source 스키마를 직접 업데이트하는 API가 필요하지만
      // 현재는 데이터베이스 업데이트를 시도
      const updateResult = await this.mcpNotionUpdateDatabase({
        database_id: dataSourceInfo.id, // Data Source ID 사용
        properties: newProperties
      });

      logger.success(`✅ ${dbName} Data Source schema updated`);
      logger.success(`   Properties updated: ${Object.keys(newProperties).length}`);

    } catch (error: any) {
      logger.error(`❌ Failed to update ${dbName} Data Source schema: ` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * Data Source 스키마 검증
   */
  private async validateDataSourceSchema(
    dataSourceInfo: DataSourceInfo,
    dbName: string,
    schema: DatabaseSchema
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Data Source가 존재하고 접근 가능한지 확인
      if (!dataSourceInfo || !dataSourceInfo.id) {
        errors.push(`Data Source for ${dbName} not found or not accessible`);
        return { isValid: false, errors, warnings };
      }

      // 2. 현재 스키마와 새 스키마 비교
      const currentSchema = dataSourceInfo.schema || {};
      const newSchema = schema.properties || {};

      // 3. 기존 속성과 충돌 여부 확인
      for (const [propName, propConfig] of Object.entries(newSchema)) {
        if (currentSchema[propName]) {
          const currentType = currentSchema[propName].type;
          const newType = propConfig.type;

          if (currentType !== newType) {
            warnings.push(`Property "${propName}" type will change from ${currentType} to ${newType} in Data Source ${dataSourceInfo.id}`);
          }
        }
      }

      // 4. 필수 타이틀 속성 확인
      const titleProperties = Object.entries(newSchema).filter(([_, config]) => config.type === 'title');
      if (titleProperties.length === 0) {
        warnings.push(`No title property found in schema for ${dbName} Data Source`);
      } else if (titleProperties.length > 1) {
        errors.push(`Multiple title properties found in schema for ${dbName} Data Source. Only one title property is allowed.`);
      }

      logger.debug(`✅ Data Source schema validation completed for ${dbName}: ${errors.length} errors, ${warnings.length} warnings`);

    } catch (validationError) {
      errors.push(`Data Source validation error for ${dbName}: ${validationError}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * JSON 스키마를 Data Source 속성 형식으로 변환
   */
  private convertJsonSchemaToDataSourceProperties(jsonProperties: Record<string, any>): Record<string, any> {
    const dataSourceProperties: Record<string, any> = {};

    for (const [propName, propConfig] of Object.entries(jsonProperties)) {
      switch (propConfig.type) {
        case 'title':
          dataSourceProperties[propName] = {
            type: 'title',
            title: {}
          };
          break;

        case 'rich_text':
          dataSourceProperties[propName] = {
            type: 'rich_text',
            rich_text: {}
          };
          break;

        case 'number':
          dataSourceProperties[propName] = {
            type: 'number',
            number: {
              format: 'number'
            }
          };
          break;

        case 'date':
          dataSourceProperties[propName] = {
            type: 'date',
            date: {}
          };
          break;

        case 'select':
          if (propConfig.options && Array.isArray(propConfig.options)) {
            dataSourceProperties[propName] = {
              type: 'select',
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
            dataSourceProperties[propName] = {
              type: 'multi_select',
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
          // Data Source 관계는 collection URL 기반
          if (propConfig.target === 'self') {
            dataSourceProperties[propName] = {
              type: 'relation',
              relation: {
                data_source_id: '', // 런타임에 설정
                type: 'dual_property',
                dual_property: {
                  synced_property_name: propConfig.sync_property || 'Related'
                }
              }
            };
          }
          break;

        case 'checkbox':
          dataSourceProperties[propName] = {
            type: 'checkbox',
            checkbox: {}
          };
          break;

        case 'url':
          dataSourceProperties[propName] = {
            type: 'url',
            url: {}
          };
          break;

        case 'email':
          dataSourceProperties[propName] = {
            type: 'email',
            email: {}
          };
          break;

        case 'phone_number':
          dataSourceProperties[propName] = {
            type: 'phone_number',
            phone_number: {}
          };
          break;

        case 'files':
          dataSourceProperties[propName] = {
            type: 'files',
            files: {}
          };
          break;

        default:
          logger.warning(`⚠️ Unsupported Data Source property type: ${propConfig.type} for ${propName}`);
          break;
      }
    }

    return dataSourceProperties;
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
        logger.success(`✅ Data Source schema loaded from: ${schemaPath}`);
        return parsed;
      } catch (error) {
        continue; // 다음 경로 시도
      }
    }

    throw new Error('Schema JSON file not found in any of the expected locations');
  }

  /**
   * Data Source 스키마 현재 상태 확인
   */
  async checkDataSourceSchemas(databases: Record<string, string>): Promise<void> {
    logger.info('🔍 Checking current Data Source schemas...');

    const dataSourceInfos = await this.gatherDataSourceInfo(databases);

    for (const [dbName, dbId] of Object.entries(databases)) {
      const dataSourceInfo = dataSourceInfos.get(dbId);
      if (dataSourceInfo) {
        logger.info(`\n=== ${dbName.toUpperCase()} Data Source ===`);
        logger.info(`Data Source ID: ${dataSourceInfo.id}`);
        logger.info(`Name: ${dataSourceInfo.name}`);
        logger.info(`URL: ${dataSourceInfo.url}`);
        logger.info('Current Schema:');
        
        const schemaEntries = Object.entries(dataSourceInfo.schema);
        if (schemaEntries.length === 0) {
          logger.info('  🚨 No properties found in Data Source schema!');
        } else {
          schemaEntries.forEach(([propName, propConfig]) => {
            const config = propConfig as any;
            logger.info(`  - "${propName}": ${config.type || 'unknown'}`);
          });
        }
      } else {
        logger.warning(`⚠️ Data Source info not available for ${dbName}`);
      }
    }
  }
}