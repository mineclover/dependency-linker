/**
 * Enhanced Markdown Processor - Compatibility Replacement
 * Provides enhanced markdown processing functionality for testing compatibility
 */

export interface ParsedMarkdown {
  content: string;
  data: any;
  isEmpty?: boolean;
  wordCount?: number;
  readingTime?: number;
}

export interface NotionMetadata {
  notion_id?: string;
  title?: string;
  created?: string;
  last_edited?: string;
  last_synced?: string;
  word_count?: number;
  reading_time_minutes?: number;
  tags?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced markdown processor for compatibility
 * This is a comprehensive implementation to replace the missing EnhancedMarkdownProcessor
 */
export class SimpleMarkdownProcessor {
  /**
   * Parse markdown content and extract metadata
   */
  parse(content: string): ParsedMarkdown {
    // Check if empty
    const trimmed = content.trim();
    if (!trimmed) {
      return {
        content: '',
        data: {},
        isEmpty: true,
        wordCount: 0,
        readingTime: 0
      };
    }

    // Simple frontmatter extraction
    const lines = content.split('\n');
    let dataEndIndex = -1;
    let data: any = {};
    
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          dataEndIndex = i;
          break;
        }
        
        // Enhanced key: value parsing
        const match = lines[i].match(/^(\w+):\s*(.+)$/);
        if (match) {
          let value = match[2].replace(/['"]/g, '');
          // Handle arrays (simple case)
          if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(s => s.trim());
          }
          data[match[1]] = value;
        }
      }
    }
    
    const actualContent = dataEndIndex >= 0 
      ? lines.slice(dataEndIndex + 1).join('\n')
      : content;

    // Calculate word count and reading time
    const wordCount = this.countWords(actualContent);
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    return {
      content: actualContent,
      data,
      isEmpty: false,
      wordCount,
      readingTime
    };
  }
  
  /**
   * Extract Notion metadata from markdown
   */
  extractNotionMetadata(content: string): NotionMetadata {
    const parsed = this.parse(content);
    
    // Look for Notion ID in frontmatter
    let notionId = parsed.data.notion_id || parsed.data.notionId;
    
    // Look for Notion ID in HTML comment
    if (!notionId) {
      const htmlCommentMatch = content.match(/<!--\s*notion[_-]id:\s*([a-f0-9-]+)\s*-->/i);
      if (htmlCommentMatch) {
        notionId = htmlCommentMatch[1];
      }
    }
    
    // Extract title from frontmatter or first heading
    let title = parsed.data.title;
    if (!title) {
      const headingMatch = parsed.content.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1];
      }
    }
    
    return {
      notion_id: notionId,
      title,
      created: parsed.data.created,
      last_edited: parsed.data.last_edited,
      last_synced: parsed.data.last_synced,
      word_count: parsed.wordCount || this.countWords(parsed.content),
      reading_time_minutes: parsed.readingTime || Math.ceil(this.countWords(parsed.content) / 200),
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : (parsed.data.tags ? [parsed.data.tags] : [])
    };
  }
  
  /**
   * Embed Notion metadata into markdown
   */
  embedNotionMetadata(content: string, notionPageId: string, metadata: Partial<NotionMetadata> = {}): string {
    const parsed = this.parse(content);
    
    // Update frontmatter with Notion metadata
    const updatedData = {
      ...parsed.data,
      notion_id: notionPageId,
      last_synced: new Date().toISOString(),
      word_count: parsed.wordCount || this.countWords(parsed.content),
      reading_time_minutes: parsed.readingTime || Math.ceil(this.countWords(parsed.content) / 200),
      ...metadata
    };
    
    return this.stringify({
      content: parsed.content,
      data: updatedData
    });
  }
  
  /**
   * Validate markdown content
   */
  validateMarkdown(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if content is empty
    if (!content.trim()) {
      errors.push('Content is empty');
    }
    
    // Check for malformed frontmatter
    if (content.startsWith('---')) {
      const lines = content.split('\n');
      let foundClosing = false;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          foundClosing = true;
          break;
        }
      }
      if (!foundClosing) {
        errors.push('Malformed frontmatter: missing closing ---');
      }
    }
    
    // Check for very long lines (over 1000 characters)
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.length > 1000) {
        warnings.push(`Line ${index + 1} is very long (${line.length} characters)`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Convert content to markdown
   */
  stringify(parsed: ParsedMarkdown): string {
    const frontmatter = Object.keys(parsed.data).length > 0
      ? '---\n' + Object.entries(parsed.data).map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
          }
          return `${key}: ${value}`;
        }).join('\n') + '\n---\n'
      : '';
    
    return frontmatter + parsed.content;
  }
  
  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }
}

// Export for backward compatibility
export const EnhancedMarkdownProcessor = SimpleMarkdownProcessor;