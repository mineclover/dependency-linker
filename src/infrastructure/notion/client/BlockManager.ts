import { NotionApiClient } from './ApiClient.js';

/**
 * Notion block management for content manipulation
 * Handles block creation, updates, chunking, and content operations
 */
export class NotionBlockManager {
  private apiClient: NotionApiClient;

  constructor(apiClient: NotionApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Append multiple blocks to a page with chunking support
   */
  async appendBlocks(pageId: string, blocks: any[]): Promise<void> {
    try {
      // Split blocks into chunks to respect Notion's 100 block limit per request
      const blockChunks = this.chunkArray(blocks, 100);

      for (const chunk of blockChunks) {
        await this.apiClient.getApiQueue().add(async () => {
          await this.apiClient.getClient().blocks.children.append({
            block_id: pageId,
            children: chunk,
          });
        });
      }

      console.log(`✅ Appended ${blocks.length} blocks to page ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to append blocks to page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Create a text block with formatting options
   */
  createTextBlock(content: string, options: {
    type?: 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3';
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    color?: string;
  } = {}): any {
    const { type = 'paragraph', bold = false, italic = false, code = false, color = 'default' } = options;

    // Ensure content doesn't exceed Notion's 2000 character limit
    const truncatedContent = content.substring(0, 2000);

    const richText = [{
      type: 'text',
      text: {
        content: truncatedContent,
      },
      annotations: {
        bold,
        italic,
        code,
        color,
      },
    }];

    if (type.startsWith('heading_')) {
      return {
        object: 'block',
        type,
        [type]: {
          rich_text: richText,
        },
      };
    }

    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: richText,
      },
    };
  }

  /**
   * Create a code block with language support
   */
  createCodeBlock(code: string, language: string = 'plain text'): any {
    // Split long code into multiple blocks if necessary
    const codeChunks = this.chunkContent(code, 2000);
    
    return codeChunks.map(chunk => ({
      object: 'block',
      type: 'code',
      code: {
        rich_text: [{
          type: 'text',
          text: {
            content: chunk,
          },
        }],
        language: this.normalizeLanguage(language),
      },
    }));
  }

  /**
   * Create a bulleted list block
   */
  createBulletedListBlock(items: string[]): any[] {
    return items.map(item => ({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: {
            content: item.substring(0, 2000),
          },
        }],
      },
    }));
  }

  /**
   * Create a numbered list block
   */
  createNumberedListBlock(items: string[]): any[] {
    return items.map(item => ({
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: [{
          type: 'text',
          text: {
            content: item.substring(0, 2000),
          },
        }],
      },
    }));
  }

  /**
   * Create a divider block
   */
  createDividerBlock(): any {
    return {
      object: 'block',
      type: 'divider',
      divider: {},
    };
  }

  /**
   * Create a callout block
   */
  createCalloutBlock(content: string, icon: string = '💡'): any {
    return {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{
          type: 'text',
          text: {
            content: content.substring(0, 2000),
          },
        }],
        icon: {
          type: 'emoji',
          emoji: icon,
        },
      },
    };
  }

  /**
   * Update existing blocks on a page
   */
  async updateBlocks(pageId: string, blockUpdates: Array<{
    blockId: string;
    content: string;
    type?: string;
  }>): Promise<void> {
    try {
      const promises = blockUpdates.map(async (update) => {
        await this.apiClient.getApiQueue().add(async () => {
          await this.apiClient.getClient().blocks.update({
            block_id: update.blockId,
            [update.type || 'paragraph']: {
              rich_text: [{
                type: 'text',
                text: {
                  content: update.content.substring(0, 2000),
                },
              }],
            },
          });
        });
      });

      await Promise.all(promises);
      console.log(`✅ Updated ${blockUpdates.length} blocks on page ${pageId}`);
    } catch (error) {
      console.error(`❌ Failed to update blocks on page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Delete blocks from a page
   */
  async deleteBlocks(blockIds: string[]): Promise<void> {
    try {
      const promises = blockIds.map(async (blockId) => {
        await this.apiClient.getApiQueue().add(async () => {
          await this.apiClient.getClient().blocks.delete({
            block_id: blockId,
          });
        });
      });

      await Promise.all(promises);
      console.log(`✅ Deleted ${blockIds.length} blocks`);
    } catch (error) {
      console.error(`❌ Failed to delete blocks:`, error);
      throw error;
    }
  }

  /**
   * Get all blocks from a page
   */
  async getPageBlocks(pageId: string): Promise<any[]> {
    try {
      const blocks: any[] = [];
      let cursor: string | undefined;

      do {
        const response = await this.apiClient.getApiQueue().add(async () => {
          return await this.apiClient.getClient().blocks.children.list({
            block_id: pageId,
            start_cursor: cursor,
            page_size: 100,
          });
        });

        blocks.push(...response.results);
        cursor = response.next_cursor || undefined;
      } while (cursor);

      console.log(`📋 Retrieved ${blocks.length} blocks from page ${pageId}`);
      return blocks;
    } catch (error) {
      console.error(`❌ Failed to get blocks from page ${pageId}:`, error);
      throw error;
    }
  }

  /**
   * Convert content to appropriate blocks based on content type
   */
  convertContentToBlocks(content: string): any[] {
    const blocks: any[] = [];
    const lines = content.split('\n');
    let codeBlockLines: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    for (const line of lines) {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          if (codeBlockLines.length > 0) {
            const codeBlocks = this.createCodeBlock(codeBlockLines.join('\n'), codeLanguage);
            blocks.push(...codeBlocks);
          }
          codeBlockLines = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          // Start of code block
          codeLanguage = line.replace('```', '').trim();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Handle headings
      if (line.startsWith('### ')) {
        blocks.push(this.createTextBlock(line.substring(4), { type: 'heading_3' }));
      } else if (line.startsWith('## ')) {
        blocks.push(this.createTextBlock(line.substring(3), { type: 'heading_2' }));
      } else if (line.startsWith('# ')) {
        blocks.push(this.createTextBlock(line.substring(2), { type: 'heading_1' }));
      } else if (line.trim() === '') {
        // Skip empty lines or add them as spacing if needed
        continue;
      } else {
        // Regular paragraph
        blocks.push(this.createTextBlock(line));
      }
    }

    // Handle unclosed code block
    if (inCodeBlock && codeBlockLines.length > 0) {
      const codeBlocks = this.createCodeBlock(codeBlockLines.join('\n'), codeLanguage);
      blocks.push(...codeBlocks);
    }

    return blocks;
  }

  /**
   * Chunk content into manageable pieces
   */
  private chunkContent(content: string, maxSize: number): string[] {
    if (content.length <= maxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + maxSize, content.length);
      
      // Try to break at a newline near the limit
      if (end < content.length) {
        const newlineIndex = content.lastIndexOf('\n', end);
        if (newlineIndex > start) {
          end = newlineIndex;
        }
      }

      chunks.push(content.substring(start, end));
      start = end + (content[end] === '\n' ? 1 : 0); // Skip the newline
    }

    return chunks;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Normalize language names for Notion code blocks
   */
  private normalizeLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'yml': 'yaml',
      'md': 'markdown',
    };

    const normalized = language.toLowerCase().replace('.', '');
    return languageMap[normalized] || normalized;
  }
}