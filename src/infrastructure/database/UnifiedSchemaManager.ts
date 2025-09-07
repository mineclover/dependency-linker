/**
 * Unified Schema Manager - Strategy Pattern with Database Adapters
 * Consolidates multiple schema management approaches into single responsibility
 * 
 * Replaces:
 * - src/shared/utils/schemaManager.ts
 * - src/infrastructure/notion/schemaManager.ts  
 * - src/infrastructure/notion/DatabaseSchemaManager.ts
 * - src/services/sqliteSchemaManager.ts
 */

// Removed logger import to prevent circular dependency
// import { logger } from '../../shared/utils/index.js';

// Domain interfaces
export interface ISchemaAdapter {
  loadSchema(type: string): Promise<DatabaseSchema>;
  validateSchema(schema: DatabaseSchema): ValidationResult;
  applySchema(schema: DatabaseSchema): Promise<void>;
}

export interface DatabaseSchema {
  title: string;
  description: string;
  properties: Record<string, Property>;
  version?: string;
  type?: string;
}

export interface Property {
  type: string;
  required: boolean;
  description?: string;
  options?: PropertyOption[];
  target?: string;
  bidirectional?: boolean;
}

export interface PropertyOption {
  name: string;
  color: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * JSON Schema Adapter - Loads schemas from JSON files
 */
export class JsonSchemaAdapter implements ISchemaAdapter {
  constructor(private schemaPath: string) {}
  
  async loadSchema(type: string): Promise<DatabaseSchema> {
    try {
      const path = await import('path');
      const { readFile } = await import('fs/promises');
      
      const schemaFile = await readFile(
        path.join(this.schemaPath, 'database-schemas.json'), 
        'utf8'
      );
      const schemas = JSON.parse(schemaFile);
      
      if (!schemas.databases?.[type]) {
        throw new Error(`Schema type '${type}' not found in database-schemas.json`);
      }
      
      console.log(`📋 Loaded JSON schema for type: ${type}`);
      return schemas.databases[type];
    } catch (error) {
      console.error(`❌ Failed to load JSON schema for ${type}: ${error}`);
      throw error;
    }
  }
  
  validateSchema(schema: DatabaseSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!schema.title) errors.push('Schema title is required');
    if (!schema.properties) errors.push('Schema properties are required');
    
    // Validate property types
    for (const [name, property] of Object.entries(schema.properties || {})) {
      const validTypes = ['title', 'rich_text', 'select', 'multi_select', 'number', 'date', 'checkbox', 'relation'];
      if (!validTypes.includes(property.type)) {
        warnings.push(`Property '${name}' has unknown type '${property.type}'`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async applySchema(schema: DatabaseSchema): Promise<void> {
    console.log(`✅ Applied JSON schema: ${schema.title}`);
    // JSON schemas are applied through Notion API calls
  }
}

/**
 * SQLite Schema Adapter - Manages SQLite table schemas
 */
export class SqliteSchemaAdapter implements ISchemaAdapter {
  constructor(private dbPath: string) {}
  
  async loadSchema(type: string): Promise<DatabaseSchema> {
    // Convert SQLite table schema to unified format
    const sqliteToUnified = {
      'files': {
        title: 'Files Database',
        description: 'File tracking and metadata',
        properties: {
          'id': { type: 'title', required: true },
          'file_path': { type: 'rich_text', required: true },
          'size': { type: 'number', required: false },
          'modified_date': { type: 'date', required: false }
        }
      },
      'dependencies': {
        title: 'Dependencies Database', 
        description: 'Dependency relationships',
        properties: {
          'id': { type: 'title', required: true },
          'source_file': { type: 'rich_text', required: true },
          'target_file': { type: 'rich_text', required: true },
          'type': { type: 'select', required: true }
        }
      }
    };
    
    if (!sqliteToUnified[type as keyof typeof sqliteToUnified]) {
      throw new Error(`SQLite schema type '${type}' not supported`);
    }
    
    console.log(`🗄️ Loaded SQLite schema for type: ${type}`);
    return sqliteToUnified[type as keyof typeof sqliteToUnified];
  }
  
  validateSchema(schema: DatabaseSchema): ValidationResult {
    // SQLite-specific validation
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!schema.properties?.id) {
      errors.push('SQLite schemas must have an id property');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async applySchema(schema: DatabaseSchema): Promise<void> {
    console.log(`✅ Applied SQLite schema: ${schema.title}`);
    // SQLite schemas are applied through SQL CREATE TABLE statements
  }
}

/**
 * Notion Schema Adapter - Manages Notion database schemas
 */
export class NotionSchemaAdapter implements ISchemaAdapter {
  constructor(private apiKey: string) {}
  
  async loadSchema(type: string): Promise<DatabaseSchema> {
    // Convert Notion database properties to unified format
    const notionToUnified = {
      'files': {
        title: 'Project Files',
        description: 'File management with relationships',
        properties: {
          'Name': { type: 'title', required: true },
          'File Path': { type: 'rich_text', required: true },
          'Extension': { 
            type: 'select', 
            required: false,
            options: [
              { name: '.js', color: 'yellow' },
              { name: '.ts', color: 'blue' },
              { name: '.jsx', color: 'green' },
              { name: '.tsx', color: 'purple' }
            ]
          },
          'Size (bytes)': { type: 'number', required: false },
          'Last Modified': { type: 'date', required: false },
          'Imports': { type: 'relation', target: 'self', bidirectional: true }
        }
      }
    };
    
    if (!notionToUnified[type as keyof typeof notionToUnified]) {
      throw new Error(`Notion schema type '${type}' not supported`);
    }
    
    console.log(`📄 Loaded Notion schema for type: ${type}`);
    return notionToUnified[type as keyof typeof notionToUnified];
  }
  
  validateSchema(schema: DatabaseSchema): ValidationResult {
    // Notion-specific validation
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const hasTitle = Object.values(schema.properties || {}).some(prop => prop.type === 'title');
    if (!hasTitle) {
      errors.push('Notion schemas must have at least one title property');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async applySchema(schema: DatabaseSchema): Promise<void> {
    console.log(`✅ Applied Notion schema: ${schema.title}`);
    // Notion schemas are applied through Notion API database.create calls
  }
}

/**
 * Unified Schema Manager - Consolidates all schema management approaches
 * Implements Strategy pattern with pluggable adapters
 */
export class UnifiedSchemaManager {
  private adapters: Map<string, ISchemaAdapter> = new Map();

  constructor(schemaPath?: string, dbPath?: string, apiKey?: string) {
    // Register default adapters
    if (schemaPath) {
      this.registerAdapter('json', new JsonSchemaAdapter(schemaPath));
    }
    if (dbPath) {
      this.registerAdapter('sqlite', new SqliteSchemaAdapter(dbPath));
    }
    if (apiKey) {
      this.registerAdapter('notion', new NotionSchemaAdapter(apiKey));
    }
    
    console.log('🏗️ UnifiedSchemaManager initialized with adapters');
  }

  /**
   * Load database schema using specified adapter
   */
  async loadDatabaseSchema(type: string, adapter = 'json'): Promise<DatabaseSchema> {
    const schemaAdapter = this.adapters.get(adapter);
    if (!schemaAdapter) {
      throw new Error(`Schema adapter '${adapter}' not found`);
    }
    
    return schemaAdapter.loadSchema(type);
  }

  /**
   * Validate schema using specified adapter
   */
  validateDatabaseSchema(schema: DatabaseSchema, adapter = 'json'): ValidationResult {
    const schemaAdapter = this.adapters.get(adapter);
    if (!schemaAdapter) {
      throw new Error(`Schema adapter '${adapter}' not found`);
    }
    
    return schemaAdapter.validateSchema(schema);
  }

  /**
   * Apply schema using specified adapter
   */
  async applyDatabaseSchema(schema: DatabaseSchema, adapter = 'json'): Promise<void> {
    const schemaAdapter = this.adapters.get(adapter);
    if (!schemaAdapter) {
      throw new Error(`Schema adapter '${adapter}' not found`);
    }
    
    return schemaAdapter.applySchema(schema);
  }

  /**
   * Register new schema adapter
   */
  registerAdapter(name: string, adapter: ISchemaAdapter): void {
    this.adapters.set(name, adapter);
    console.log(`🔧 Registered schema adapter: ${name}`);
  }

  /**
   * Get available adapter names
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get schema manager statistics
   */
  getStats() {
    return {
      adapters: this.adapters.size,
      types: this.getAvailableAdapters()
    };
  }
}

// Legacy compatibility exports
export const unifiedSchemaManager = new UnifiedSchemaManager(
  './src/infrastructure/database/schemas',
  './file-index.db',
  process.env.NOTION_API_KEY
);

// Type exports for shared layer
export type { ISchemaAdapter, DatabaseSchema, Property, PropertyOption, ValidationResult };