/**
 * Types and interfaces for the sync workflow system
 * Centralizes all workflow-related type definitions
 */

export interface SyncWorkflowOptions {
  dryRun?: boolean;
  force?: boolean;
  autoCommit?: boolean;
  updateIndex?: boolean;
}

export interface SyncWorkflowResult {
  success: boolean;
  processed: number;
  uploaded: number;
  updated: number;
  skipped: number;
  errors: string[];
  newNotionPages: Array<{
    file: string;
    notionPageId: string;
  }>;
}

export interface DocumentUploadOptions {
  type?: string;
  priority?: string;
  tags?: string[];
  relateTo?: string[];
}

export interface DocumentUploadResult {
  success: boolean;
  docsUploaded: number;
  docsSkipped: number;
  relationships: number;
  errors: string[];
}

export interface DocumentSetupResult {
  success: boolean;
  docsDbId?: string;
  error?: string;
}

export interface DatabaseFixResult {
  success: boolean;
  error?: string;
}

export interface GitIntegrationOptions {
  autoSync?: boolean;
}

export interface SystemStatus {
  files: {
    total: number;
    synced: number;
    needsUpdate: number;
    notSynced: number;
  };
  git: {
    staged: string[];
    modified: string[];
    needsSync: string[];
  };
  config: {
    hasConfig: boolean;
    databases: string[];
  };
}

export interface DocumentFile {
  name: string;
  path: string;
  relativePath?: string;
}

export interface DocumentMetadata {
  name: string;
  content: string;
  documentType: string;
  filePath: string;
  wordCount: number;
  readingTime: number;
  relatedFileIds: string[];
}

export interface FrontMatterData {
  notion_page_id: string;
  notion_database_id: string;
  last_synced: string;
  category: string;
  auto_generated: boolean;
}

export interface WorkspaceDisplayInfo {
  workspaceUrl?: string;
  rootPageId?: string;
  filesDbId?: string;
  docsDbId?: string;
  functionsDbId?: string;
}

// Workflow step status types
export type WorkflowStep = 
  | 'discover_files'
  | 'identify_sync'
  | 'sync_notion'
  | 'update_index'
  | 'cleanup'
  | 'generate_summary';

export interface StepProgress {
  step: WorkflowStep;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  progress?: number;
}

// File processing result
export interface FileProcessResult {
  success: boolean;
  filePath: string;
  notionPageId?: string;
  action: 'created' | 'updated' | 'skipped';
  error?: string;
}

// Cleanup result
export interface CleanupResult {
  removed: number;
  errors: string[];
}

// Document patterns for discovery
export const DOC_PATTERNS = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE.md',
  'docs/**/*.md',
  'documentation/**/*.md',
  '*.md'
] as const;

// Document type inference mapping
export const DOCUMENT_TYPE_MAPPING = {
  readme: 'README',
  api: 'API Documentation',
  reference: 'API Documentation',
  guide: 'User Guide',
  tutorial: 'User Guide',
  spec: 'Technical Spec',
  design: 'Technical Spec',
  howto: 'Tutorial'
} as const;

// Content analysis tags
export const CONTENT_TAGS = {
  setup: 'Setup',
  install: 'Setup',
  config: 'Configuration',
  setting: 'Configuration',
  develop: 'Development',
  build: 'Development',
  deploy: 'Deployment',
  production: 'Deployment',
  troubleshoot: 'Troubleshooting',
  debug: 'Troubleshooting',
  error: 'Troubleshooting'
} as const;

export type DocumentType = typeof DOCUMENT_TYPE_MAPPING[keyof typeof DOCUMENT_TYPE_MAPPING] | 'Other';
export type ContentTag = typeof CONTENT_TAGS[keyof typeof CONTENT_TAGS] | 'Other';