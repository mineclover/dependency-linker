/**
 * Database Schema Manager (v2)
 * 유저 친화적 JSON 스키마 기반 데이터베이스 관리
 * 
 * 새로운 아키텍처:
 * 1. 유저 친화적 스키마 → SchemaTransformer → initial_data_source
 * 2. JSON Schema 스펙 기반 검증
 * 3. 단일 스펙 관리 시스템
 */

import { schemaTransformer, type NotionDatabaseSchema } from './transformers/SchemaTransformer.js';

// 레거시 호환성을 위한 타입 정의
export interface SelectOption {
  name: string;
  color: string;
}

export interface PropertyConfig {
  type: string;
  [key: string]: any;
}

export interface RelationConfig {
  type: 'relation';
  target: string;
  relation_type: 'single_property' | 'dual_property';
  synced_property_name?: string;
  synced_property_id?: string;
}

export interface DataSourceSchema {
  title: string;
  properties: Record<string, PropertyConfig>;
  relations: Record<string, RelationConfig>;
}

export interface DatabaseSchema {
  title: string;
  description: string;
  initial_data_source: DataSourceSchema;
}

export interface SchemasConfig {
  version: string;
  databases: Record<string, DatabaseSchema>;
}

/**
 * 스키마 관리자 (v2) - 데이터베이스 스키마의 중앙 집중식 관리
 * 
 * 새로운 핵심 역할:
 * 1. 유저 친화적 스키마를 SchemaTransformer를 통해 변환
 * 2. 레거시 API 호환성 유지
 * 3. 변환된 initial_data_source 제공
 * 4. 고급 메타데이터 및 종속성 분석
 */
class SchemaManager {
  private static instance: SchemaManager;

  private constructor() {
    // SchemaTransformer에 의존하여 초기화
    console.log('✅ SchemaManager v2 initialized with SchemaTransformer');
  }

  static getInstance(): SchemaManager {
    if (!SchemaManager.instance) {
      SchemaManager.instance = new SchemaManager();
    }
    return SchemaManager.instance;
  }

  /**
   * 데이터베이스 스키마 가져오기 (v2 - 변환된 스키마 반환)
   */
  getDatabaseSchema(dbType: string): DatabaseSchema | undefined {
    const notionSchema = schemaTransformer.transformToNotionSchema(dbType);
    if (!notionSchema) {
      return undefined;
    }

    // 레거시 형식으로 변환 (relations 필드 추가)
    return {
      title: notionSchema.title,
      description: notionSchema.description,
      initial_data_source: {
        title: notionSchema.initial_data_source.title,
        properties: notionSchema.initial_data_source.properties,
        relations: {} // 관계는 properties에 포함되어 있음
      }
    };
  }

  /**
   * initial_data_source 형식으로 변환된 속성 가져오기 (v2)
   */
  getInitialDataSourceProperties(dbType: string, dataSourceIds?: Record<string, string>): any {
    const notionSchema = schemaTransformer.transformToNotionSchema(dbType, dataSourceIds);
    if (!notionSchema) {
      return null;
    }

    return notionSchema.initial_data_source.properties;
  }

  /**
   * 데이터베이스 업데이트용 속성 스키마 가져오기 (관계 제외) (v2)
   */
  getUpdateProperties(dbType: string): any {
    const properties = this.getInitialDataSourceProperties(dbType);
    if (!properties) return null;

    // Name 속성과 관계 속성 제외
    const updateProperties: any = {};
    for (const [propName, propConfig] of Object.entries(properties)) {
      if (propName !== 'Name' && propConfig.type !== 'relation') {
        updateProperties[propName] = propConfig;
      }
    }

    return updateProperties;
  }

  /**
   * 모든 데이터베이스 타입 가져오기 (v2)
   */
  getAllDatabaseTypes(): string[] {
    return schemaTransformer.getAllDatabaseTypes();
  }

  /**
   * 특정 데이터베이스의 관계 타겟들 가져오기 (v2)
   */
  getRelationTargets(dbType: string): string[] {
    return schemaTransformer.getRelationTargets(dbType);
  }

  /**
   * 데이터베이스 종속성 그래프 생성 (v2)
   */
  getDependencyGraph(): Map<string, string[]> {
    return schemaTransformer.getDependencyGraph();
  }

  /**
   * 생성 순서 최적화 (v2)
   */
  getCreationOrder(): string[] {
    return schemaTransformer.getCreationOrder();
  }

  /**
   * 스키마 통계 정보 (v2)
   */
  getSchemaStats() {
    return schemaTransformer.getSchemaStats();
  }

  /**
   * 데이터베이스 타이틀 가져오기
   */
  getDatabaseTitle(dbType: string): string {
    const schema = this.getDatabaseSchema(dbType);
    return schema?.title || dbType;
  }

  /**
   * Data Source 타이틀 가져오기
   */
  getDataSourceTitle(dbType: string): string {
    const schema = this.getDatabaseSchema(dbType);
    return schema?.initial_data_source.title || `${dbType} Data Source`;
  }

  /**
   * 관계 대상 데이터베이스들 가져오기
   */
  getRelationTargets(dbType: string): string[] {
    const schema = this.getDatabaseSchema(dbType);
    if (!schema) return [];

    const targets = new Set<string>();
    for (const relationConfig of Object.values(schema.initial_data_source.relations)) {
      if (relationConfig.target !== dbType) {
        targets.add(relationConfig.target);
      }
    }

    return Array.from(targets);
  }

  /**
   * 스키마 다시 로드
   */
  reloadSchemas(): void {
    this.loadSchemas();
  }
}

export const schemaManager = SchemaManager.getInstance();