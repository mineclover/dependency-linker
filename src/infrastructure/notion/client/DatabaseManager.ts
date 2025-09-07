import { Client } from '@notionhq/client';
import { EnhancedNotionApiQueue, DatabaseSchemaManager, type DatabaseSchemas } from '../../../shared/utils/index.js';
import { NotionApiClient } from './ApiClient.js';

/**
 * Notion database management with schema system integration
 * Handles database creation, updates, property management, and relationships
 */
export class NotionDatabaseManager {
  private apiClient: NotionApiClient;
  private schemaManager?: DatabaseSchemaManager;
  private useSchemaSystem: boolean = true;

  constructor(apiClient: NotionApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Initialize schema system with JSON specifications
   */
  async initializeSchemaSystem(schemaPath: string = './src/infrastructure/database/schemas/database-schemas.json'): Promise<void> {
    try {
      const parentPageId = this.apiClient.getParentPageId();
      if (!parentPageId) {
        throw new Error('Parent page ID not configured. Call setParentPageId() first.');
      }

      const schemas = await DatabaseSchemaManager.loadSchemas(schemaPath);
      this.schemaManager = new DatabaseSchemaManager(
        this.apiClient.getApiQueue(),
        this.apiClient.getClient(),
        parentPageId,
        schemas
      );
      
      console.log('✅ Schema system initialized');
    } catch (error) {
      console.warn('⚠️ Schema system initialization failed:', error);
      this.useSchemaSystem = false;
    }
  }

  /**
   * Create databases using schema system
   */
  async createDatabasesFromSchema(): Promise<Record<string, string>> {
    if (!this.schemaManager) {
      throw new Error('Schema system not initialized. Call initializeSchemaSystem() first.');
    }

    console.log('🏗️ Creating databases from schema specifications...');
    
    const validation = this.schemaManager.validateSchemas();
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
    }

    const databaseIds = await this.schemaManager.createAllDatabases();
    
    console.log(`✅ Created ${Object.keys(databaseIds).length} databases from schema`);
    return databaseIds;
  }

  /**
   * Get property mapping for schema-created databases
   */
  getPropertyMapping(databaseId: string, propertyName: string) {
    if (!this.schemaManager) {
      console.warn('Schema system not available, property mapping unavailable');
      return null;
    }
    return this.schemaManager.getPropertyMapping(databaseId, propertyName);
  }

  /**
   * Export schema configuration
   */
  exportSchemaConfiguration() {
    if (!this.schemaManager) {
      console.warn('Schema system not available');
      return null;
    }
    return this.schemaManager.exportMappingsToConfig();
  }

  /**
   * Create a database with fallback to legacy method
   */
  async createDatabase(title: string = 'Project Files', type: 'files' | 'docs' = 'files'): Promise<string> {
    console.log(`🗄️ Creating Notion database: ${title}`);

    const parentPageId = this.apiClient.getParentPageId();
    if (!parentPageId) {
      throw new Error('Parent page ID not configured. Call setParentPageId() first.');
    }

    // Try to use schema system first
    if (this.useSchemaSystem && this.schemaManager) {
      try {
        console.log('🏗️ Using schema system for database creation...');
        const databaseIds = await this.schemaManager.createAllDatabases();
        
        if (type === 'files' && databaseIds.files) {
          console.log(`✅ Files database created via schema system: ${databaseIds.files}`);
          return databaseIds.files;
        } else if (type === 'docs' && databaseIds.docs) {
          console.log(`✅ Docs database created via schema system: ${databaseIds.docs}`);
          return databaseIds.docs;
        }
      } catch (schemaError) {
        console.warn('⚠️ Schema system failed, falling back to legacy method:', schemaError);
        this.useSchemaSystem = false;
      }
    }

    // Fallback to legacy database creation
    console.log('🔄 Using legacy database creation method...');
    return this.createDatabaseLegacy(title, type);
  }

  /**
   * Legacy database creation method (preserved for fallback)
   */
  private async createDatabaseLegacy(title: string, type: 'files' | 'docs'): Promise<string> {
    try {
      const baseProperties = {
        'Name': {
          title: {},
        },
      };

      const filesProperties = {
        ...baseProperties,
        'File Path': {
          rich_text: {},
        },
        'Extension': {
          select: {
            options: [
              { name: '.js', color: 'yellow' },
              { name: '.ts', color: 'blue' },
              { name: '.jsx', color: 'green' },
              { name: '.tsx', color: 'purple' },
              { name: '.json', color: 'gray' },
              { name: '.md', color: 'orange' },
              { name: 'Other', color: 'default' },
            ],
          },
        },
        'Size (bytes)': {
          number: {},
        },
        'Last Modified': {
          date: {},
        },
        'Status': {
          select: {
            options: [
              { name: 'Uploaded', color: 'green' },
              { name: 'Updated', color: 'blue' },
              { name: 'Error', color: 'red' },
            ],
          },
        },
        'Project': {
          select: {
            options: [
              { name: 'dependency-linker', color: 'blue' },
            ],
          },
        },
      };

      const docsProperties = {
        ...baseProperties,
        'Document Type': {
          select: {
            options: [
              { name: 'README', color: 'blue' },
              { name: 'API Documentation', color: 'green' },
              { name: 'User Guide', color: 'purple' },
              { name: 'Technical Spec', color: 'orange' },
              { name: 'Tutorial', color: 'yellow' },
              { name: 'Other', color: 'default' },
            ],
          },
        },
        'Last Updated': {
          date: {},
        },
        'Status': {
          select: {
            options: [
              { name: 'Draft', color: 'yellow' },
              { name: 'Review', color: 'orange' },
              { name: 'Published', color: 'green' },
              { name: 'Archived', color: 'gray' },
            ],
          },
        },
        'Priority': {
          select: {
            options: [
              { name: 'High', color: 'red' },
              { name: 'Medium', color: 'yellow' },
              { name: 'Low', color: 'green' },
            ],
          },
        },
        'Tags': {
          multi_select: {
            options: [
              { name: 'Setup', color: 'blue' },
              { name: 'Configuration', color: 'purple' },
              { name: 'Development', color: 'green' },
              { name: 'Deployment', color: 'orange' },
              { name: 'Troubleshooting', color: 'red' },
            ],
          },
        },
      };

      const properties = type === 'docs' ? docsProperties : filesProperties;

      const response = await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().databases.create({
          parent: {
            type: 'page_id',
            page_id: this.apiClient.getParentPageId()!,
          },
          title: [
            {
              type: 'text',
              text: {
                content: title,
              },
            },
          ],
          properties,
        })
      );

      console.log(`✅ Database created with ID: ${response.id}`);

      if (type === 'files') {
        // Add Dependencies relation for files database (self-reference)
        await this.apiClient.getApiQueue().add(() => 
          this.apiClient.getClient().databases.update({
            database_id: response.id,
            properties: {
              'Imports': {
                relation: {
                  database_id: response.id, // Self-reference for dependencies
                  dual_property: {
                    synced_property_name: 'Imported By'
                  }
                },
              },
            },
          })
        );
        console.log(`✅ Imports relation with bidirectional sync added to files database`);
      }

      return response.id;
    } catch (error) {
      throw new Error(`Failed to create database: ${error}`);
    }
  }

  /**
   * Add relationship between docs and files databases
   */
  async addDocsToFilesRelation(docsDbId: string, filesDbId: string): Promise<void> {
    try {
      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().databases.update({
          database_id: docsDbId,
          properties: {
            'Related Files': {
              relation: {
                database_id: filesDbId,
                dual_property: {
                  synced_property_name: 'Related Docs'
                }
              },
            },
          },
        })
      );
      console.log(`✅ Bidirectional relation added between docs and files databases`);
    } catch (error) {
      throw new Error(`Failed to add relation: ${error}`);
    }
  }

  /**
   * Remove content property from docs database
   */
  async removeContentProperty(docsDbId: string): Promise<void> {
    try {
      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().databases.update({
          database_id: docsDbId,
          properties: {
            'Content': null, // Remove the property
          },
        })
      );
      console.log(`✅ Content property removed from docs database`);
    } catch (error) {
      throw new Error(`Failed to remove content property: ${error}`);
    }
  }

  /**
   * Query existing docs in database
   */
  async queryExistingDocs(docsDbId: string): Promise<Record<string, string>> {
    try {
      const response = await this.apiClient.getApiQueue().add(async () => 
        await this.apiClient.getClient().dataSources.query({
          data_source_id: docsDbId,
          page_size: 100,
        })
      );

      const existingDocs: Record<string, string> = {};
      for (const page of response.results) {
        const pageData = page as any;
        const nameProperty = pageData.properties?.Name?.title?.[0]?.plain_text ||
                           pageData.properties?.Title?.title?.[0]?.plain_text;
        if (nameProperty) {
          existingDocs[nameProperty] = pageData.id;
        }
      }

      console.log(`📊 Found ${Object.keys(existingDocs).length} existing docs`);
      return existingDocs;
    } catch (error) {
      console.error('Error querying existing docs:', error);
      return {};
    }
  }

  /**
   * Query existing files in database
   */
  async queryExistingFiles(databaseId: string): Promise<Record<string, string>> {
    try {
      const response = await this.apiClient.getApiQueue().add(async () => 
        await this.apiClient.getClient().dataSources.query({
          data_source_id: databaseId,
          page_size: 100,
        })
      );

      const existingFiles: Record<string, string> = {};
      for (const page of response.results) {
        const pageData = page as any;
        const nameProperty = pageData.properties?.Name?.title?.[0]?.plain_text ||
                           pageData.properties?.Title?.title?.[0]?.plain_text;
        if (nameProperty) {
          existingFiles[nameProperty] = pageData.id;
        }
      }

      console.log(`📊 Found ${Object.keys(existingFiles).length} existing files`);
      return existingFiles;
    } catch (error) {
      console.error('Error querying existing files:', error);
      return {};
    }
  }

  /**
   * Get database information
   */
  async getDatabase(databaseId: string) {
    try {
      return await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().databases.retrieve({
          database_id: databaseId
        })
      );
    } catch (error) {
      throw new Error(`Failed to get database ${databaseId}: ${error}`);
    }
  }

  /**
   * Update database schema with new properties
   */
  async updateDatabaseSchema(databaseId: string, properties: any) {
    try {
      return await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().databases.update({
          database_id: databaseId,
          properties: properties
        })
      );
    } catch (error) {
      throw new Error(`Failed to update database schema ${databaseId}: ${error}`);
    }
  }

  /**
   * Test connection to Notion
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().users.me()
      );
      return true;
    } catch (error) {
      console.error('Notion connection failed:', error);
      return false;
    }
  }
}