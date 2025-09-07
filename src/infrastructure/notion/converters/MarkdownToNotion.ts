import { Client } from '@notionhq/client';
import { 
  ConversionResult, 
  ConversionOptions, 
  NOTION_BLOCK_TYPES, 
  MARKDOWN_PATTERNS 
} from './ConversionTypes.js';
import { ContentChunker } from './ContentChunker.js';

/**
 * Markdown to Notion blocks converter
 * Handles parsing markdown content and converting to Notion block format
 */
export class MarkdownToNotionConverter {
  private notion: Client;
  private contentChunker: ContentChunker;

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
    this.contentChunker = new ContentChunker();
  }

  /**
   * Convert markdown to Notion page
   */
  async markdownToNotion(
    markdown: string,
    parentId: string,
    title: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      // Parse markdown to blocks
      const blocks = this.markdownToBlocks(markdown, options);
      
      // Create page properties
      const pageProperties = {
        title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      };

      // Handle blocks in chunks if they exceed Notion's limit (100 blocks)
      const MAX_BLOCKS_PER_REQUEST = 100;
      let pageId: string;
      
      if (blocks.length <= MAX_BLOCKS_PER_REQUEST) {
        // Create page with all blocks at once
        const createPageParams: any = {
          parent: { page_id: parentId },
          properties: pageProperties,
          children: blocks
        };
        
        const page = await this.notion.pages.create(createPageParams);
        pageId = page.id;
      } else {
        // Create page with initial blocks, then append remaining blocks
        const initialBlocks = blocks.slice(0, MAX_BLOCKS_PER_REQUEST);
        const remainingBlocks = blocks.slice(MAX_BLOCKS_PER_REQUEST);
        
        const createPageParams: any = {
          parent: { page_id: parentId },
          properties: pageProperties,
          children: initialBlocks
        };
        
        const page = await this.notion.pages.create(createPageParams);
        pageId = page.id;
        
        // Add remaining blocks in chunks
        for (let i = 0; i < remainingBlocks.length; i += MAX_BLOCKS_PER_REQUEST) {
          const chunk = remainingBlocks.slice(i, i + MAX_BLOCKS_PER_REQUEST);
          await this.notion.blocks.children.append({
            block_id: pageId,
            children: chunk
          });
        }
      }
      
      return {
        success: true,
        blocks,
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
   * Convert markdown string to Notion blocks array
   */
  markdownToBlocks(markdown: string, options: ConversionOptions = {}): any[] {
    const lines = markdown.split('\n');
    const blocks: any[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      // Skip empty lines
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Handle headings
      if (MARKDOWN_PATTERNS.HEADING_1.test(line)) {
        const match = line.match(MARKDOWN_PATTERNS.HEADING_1);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 1));
        }
        i++;
        continue;
      }

      if (MARKDOWN_PATTERNS.HEADING_2.test(line)) {
        const match = line.match(MARKDOWN_PATTERNS.HEADING_2);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 2));
        }
        i++;
        continue;
      }

      if (MARKDOWN_PATTERNS.HEADING_3.test(line)) {
        const match = line.match(MARKDOWN_PATTERNS.HEADING_3);
        if (match) {
          blocks.push(this.createHeadingBlock(match[1], 3));
        }
        i++;
        continue;
      }

      // Handle code blocks
      if (line.startsWith('```')) {
        const codeBlockResult = this.parseCodeBlock(lines, i);
        blocks.push(...codeBlockResult.blocks);
        i = codeBlockResult.nextIndex;
        continue;
      }

      // Handle quotes
      if (MARKDOWN_PATTERNS.QUOTE.test(line)) {
        const match = line.match(MARKDOWN_PATTERNS.QUOTE);
        if (match) {
          blocks.push(this.createQuoteBlock(match[1]));
        }
        i++;
        continue;
      }

      // Handle lists
      if (MARKDOWN_PATTERNS.BULLET_LIST.test(line)) {
        const listResult = this.parseList(lines, i, 'bulleted');
        blocks.push(...listResult.blocks);
        i = listResult.nextIndex;
        continue;
      }

      if (MARKDOWN_PATTERNS.NUMBER_LIST.test(line)) {
        const listResult = this.parseList(lines, i, 'numbered');
        blocks.push(...listResult.blocks);
        i = listResult.nextIndex;
        continue;
      }

      // Handle checkboxes
      if (MARKDOWN_PATTERNS.CHECKBOX_CHECKED.test(line) || MARKDOWN_PATTERNS.CHECKBOX_UNCHECKED.test(line)) {
        const isChecked = MARKDOWN_PATTERNS.CHECKBOX_CHECKED.test(line);
        const match = line.match(isChecked ? MARKDOWN_PATTERNS.CHECKBOX_CHECKED : MARKDOWN_PATTERNS.CHECKBOX_UNCHECKED);
        if (match) {
          blocks.push(this.createCheckboxBlock(match[1], isChecked));
        }
        i++;
        continue;
      }

      // Handle horizontal rule/divider
      if (line.trim() === '---' || line.trim() === '***') {
        blocks.push(this.createDividerBlock());
        i++;
        continue;
      }

      // Default to paragraph
      blocks.push(this.createParagraphBlock(line));
      i++;
    }

    return blocks;
  }

  /**
   * Create heading block
   */
  private createHeadingBlock(text: string, level: 1 | 2 | 3): any {
    const types = ['heading_1', 'heading_2', 'heading_3'];
    const type = types[level - 1];
    
    return {
      object: 'block',
      type,
      [type]: {
        rich_text: this.parseRichText(text)
      }
    };
  }

  /**
   * Create paragraph block
   */
  private createParagraphBlock(text: string): any {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: this.parseRichText(text)
      }
    };
  }

  /**
   * Create quote block
   */
  private createQuoteBlock(text: string): any {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: this.parseRichText(text)
      }
    };
  }

  /**
   * Create checkbox block
   */
  private createCheckboxBlock(text: string, checked: boolean): any {
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: this.parseRichText(text),
        checked
      }
    };
  }

  /**
   * Create divider block
   */
  private createDividerBlock(): any {
    return {
      object: 'block',
      type: 'divider',
      divider: {}
    };
  }

  /**
   * Parse code block with language detection
   */
  private parseCodeBlock(lines: string[], startIndex: number): { blocks: any[], nextIndex: number } {
    const startLine = lines[startIndex];
    const language = startLine.replace('```', '').trim() || 'plain text';
    
    let endIndex = startIndex + 1;
    const codeLines: string[] = [];
    
    while (endIndex < lines.length && !lines[endIndex].startsWith('```')) {
      codeLines.push(lines[endIndex]);
      endIndex++;
    }
    
    const code = codeLines.join('\n');
    
    // Handle large code blocks by chunking
    if (code.length > 2000) {
      const chunks = this.contentChunker.chunkContent(code, 2000);
      return {
        blocks: chunks.chunks.map(chunk => this.createCodeBlock(chunk, language)),
        nextIndex: endIndex + 1
      };
    }
    
    return {
      blocks: [this.createCodeBlock(code, language)],
      nextIndex: endIndex + 1
    };
  }

  /**
   * Create code block
   */
  private createCodeBlock(code: string, language: string): any {
    return {
      object: 'block',
      type: 'code',
      code: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: code
            }
          }
        ],
        language: language.toLowerCase()
      }
    };
  }

  /**
   * Parse list items
   */
  private parseList(lines: string[], startIndex: number, type: 'bulleted' | 'numbered'): { blocks: any[], nextIndex: number } {
    const blocks: any[] = [];
    let i = startIndex;
    
    const pattern = type === 'bulleted' ? MARKDOWN_PATTERNS.BULLET_LIST : MARKDOWN_PATTERNS.NUMBER_LIST;
    
    while (i < lines.length && pattern.test(lines[i])) {
      const match = lines[i].match(pattern);
      if (match) {
        blocks.push(this.createListItemBlock(match[1], type));
      }
      i++;
    }
    
    return { blocks, nextIndex: i };
  }

  /**
   * Create list item block
   */
  private createListItemBlock(text: string, type: 'bulleted' | 'numbered'): any {
    const blockType = type === 'bulleted' ? 'bulleted_list_item' : 'numbered_list_item';
    
    return {
      object: 'block',
      type: blockType,
      [blockType]: {
        rich_text: this.parseRichText(text)
      }
    };
  }

  /**
   * Parse rich text with formatting
   */
  private parseRichText(text: string): any[] {
    // Simple implementation - can be enhanced for complex formatting
    return [
      {
        type: 'text',
        text: {
          content: text
        }
      }
    ];
  }
}