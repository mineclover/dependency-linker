/**
 * Configuration Normalizer
 * Handles mapping between different configuration formats and ensures proper ID synchronization
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import type { WorkspaceConfig } from '../../shared/types/index.js';

export interface NormalizedConfig {
  apiKey: string;
  databases: Record<string, string>;
  parentPageId?: string;
  projectPath: string;
  environment: string;
  environments?: Record<string, any>;
  // Additional metadata
  _metadata: {
    source: 'env' | 'project' | 'global' | 'mixed';
    lastSynced: Date;
    validatedIds: Record<string, boolean>;
  };
}

export interface ConfigSource {
  type: 'env' | 'project' | 'global';
  data: any;
  priority: number;
}

export class ConfigNormalizer {
  private client: Client | null = null;

  /**
   * Normalize configuration from multiple sources with proper database ID mapping
   */
  async normalizeConfig(
    sources: ConfigSource[],
    options: {
      validateIds?: boolean;
      autoDiscover?: boolean;
      updateMissingIds?: boolean;
    } = {}
  ): Promise<NormalizedConfig> {
    const { validateIds = true, autoDiscover = false, updateMissingIds = false } = options;

    // Sort sources by priority (higher = more important)
    const sortedSources = sources.sort((a, b) => b.priority - a.priority);
    
    // Merge configurations
    let mergedConfig: any = {};
    let sourceType: 'env' | 'project' | 'global' | 'mixed' = 'env';
    
    for (const source of sortedSources) {
      const normalized = this.normalizeSourceData(source.data, source.type);
      mergedConfig = this.deepMerge(mergedConfig, normalized);
      
      if (sources.length > 1) {
        sourceType = 'mixed';
      } else {
        sourceType = source.type;
      }
    }

    // Extract and validate database IDs
    const databases = await this.extractAndValidateDatabases(
      mergedConfig, 
      { validateIds, autoDiscover, updateMissingIds }
    );

    const normalizedConfig: NormalizedConfig = {
      apiKey: mergedConfig.apiKey,
      databases,
      parentPageId: mergedConfig.parentPageId,
      projectPath: mergedConfig.projectPath || process.cwd(),
      environment: mergedConfig.environment || 'development',
      _metadata: {
        source: sourceType,
        lastSynced: new Date(),
        validatedIds: {}
      }
    };

    // Validate IDs if requested
    if (validateIds && normalizedConfig.apiKey) {
      await this.validateDatabaseIds(normalizedConfig);
    }

    logger.info(`✅ Configuration normalized from ${sources.length} source(s)`);
    logger.info(`📊 Found ${Object.keys(databases).length} database(s): ${Object.keys(databases).join(', ')}`);

    return normalizedConfig;
  }

  /**
   * Normalize data from specific source type
   */
  private normalizeSourceData(data: any, sourceType: 'env' | 'project' | 'global'): any {
    switch (sourceType) {
      case 'project':
        return this.normalizeProjectConfig(data);
      case 'env':
        return this.normalizeEnvConfig(data);
      case 'global':
        return this.normalizeGlobalConfig(data);
      default:
        return data;
    }
  }

  /**
   * Normalize project configuration (deplink.config.json format)
   */
  private normalizeProjectConfig(config: any): any {
    const normalized: any = {
      projectPath: config.project?.path,
      environment: config.project?.environment
    };

    // Handle nested notion configuration
    if (config.notion) {
      normalized.apiKey = config.notion.apiKey;
      normalized.parentPageId = config.notion.parentPageId;
      
      // Convert notion.databases to flat databases structure
      if (config.notion.databases) {
        normalized.databases = { ...config.notion.databases };
      }
    }

    // Handle flat database structure (legacy)
    if (config.databases) {
      normalized.databases = { ...normalized.databases, ...config.databases };
    }

    return normalized;
  }

  /**
   * Normalize environment configuration
   */
  private normalizeEnvConfig(env: Record<string, string | undefined>): any {
    const normalized: any = {};

    // API Key
    if (env.NOTION_API_KEY || env.DEPLINK_API_KEY) {
      normalized.apiKey = env.NOTION_API_KEY || env.DEPLINK_API_KEY;
    }

    // Parent Page ID
    if (env.NOTION_PARENT_PAGE_ID || env.DEPLINK_PARENT_PAGE_ID) {
      normalized.parentPageId = env.NOTION_PARENT_PAGE_ID || env.DEPLINK_PARENT_PAGE_ID;
    }

    // Database IDs
    const databases: Record<string, string> = {};
    const dbPrefixes = ['NOTION_DATABASE_', 'DEPLINK_DATABASE_'];
    
    for (const [key, value] of Object.entries(env)) {
      if (value) {
        for (const prefix of dbPrefixes) {
          if (key.startsWith(prefix)) {
            const dbName = key.substring(prefix.length).toLowerCase();
            databases[dbName] = value;
          }
        }
      }
    }

    if (Object.keys(databases).length > 0) {
      normalized.databases = databases;
    }

    // Environment
    normalized.environment = env.NODE_ENV || 'development';
    normalized.projectPath = env.PWD || process.cwd();

    return normalized;
  }

  /**
   * Normalize global configuration
   */
  private normalizeGlobalConfig(config: any): any {
    // Similar to project config but with different priorities
    return this.normalizeProjectConfig(config);
  }

  /**
   * Extract and validate database configurations
   */
  private async extractAndValidateDatabases(
    config: any,
    options: {
      validateIds?: boolean;
      autoDiscover?: boolean;
      updateMissingIds?: boolean;
    }
  ): Promise<Record<string, string>> {
    const databases: Record<string, string> = {};

    // Collect from all possible sources
    if (config.databases) {
      Object.assign(databases, config.databases);
    }

    // Auto-discover databases if enabled
    if (options.autoDiscover && config.apiKey) {
      const discovered = await this.autoDiscoverDatabases(config.apiKey, config.parentPageId);
      
      // Add discovered databases that aren't already configured
      for (const [name, id] of Object.entries(discovered)) {
        if (!databases[name]) {
          databases[name] = id;
          logger.info(`🔍 Auto-discovered database: ${name} → ${id}`);
        }
      }
    }

    return databases;
  }

  /**
   * Auto-discover databases from Notion workspace
   */
  private async autoDiscoverDatabases(
    apiKey: string, 
    parentPageId?: string
  ): Promise<Record<string, string>> {
    try {
      if (!this.client) {
        this.client = new Client({ auth: apiKey });
      }

      const databases: Record<string, string> = {};

      if (parentPageId) {
        // Search for databases under parent page
        const response = await this.client.blocks.children.list({
          block_id: parentPageId,
          page_size: 100
        });

        for (const block of response.results) {
          if ('type' in block && block.type === 'child_database') {
            const dbResponse = await this.client.databases.retrieve({
              database_id: block.id
            });
            
            if ('title' in dbResponse && dbResponse.title.length > 0) {
              const title = dbResponse.title[0];
              if ('plain_text' in title) {
                const name = title.plain_text.toLowerCase().replace(/\s+/g, '_');
                databases[name] = block.id;
              }
            }
          }
        }
      } else {
        // Search all accessible databases
        const response = await this.client.search({
          filter: { property: 'object', value: 'database' },
          page_size: 100
        });

        for (const result of response.results) {
          if ('title' in result && result.title.length > 0) {
            const title = result.title[0];
            if ('plain_text' in title) {
              const name = title.plain_text.toLowerCase().replace(/\s+/g, '_');
              databases[name] = result.id;
            }
          }
        }
      }

      logger.info(`🔍 Auto-discovered ${Object.keys(databases).length} databases`);
      return databases;
    } catch (error) {
      logger.warning(`⚠️ Auto-discovery failed: ${error}`);
      return {};
    }
  }

  /**
   * Validate database IDs against Notion API
   */
  private async validateDatabaseIds(config: NormalizedConfig): Promise<void> {
    if (!this.client) {
      this.client = new Client({ auth: config.apiKey });
    }

    const validatedIds: Record<string, boolean> = {};

    for (const [dbName, dbId] of Object.entries(config.databases)) {
      try {
        await this.client.databases.retrieve({ database_id: dbId });
        validatedIds[dbName] = true;
        logger.info(`✅ Validated database: ${dbName} → ${dbId}`);
      } catch (error: any) {
        validatedIds[dbName] = false;
        logger.warning(`❌ Invalid database ID for ${dbName}: ${dbId} - ${error.message}`);
      }
    }

    config._metadata.validatedIds = validatedIds;

    const validCount = Object.values(validatedIds).filter(Boolean).length;
    const totalCount = Object.keys(validatedIds).length;
    
    logger.info(`📊 Database validation: ${validCount}/${totalCount} valid`);
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined && source[key] !== null) {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Generate configuration synchronization report
   */
  async generateSyncReport(config: NormalizedConfig): Promise<{
    summary: {
      totalDatabases: number;
      validDatabases: number;
      invalidDatabases: number;
      missingDatabases: string[];
    };
    recommendations: string[];
    actions: {
      type: 'update_id' | 'remove_db' | 'add_db' | 'validate_schema';
      target: string;
      details: string;
    }[];
  }> {
    const validDatabases = Object.entries(config._metadata.validatedIds)
      .filter(([_, valid]) => valid).length;
    
    const invalidDatabases = Object.entries(config._metadata.validatedIds)
      .filter(([_, valid]) => !valid);

    const missingDatabases = invalidDatabases.map(([name, _]) => name);

    const recommendations: string[] = [];
    const actions: any[] = [];

    if (invalidDatabases.length > 0) {
      recommendations.push(`🔧 ${invalidDatabases.length} database(s) have invalid IDs and need updating`);
      
      for (const [dbName, _] of invalidDatabases) {
        actions.push({
          type: 'update_id',
          target: dbName,
          details: `Database ID for '${dbName}' is invalid and needs to be updated`
        });
      }
    }

    if (Object.keys(config.databases).length === 0) {
      recommendations.push('📊 No databases configured - consider running auto-discovery');
      actions.push({
        type: 'add_db',
        target: 'auto-discovery',
        details: 'Run auto-discovery to find and configure databases'
      });
    }

    const summary = {
      totalDatabases: Object.keys(config.databases).length,
      validDatabases,
      invalidDatabases: invalidDatabases.length,
      missingDatabases
    };

    return { summary, recommendations, actions };
  }
}