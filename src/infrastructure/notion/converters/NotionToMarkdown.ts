import { Client } from '@notionhq/client';
import { 
  ConversionResult, 
  ConversionOptions, 
  NotionBlockData 
} from './ConversionTypes.js';

/**
 * Notion to Markdown converter
 * Handles retrieving Notion pages and converting blocks to markdown format
 */
export class NotionToMarkdownConverter {
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
      // Get page info
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      
      // Get page blocks
      const blocks = await this.getAllBlocks(pageId);
      
      // Convert to markdown
      const markdown = await this.blocksToMarkdown(blocks, options);
      
      // Extract metadata
      const metadata = this.extractPageMetadata(page);
      
      return {
        success: true,
        content: markdown,
        metadata: options.includeMetadata ? metadata : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert Notion blocks to markdown string
   */
  private async blocksToMarkdown(
    blocks: any[], 
    options: ConversionOptions = {},
    depth: number = 0
  ): Promise<string> {
    const markdownLines: string[] = [];
    const maxDepth = options.maxDepth || 10;

    if (depth > maxDepth) {
      return '<!-- Max depth exceeded -->';
    }

    for (const block of blocks) {
      const markdown = await this.blockToMarkdown(block, options, depth);
      if (markdown) {
        markdownLines.push(markdown);
      }

      // Handle child blocks recursively
      if (block.has_children && depth < maxDepth) {
        const childBlocks = await this.getChildBlocks(block.id);
        if (childBlocks.length > 0) {
          const childMarkdown = await this.blocksToMarkdown(childBlocks, options, depth + 1);
          if (childMarkdown.trim()) {
            // Indent child content for nested blocks
            const indentedChild = childMarkdown
              .split('\n')
              .map(line => line ? '  ' + line : line)
              .join('\n');
            markdownLines.push(indentedChild);
          }
        }
      }
    }

    return markdownLines.join('\n\n').trim();
  }

  /**
   * Convert individual block to markdown
   */
  private async blockToMarkdown(
    block: any, 
    options: ConversionOptions = {},
    depth: number = 0
  ): Promise<string> {
    const { type } = block;
    const blockData = block[type];

    // Handle custom block handlers
    if (options.customBlockHandlers?.has(type)) {
      const customHandler = options.customBlockHandlers.get(type);
      if (customHandler) {
        return customHandler(block);
      }
    }

    switch (type) {
      case 'paragraph':
        return this.richTextToMarkdown(blockData.rich_text || []);

      case 'heading_1':
        return `# ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'heading_2':
        return `## ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'heading_3':
        return `### ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'bulleted_list_item':
        return `- ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'numbered_list_item':
        return `1. ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'to_do':
        const checkbox = blockData.checked ? '[x]' : '[ ]';
        return `- ${checkbox} ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'toggle':
        return `<details>\n<summary>${this.richTextToMarkdown(blockData.rich_text || [])}</summary>\n</details>`;

      case 'quote':
        return `> ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'code':
        const language = blockData.language || 'text';
        const codeText = this.richTextToMarkdown(blockData.rich_text || []);
        return `\`\`\`${language}\n${codeText}\n\`\`\``;

      case 'callout':
        const icon = blockData.icon?.emoji || '💡';
        return `> ${icon} ${this.richTextToMarkdown(blockData.rich_text || [])}`;

      case 'divider':
        return '---';

      case 'image':
        const imageUrl = blockData.file?.url || blockData.external?.url || '';
        const imageCaption = this.richTextToMarkdown(blockData.caption || []);
        return imageCaption ? `![${imageCaption}](${imageUrl})` : `![](${imageUrl})`;

      case 'file':
        const fileUrl = blockData.file?.url || blockData.external?.url || '';
        const fileName = blockData.name || 'File';
        return `[${fileName}](${fileUrl})`;

      case 'bookmark':
      case 'link_preview':
        const url = blockData.url || '';
        return url ? `[${url}](${url})` : '';

      case 'equation':
        return `$$${blockData.expression}$$`;

      case 'table':
        return await this.tableToMarkdown(block);

      case 'child_page':
        return `[${blockData.title}](notion://page/${block.id})`;

      case 'child_database':
        return `[Database: ${blockData.title}](notion://database/${block.id})`;

      case 'embed':
      case 'video':
      case 'audio':
        const embedUrl = blockData.url || '';
        return embedUrl ? `[${type.toUpperCase()}](${embedUrl})` : '';

      default:
        // Fallback for unsupported blocks
        if (blockData?.rich_text) {
          return this.richTextToMarkdown(blockData.rich_text);
        }
        return `<!-- Unsupported block type: ${type} -->`;
    }
  }

  /**
   * Convert rich text to markdown
   */
  private richTextToMarkdown(richText: any[]): string {
    return richText.map(text => {
      let content = text.plain_text || text.text?.content || '';
      
      if (text.annotations) {
        const { bold, italic, code, strikethrough, underline } = text.annotations;
        
        if (code) {
          content = `\`${content}\``;
        }
        if (bold) {
          content = `**${content}**`;
        }
        if (italic) {
          content = `*${content}*`;
        }
        if (strikethrough) {
          content = `~~${content}~~`;
        }
        if (underline) {
          content = `<u>${content}</u>`;
        }
      }

      // Handle links
      if (text.href) {
        content = `[${content}](${text.href})`;
      }

      return content;
    }).join('');
  }

  /**
   * Convert table to markdown
   */
  private async tableToMarkdown(tableBlock: any): Promise<string> {
    try {
      const tableRows = await this.getChildBlocks(tableBlock.id);
      if (tableRows.length === 0) return '';

      const markdownRows: string[] = [];
      
      for (let i = 0; i < tableRows.length; i++) {
        const row = tableRows[i];
        if (row.type === 'table_row') {
          const cells = row.table_row.cells || [];
          const cellTexts = cells.map((cell: any) => this.richTextToMarkdown(cell));
          markdownRows.push(`| ${cellTexts.join(' | ')} |`);
          
          // Add header separator after first row
          if (i === 0) {
            const separator = cells.map(() => '---').join(' | ');
            markdownRows.push(`| ${separator} |`);
          }
        }
      }

      return markdownRows.join('\n');
    } catch (error) {
      return '<!-- Table conversion failed -->';
    }
  }

  /**
   * Get all blocks from a page with pagination
   */
  private async getAllBlocks(pageId: string): Promise<any[]> {
    const blocks: any[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      blocks.push(...response.results);
      cursor = response.next_cursor || undefined;
    } while (cursor);

    return blocks;
  }

  /**
   * Get child blocks of a parent block
   */
  private async getChildBlocks(blockId: string): Promise<any[]> {
    try {
      const response = await this.notion.blocks.children.list({
        block_id: blockId,
        page_size: 100,
      });
      return response.results;
    } catch (error) {
      console.warn(`Failed to get child blocks for ${blockId}:`, error);
      return [];
    }
  }

  /**
   * Extract metadata from a Notion page
   */
  private extractPageMetadata(page: any): any {
    const properties = page.properties || {};
    const metadata: any = {
      pageId: page.id,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };

    // Extract title from properties
    for (const [key, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'title') {
        const title = ((prop as any).title || [])
          .map((text: any) => text.plain_text)
          .join('');
        if (title) {
          metadata.title = title;
          break;
        }
      }
    }

    return metadata;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Determine document type from title and file path
   */
  private determineDocumentType(title: string, filePath?: string): string {
    const titleLower = title.toLowerCase();
    const pathLower = filePath?.toLowerCase() || '';

    if (titleLower.includes('readme') || pathLower.includes('readme')) {
      return 'README';
    }
    if (titleLower.includes('api') || pathLower.includes('api')) {
      return 'API Documentation';
    }
    if (titleLower.includes('guide') || titleLower.includes('tutorial')) {
      return 'User Guide';
    }
    if (titleLower.includes('spec') || titleLower.includes('specification')) {
      return 'Technical Spec';
    }
    if (pathLower.includes('docs/') || pathLower.includes('documentation/')) {
      return 'Technical Spec';
    }

    return 'Other';
  }
}