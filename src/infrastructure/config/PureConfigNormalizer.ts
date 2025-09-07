/**
 * Pure Configuration Normalizer - Infrastructure Layer
 * ONLY data transformation, NO business logic
 * 
 * This replaces the mixed-concern ConfigNormalizer with pure infrastructure component
 */

import { logger } from '../../shared/utils/index.js';

export interface NormalizedConfig {
  apiKey: string;
  databases: Record<string, string>;
  parentPageId?: string;
  projectPath: string;
  environment: string;
  environments?: Record<string, any>;
  workspaceInfo?: {
    userId?: string;
    projectName?: string;
    setupDate?: string;
    workspaceUrl?: string;
  };
  git?: {
    enabled?: boolean;
    autoSync?: boolean;
    watchBranches?: string[];
    ignorePatterns?: string[];
  };
  // Metadata for tracking (no business logic)
  _metadata: {
    source: 'env' | 'project' | 'global' | 'mixed';
    lastSynced: Date;
    validatedIds: Record<string, boolean>;
    lastValidated?: Date;
    securityCheck?: 'pending' | 'completed' | 'failed';
  };
}

export interface ConfigSource {
  type: 'env' | 'project' | 'global';
  data: any;
  priority: number;
}

/**
 * Pure Config Normalizer - ONLY data transformation
 * No business logic, no API calls, no validation
 */
export class PureConfigNormalizer {
  /**
   * Normalize configuration from multiple sources
   * Pure data merging and transformation only
   */
  normalize(sources: ConfigSource[]): NormalizedConfig {
    // Handle empty sources - pure data operation
    if (!sources || sources.length === 0) {
      return this.createEmptyConfig();
    }

    // Sort sources by priority (process lower priority first, so higher priority overrides)
    const sortedSources = sources.sort((a, b) => a.priority - b.priority);
    
    // Merge configurations - pure data operation
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

    // Extract database IDs - pure data extraction
    const databases = this.extractDatabases(mergedConfig);

    const normalizedConfig: NormalizedConfig = {
      apiKey: mergedConfig.apiKey || '',
      databases,
      parentPageId: mergedConfig.parentPageId,
      projectPath: mergedConfig.projectPath || process.cwd(),
      environment: mergedConfig.environment || 'development',
      workspaceInfo: mergedConfig.workspaceInfo,
      git: mergedConfig.git,
      _metadata: {
        source: sourceType,
        lastSynced: new Date(),
        validatedIds: {}
      }
    };

    logger.info(`Configuration normalized from ${sources.length} source(s)`, '⚙️');
    return normalizedConfig;
  }

  /**
   * Normalize data from specific source type - pure data transformation
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
      environment: config.project?.environment || config.environment
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

    // Handle workspaceInfo
    if (config.workspaceInfo) {
      normalized.workspaceInfo = { ...config.workspaceInfo };
    }

    // Handle git configuration
    if (config.git) {
      normalized.git = { ...config.git };
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

    // Database IDs - pure extraction from environment
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
   * Extract database configurations - pure data extraction
   */
  private extractDatabases(config: any): Record<string, string> {
    const databases: Record<string, string> = {};

    // Collect from all possible sources - pure data merging
    if (config.databases) {
      Object.assign(databases, config.databases);
    }

    // Extract from legacy formats
    if (config.notion?.databases) {
      Object.assign(databases, config.notion.databases);
    }

    return databases;
  }

  /**
   * Deep merge two objects - pure data operation
   */
  private deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is object - pure utility
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Create empty configuration - pure data factory
   */
  private createEmptyConfig(): NormalizedConfig {
    return {
      apiKey: '',
      databases: {},
      projectPath: process.cwd(),
      environment: 'development',
      _metadata: {
        source: 'env',
        lastSynced: new Date(),
        validatedIds: {}
      }
    };
  }
}