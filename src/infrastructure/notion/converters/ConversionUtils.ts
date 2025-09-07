import path from 'path';

/**
 * Conversion utilities for text analysis and validation
 * Handles integrity analysis, metadata extraction, and text processing
 */
export class ConversionUtils {
  
  /**
   * Count words in text content
   */
  static countWords(content: string): number {
    const words = content
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Determine document type from title and file path
   */
  static determineDocumentType(title: string, filePath?: string): string {
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

  /**
   * Extract title from Notion page properties
   */
  static extractTitle(properties: any): string {
    for (const [key, prop] of Object.entries(properties as any)) {
      if ((prop as any).type === 'title') {
        return (prop as any).title?.map((t: any) => t.plain_text).join('') || 'Untitled';
      }
    }
    return 'Untitled';
  }

  /**
   * Extract metadata from Notion page
   */
  static extractPageMetadata(page: any): any {
    return {
      pageId: page.id,
      title: ConversionUtils.extractTitle(page.properties),
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }

  /**
   * Analyze conversion integrity between original and converted text
   */
  static analyzeIntegrity(original: string, converted: string): {
    passed: boolean;
    issues: string[];
    similarity: number;
  } {
    const issues: string[] = [];
    
    // Basic length comparison
    const lengthDiff = Math.abs(original.length - converted.length);
    const lengthSimilarity = 1 - (lengthDiff / Math.max(original.length, converted.length));
    
    if (lengthSimilarity < 0.8) {
      issues.push(`Significant length difference: ${lengthDiff} characters`);
    }

    // Line count comparison
    const originalLines = original.split('\n').length;
    const convertedLines = converted.split('\n').length;
    const lineDiff = Math.abs(originalLines - convertedLines);
    
    if (lineDiff > originalLines * 0.2) {
      issues.push(`Line count difference: ${lineDiff} lines`);
    }

    // Simple text similarity (Jaccard similarity on words)
    const similarity = ConversionUtils.calculateJaccardSimilarity(original, converted);
    
    if (similarity < 0.7) {
      issues.push(`Low text similarity: ${(similarity * 100).toFixed(1)}%`);
    }

    return {
      passed: issues.length === 0 && similarity > 0.8,
      issues,
      similarity: Math.round(similarity * 100) / 100
    };
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  static calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Create database entry properties with metadata
   */
  static createDatabaseProperties(
    title: string, 
    content: string, 
    filePath?: string
  ): any {
    const wordCount = ConversionUtils.countWords(content);
    const documentType = ConversionUtils.determineDocumentType(title, filePath);

    const properties: any = {
      Name: {
        title: [
          {
            text: {
              content: title
            }
          }
        ]
      },
      Status: {
        select: {
          name: "Published"
        }
      },
      Type: {
        select: {
          name: documentType
        }
      },
      "Word Count": {
        number: wordCount
      },
      "Reading Time": {
        number: Math.ceil(wordCount / 200) // 200 words per minute
      },
      "Last Updated": {
        date: {
          start: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        }
      }
    };
    
    // Add File Path if provided
    if (filePath) {
      properties["File Path"] = {
        rich_text: [
          {
            text: {
              content: filePath
            }
          }
        ]
      };
    }

    return properties;
  }

  /**
   * Create page properties for simple page creation
   */
  static createPageProperties(title: string): any {
    return {
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
  }

  /**
   * Add delay for rate limiting
   */
  static async addDelay(baseMs: number = 1000, randomMs: number = 500): Promise<void> {
    const delay = baseMs + Math.random() * randomMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  static calculateBackoffDelay(retryCount: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  /**
   * Handle retry logic with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 1000
  ): Promise<T> {
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          throw error;
        }
        
        if (error.code === 'rate_limited' || error.status === 429) {
          const delay = ConversionUtils.calculateBackoffDelay(retryCount, baseDelay);
          console.log(`🛑 Rate limit hit, backing off for ${Math.round(delay)}ms... (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Other errors, shorter delay
          await new Promise(resolve => setTimeout(resolve, baseDelay * retryCount));
        }
      }
    }
    
    throw new Error(`Operation failed after ${maxRetries} retries`);
  }

  /**
   * Parse frontmatter from markdown content
   */
  static parseFrontmatter(markdown: string): { content: string; data: any } {
    try {
      const matter = require('gray-matter');
      const parsed = matter(markdown);
      return {
        content: parsed.content,
        data: parsed.data
      };
    } catch (error) {
      // Fallback if gray-matter is not available
      return {
        content: markdown,
        data: {}
      };
    }
  }

  /**
   * Validate block structure and content
   */
  static validateBlocks(blocks: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      if (!block.object || block.object !== 'block') {
        errors.push(`Block ${i}: Missing or invalid object property`);
      }
      
      if (!block.type) {
        errors.push(`Block ${i}: Missing block type`);
      }
      
      if (block.type && !block[block.type]) {
        errors.push(`Block ${i}: Missing ${block.type} property`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean and optimize blocks for Notion API
   */
  static cleanBlocks(blocks: any[]): any[] {
    return blocks.filter(block => {
      // Remove invalid blocks
      if (!block.type || !block[block.type]) {
        return false;
      }
      
      // Check if block has meaningful content
      const blockData = block[block.type];
      if (blockData.rich_text) {
        const hasContent = blockData.rich_text.some((rt: any) => 
          rt.text?.content && rt.text.content.trim().length > 0
        );
        return hasContent || block.type === 'divider';
      }
      
      return true;
    });
  }
}