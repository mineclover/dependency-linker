/**
 * Config Repository - Pure Infrastructure Layer
 * ONLY handles configuration data access, NO business logic
 * 
 * Implementation of IConfigRepository interface for ConfigurationService
 */

import { logger } from '../../shared/utils/index.js';
import type { IConfigRepository } from '../../services/config/ConfigurationService.js';
import type { NormalizedConfig, ConfigSource } from './PureConfigNormalizer.js';
import type { NotionConfig } from '../../shared/types/index.js';
import { Client } from '@notionhq/client';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Config Repository - Pure data access implementation
 */
export class ConfigRepository implements IConfigRepository {
  /**
   * Load configuration sources from project - pure data loading
   */
  async loadSources(projectPath: string): Promise<ConfigSource[]> {
    const sources: ConfigSource[] = [];

    try {
      // Load environment variables (highest priority)
      const envSource = this.loadEnvironmentSource();
      if (envSource) {
        sources.push(envSource);
      }

      // Load project configuration (medium priority)
      const projectSource = await this.loadProjectSource(projectPath);
      if (projectSource) {
        sources.push(projectSource);
      }

      // Load global configuration (lowest priority)
      const globalSource = await this.loadGlobalSource();
      if (globalSource) {
        sources.push(globalSource);
      }

      logger.debug(`Loaded ${sources.length} configuration sources`);
      return sources;
    } catch (error) {
      logger.warning(`Configuration source loading failed: ${error}`);
      return [];
    }
  }

  /**
   * Save merged configuration - pure data persistence with security filtering
   */
  async saveMergedConfig(config: NormalizedConfig, projectPath: string): Promise<void> {
    try {
      const configPath = path.join(projectPath, '.deplink-config.json');
      
      // Security: Never save sensitive data to config files
      const configData = {
        project: {
          path: config.projectPath,
          environment: config.environment
        },
        notion: {
          // apiKey: INTENTIONALLY OMITTED for security - should only be in .env
          // parentPageId: INTENTIONALLY OMITTED for security - should only be in .env
          databases: config.databases
        },
        metadata: {
          ...config._metadata,
          securityNote: "API keys and sensitive data should be stored in environment variables, not in this config file"
        }
      };

      await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
      logger.debug(`Configuration saved to ${configPath} (sensitive data excluded)`);
    } catch (error) {
      logger.error(`Failed to save configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Validate environment access - pure infrastructure check
   */
  async validateEnvironmentAccess(apiKey: string): Promise<boolean> {
    if (!apiKey) {
      return false;
    }

    try {
      const client = new Client({ auth: apiKey });
      await client.users.me();
      return true;
    } catch (error) {
      logger.debug(`Environment access validation failed: ${error}`);
      return false;
    }
  }

  // ===== Private Data Loading Methods =====

  /**
   * Load environment configuration source - pure data extraction
   */
  private loadEnvironmentSource(): ConfigSource | null {
    const envData: Record<string, string | undefined> = {};
    let hasData = false;

    // API Key
    if (process.env.NOTION_API_KEY || process.env.DEPLINK_API_KEY) {
      envData.NOTION_API_KEY = process.env.NOTION_API_KEY || process.env.DEPLINK_API_KEY;
      hasData = true;
    }

    // Parent Page ID
    if (process.env.NOTION_PARENT_PAGE_ID || process.env.DEPLINK_PARENT_PAGE_ID) {
      envData.NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID || process.env.DEPLINK_PARENT_PAGE_ID;
      hasData = true;
    }

    // Database IDs
    const dbPrefixes = ['NOTION_DATABASE_', 'DEPLINK_DATABASE_'];
    for (const [key, value] of Object.entries(process.env)) {
      if (value) {
        for (const prefix of dbPrefixes) {
          if (key.startsWith(prefix)) {
            envData[key] = value;
            hasData = true;
          }
        }
      }
    }

    // Environment settings
    if (process.env.NODE_ENV) {
      envData.NODE_ENV = process.env.NODE_ENV;
      hasData = true;
    }

    if (process.env.PWD) {
      envData.PWD = process.env.PWD;
      hasData = true;
    }

    if (!hasData) {
      return null;
    }

    return {
      type: 'env',
      data: envData,
      priority: 3 // Highest priority
    };
  }

  /**
   * Load project configuration source - pure file reading
   */
  private async loadProjectSource(projectPath: string): Promise<ConfigSource | null> {
    const configFiles = [
      'deplink.config.json',
      '.deplink-config.json',
      '.deplink.json'
    ];

    for (const configFile of configFiles) {
      try {
        const configPath = path.join(projectPath, configFile);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const configData = JSON.parse(configContent);

        return {
          type: 'project',
          data: configData,
          priority: 2 // Medium priority
        };
      } catch (error) {
        // Continue to next config file
        continue;
      }
    }

    return null;
  }

  /**
   * Load global configuration source - pure data reading
   */
  private async loadGlobalSource(): Promise<ConfigSource | null> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (!homeDir) {
        return null;
      }

      const globalConfigPath = path.join(homeDir, '.deplink', 'config.json');
      const configContent = await fs.readFile(globalConfigPath, 'utf-8');
      const configData = JSON.parse(configContent);

      return {
        type: 'global',
        data: configData,
        priority: 1 // Lowest priority
      };
    } catch (error) {
      // Global config is optional
      return null;
    }
  }
}