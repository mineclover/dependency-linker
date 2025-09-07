/**
 * Database Schema Manager - Infrastructure Layer
 * JSON 스키마 파일 기반 Notion 데이터베이스 스키마 관리
 */

import { readFile, access, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../../shared/utils/index.js';
import type { DatabaseSchemas, DatabaseSchema, Property } from '../../shared/utils/schemaManager.js';
import type { PropertyMapping, DatabasePropertyMappings } from '../../shared/types/index.js';

export interface NotionProperty {
  [key: string]: any;
}

export interface NotionDatabaseSchema {
  title: Array<{ text: { content: string } }>;
  properties: Record<string, NotionProperty>;
}

export class DatabaseSchemaManager {
  private projectPath: string;
  private schemaCache: Map<string, DatabaseSchemas> = new Map();

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
  }

  /**
   * Load database schemas from JSON file
   */
  async loadSchemas(): Promise<DatabaseSchemas> {
    const cacheKey = this.projectPath;
    
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const schemas = await this.loadSchemasFromFile();
    this.schemaCache.set(cacheKey, schemas);
    
    return schemas;
  }

  /**
   * Get schema for a specific database
   */
  async getDatabaseSchema(databaseType: string): Promise<NotionDatabaseSchema> {
    const schemas = await this.loadSchemas();
    const dbSchema = schemas.databases[databaseType];
    
    if (!dbSchema) {
      logger.warning(`Schema not found for database type: ${databaseType}, using default`);
      return this.getDefaultDatabaseSchema(databaseType);
    }

    // Extract properties from either direct or nested structure
    const properties = this.extractProperties(dbSchema);

    return {
      title: [{ text: { content: dbSchema.title } }],
      properties: this.convertToNotionProperties(properties)
    };
  }

  /**
   * Extract properties from schema, supporting both flat and nested formats
   */
  private extractProperties(schema: any): Record<string, Property> {
    // Try direct properties first
    if (schema.properties && typeof schema.properties === 'object') {
      return schema.properties;
    }

    // Try nested properties in initial_data_source
    if (schema.initial_data_source && schema.initial_data_source.properties) {
      return schema.initial_data_source.properties;
    }

    // Fallback to empty object
    logger.warning('No properties found in schema, using empty object');
    return {};
  }

  /**
   * Convert schema properties to Notion API format
   */
  private convertToNotionProperties(properties: Record<string, Property>): Record<string, NotionProperty> {
    const notionProperties: Record<string, NotionProperty> = {};

    for (const [propName, prop] of Object.entries(properties)) {
      notionProperties[propName] = this.convertProperty(prop);
    }

    return notionProperties;
  }

  /**
   * Convert single property to Notion format
   */
  private convertProperty(prop: Property): NotionProperty {
    switch (prop.type) {
      case 'title':
        return { title: {} };
      
      case 'rich_text':
        return { rich_text: {} };
      
      case 'number':
        return { 
          number: { 
            format: (prop as any).format || 'number' 
          } 
        };
      
      case 'date':
        return { date: {} };
      
      case 'select':
        return {
          select: {
            options: (prop as any).options || []
          }
        };
      
      case 'multi_select':
        return {
          multi_select: {
            options: (prop as any).options || []
          }
        };
      
      case 'checkbox':
        return { checkbox: {} };
      
      case 'url':
        return { url: {} };
      
      case 'email':
        return { email: {} };
      
      case 'phone_number':
        return { phone_number: {} };
      
      case 'files':
        return { files: {} };
      
      case 'relation':
        const relationProp = prop as any;
        return {
          relation: {
            database_id: relationProp.target || '',
            type: 'single_property',
            single_property: {}
          }
        };
      
      case 'rollup':
        const rollupProp = prop as any;
        return {
          rollup: {
            relation_property_name: rollupProp.relation_property || '',
            rollup_property_name: rollupProp.rollup_property || '',
            function: rollupProp.function || 'count'
          }
        };
      
      case 'formula':
        return {
          formula: {
            expression: (prop as any).expression || ''
          }
        };
      
      default:
        logger.warning(`Unknown property type: ${prop.type}, defaulting to rich_text`);
        return { rich_text: {} };
    }
  }

  /**
   * Load schemas from JSON file with fallback locations
   */
  private async loadSchemasFromFile(): Promise<DatabaseSchemas> {
    const possiblePaths = [
      path.join(this.projectPath, 'schemas', 'database-schemas.json'),
      path.join(this.projectPath, 'src', 'infrastructure', 'database', 'schemas', 'database-schemas.json'), 
      path.join(this.projectPath, 'data', 'schema-setup-export.json'),
      path.join(process.cwd(), 'data', 'schema-setup-export.json')
    ];

    for (const schemaPath of possiblePaths) {
      try {
        await access(schemaPath);
        const content = await readFile(schemaPath, 'utf-8');
        const schemas = JSON.parse(content);
        
        logger.info(`Schema loaded from: ${schemaPath}`, '📋');
        return this.validateAndNormalizeSchemas(schemas);
      } catch (error) {
        // Try next path
        continue;
      }
    }

    logger.warning('No schema file found, using default schemas');
    return this.getDefaultSchemas();
  }

  /**
   * Validate and normalize loaded schemas
   */
  private validateAndNormalizeSchemas(rawSchemas: any): DatabaseSchemas {
    if (!rawSchemas || typeof rawSchemas !== 'object') {
      throw new Error('Invalid schema format');
    }

    // Handle different schema formats
    let databases: Record<string, DatabaseSchema>;
    
    if (rawSchemas.databases) {
      databases = rawSchemas.databases;
    } else {
      // Assume the root object contains database definitions
      databases = rawSchemas;
    }

    // Validate each database schema
    for (const [dbName, dbSchema] of Object.entries(databases)) {
      if (!this.isValidDatabaseSchema(dbSchema)) {
        logger.warning(`Invalid schema for database: ${dbName}`);
        databases[dbName] = this.getDefaultDatabaseSchemaForType(dbName);
      }
    }

    return {
      databases,
      property_types: rawSchemas.property_types || {}
    };
  }

  /**
   * Validate database schema structure
   * Supports both flat and nested (initial_data_source) formats
   */
  private isValidDatabaseSchema(schema: any): schema is DatabaseSchema {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // Check required title field
    if (typeof schema.title !== 'string') {
      return false;
    }

    // Check for properties in multiple possible locations
    const hasDirectProperties = schema.properties && typeof schema.properties === 'object';
    const hasNestedProperties = schema.initial_data_source && 
                               schema.initial_data_source.properties && 
                               typeof schema.initial_data_source.properties === 'object';

    return hasDirectProperties || hasNestedProperties;
  }

  /**
   * Get default schemas when no file is found
   */
  private getDefaultSchemas(): DatabaseSchemas {
    return {
      databases: {
        files: {
          title: '📁 Project Files',
          description: 'Track project source files and their metadata',
          properties: {
            'File Path': { type: 'title', required: true },
            'Extension': {
              type: 'select',
              required: false,
              options: [
                { name: '.ts', color: 'blue' },
                { name: '.js', color: 'yellow' },
                { name: '.tsx', color: 'purple' },
                { name: '.jsx', color: 'orange' },
                { name: '.json', color: 'green' },
                { name: '.md', color: 'gray' }
              ]
            },
            'Size (bytes)': { type: 'number', required: false },
            'Last Modified': { type: 'date', required: false },
            'Status': {
              type: 'select',
              required: false,
              options: [
                { name: 'Synced', color: 'green' },
                { name: 'Modified', color: 'yellow' },
                { name: 'New', color: 'blue' },
                { name: 'Error', color: 'red' }
              ]
            },
            'Content': { type: 'rich_text', required: false }
          }
        },
        docs: {
          title: '📖 Project Documents',
          description: 'Manage project documentation and guides',
          properties: {
            'Document Title': { type: 'title', required: true },
            'File Path': { type: 'rich_text', required: false },
            'Document Type': {
              type: 'select',
              required: false,
              options: [
                { name: 'README', color: 'blue' },
                { name: 'API Documentation', color: 'green' },
                { name: 'User Guide', color: 'yellow' },
                { name: 'Technical Spec', color: 'purple' },
                { name: 'Other', color: 'gray' }
              ]
            },
            'Status': {
              type: 'select',
              required: false,
              options: [
                { name: 'Published', color: 'green' },
                { name: 'Draft', color: 'yellow' },
                { name: 'Review', color: 'orange' },
                { name: 'Archived', color: 'red' }
              ]
            },
            'Last Updated': { type: 'date', required: false },
            'Word Count': { type: 'number', required: false },
            'Related Files': { type: 'rich_text', required: false }
          }
        }
      },
      property_types: {}
    };
  }

  /**
   * Get default schema for a specific database type
   */
  private getDefaultDatabaseSchema(databaseType: string): NotionDatabaseSchema {
    const defaultSchemas = this.getDefaultSchemas();
    const schema = defaultSchemas.databases[databaseType] || defaultSchemas.databases.files;
    
    return {
      title: [{ text: { content: schema.title } }],
      properties: this.convertToNotionProperties(schema.properties)
    };
  }

  /**
   * Get default database schema configuration for a type
   */
  private getDefaultDatabaseSchemaForType(dbType: string): DatabaseSchema {
    const defaultSchemas = this.getDefaultSchemas();
    return defaultSchemas.databases[dbType] || defaultSchemas.databases.files;
  }

  /**
   * Get list of available database types
   */
  async getAvailableDatabaseTypes(): Promise<string[]> {
    const schemas = await this.loadSchemas();
    return Object.keys(schemas.databases);
  }

  /**
   * Get schema information for display
   */
  async getSchemaInfo(): Promise<{
    totalDatabases: number;
    databaseTypes: string[];
    schemaSource: 'file' | 'default';
  }> {
    const schemas = await this.loadSchemas();
    
    return {
      totalDatabases: Object.keys(schemas.databases).length,
      databaseTypes: Object.keys(schemas.databases),
      schemaSource: this.schemaCache.size > 0 ? 'file' : 'default'
    };
  }

  /**
   * Export current schemas to file
   */
  async exportSchemas(outputPath: string): Promise<void> {
    const schemas = await this.loadSchemas();
    const schemaJson = JSON.stringify(schemas, null, 2);
    
    await writeFile(outputPath, schemaJson, 'utf-8');
    logger.info(`Schemas exported to: ${outputPath}`, '💾');
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get property mapping for schema-created databases
   */
  getPropertyMapping(databaseId: string, propertyName: string): PropertyMapping | null {
    try {
      // TODO: Implement actual property ID tracking system
      // For now, return mock mapping based on configuration
      const mapping = this.getMockPropertyMapping(databaseId, propertyName);
      if (mapping) {
        logger.info(`Property mapping found for ${propertyName} in database ${databaseId}`);
        return mapping;
      }
      
      logger.warning(`Property mapping not found for ${propertyName} in database ${databaseId}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get property mapping: ${error}`);
      return null;
    }
  }

  /**
   * Export schema configuration with property mappings
   */
  exportMappingsToConfig(): DatabasePropertyMappings[] {
    try {
      // TODO: Implement actual property mappings export
      // For now, return mock data structure
      const mockMappings: DatabasePropertyMappings[] = [
        {
          databaseId: 'mock-files-db',
          databaseName: 'Project Files',
          properties: {
            'File Path': {
              localName: 'filePath',
              notionPropertyId: 'mock-property-id-1',
              notionPropertyName: 'File Path',
              notionPropertyType: 'title',
              sqliteKey: 'file_path',
              required: true,
              lastValidated: new Date()
            }
          },
          lastSynced: new Date(),
          schemaVersion: '1.0.0'
        }
      ];
      
      logger.info('Schema mappings exported successfully');
      return mockMappings;
    } catch (error) {
      logger.error(`Failed to export mappings: ${error}`);
      return [];
    }
  }

  /**
   * Mock property mapping for compatibility
   * TODO: Replace with actual implementation
   */
  private getMockPropertyMapping(databaseId: string, propertyName: string): PropertyMapping | null {
    // Mock mappings based on common property names
    const commonMappings: Record<string, Partial<PropertyMapping>> = {
      'File Path': {
        localName: 'filePath',
        notionPropertyType: 'title',
        sqliteKey: 'file_path',
        required: true
      },
      'Extension': {
        localName: 'extension',
        notionPropertyType: 'select',
        sqliteKey: 'extension',
        required: false
      },
      'Status': {
        localName: 'status',
        notionPropertyType: 'select',
        sqliteKey: 'status',
        required: false
      }
    };

    const baseMapping = commonMappings[propertyName];
    if (baseMapping) {
      return {
        localName: baseMapping.localName || propertyName,
        notionPropertyId: `mock-${databaseId}-${propertyName}`,
        notionPropertyName: propertyName,
        notionPropertyType: baseMapping.notionPropertyType || 'rich_text',
        sqliteKey: baseMapping.sqliteKey,
        required: baseMapping.required || false,
        lastValidated: new Date()
      };
    }

    return null;
  }
}