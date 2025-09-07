/**
 * Notion Database Creator - Migration System Component
 * 스키마 기반 Notion 데이터베이스 생성 및 관리
 */

import { NotionApiService } from '../../infrastructure/notion/core/NotionApiService.js';
import { SchemaValidationService, type ValidationResult } from '../../domain/services/SchemaValidationService.js';
import { logger } from '../../shared/utils/index.js';
import type { DatabaseSchema, Property } from '../../shared/utils/schemaManager.js';

export interface DatabaseCreationRequest {
  schema: DatabaseSchema;
  parentPageId?: string;
  options?: DatabaseCreationOptions;
}

export interface DatabaseCreationOptions {
  isInline?: boolean;
  icon?: string;
  description?: string;
  cleanupExisting?: boolean;
}

export interface DatabaseCreationResult {
  success: boolean;
  databaseId?: string;
  databaseUrl?: string;
  dataSourceId?: string;
  validationResult?: ValidationResult;
  message: string;
  errors?: string[];
}

export interface NotionDatabaseCreateRequest {
  parent: { page_id: string } | { type: 'workspace' };
  title: Array<{ text: { content: string } }>;
  properties: Record<string, any>;
  description?: Array<{ text: { content: string } }>;
  is_inline?: boolean;
  icon?: { emoji: string };
}

/**
 * Notion Database Creator
 * 검증된 스키마를 기반으로 새로운 Notion 데이터베이스를 생성
 */
export class NotionDatabaseCreator {
  private notionApi: NotionApiService;
  private validator: SchemaValidationService;

  constructor(notionApi: NotionApiService) {
    this.notionApi = notionApi;
    this.validator = new SchemaValidationService();
  }

  /**
   * 스키마 기반 데이터베이스 생성
   */
  async createDatabase(request: DatabaseCreationRequest): Promise<DatabaseCreationResult> {
    try {
      logger.info(`Creating database: ${request.schema.title}`, '🏗️');

      // 1. 스키마 검증
      const validationResult = await this.validator.validateDatabaseSchema(request.schema);
      
      if (!validationResult.isValid) {
        const criticalErrors = validationResult.errors.filter(e => 
          e.severity === 'CRITICAL' || e.severity === 'HIGH'
        );
        
        if (criticalErrors.length > 0) {
          return {
            success: false,
            message: `Schema validation failed: ${criticalErrors.length} critical errors`,
            validationResult,
            errors: criticalErrors.map(e => `[${e.severity}] ${e.field}: ${e.message}`)
          };
        }
      }

      // 2. Notion API 요청 준비
      const createRequest = this.prepareCreationRequest(request);

      // 3. 데이터베이스 생성
      const createResult = await this.notionApi.createDatabase(createRequest);

      if (!createResult.success) {
        return {
          success: false,
          message: `Failed to create database: ${createResult.message}`,
          errors: [createResult.message]
        };
      }

      const database = createResult.data;
      const databaseId = database.id;
      const databaseUrl = database.url;

      // 4. 생성된 데이터베이스 검증
      const verificationResult = await this.verifyCreatedDatabase(databaseId, request.schema);

      if (!verificationResult.success) {
        logger.warning(`Database created but verification failed: ${verificationResult.message}`);
      }

      // 5. Data Source ID 추출 (2025-09-03 API)
      let dataSourceId: string | undefined;
      try {
        if (database.data_sources && database.data_sources.length > 0) {
          dataSourceId = database.data_sources[0].id;
        }
      } catch (error) {
        logger.warning(`Could not extract data source ID: ${error}`);
      }

      logger.success(`Database created successfully: ${request.schema.title}`);

      return {
        success: true,
        databaseId,
        databaseUrl,
        dataSourceId,
        validationResult,
        message: `Database "${request.schema.title}" created successfully`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Database creation failed: ${errorMessage}`);

      return {
        success: false,
        message: `Database creation failed: ${errorMessage}`,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 여러 데이터베이스 일괄 생성
   */
  async createMultipleDatabases(
    requests: DatabaseCreationRequest[],
    parentPageId?: string
  ): Promise<{
    results: DatabaseCreationResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    logger.info(`Creating ${requests.length} databases`, '🏗️');

    const results: DatabaseCreationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const request of requests) {
      // Parent page 설정
      if (parentPageId && !request.parentPageId) {
        request.parentPageId = parentPageId;
      }

      const result = await this.createDatabase(request);
      results.push(result);

      if (result.success) {
        successful++;
        logger.success(`✅ Created: ${request.schema.title}`);
      } else {
        failed++;
        logger.error(`❌ Failed: ${request.schema.title} - ${result.message}`);
      }

      // Rate limiting - Notion API has rate limits
      await this.delay(500);
    }

    const summary = {
      total: requests.length,
      successful,
      failed
    };

    logger.info(`Database creation completed: ${successful}/${requests.length} successful`);

    return { results, summary };
  }

  /**
   * Notion API 요청 객체 준비
   */
  private prepareCreationRequest(request: DatabaseCreationRequest): NotionDatabaseCreateRequest {
    const { schema, parentPageId, options = {} } = request;

    // Parent 설정
    const parent = parentPageId 
      ? { page_id: parentPageId }
      : { type: 'workspace' as const };

    // Title 설정
    const title = [{ text: { content: schema.title } }];

    // Properties 변환
    const properties = this.convertSchemaProperties(schema);

    // 기본 요청 객체
    const createRequest: NotionDatabaseCreateRequest = {
      parent,
      title,
      properties
    };

    // Optional fields 추가
    if (schema.description || options.description) {
      createRequest.description = [{
        text: { content: options.description || schema.description || '' }
      }];
    }

    if (options.isInline !== undefined) {
      createRequest.is_inline = options.isInline;
    }

    if (options.icon) {
      createRequest.icon = { emoji: options.icon };
    }

    return createRequest;
  }

  /**
   * 스키마 속성을 Notion API 형식으로 변환
   */
  private convertSchemaProperties(schema: DatabaseSchema): Record<string, any> {
    const properties: Record<string, any> = {};

    // 스키마에서 properties 추출
    const schemaProperties = this.extractPropertiesFromSchema(schema);

    for (const [propName, prop] of Object.entries(schemaProperties)) {
      properties[propName] = this.convertProperty(prop);
    }

    // 최소한 하나의 title 속성 보장
    const hasTitleProperty = Object.values(properties).some((prop: any) => prop.type === 'title');
    if (!hasTitleProperty) {
      properties['Name'] = { title: {} };
    }

    return properties;
  }

  /**
   * 개별 속성 변환
   */
  private convertProperty(prop: Property): any {
    switch (prop.type) {
      case 'title':
        return { title: {} };

      case 'rich_text':
        return { rich_text: {} };

      case 'number':
        return { 
          number: { 
            format: (prop as any).number?.format || 'number' 
          } 
        };

      case 'select':
        return {
          select: {
            options: (prop as any).select?.options || []
          }
        };

      case 'multi_select':
        return {
          multi_select: {
            options: (prop as any).multi_select?.options || []
          }
        };

      case 'date':
        return { date: {} };

      case 'checkbox':
        return { checkbox: {} };

      case 'url':
        return { url: {} };

      case 'email':
        return { email: {} };

      case 'phone_number':
        return { phone_number: {} };

      case 'relation':
        // Relation properties need target database ID
        const relationConfig = (prop as any).relation;
        if (relationConfig && relationConfig.database_id) {
          return {
            relation: {
              database_id: relationConfig.database_id,
              type: relationConfig.type || 'single_property',
              single_property: relationConfig.single_property || {}
            }
          };
        }
        // Skip relations without target database
        return null;

      default:
        logger.warning(`Unsupported property type: ${prop.type}, converting to rich_text`);
        return { rich_text: {} };
    }
  }

  /**
   * 생성된 데이터베이스 검증
   */
  private async verifyCreatedDatabase(
    databaseId: string,
    expectedSchema: DatabaseSchema
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Notion에서 생성된 데이터베이스 조회
      const retrieveResult = await this.notionApi.retrieveDatabase(databaseId);

      if (!retrieveResult.success) {
        return {
          success: false,
          message: `Failed to retrieve created database: ${retrieveResult.message}`
        };
      }

      const createdDatabase = retrieveResult.data;

      // 기본 검증
      const verifications = {
        titleMatch: this.verifyTitle(createdDatabase, expectedSchema),
        propertiesExist: this.verifyProperties(createdDatabase, expectedSchema),
        propertyTypes: this.verifyPropertyTypes(createdDatabase, expectedSchema)
      };

      const allValid = Object.values(verifications).every(v => v.success);

      return {
        success: allValid,
        message: allValid 
          ? 'Database verification passed' 
          : 'Database verification failed',
        details: verifications
      };

    } catch (error) {
      return {
        success: false,
        message: `Database verification error: ${error}`,
        details: { error: String(error) }
      };
    }
  }

  /**
   * 제목 검증
   */
  private verifyTitle(database: any, schema: DatabaseSchema): { success: boolean; message: string } {
    const actualTitle = database.title?.[0]?.text?.content;
    const expectedTitle = schema.title;

    if (actualTitle === expectedTitle) {
      return { success: true, message: 'Title matches' };
    }

    return {
      success: false,
      message: `Title mismatch: expected "${expectedTitle}", got "${actualTitle}"`
    };
  }

  /**
   * 속성 존재 검증
   */
  private verifyProperties(database: any, schema: DatabaseSchema): { success: boolean; message: string } {
    const actualProperties = database.properties || {};
    const expectedProperties = this.extractPropertiesFromSchema(schema);

    const missingProperties = [];
    for (const propName of Object.keys(expectedProperties)) {
      if (!actualProperties[propName]) {
        missingProperties.push(propName);
      }
    }

    if (missingProperties.length === 0) {
      return { success: true, message: 'All properties exist' };
    }

    return {
      success: false,
      message: `Missing properties: ${missingProperties.join(', ')}`
    };
  }

  /**
   * 속성 타입 검증
   */
  private verifyPropertyTypes(database: any, schema: DatabaseSchema): { success: boolean; message: string } {
    const actualProperties = database.properties || {};
    const expectedProperties = this.extractPropertiesFromSchema(schema);

    const typeMismatches = [];
    for (const [propName, expectedProp] of Object.entries(expectedProperties)) {
      const actualProp = actualProperties[propName];
      if (actualProp && actualProp.type !== expectedProp.type) {
        typeMismatches.push({
          property: propName,
          expected: expectedProp.type,
          actual: actualProp.type
        });
      }
    }

    if (typeMismatches.length === 0) {
      return { success: true, message: 'All property types match' };
    }

    return {
      success: false,
      message: `Type mismatches: ${typeMismatches.map(m => 
        `${m.property}(${m.expected}→${m.actual})`
      ).join(', ')}`
    };
  }

  /**
   * 스키마에서 properties 추출 (중첩 구조 지원)
   */
  private extractPropertiesFromSchema(schema: DatabaseSchema): Record<string, Property> {
    // Try direct properties first
    if ((schema as any).properties) {
      return (schema as any).properties;
    }

    // Try nested properties in initial_data_source
    if ((schema as any).initial_data_source?.properties) {
      return (schema as any).initial_data_source.properties;
    }

    return {};
  }

  /**
   * 지연 함수 (Rate limiting용)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}