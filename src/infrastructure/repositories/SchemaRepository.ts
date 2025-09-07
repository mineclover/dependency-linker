/**
 * Schema Repository - Infrastructure Layer
 * Handles schema file I/O operations
 */

import { readFileSync, promises as fs } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import type { ISchemaRepository } from '../../domain/services/DataCollectionService.js';

/**
 * Schema Repository
 * Implements file system operations for schema management
 */
export class SchemaRepository implements ISchemaRepository {
  /**
   * Load schema from file system
   */
  async loadSchema(schemaPath: string): Promise<any> {
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file: ${schemaPath}`);
      }
      throw error;
    }
  }

  /**
   * Save schema to file system
   */
  async saveSchema(schemaPath: string, schema: any): Promise<void> {
    try {
      const content = JSON.stringify(schema, null, 2);
      const dir = path.dirname(schemaPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(schemaPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save schema to ${schemaPath}: ${error}`);
    }
  }

  /**
   * Validate schema file access
   */
  async validateSchemaAccess(schemaPath: string): Promise<boolean> {
    try {
      await access(schemaPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synchronous schema loading (for backward compatibility)
   */
  loadSchemaSync(schemaPath: string): any {
    try {
      const content = readFileSync(schemaPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in schema file: ${schemaPath}`);
      }
      throw error;
    }
  }
}