import { Client } from '@notionhq/client';
import { NotionToMarkdownConverter } from './NotionToMarkdown.js';
import { MarkdownToNotionConverter } from './MarkdownToNotion.js';
import { ConversionUtils } from './ConversionUtils.js';
import { 
  ConversionResult, 
  ConversionOptions, 
  NOTION_LIMITS 
} from './ConversionTypes.js';

/**
 * Main facade for Notion-Markdown conversion operations
 * Provides a unified interface for all conversion functionality
 */
export class NotionMarkdownConverter {
  private notion: Client;
  private notionToMarkdown: NotionToMarkdownConverter;
  private markdownToNotion: MarkdownToNotionConverter;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
    this.notionToMarkdown = new NotionToMarkdownConverter(apiKey);
    this.markdownToNotion = new MarkdownToNotionConverter(apiKey);
  }

  /**
   * Convert Notion page to Markdown
   */
  async notionToMarkdown(
    pageId: string, 
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    return this.notionToMarkdown.notionToMarkdown(pageId, options);
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
    return this.markdownToNotion.markdownToNotion(markdown, parentId, title, options);
  }

  /**
   * Convert Markdown to Notion database entry with enhanced metadata
   */
  async markdownToDatabaseEntry(
    markdown: string,
    databaseId: string,
    title: string,
    options: ConversionOptions = {},
    filePath?: string
  ): Promise<ConversionResult> {
    try {
      // Parse frontmatter and extract content
      const { content: contentOnly, data: frontmatterData } = ConversionUtils.parseFrontmatter(markdown);
      
      // Parse markdown to blocks
      const blocks = this.markdownToNotion.markdownToBlocks(contentOnly, options);
      
      // Clean and validate blocks
      const cleanedBlocks = ConversionUtils.cleanBlocks(blocks);
      const validation = ConversionUtils.validateBlocks(cleanedBlocks);
      
      if (!validation.valid) {
        return {
          success: false,
          error: `Block validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create database entry properties with metadata
      const pageProperties = ConversionUtils.createDatabaseProperties(title, contentOnly, filePath);
      
      // Merge frontmatter data if available
      if (frontmatterData && Object.keys(frontmatterData).length > 0) {
        // Add frontmatter data to properties where possible
        Object.entries(frontmatterData).forEach(([key, value]) => {
          if (typeof value === 'string' && !pageProperties[key]) {
            pageProperties[key] = {
              rich_text: [{ text: { content: value } }]
            };
          }
        });
      }

      // Handle blocks in chunks if they exceed Notion's limit
      let pageId: string;
      
      if (cleanedBlocks.length <= NOTION_LIMITS.MAX_BLOCKS_PER_REQUEST) {
        // Create database entry with all blocks at once
        const createPageParams: any = {
          parent: { database_id: databaseId },
          properties: pageProperties,
          children: cleanedBlocks
        };
        
        const page = await this.notion.pages.create(createPageParams);
        pageId = page.id;
      } else {
        // Create database entry with initial blocks, then append remaining blocks
        const initialBlocks = cleanedBlocks.slice(0, NOTION_LIMITS.MAX_BLOCKS_PER_REQUEST);
        const remainingBlocks = cleanedBlocks.slice(NOTION_LIMITS.MAX_BLOCKS_PER_REQUEST);
        
        const createPageParams: any = {
          parent: { database_id: databaseId },
          properties: pageProperties,
          children: initialBlocks
        };
        
        const page = await this.notion.pages.create(createPageParams);
        pageId = page.id;
        
        // Add remaining blocks in chunks with retry logic
        await this.appendBlocksInChunks(pageId, remainingBlocks);
      }

      return {
        success: true,
        blocks: cleanedBlocks,
        metadata: {
          pageId: pageId,
          title,
          createdTime: new Date().toISOString(),
          lastEditedTime: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Round-trip test: Notion -> Markdown -> Notion
   */
  async testRoundTrip(
    sourcePageId: string,
    testParentId: string,
    testTitle: string = 'Round Trip Test'
  ): Promise<{
    original: ConversionResult;
    markdown: ConversionResult;
    recreated: ConversionResult;
    integrity: {
      passed: boolean;
      issues: string[];
      similarity: number;
    };
  }> {
    // Step 1: Notion -> Markdown
    const original = await this.notionToMarkdown(sourcePageId, { 
      includeMetadata: true 
    });
    
    if (!original.success || !original.content) {
      return {
        original,
        markdown: { success: false, error: 'Failed to convert to markdown' },
        recreated: { success: false, error: 'Failed to convert to markdown' },
        integrity: { passed: false, issues: ['Initial conversion failed'], similarity: 0 }
      };
    }

    // Step 2: Markdown -> Notion
    const recreated = await this.markdownToNotion(
      original.content,
      testParentId,
      testTitle
    );

    // Step 3: Get recreated page as markdown for comparison
    let roundTripMarkdown: ConversionResult = { success: false };
    if (recreated.success && recreated.metadata?.pageId) {
      // Wait a moment for Notion to process
      await ConversionUtils.addDelay(1000);
      roundTripMarkdown = await this.notionToMarkdown(recreated.metadata.pageId);
    }

    // Step 4: Analyze integrity
    const integrity = ConversionUtils.analyzeIntegrity(
      original.content,
      roundTripMarkdown.content || ''
    );

    return {
      original,
      markdown: roundTripMarkdown,
      recreated,
      integrity
    };
  }

  /**
   * Batch convert multiple markdown files to database entries
   */
  async batchMarkdownToDatabaseEntry(
    entries: Array<{
      markdown: string;
      title: string;
      filePath?: string;
    }>,
    databaseId: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Add delay between requests to respect rate limits
      if (i > 0) {
        await ConversionUtils.addDelay(500, 300);
      }
      
      try {
        const result = await this.markdownToDatabaseEntry(
          entry.markdown,
          databaseId,
          entry.title,
          options,
          entry.filePath
        );
        results.push(result);
        
        console.log(`✅ Converted ${i + 1}/${entries.length}: ${entry.title}`);
      } catch (error) {
        const errorResult: ConversionResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        
        console.log(`❌ Failed ${i + 1}/${entries.length}: ${entry.title} - ${errorResult.error}`);
      }
    }
    
    return results;
  }

  /**
   * Get conversion statistics
   */
  static getConversionStats(results: ConversionResult[]): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    errors: string[];
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');
    
    return {
      total: results.length,
      successful,
      failed,
      successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
      errors
    };
  }

  /**
   * Append blocks to a page in chunks with retry logic
   */
  private async appendBlocksInChunks(pageId: string, blocks: any[]): Promise<void> {
    const chunks = [];
    for (let i = 0; i < blocks.length; i += NOTION_LIMITS.MAX_BLOCKS_PER_REQUEST) {
      chunks.push(blocks.slice(i, i + NOTION_LIMITS.MAX_BLOCKS_PER_REQUEST));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Add delay between chunks to respect rate limits
      if (i > 0) {
        await ConversionUtils.addDelay();
      }
      
      await ConversionUtils.retryWithBackoff(async () => {
        await this.notion.blocks.children.append({
          block_id: pageId,
          children: chunk
        });
      });
    }
  }
}

// For backward compatibility
export default NotionMarkdownConverter;