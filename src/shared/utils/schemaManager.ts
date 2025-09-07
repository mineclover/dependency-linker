/**
 * Database Schema Manager Interface - Clean Architecture Shared Layer
 * Temporary abstraction to resolve import violations
 */

export interface DatabaseSchemas {
  databases: Record<string, DatabaseSchema>;
  property_types: Record<string, any>;
}

export interface DatabaseSchema {
  title: string;
  description: string;
  properties: Record<string, Property>;
  initial_data_source?: {
    title: string;
    properties: Record<string, any>;
  };
}

export interface Property {
  type: string;
  required: boolean;
  description?: string;
}

export interface SelectProperty extends Property {
  type: 'select' | 'multi_select';
  options: PropertyOption[];
}

export interface RelationProperty extends Property {
  type: 'relation';
  target: string;
  bidirectional?: boolean;
  sync_property?: string;
}

export interface PropertyOption {
  name: string;
  color: string;
}

// Legacy compatibility export with bridge to UnifiedSchemaManager
import { UnifiedSchemaManager } from '../../infrastructure/database/UnifiedSchemaManager.js';

/**
 * Legacy DatabaseSchemaManager - Bridge to UnifiedSchemaManager
 * @deprecated Use UnifiedSchemaManager directly
 */
export class DatabaseSchemaManager {
  private static instance: DatabaseSchemaManager;
  private unifiedManager: UnifiedSchemaManager;

  private constructor() {
    this.unifiedManager = new UnifiedSchemaManager(
      './src/infrastructure/database/schemas',
      './file-index.db',
      process.env.NOTION_API_KEY
    );
  }

  static getInstance(): DatabaseSchemaManager {
    if (!DatabaseSchemaManager.instance) {
      DatabaseSchemaManager.instance = new DatabaseSchemaManager();
    }
    return DatabaseSchemaManager.instance;
  }

  // Legacy methods bridged to unified implementation
  async loadDatabaseSchemas(): Promise<any> {
    console.warn('⚠️ Using deprecated loadDatabaseSchemas. Use UnifiedSchemaManager instead.');
    try {
      const filesSchema = await this.unifiedManager.loadDatabaseSchema('files');
      return { databases: { files: filesSchema } };
    } catch (error) {
      console.error('Failed to load schemas via bridge:', error);
      return { databases: {} };
    }
  }

  getDatabaseSchema(type: string): any {
    console.warn('⚠️ Using deprecated getDatabaseSchema. Use UnifiedSchemaManager instead.');
    // Return basic schema structure for compatibility
    return {
      title: `${type} Database`,
      properties: {
        Name: { type: 'title' }
      }
    };
  }
}

// Legacy function export
export async function loadDatabaseSchemas(): Promise<any> {
  console.warn('⚠️ Using deprecated loadDatabaseSchemas function. Use UnifiedSchemaManager instead.');
  const manager = DatabaseSchemaManager.getInstance();
  return manager.loadDatabaseSchemas();
}