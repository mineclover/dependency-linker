/**
 * Shared types for Notion-Markdown conversion pipeline
 */

export interface ConversionResult {
  success: boolean;
  content?: string;
  blocks?: any[];
  error?: string;
  metadata?: {
    pageId?: string;
    title?: string;
    createdTime?: string;
    lastEditedTime?: string;
  };
}

export interface ConversionOptions {
  preserveFormatting?: boolean;
  includeMetadata?: boolean;
  customBlockHandlers?: Map<string, (block: any) => string>;
  chunkSize?: number;
  maxDepth?: number;
}

export interface MarkdownBlock {
  type: string;
  content: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    color?: string;
  };
  children?: MarkdownBlock[];
}

export interface NotionBlockData {
  id: string;
  type: string;
  content: any;
  children?: NotionBlockData[];
  hasMore?: boolean;
}

export interface ChunkResult {
  chunks: string[];
  totalChunks: number;
  metadata: {
    originalLength: number;
    averageChunkSize: number;
  };
}

export interface SerializationOptions {
  preserveIds?: boolean;
  includeChildren?: boolean;
  maxDepth?: number;
  indentSize?: number;
}

// Block type mapping
export const NOTION_BLOCK_TYPES = {
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading_1',
  HEADING_2: 'heading_2', 
  HEADING_3: 'heading_3',
  BULLETED_LIST: 'bulleted_list_item',
  NUMBERED_LIST: 'numbered_list_item',
  QUOTE: 'quote',
  CODE: 'code',
  CALLOUT: 'callout',
  DIVIDER: 'divider',
  TO_DO: 'to_do',
  TOGGLE: 'toggle',
  IMAGE: 'image',
  FILE: 'file',
  BOOKMARK: 'bookmark',
  LINK_PREVIEW: 'link_preview',
  TABLE: 'table',
  TABLE_ROW: 'table_row',
  COLUMN_LIST: 'column_list',
  COLUMN: 'column',
  CHILD_PAGE: 'child_page',
  CHILD_DATABASE: 'child_database',
  EMBED: 'embed',
  VIDEO: 'video',
  AUDIO: 'audio',
  EQUATION: 'equation',
} as const;

export const MARKDOWN_PATTERNS = {
  HEADING_1: /^# (.+)$/,
  HEADING_2: /^## (.+)$/,
  HEADING_3: /^### (.+)$/,
  BOLD: /\*\*(.+?)\*\*/g,
  ITALIC: /\*(.+?)\*/g,
  CODE_INLINE: /`(.+?)`/g,
  CODE_BLOCK: /```(\w*)\n([\s\S]*?)```/g,
  LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  BULLET_LIST: /^[-*+] (.+)$/,
  NUMBER_LIST: /^\d+\. (.+)$/,
  QUOTE: /^> (.+)$/,
  STRIKETHROUGH: /~~(.+?)~~/g,
  CHECKBOX_CHECKED: /^- \[x\] (.+)$/,
  CHECKBOX_UNCHECKED: /^- \[ \] (.+)$/,
} as const;