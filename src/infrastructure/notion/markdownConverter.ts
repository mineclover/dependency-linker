/**
 * Notion-Markdown Converter
 * Converts between Notion blocks and Markdown format with high fidelity
 */

import { Client } from '@notionhq/client';
import * as path from 'path';
import { logger } from '../../shared/utils/index.js';

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
}

export class NotionMarkdownConverter {
  private notion: Client;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  /**
   * Convert Notion page to Markdown
   */
  async notionToMarkdown(
    pageId: string, 
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      logger.info(`📥 Converting Notion page ${pageId} to Markdown...`);
      
      // Get page info
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      
      // Get page blocks
      const blocks = await this.getAllBlocks(pageId);
      
      // Convert to markdown
      const markdown = await this.blocksToMarkdown(blocks, options);
      
      // Extract metadata
      const metadata = this.extractPageMetadata(page);
      
      logger.success(`✅ Successfully converted page to Markdown`);
      
      // Use enhanced front-matter if metadata is requested
      let finalContent = markdown;
      if (options.includeMetadata && metadata) {
        finalContent = this.embedRichFrontMatter(markdown, metadata);
      }

      return {
        success: true,
        content: finalContent,
        metadata: options.includeMetadata ? metadata : undefined
      };
      
    } catch (error) {
      logger.error(`❌ Failed to convert page to Markdown: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert Markdown to Notion database entry
   */
  async markdownToDatabaseEntry(
    markdown: string,
    databaseId: string,
    title: string,
    options: ConversionOptions = {},
    filePath?: string
  ): Promise<ConversionResult> {
    try {
      logger.info(`📤 Uploading Markdown as database entry: ${title}`);
      
      // Parse markdown to blocks
      const blocks = this.markdownToBlocks(markdown, options);
      
      // Parse front-matter if gray-matter is available
      let contentOnly = markdown;
      let wordCount = 0;
      
      try {
        const matter = await import('gray-matter');
        const parsed = matter.default(markdown);
        contentOnly = parsed.content;
      } catch {
        // gray-matter not available, use full content
        logger.debug('gray-matter not available, using full content');
      }
      
      // Calculate word count
      wordCount = this.countWords(contentOnly);
      
      // Determine document type
      const documentType = this.determineDocumentType(title, filePath);
      
      // Create enhanced page properties for database entry
      const pageProperties: any = {
        Name: {
          title: [{
            text: { content: title }
          }]
        },
        Status: {
          select: { name: "Published" }
        },
        "Document Type": {
          select: { name: documentType }
        },
        "Word Count": {
          number: wordCount
        },
        "Reading Time": {
          number: Math.ceil(wordCount / 200) // 200 words per minute
        },
        "Last Updated": {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        }
      };
      
      // Add file path if provided
      if (filePath) {
        pageProperties["File Path"] = {
          rich_text: [{
            text: { content: filePath }
          }]
        };
      }

      // Handle blocks in chunks if they exceed Notion's limit (100 blocks)
      const MAX_BLOCKS_PER_REQUEST = 100;
      let pageId: string;
      
      if (blocks.length <= MAX_BLOCKS_PER_REQUEST) {
        // Create database entry with all blocks at once
        const page = await this.notion.pages.create({
          parent: { database_id: databaseId },
          properties: pageProperties,
          children: blocks
        });
        pageId = page.id;
      } else {
        // Create with initial blocks, then append remaining
        const initialBlocks = blocks.slice(0, MAX_BLOCKS_PER_REQUEST);
        const remainingBlocks = blocks.slice(MAX_BLOCKS_PER_REQUEST);
        
        const page = await this.notion.pages.create({
          parent: { database_id: databaseId },
          properties: pageProperties,
          children: initialBlocks
        });
        pageId = page.id;
        
        // Add remaining blocks in chunks
        for (let i = 0; i < remainingBlocks.length; i += MAX_BLOCKS_PER_REQUEST) {
          const chunk = remainingBlocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
          
          // Add delay between chunks to respect rate limits
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          await this.notion.blocks.children.append({
            block_id: pageId,
            children: chunk
          });
        }
      }

      logger.success(`✅ Successfully uploaded Markdown to database`);

      return {
        success: true,
        blocks,
        metadata: {
          pageId,
          title,
          createdTime: new Date().toISOString(),
          lastEditedTime: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`❌ Failed to upload Markdown: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert Markdown to Notion page
   */
  async markdownToNotion(
    markdown: string,
    parentId: string,
    title: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      logger.info(`📤 Creating Notion page from Markdown: ${title}`);
      
      // Parse markdown to blocks
      const blocks = this.markdownToBlocks(markdown, options);
      
      // Create page properties
      const pageProperties = {
        title: {
          title: [{
            text: { content: title }
          }]
        }
      };

      // Handle blocks in chunks
      const MAX_BLOCKS_PER_REQUEST = 100;
      let pageId: string;
      
      if (blocks.length <= MAX_BLOCKS_PER_REQUEST) {
        const page = await this.notion.pages.create({
          parent: { page_id: parentId },
          properties: pageProperties,
          children: blocks
        });
        pageId = page.id;
      } else {
        const initialBlocks = blocks.slice(0, MAX_BLOCKS_PER_REQUEST);
        const remainingBlocks = blocks.slice(MAX_BLOCKS_PER_REQUEST);
        
        const page = await this.notion.pages.create({
          parent: { page_id: parentId },
          properties: pageProperties,
          children: initialBlocks
        });
        pageId = page.id;
        
        for (let i = 0; i < remainingBlocks.length; i += MAX_BLOCKS_PER_REQUEST) {
          const chunk = remainingBlocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
          await this.notion.blocks.children.append({
            block_id: pageId,
            children: chunk
          });
        }
      }
      
      logger.success(`✅ Successfully created Notion page from Markdown`);
      
      return {
        success: true,
        blocks,
        metadata: {
          pageId,
          title,
          createdTime: new Date().toISOString(),
          lastEditedTime: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`❌ Failed to create Notion page: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all blocks from a page recursively
   */
  private async getAllBlocks(pageId: string): Promise<any[]> {
    const blocks: any[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100
      });

      const pageBlocks = response.results as any[];
      blocks.push(...pageBlocks);

      // Get children blocks recursively
      for (const block of pageBlocks) {
        if (block.has_children) {
          const children = await this.getAllBlocks(block.id);
          children.forEach(child => {
            (child as any).parent_id = block.id;
            (child as any).nesting_level = ((block as any).nesting_level || 0) + 1;
          });
          blocks.push(...children);
        }
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return blocks;
  }

  /**
   * Convert blocks to markdown
   */
  private async blocksToMarkdown(
    blocks: any[], 
    options: ConversionOptions
  ): Promise<string> {
    const markdownLines: string[] = [];
    
    for (const block of blocks) {
      const markdown = this.blockToMarkdown(block, options);
      if (markdown) {
        markdownLines.push(markdown);
      }
    }

    return markdownLines.join('\n\n');
  }

  /**
   * Convert single block to markdown
   */
  private blockToMarkdown(block: any, options: ConversionOptions): string {
    const type = block.type;
    const blockData = (block as any)[type];
    const nestingLevel = (block as any).nesting_level || 0;
    const indent = '  '.repeat(nestingLevel);

    // Custom block handler
    if (options.customBlockHandlers?.has(type)) {
      return options.customBlockHandlers.get(type)!(block);
    }

    switch (type) {
      case 'paragraph':
        return `${indent}${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'heading_1':
        return `${indent}# ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'heading_2':
        return `${indent}## ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'heading_3':
        return `${indent}### ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'bulleted_list_item':
        return `${indent}- ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'numbered_list_item':
        return `${indent}1. ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'to_do':
        const checked = blockData.checked ? 'x' : ' ';
        return `${indent}- [${checked}] ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'quote':
        return `${indent}> ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'code':
        const language = blockData.language || 'plain text';
        const code = this.richTextToMarkdown(blockData.rich_text || []);
        return `${indent}\`\`\`${language}\n${code}\n\`\`\``;
        
      case 'divider':
        return `${indent}---`;
        
      case 'callout':
        const emoji = blockData.icon?.emoji || '💡';
        return `${indent}${emoji} ${this.richTextToMarkdown(blockData.rich_text || [])}`;
        
      case 'table':
        return this.tableToMarkdown(blockData, indent);
        
      default:
        if (blockData?.rich_text) {
          return `${indent}${this.richTextToMarkdown(blockData.rich_text)}`;
        }
        return `${indent}<!-- Unsupported block type: ${type} -->`;
    }
  }

  /**
   * Convert rich text to markdown
   */
  private richTextToMarkdown(richText: any[]): string {
    return richText.map(text => {
      let content = text.plain_text || '';
      const annotations = text.annotations;

      if (annotations?.bold) content = `**${content}**`;
      if (annotations?.italic) content = `*${content}*`;
      if (annotations?.strikethrough) content = `~~${content}~~`;
      if (annotations?.underline) content = `<u>${content}</u>`;
      if (annotations?.code) content = `\`${content}\``;

      if (text.href) content = `[${content}](${text.href})`;

      return content;
    }).join('');
  }

  /**
   * Convert markdown to Notion blocks
   */
  private markdownToBlocks(markdown: string, options: ConversionOptions): any[] {
    // Remove front-matter if gray-matter is available
    let contentOnly = markdown;
    
    try {
      const matter = require('gray-matter');
      const parsed = matter(markdown);
      contentOnly = parsed.content;
    } catch {
      // gray-matter not available, use full content
    }
    
    const lines = contentOnly.split('\n');
    const blocks: any[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          blocks.push({
            object: 'block',
            type: 'code',
            code: {
              language: codeLanguage,
              rich_text: [{
                type: 'text',
                text: { content: codeContent.join('\n') }
              }]
            }
          });
          inCodeBlock = false;
          codeLanguage = '';
          codeContent = [];
        } else {
          // Start code block
          inCodeBlock = true;
          codeLanguage = trimmedLine.slice(3) || 'plain text';
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Skip empty lines
      if (!trimmedLine) continue;

      // Parse different markdown elements
      const block = this.parseMarkdownLine(line);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Parse single markdown line to Notion block
   */
  private parseMarkdownLine(line: string): any {
    const trimmedLine = line.trim();

    // Headings
    if (trimmedLine.startsWith('### ')) {
      return this.createTextBlock('heading_3', trimmedLine.slice(4));
    }
    if (trimmedLine.startsWith('## ')) {
      return this.createTextBlock('heading_2', trimmedLine.slice(3));
    }
    if (trimmedLine.startsWith('# ')) {
      return this.createTextBlock('heading_1', trimmedLine.slice(2));
    }

    // Lists
    if (trimmedLine.startsWith('- [x] ')) {
      return {
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: this.markdownToRichText(trimmedLine.slice(6)),
          checked: true
        }
      };
    }
    if (trimmedLine.startsWith('- [ ] ')) {
      return {
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: this.markdownToRichText(trimmedLine.slice(6)),
          checked: false
        }
      };
    }
    if (trimmedLine.startsWith('- ')) {
      return this.createTextBlock('bulleted_list_item', trimmedLine.slice(2));
    }
    if (/^\d+\. /.test(trimmedLine)) {
      return this.createTextBlock('numbered_list_item', trimmedLine.replace(/^\d+\. /, ''));
    }

    // Quote
    if (trimmedLine.startsWith('> ')) {
      return this.createTextBlock('quote', trimmedLine.slice(2));
    }

    // Divider
    if (trimmedLine === '---') {
      return { object: 'block', type: 'divider', divider: {} };
    }

    // Default to paragraph
    return this.createTextBlock('paragraph', trimmedLine);
  }

  /**
   * Create text block with rich text
   */
  private createTextBlock(type: string, content: string): any {
    return {
      object: 'block',
      type,
      [type]: {
        rich_text: this.markdownToRichText(content)
      }
    };
  }

  /**
   * Convert markdown text to Notion rich text
   */
  private markdownToRichText(text: string): any[] {
    const richText: any[] = [];
    let currentText = text;
    
    // Bold text
    currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      richText.push({
        type: 'text',
        text: { content },
        annotations: { bold: true }
      });
      return '\n__RICH_TEXT_PLACEHOLDER__\n';
    });

    // Italic text
    currentText = currentText.replace(/\*(.*?)\*/g, (match, content) => {
      richText.push({
        type: 'text',
        text: { content },
        annotations: { italic: true }
      });
      return '\n__RICH_TEXT_PLACEHOLDER__\n';
    });

    // Code
    currentText = currentText.replace(/`(.*?)`/g, (match, content) => {
      richText.push({
        type: 'text',
        text: { content },
        annotations: { code: true }
      });
      return '\n__RICH_TEXT_PLACEHOLDER__\n';
    });

    // Handle plain text parts
    const parts = currentText.split('\n__RICH_TEXT_PLACEHOLDER__\n');
    const result: any[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].trim()) {
        result.push({
          type: 'text',
          text: { content: parts[i] }
        });
      }
      if (richText[i]) {
        result.push(richText[i]);
      }
    }

    return result.length > 0 ? result : [{
      type: 'text',
      text: { content: text }
    }];
  }

  /**
   * Convert table to markdown (simplified)
   */
  private tableToMarkdown(tableData: any, indent: string): string {
    return `${indent}| Table | Conversion | Not Fully Implemented |\n${indent}|-------|------------|----------------------|`;
  }

  /**
   * Extract page metadata
   */
  private extractPageMetadata(page: any): any {
    return {
      pageId: page.id,
      title: this.extractTitle(page.properties),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }

  /**
   * Create enhanced front-matter with metadata
   */
  private createEnhancedFrontMatter(
    title: string,
    pageId: string,
    databaseId?: string,
    contentOnly?: string
  ): any {
    const wordCount = contentOnly ? this.countWords(contentOnly) : 0;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    const frontMatterData: any = {
      notion_page_id: pageId,
      title: title,
      last_synced: new Date().toISOString(),
      word_count: wordCount,
      reading_time_minutes: readingTime,
      auto_generated: true
    };

    if (databaseId) {
      frontMatterData.notion_database_id = databaseId;
    }

    return frontMatterData;
  }

  /**
   * Embed rich front-matter in downloaded content
   */
  private embedRichFrontMatter(content: string, metadata: any): string {
    const frontMatterData = {
      notion_page_id: metadata.pageId,
      title: metadata.title || 'Untitled',
      last_synced: new Date().toISOString(),
      created: metadata.createdTime,
      lastEdited: metadata.lastEditedTime,
      word_count: this.countWords(content),
      reading_time_minutes: Math.ceil(this.countWords(content) / 200),
      auto_generated: true
    };

    // Create enhanced content with comments
    const notionUrl = `https://notion.so/${metadata.pageId.replace(/-/g, '')}`;
    const enhancedContent = [
      '<!-- This document is synced with Notion -->',
      `<!-- Notion Page: ${notionUrl} -->`,
      `<!-- Last synced: ${frontMatterData.last_synced} -->`,
      '',
      content
    ].join('\n');

    // Use gray-matter to create front-matter
    try {
      const matter = require('gray-matter');
      return matter.stringify(enhancedContent, frontMatterData);
    } catch {
      // Fallback if gray-matter not available
      const yamlFrontMatter = Object.entries(frontMatterData)
        .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
        .join('\n');
      
      return `---\n${yamlFrontMatter}\n---\n\n${enhancedContent}`;
    }
  }

  /**
   * Extract title from page properties
   */
  private extractTitle(properties: any): string {
    for (const [key, prop] of Object.entries(properties as any)) {
      if ((prop as any).type === 'title') {
        return (prop as any).title?.map((t: any) => t.plain_text).join('') || 'Untitled';
      }
    }
    return 'Untitled';
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    const words = content
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Determine document type based on title and file path
   */
  private determineDocumentType(title: string, filePath?: string): string {
    const titleLower = title.toLowerCase();
    const fileName = filePath ? path.basename(filePath).toLowerCase() : '';
    
    if (titleLower.includes('guide') || fileName.includes('guide')) return 'Guide';
    if (titleLower.includes('spec') || fileName.includes('spec') || 
        titleLower.includes('specification') || fileName.includes('specification')) return 'Specification';
    if (titleLower.includes('reference') || fileName.includes('reference') || 
        titleLower.includes('api') || fileName.includes('api')) return 'Reference';
    if (titleLower.includes('tutorial') || fileName.includes('tutorial') || 
        titleLower.includes('quick') || fileName.includes('quick')) return 'Tutorial';
    
    return 'Documentation';
  }
}

export default NotionMarkdownConverter;