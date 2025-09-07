/**
 * Notion API Service Interface
 * Domain interface for Notion API operations
 */

export interface INotionApiService {
  /**
   * Check if the Notion API service is healthy and ready
   */
  isHealthy(): Promise<boolean>;

  /**
   * Upload analysis result to Notion
   */
  uploadAnalysisResult(result: any, options?: any): Promise<any>;

  /**
   * Get or create a database for the given type
   */
  getOrCreateDatabase(type: string): Promise<string>;

  /**
   * Create a page in the specified database (simple interface)
   */
  createPage(databaseId: string, properties: any, content?: string): Promise<string>;

  /**
   * Create a page with complex Notion API structure
   */
  createPageAdvanced(pageData: {
    parent: { database_id: string };
    properties: any;
    children?: any[];
  }): Promise<{ success: boolean; data?: any; error?: any }>;

  /**
   * Update an existing page
   */
  updatePage(pageId: string, properties: any, content?: string): Promise<void>;

  /**
   * Search for pages in a database
   */
  searchPages(databaseId: string, query?: any): Promise<any[]>;

  /**
   * Update a database configuration
   */
  updateDatabase(databaseId: string, updates: any): Promise<any>;

  /**
   * Retrieve database information
   */
  retrieveDatabase(databaseId: string): Promise<any>;

  /**
   * Query database for pages
   */
  queryDatabase(databaseId: string, filter?: any): Promise<any>;

  /**
   * Test API connection
   */
  testConnection(): Promise<{ success: boolean; error?: any }>;

  /**
   * Create a new database
   */
  createDatabase(data: any): Promise<any>;
}