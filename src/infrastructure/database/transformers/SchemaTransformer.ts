/**
 * Schema Transformer - User Schema to initial_data_source Converter
 * 유저 친화적 스키마를 Notion initial_data_source 형식으로 변환
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// 유저 스키마 타입 정의
export interface UserSchemaConfig {
  version: string;
  metadata: {
    name: string;
    description: string;
    author?: string;
    lastUpdated?: string;
  };
  databases: Record<string, UserDatabase>;
}

export interface UserDatabase {
  display_name: string;
  description: string;
  icon?: string;
  category?: 'core' | 'relationship' | 'external' | 'code' | 'system';
  properties: Record<string, UserProperty>;
  relationships?: Record<string, UserRelationship>;
}

export interface UserProperty {
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'metrics';
  display_name: string;
  description?: string;
  required?: boolean;
  searchable?: boolean;
  auto_detect?: boolean;
  default?: any;
  options?: Array<{
    value: string;
    label: string;
    color?: string;
    description?: string;
  }>;
  format?: string;
  min?: number;
  max?: number;
  multiline?: boolean;
  include_time?: boolean;
  auto_update?: boolean;
  [key: string]: any; // metrics 속성들을 위한 확장
}

export interface UserRelationship {
  target: string; // 'self' 또는 다른 데이터베이스 이름
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  display_name: string;
  description?: string;
  required?: boolean;
  reference_type?: 'database' | 'self'; // 참조 타입 명시
  bidirectional?: {
    reverse_name: string;
    reverse_description?: string;
    auto_generate?: boolean; // 자동 역관계 생성 여부
    reverse_type?: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many'; // 역관계 타입 오버라이드
  };
}

// Notion initial_data_source 타입 정의
export interface NotionDataSource {
  title: string;
  properties: Record<string, any>;
}

export interface NotionDatabaseSchema {
  title: string;
  description: string;
  initial_data_source: NotionDataSource;
}

/**
 * 스키마 변환기
 */
export class SchemaTransformer {
  private static instance: SchemaTransformer;
  private userSchema: UserSchemaConfig | null = null;
  private ajv: Ajv;
  private jsonSchema: any;
  
  private readonly USER_SCHEMA_PATH = join(
    process.cwd(), 
    'src', 
    'infrastructure', 
    'database', 
    'schemas', 
    'user-schema.json'
  );
  
  private readonly JSON_SCHEMA_PATH = join(
    process.cwd(),
    'src',
    'infrastructure', 
    'database',
    'schemas',
    'user-schema.schema.json'
  );

  private constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false,
      strictSchema: false,
      strictNumbers: false,
      strictTypes: false,
      strictTuples: false,
      strictRequired: false
    });
    addFormats(this.ajv);
    this.loadSchemas();
  }

  static getInstance(): SchemaTransformer {
    if (!SchemaTransformer.instance) {
      SchemaTransformer.instance = new SchemaTransformer();
    }
    return SchemaTransformer.instance;
  }

  /**
   * 스키마 파일들 로딩
   */
  private loadSchemas(): void {
    try {
      // JSON Schema 스펙 로딩
      if (existsSync(this.JSON_SCHEMA_PATH)) {
        const jsonSchemaContent = readFileSync(this.JSON_SCHEMA_PATH, 'utf-8');
        this.jsonSchema = JSON.parse(jsonSchemaContent);
        this.ajv.addSchema(this.jsonSchema, 'user-schema');
      }

      // 유저 스키마 로딩
      if (existsSync(this.USER_SCHEMA_PATH)) {
        const userSchemaContent = readFileSync(this.USER_SCHEMA_PATH, 'utf-8');
        this.userSchema = JSON.parse(userSchemaContent);
        
        // 스키마 검증
        if (this.jsonSchema) {
          this.validateUserSchema();
        }
        
        console.log(`✅ User schema loaded and validated: ${Object.keys(this.userSchema.databases).length} databases`);
      } else {
        throw new Error(`User schema not found at: ${this.USER_SCHEMA_PATH}`);
      }
    } catch (error) {
      console.error('Failed to load schemas:', error);
      throw new Error(`Schema loading failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 유저 스키마 유효성 검증
   */
  private validateUserSchema(): void {
    if (!this.userSchema || !this.jsonSchema) {
      throw new Error('Schemas not loaded');
    }

    const validate = this.ajv.getSchema('user-schema');
    if (!validate) {
      throw new Error('JSON Schema validator not found');
    }

    const valid = validate(this.userSchema);
    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath}: ${err.message} (${JSON.stringify(err.params)})`
      ).join(', ');
      throw new Error(`User schema validation failed: ${errors}`);
    }
  }

  /**
   * 유저 스키마를 Notion 데이터베이스 스키마로 변환
   */
  transformToNotionSchema(databaseName: string, dataSourceIds?: Record<string, string>): NotionDatabaseSchema | null {
    if (!this.userSchema) {
      throw new Error('User schema not loaded');
    }

    const userDb = this.userSchema.databases[databaseName];
    if (!userDb) {
      return null;
    }

    const notionProperties: Record<string, any> = {};

    // Name 속성 자동 추가 (title 타입)
    notionProperties['Name'] = {
      type: 'title',
      title: {}
    };

    // 일반 속성들 변환
    for (const [propName, propConfig] of Object.entries(userDb.properties)) {
      if (propConfig.type === 'metrics') {
        // 메트릭 그룹 처리
        for (const [metricName, metricConfig] of Object.entries(propConfig)) {
          if (metricName !== 'type' && metricName !== 'display_name' && metricName !== 'description') {
            const notionProp = this.transformProperty(metricConfig as UserProperty);
            if (notionProp) {
              notionProperties[(metricConfig as UserProperty).display_name || metricName] = notionProp;
            }
          }
        }
      } else {
        const notionProp = this.transformProperty(propConfig);
        if (notionProp) {
          notionProperties[propConfig.display_name] = notionProp;
        }
      }
    }

    // 관계 속성들 변환
    if (userDb.relationships && dataSourceIds) {
      for (const [relName, relConfig] of Object.entries(userDb.relationships)) {
        const notionRelation = this.transformRelationship(relConfig, databaseName, dataSourceIds);
        if (notionRelation) {
          notionProperties[relConfig.display_name] = notionRelation;
        }
      }
    }

    return {
      title: userDb.display_name,
      description: userDb.description,
      initial_data_source: {
        title: `${userDb.display_name} Data Source`,
        properties: notionProperties
      }
    };
  }

  /**
   * 단일 속성을 Notion 속성으로 변환
   */
  private transformProperty(userProp: UserProperty): any | null {
    switch (userProp.type) {
      case 'text':
        return {
          type: 'rich_text',
          rich_text: {}
        };

      case 'number':
        return {
          type: 'number',
          number: {
            format: userProp.format || 'number'
          }
        };

      case 'select':
        if (!userProp.options || userProp.options.length === 0) {
          console.warn(`Select property missing options: ${userProp.display_name}`);
          return null;
        }
        
        return {
          type: 'select',
          select: {
            options: userProp.options.map(option => ({
              name: option.label,
              color: option.color || 'default'
            }))
          }
        };

      case 'checkbox':
        return {
          type: 'checkbox',
          checkbox: {}
        };

      case 'date':
        return {
          type: 'date',
          date: {}
        };

      default:
        console.warn(`Unsupported property type: ${userProp.type}`);
        return null;
    }
  }

  /**
   * 관계를 Notion 관계 속성으로 변환
   */
  private transformRelationship(
    userRel: UserRelationship, 
    currentDbName: string, 
    dataSourceIds: Record<string, string>
  ): any | null {
    // 관계 타입 결정
    const isAutoGenerated = userRel.bidirectional?.auto_generate !== false;
    const relationType = (userRel.bidirectional && isAutoGenerated) ? 'dual_property' : 'single_property';
    
    // Self-reference 또는 "self" target 처리
    const isSelfReference = userRel.target === 'self' || 
                           userRel.target === currentDbName || 
                           userRel.reference_type === 'self';
                           
    if (isSelfReference) {
      return {
        type: 'relation',
        relation: {
          data_source_id: 'SELF_REFERENCE', // 나중에 실제 ID로 교체
          type: relationType,
          ...(relationType === 'dual_property' && userRel.bidirectional ? {
            dual_property: {
              synced_property_name: userRel.bidirectional.reverse_name,
              synced_property_id: `${currentDbName}_${userRel.display_name.toLowerCase().replace(/\s+/g, '_')}_reverse`
            }
          } : {
            single_property: {}
          })
        }
      };
    }

    // 외부 데이터베이스 관계 처리
    const targetDatabase = userRel.target;
    const targetDataSourceId = dataSourceIds[targetDatabase];
    
    if (!targetDataSourceId) {
      console.warn(`Data source ID not found for target: ${targetDatabase}`);
      return null;
    }

    return {
      type: 'relation',
      relation: {
        data_source_id: targetDataSourceId,
        type: relationType,
        ...(relationType === 'dual_property' && userRel.bidirectional ? {
          dual_property: {
            synced_property_name: userRel.bidirectional.reverse_name,
            synced_property_id: `${targetDatabase}_${userRel.bidirectional.reverse_name.toLowerCase().replace(/\s+/g, '_')}`
          }
        } : {
          single_property: {}
        })
      }
    };
  }

  /**
   * 모든 데이터베이스 타입 가져오기
   */
  getAllDatabaseTypes(): string[] {
    return Object.keys(this.userSchema?.databases || {});
  }

  /**
   * 특정 데이터베이스의 관계 타겟들 가져오기
   */
  getRelationTargets(databaseName: string): string[] {
    const userDb = this.userSchema?.databases[databaseName];
    if (!userDb || !userDb.relationships) {
      return [];
    }

    return Object.values(userDb.relationships)
      .map(rel => rel.target === 'self' ? databaseName : rel.target)
      .filter(target => target !== databaseName || Object.values(userDb.relationships).some(rel => rel.target === 'self'));
  }

  /**
   * 특정 데이터베이스의 자기 참조 관계들 가져오기
   */
  getSelfReferences(databaseName: string): string[] {
    const userDb = this.userSchema?.databases[databaseName];
    if (!userDb || !userDb.relationships) {
      return [];
    }

    return Object.entries(userDb.relationships)
      .filter(([_, rel]) => rel.target === 'self' || rel.reference_type === 'self')
      .map(([relName]) => relName);
  }

  /**
   * 특정 데이터베이스의 양방향 관계들 가져오기
   */
  getBidirectionalRelations(databaseName: string): Array<{
    name: string;
    target: string;
    reverseName: string;
    autoGenerate: boolean;
  }> {
    const userDb = this.userSchema?.databases[databaseName];
    if (!userDb || !userDb.relationships) {
      return [];
    }

    return Object.entries(userDb.relationships)
      .filter(([_, rel]) => rel.bidirectional)
      .map(([relName, rel]) => ({
        name: relName,
        target: rel.target === 'self' ? databaseName : rel.target,
        reverseName: rel.bidirectional!.reverse_name,
        autoGenerate: rel.bidirectional!.auto_generate !== false
      }));
  }

  /**
   * 데이터베이스 종속성 그래프 생성
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    if (!this.userSchema) {
      return graph;
    }

    for (const [dbName, dbConfig] of Object.entries(this.userSchema.databases)) {
      const dependencies = this.getRelationTargets(dbName)
        .filter(target => target !== dbName); // Self-reference 제외
      
      graph.set(dbName, dependencies);
    }
    
    return graph;
  }

  /**
   * 생성 순서 최적화 (위상 정렬)
   */
  getCreationOrder(): string[] {
    const graph = this.getDependencyGraph();
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: string) => {
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }
      if (visited.has(node)) return;

      visiting.add(node);
      const dependencies = graph.get(node) || [];
      
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const dbType of graph.keys()) {
      visit(dbType);
    }

    return result;
  }

  /**
   * 스키마 통계 정보
   */
  getSchemaStats() {
    if (!this.userSchema) {
      return null;
    }

    const databases = this.userSchema.databases;
    const stats = {
      version: this.userSchema.version,
      totalDatabases: Object.keys(databases).length,
      totalProperties: 0,
      totalRelationships: 0,
      categories: {} as Record<string, number>,
      relationshipTypes: {
        one_to_one: 0,
        one_to_many: 0,
        many_to_one: 0,
        many_to_many: 0,
        bidirectional: 0
      }
    };

    for (const [dbName, dbConfig] of Object.entries(databases)) {
      // 속성 개수 계산
      for (const [propName, propConfig] of Object.entries(dbConfig.properties)) {
        if (propConfig.type === 'metrics') {
          // 메트릭 그룹의 하위 속성들 계산
          const metricCount = Object.keys(propConfig).filter(
            key => !['type', 'display_name', 'description'].includes(key)
          ).length;
          stats.totalProperties += metricCount;
        } else {
          stats.totalProperties++;
        }
      }

      // 관계 개수 및 타입 계산
      if (dbConfig.relationships) {
        const relationships = Object.values(dbConfig.relationships);
        stats.totalRelationships += relationships.length;

        relationships.forEach(rel => {
          stats.relationshipTypes[rel.type]++;
          if (rel.bidirectional) {
            stats.relationshipTypes.bidirectional++;
          }
        });
      }

      // 카테고리별 개수
      const category = dbConfig.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }

    return stats;
  }

  /**
   * 유저 친화적 데이터베이스 정보 가져오기
   */
  getUserDatabase(databaseName: string): UserDatabase | null {
    return this.userSchema?.databases[databaseName] || null;
  }
}

// 싱글톤 인스턴스 export
export const schemaTransformer = SchemaTransformer.getInstance();