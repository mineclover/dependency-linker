import type { DependencyGraph } from '../../../shared/types/index.js';
import { NotionApiClient } from './ApiClient.js';

/**
 * Notion property management and dependency relationship handling
 * Manages database properties, relationships, and dependency tracking
 */
export class NotionPropertyManager {
  private apiClient: NotionApiClient;

  constructor(apiClient: NotionApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Update dependency relationships between files
   */
  async updateDependencyRelationships(
    notionId: string,
    dependencies: string[],
    databaseId: string,
    existingFiles: Record<string, string>
  ): Promise<void> {
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    try {
      // Map dependency file paths to Notion page IDs
      const dependencyIds = dependencies
        .map(dep => existingFiles[dep])
        .filter(id => id); // Remove undefined IDs

      if (dependencyIds.length === 0) {
        console.log(`⚠️ No existing Notion pages found for dependencies of page ${notionId}`);
        return;
      }

      // Update the Imports property with dependency relations
      await this.apiClient.getApiQueue().add(async () => {
        await this.apiClient.getClient().pages.update({
          page_id: notionId,
          properties: {
            'Imports': {
              relation: dependencyIds.map(id => ({ id })),
            },
          },
        });
      });

      console.log(`✅ Updated ${dependencyIds.length} dependency relationships for page ${notionId}`);
    } catch (error) {
      console.error(`❌ Failed to update dependency relationships for page ${notionId}:`, error);
      throw error;
    }
  }

  /**
   * Add language-specific properties to a file page
   */
  async addLanguageProperties(pageId: string, extension: string, additionalProps: Record<string, any> = {}): Promise<void> {
    try {
      const language = this.getLanguageFromExtension(extension);
      
      const properties: any = {
        'Language': {
          select: {
            name: language,
          },
        },
        ...additionalProps,
      };

      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.update({
          page_id: pageId,
          properties,
        })
      );

      console.log(`✅ Added language properties (${language}) to page ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to add language properties to page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Update file statistics properties
   */
  async updateFileStatistics(
    pageId: string,
    stats: {
      linesOfCode?: number;
      complexity?: number;
      maintainabilityIndex?: number;
      testCoverage?: number;
    }
  ): Promise<void> {
    try {
      const properties: any = {};

      if (stats.linesOfCode !== undefined) {
        properties['Lines of Code'] = {
          number: stats.linesOfCode,
        };
      }

      if (stats.complexity !== undefined) {
        properties['Complexity'] = {
          number: stats.complexity,
        };
      }

      if (stats.maintainabilityIndex !== undefined) {
        properties['Maintainability Index'] = {
          number: stats.maintainabilityIndex,
        };
      }

      if (stats.testCoverage !== undefined) {
        properties['Test Coverage'] = {
          number: stats.testCoverage,
        };
      }

      if (Object.keys(properties).length > 0) {
        await this.apiClient.getApiQueue().add(() => 
          this.apiClient.getClient().pages.update({
            page_id: pageId,
            properties,
          })
        );

        console.log(`✅ Updated file statistics for page ${pageId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update file statistics for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Set project-specific properties
   */
  async setProjectProperties(pageId: string, projectName: string, additionalTags: string[] = []): Promise<void> {
    try {
      const properties: any = {
        'Project': {
          select: {
            name: projectName,
          },
        },
      };

      if (additionalTags.length > 0) {
        properties['Tags'] = {
          multi_select: additionalTags.map(tag => ({ name: tag })),
        };
      }

      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.update({
          page_id: pageId,
          properties,
        })
      );

      console.log(`✅ Set project properties for page ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to set project properties for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Update status property
   */
  async updateStatus(pageId: string, status: 'Uploaded' | 'Updated' | 'Error' | 'Processing'): Promise<void> {
    try {
      await this.apiClient.getApiQueue().add(() => 
        this.apiClient.getClient().pages.update({
          page_id: pageId,
          properties: {
            'Status': {
              select: {
                name: status,
              },
            },
          },
        })
      );

      console.log(`✅ Updated status to '${status}' for page ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to update status for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Add timestamp properties
   */
  async addTimestamps(pageId: string, timestamps: {
    created?: string;
    modified?: string;
    lastSynced?: string;
  }): Promise<void> {
    try {
      const properties: any = {};

      if (timestamps.created) {
        properties['Created'] = {
          date: {
            start: timestamps.created,
          },
        };
      }

      if (timestamps.modified) {
        properties['Last Modified'] = {
          date: {
            start: timestamps.modified,
          },
        };
      }

      if (timestamps.lastSynced) {
        properties['Last Synced'] = {
          date: {
            start: timestamps.lastSynced,
          },
        };
      }

      if (Object.keys(properties).length > 0) {
        await this.apiClient.getApiQueue().add(() => 
          this.apiClient.getClient().pages.update({
            page_id: pageId,
            properties,
          })
        );

        console.log(`✅ Added timestamps for page ${pageId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to add timestamps for page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.html': 'HTML',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.yml': 'YAML',
      '.yaml': 'YAML',
      '.xml': 'XML',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.sh': 'Shell Script',
      '.sql': 'SQL',
    };
    return languageMap[extension] || 'Other';
  }

  /**
   * Validate and sanitize property values
   */
  private sanitizePropertyValue(value: any, propertyType: string): any {
    switch (propertyType) {
      case 'title':
      case 'rich_text':
        if (typeof value === 'string') {
          return value.substring(0, 2000); // Notion limit
        }
        return String(value).substring(0, 2000);

      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;

      case 'select':
        return typeof value === 'string' ? value.substring(0, 100) : String(value).substring(0, 100);

      case 'date':
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        }
        return new Date().toISOString();

      default:
        return value;
    }
  }

  /**
   * Batch update properties for multiple pages
   */
  async batchUpdateProperties(updates: Array<{
    pageId: string;
    properties: Record<string, any>;
  }>): Promise<void> {
    console.log(`📦 Batch updating properties for ${updates.length} pages`);

    const promises = updates.map(async (update) => {
      try {
        await this.apiClient.getApiQueue().add(() => 
          this.apiClient.getClient().pages.update({
            page_id: update.pageId,
            properties: update.properties,
          })
        );
        return { pageId: update.pageId, success: true };
      } catch (error) {
        console.error(`❌ Failed to update properties for page ${update.pageId}:`, error);
        return { pageId: update.pageId, success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Batch update completed: ${successful} successful, ${failed} failed`);
  }
}