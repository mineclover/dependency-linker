import { NotionBlockData, SerializationOptions } from './ConversionTypes.js';

/**
 * Block serialization utilities for Notion blocks
 * Handles serialization, validation, and transformation of block structures
 */
export class BlockSerializer {
  
  /**
   * Serialize Notion blocks to a standardized format
   */
  serializeBlocks(blocks: any[], options: SerializationOptions = {}): NotionBlockData[] {
    const { maxDepth = 10, includeChildren = true, preserveIds = true } = options;
    
    return blocks.map(block => this.serializeBlock(block, options, 0, maxDepth));
  }

  /**
   * Serialize a single block
   */
  private serializeBlock(
    block: any, 
    options: SerializationOptions, 
    currentDepth: number, 
    maxDepth: number
  ): NotionBlockData {
    const serialized: NotionBlockData = {
      id: options.preserveIds ? block.id : this.generateId(),
      type: block.type,
      content: this.extractBlockContent(block),
    };

    // Handle children if enabled and within depth limit
    if (options.includeChildren && currentDepth < maxDepth && block.has_children) {
      serialized.hasMore = true;
      // Note: In real implementation, we'd fetch children here
      // This is a placeholder for the structure
    }

    return serialized;
  }

  /**
   * Extract content from a block based on its type
   */
  private extractBlockContent(block: any): any {
    const { type } = block;
    const blockData = block[type];

    if (!blockData) return null;

    switch (type) {
      case 'paragraph':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'to_do':
      case 'toggle':
      case 'quote':
        return {
          rich_text: blockData.rich_text || [],
          ...(type === 'to_do' && { checked: blockData.checked }),
        };

      case 'code':
        return {
          rich_text: blockData.rich_text || [],
          language: blockData.language || 'plain text',
        };

      case 'callout':
        return {
          rich_text: blockData.rich_text || [],
          icon: blockData.icon,
          color: blockData.color,
        };

      case 'image':
      case 'file':
      case 'video':
      case 'audio':
        return {
          type: blockData.type,
          url: blockData.file?.url || blockData.external?.url,
          caption: blockData.caption || [],
          ...(type === 'file' && { name: blockData.name }),
        };

      case 'bookmark':
      case 'link_preview':
        return {
          url: blockData.url,
          caption: blockData.caption || [],
        };

      case 'equation':
        return {
          expression: blockData.expression,
        };

      case 'divider':
        return {};

      case 'table':
        return {
          table_width: blockData.table_width,
          has_column_header: blockData.has_column_header,
          has_row_header: blockData.has_row_header,
        };

      case 'table_row':
        return {
          cells: blockData.cells || [],
        };

      case 'column_list':
        return {
          children_count: blockData.children?.length || 0,
        };

      case 'column':
        return {};

      case 'child_page':
        return {
          title: blockData.title,
        };

      case 'child_database':
        return {
          title: blockData.title,
        };

      case 'embed':
        return {
          url: blockData.url,
          caption: blockData.caption || [],
        };

      default:
        // Return raw data for unsupported types
        return blockData;
    }
  }

  /**
   * Deserialize blocks back to Notion format
   */
  deserializeBlocks(serializedBlocks: NotionBlockData[]): any[] {
    return serializedBlocks.map(block => this.deserializeBlock(block));
  }

  /**
   * Deserialize a single block
   */
  private deserializeBlock(serialized: NotionBlockData): any {
    const { type, content } = serialized;
    
    const block: any = {
      object: 'block',
      type,
      [type]: content || {},
    };

    // Add ID if preserving IDs
    if (serialized.id) {
      block.id = serialized.id;
    }

    return block;
  }

  /**
   * Validate block structure
   */
  validateBlock(block: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!block.type) {
      errors.push('Block type is required');
    }

    if (!block.object || block.object !== 'block') {
      errors.push('Block object must be "block"');
    }

    // Type-specific validation
    if (block.type && !this.isValidBlockType(block.type)) {
      errors.push(`Invalid block type: ${block.type}`);
    }

    // Content validation
    const contentErrors = this.validateBlockContent(block);
    errors.push(...contentErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate block content based on type
   */
  private validateBlockContent(block: any): string[] {
    const errors: string[] = [];
    const { type } = block;
    const blockData = block[type];

    if (!blockData) {
      errors.push(`Missing content for block type: ${type}`);
      return errors;
    }

    switch (type) {
      case 'paragraph':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'bulleted_list_item':
      case 'numbered_list_item':
      case 'quote':
        if (!Array.isArray(blockData.rich_text)) {
          errors.push(`${type} block must have rich_text array`);
        }
        break;

      case 'code':
        if (!Array.isArray(blockData.rich_text)) {
          errors.push('Code block must have rich_text array');
        }
        if (blockData.language && typeof blockData.language !== 'string') {
          errors.push('Code block language must be a string');
        }
        break;

      case 'to_do':
        if (!Array.isArray(blockData.rich_text)) {
          errors.push('To-do block must have rich_text array');
        }
        if (typeof blockData.checked !== 'boolean') {
          errors.push('To-do block must have boolean checked property');
        }
        break;

      case 'image':
      case 'file':
      case 'video':
      case 'audio':
        if (!blockData.file && !blockData.external) {
          errors.push(`${type} block must have file or external property`);
        }
        break;

      case 'equation':
        if (!blockData.expression || typeof blockData.expression !== 'string') {
          errors.push('Equation block must have expression string');
        }
        break;
    }

    return errors;
  }

  /**
   * Check if block type is valid
   */
  private isValidBlockType(type: string): boolean {
    const validTypes = [
      'paragraph', 'heading_1', 'heading_2', 'heading_3',
      'bulleted_list_item', 'numbered_list_item', 'to_do',
      'toggle', 'code', 'quote', 'callout', 'divider',
      'image', 'file', 'video', 'audio', 'bookmark',
      'link_preview', 'equation', 'table', 'table_row',
      'column_list', 'column', 'child_page', 'child_database',
      'embed', 'breadcrumb', 'table_of_contents',
      'link_to_page', 'synced_block', 'template',
    ];

    return validTypes.includes(type);
  }

  /**
   * Generate a unique ID for blocks
   */
  private generateId(): string {
    return 'block_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clean blocks by removing invalid or empty content
   */
  cleanBlocks(blocks: any[]): any[] {
    return blocks
      .filter(block => this.isValidBlock(block))
      .map(block => this.cleanBlock(block));
  }

  /**
   * Check if a block is valid and has content
   */
  private isValidBlock(block: any): boolean {
    if (!block || !block.type) return false;

    const blockData = block[block.type];
    if (!blockData) return false;

    // Check if block has meaningful content
    if (blockData.rich_text) {
      const hasText = blockData.rich_text.some((rt: any) => 
        rt.plain_text && rt.plain_text.trim().length > 0
      );
      if (!hasText && block.type !== 'divider') return false;
    }

    return true;
  }

  /**
   * Clean individual block
   */
  private cleanBlock(block: any): any {
    const cleaned = { ...block };
    const blockData = cleaned[block.type];

    if (blockData?.rich_text) {
      // Remove empty rich text elements
      blockData.rich_text = blockData.rich_text.filter((rt: any) => 
        rt.plain_text && rt.plain_text.trim().length > 0
      );
    }

    return cleaned;
  }

  /**
   * Convert blocks to a flat structure for easier processing
   */
  flattenBlocks(blocks: any[], includeChildren: boolean = true): any[] {
    const flattened: any[] = [];

    for (const block of blocks) {
      flattened.push(block);
      
      if (includeChildren && block.children) {
        flattened.push(...this.flattenBlocks(block.children, includeChildren));
      }
    }

    return flattened;
  }

  /**
   * Group blocks by type for batch processing
   */
  groupBlocksByType(blocks: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const block of blocks) {
      if (!grouped[block.type]) {
        grouped[block.type] = [];
      }
      grouped[block.type].push(block);
    }

    return grouped;
  }
}