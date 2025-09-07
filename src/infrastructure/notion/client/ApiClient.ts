import { Client } from '@notionhq/client';
import { EnhancedNotionApiQueue } from '../../../shared/utils/apiQueue.js';
import type { ProjectFile } from '../../../shared/types/index.js';

/**
 * Core Notion API client wrapper with rate limiting and queue management
 * Handles authentication, API configuration, and basic request orchestration
 */
export class NotionApiClient {
  private notion: Client;
  private apiQueue: EnhancedNotionApiQueue;
  private projectPath: string;
  private workspaceUrl?: string;
  private parentPageId?: string;

  constructor(apiKey: string, projectPath: string) {
    this.notion = new Client({
      auth: apiKey,
    });
    this.projectPath = projectPath;
    this.apiQueue = new EnhancedNotionApiQueue(350, 5); // 350ms delay, 5 max retries
  }

  /**
   * Get the Notion client instance
   */
  getClient(): Client {
    return this.notion;
  }

  /**
   * Get the API queue for rate-limited requests
   */
  getApiQueue(): EnhancedNotionApiQueue {
    return this.apiQueue;
  }

  /**
   * Set the parent page ID for database creation
   */
  setParentPageId(pageId: string): void {
    this.parentPageId = pageId;
  }

  /**
   * Get the current parent page ID
   */
  getParentPageId(): string | undefined {
    return this.parentPageId;
  }

  /**
   * Set the workspace URL
   */
  setWorkspaceUrl(url: string): void {
    this.workspaceUrl = url;
  }

  /**
   * Get the workspace URL
   */
  getWorkspaceUrl(): string | undefined {
    return this.workspaceUrl;
  }

  /**
   * Get project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Wait for all queued API requests to complete
   */
  async waitForQueue(): Promise<void> {
    await this.apiQueue.waitForCompletion();
  }

  /**
   * Detect workspace URL from a database ID
   */
  async detectWorkspaceUrl(databaseId: string): Promise<{workspaceUrl?: string, rootPageId?: string}> {
    try {
      const response = await this.apiQueue.add(async () => 
        await this.notion.databases.retrieve({ database_id: databaseId })
      );
      
      if (response.url) {
        const urlParts = response.url.split('/');
        if (urlParts.length >= 4) {
          const workspaceUrl = `${urlParts[0]}//${urlParts[2]}/${urlParts[3]}`;
          
          // Try to find the root page
          let rootPageId;
          if (response.parent?.type === 'page_id') {
            rootPageId = response.parent.page_id;
          }
          
          this.workspaceUrl = workspaceUrl;
          
          return { workspaceUrl, rootPageId };
        }
      }
      
      return {};
    } catch (error) {
      console.warn('Failed to detect workspace URL:', error);
      return {};
    }
  }

  /**
   * Search database pages with pagination support
   */
  async searchDatabasePages(databaseId: string): Promise<Array<{ id: string; title: string; url: string }>> {
    try {
      const response = await this.apiQueue.add(async () =>
        await this.notion.dataSources.query({
          data_source_id: databaseId,
          page_size: 100,
        })
      );

      const pages = response.results.map((page: any) => ({
        id: page.id,
        title: page.properties?.Name?.title?.[0]?.plain_text || 
               page.properties?.Title?.title?.[0]?.plain_text || 
               'Untitled',
        url: page.url || '',
      }));

      return pages;
    } catch (error) {
      console.error('Error searching database pages:', error);
      return [];
    }
  }
}