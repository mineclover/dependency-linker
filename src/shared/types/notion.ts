/**
 * Notion API - Unified Types
 * 모든 Notion 관련 타입들을 통합 정의
 */

// Base Notion Types
export type NotionPageId = string;
export type NotionDatabaseId = string;
export type NotionUserId = string;

// Configuration Types
export interface NotionDatabases {
  files: NotionDatabaseId;
  functions?: NotionDatabaseId;
  classes?: NotionDatabaseId;
  dependencies?: NotionDatabaseId;
  libraries?: NotionDatabaseId;
  relationships?: NotionDatabaseId;
  docs?: NotionDatabaseId;
}

export interface NotionConfig {
  apiKey: string;
  databases: NotionDatabases;
  parentPageId?: NotionPageId;
  environment?: 'development' | 'test' | 'production';
  timeout?: number;
  retryAttempts?: number;
}

// Property Types
export interface NotionPropertyValue {
  type: string;
  [key: string]: any;
}

export interface NotionPageProperties {
  [propertyName: string]: NotionPropertyValue;
}

// Common Property Builders
export interface PropertyBuilder {
  title(content: string): NotionPropertyValue;
  richText(content: string): NotionPropertyValue;
  number(value: number): NotionPropertyValue;
  checkbox(checked: boolean): NotionPropertyValue;
  select(name: string): NotionPropertyValue;
  multiSelect(names: string[]): NotionPropertyValue;
  date(start: string, end?: string): NotionPropertyValue;
  url(url: string): NotionPropertyValue;
  relation(pageIds: NotionPageId[]): NotionPropertyValue;
}

// Page Types
export interface NotionPage {
  id: NotionPageId;
  object: 'page';
  created_time: string;
  last_edited_time: string;
  created_by: { id: NotionUserId; object: 'user' };
  last_edited_by: { id: NotionUserId; object: 'user' };
  cover: any | null;
  icon: any | null;
  parent: NotionParent;
  archived: boolean;
  properties: NotionPageProperties;
  url: string;
}

export interface NotionParent {
  type: 'database_id' | 'page_id' | 'workspace';
  database_id?: NotionDatabaseId;
  page_id?: NotionPageId;
}

// Block Types
export interface NotionBlock {
  id: string;
  object: 'block';
  type: string;
  created_time: string;
  last_edited_time: string;
  created_by: { id: NotionUserId; object: 'user' };
  last_edited_by: { id: NotionUserId; object: 'user' };
  archived: boolean;
  has_children: boolean;
  [blockType: string]: any;
}

// Database Types
export interface NotionDatabase {
  id: NotionDatabaseId;
  object: 'database';
  created_time: string;
  last_edited_time: string;
  title: any[];
  description: any[];
  icon: any | null;
  cover: any | null;
  properties: { [propertyName: string]: NotionProperty };
  parent: NotionParent;
  url: string;
  archived: boolean;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
  [propertyType: string]: any;
}

// Request/Response Types
export interface NotionRequestOptions {
  timeout?: number;
  retries?: number;
  rateLimitDelay?: number;
  validateResponse?: boolean;
}

export interface NotionRequestResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rateLimited?: boolean;
  retryAfter?: number;
}

// API Operation Types
export interface NotionPageCreateRequest {
  parent: NotionParent;
  properties: NotionPageProperties;
  children?: NotionBlock[];
  icon?: any;
  cover?: any;
}

export interface NotionPageUpdateRequest {
  properties?: NotionPageProperties;
  archived?: boolean;
  icon?: any;
  cover?: any;
}

export interface NotionDatabaseQueryRequest {
  filter?: any;
  sorts?: any[];
  start_cursor?: string;
  page_size?: number;
}

export interface NotionDatabaseQueryResponse {
  object: 'list';
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

// Client Interface
export interface INotionClient {
  // Page operations
  createPage(request: NotionPageCreateRequest, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionPage>>;
  updatePage(pageId: NotionPageId, request: NotionPageUpdateRequest, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionPage>>;
  getPage(pageId: NotionPageId, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionPage>>;
  
  // Database operations
  queryDatabase(databaseId: NotionDatabaseId, request?: NotionDatabaseQueryRequest, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionDatabaseQueryResponse>>;
  getDatabase(databaseId: NotionDatabaseId, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionDatabase>>;
  
  // Block operations
  getBlockChildren(blockId: string, options?: NotionRequestOptions): Promise<NotionRequestResult<NotionBlock[]>>;
  appendBlockChildren(blockId: string, children: NotionBlock[], options?: NotionRequestOptions): Promise<NotionRequestResult<any>>;
  
  // Utility methods
  isValidPageId(id: string): boolean;
  isValidDatabaseId(id: string): boolean;
  formatPageUrl(pageId: NotionPageId): string;
}

// Error Types
export interface NotionError {
  code: string;
  message: string;
  object: 'error';
}

export interface NotionValidationError extends NotionError {
  code: 'validation_error';
  details?: {
    property?: string;
    expected?: string;
    actual?: string;
  };
}

export interface NotionRateLimitError extends NotionError {
  code: 'rate_limited';
  retryAfter: number;
}

// Schema Types for Database Properties
export interface DatabaseSchemaProperty {
  name: string;
  type: 'title' | 'rich_text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'relation' | 'formula';
  options?: { name: string; color?: string }[];
  formula?: { expression: string };
  relation?: { database_id: NotionDatabaseId; type: 'single_property' | 'dual_property' };
  required?: boolean;
  description?: string;
}

export interface DatabaseSchema {
  [propertyName: string]: DatabaseSchemaProperty;
}

// Factory Types
export interface NotionClientFactory {
  createClient(config: NotionConfig): INotionClient;
  validateConfig(config: NotionConfig): { valid: boolean; errors: string[] };
}

export interface NotionPropertyFactory extends PropertyBuilder {
  createPropertiesFromSchema(schema: DatabaseSchema, data: Record<string, any>): NotionPageProperties;
  validateProperties(properties: NotionPageProperties, schema: DatabaseSchema): { valid: boolean; errors: string[] };
}