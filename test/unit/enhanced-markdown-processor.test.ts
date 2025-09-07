/**
 * EnhancedMarkdownProcessor 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedMarkdownProcessor } from '../../src/shared/utils/markdownProcessor.js';

describe('EnhancedMarkdownProcessor', () => {
  let processor: EnhancedMarkdownProcessor;

  beforeEach(() => {
    processor = new EnhancedMarkdownProcessor();
  });

  describe('Basic Parsing', () => {
    it('should parse markdown with front matter', () => {
      const markdown = `---
title: "Test Document"
tags: ["test", "markdown"]
---

# Hello World

This is a **test** document.`;

      const result = processor.parse(markdown);

      expect(result.content).toContain('# Hello World');
      expect(result.data.title).toBe('Test Document');
      expect(result.data.tags).toEqual(['test', 'markdown']);
      expect(result.isEmpty).toBe(false);
    });

    it('should handle markdown without front matter', () => {
      const markdown = `# Simple Document

Just a simple test.`;

      const result = processor.parse(markdown);

      expect(result.content).toBe(markdown);
      expect(result.data).toEqual({});
      expect(result.isEmpty).toBe(false);
    });

    it('should detect empty documents', () => {
      const result = processor.parse('   \n\n  ');
      expect(result.isEmpty).toBe(true);
    });
  });

  describe('Notion ID Extraction', () => {
    it('should extract notion ID from front matter', () => {
      const markdown = `---
notion_page_id: 12345678-90ab-cdef-1234-567890abcdef
title: "Test"
---

Content here.`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.notionPageId).toBe('1234567890abcdef1234567890abcdef');
    });

    it('should extract notion ID from HTML comment', () => {
      const markdown = `# Test Document

<!-- Notion Page: https://notion.so/1234567890abcdef1234567890abcdef -->

Content here.`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.notionPageId).toBe('1234567890abcdef1234567890abcdef');
    });

    it('should extract title from content if not in front matter', () => {
      const markdown = `# Main Title

Some content here.`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.title).toBe('Main Title');
    });

    it('should calculate word count and reading time', () => {
      const markdown = `# Test

This is a test document with some words to count for reading time estimation.`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.wordCount).toBeGreaterThan(10);
      expect(metadata.readingTime).toBeGreaterThan(0);
    });
  });

  describe('Metadata Embedding', () => {
    it('should embed notion metadata into markdown', () => {
      const markdown = `# Test Document

Some content here.`;

      const notionPageId = '12345678-90ab-cdef-1234-567890abcdef';
      const result = processor.embedNotionMetadata(markdown, notionPageId, {
        title: 'Updated Title'
      });

      expect(result).toContain(`notion_page_id: ${notionPageId}`);
      expect(result).toContain('title: Updated Title');
      expect(result).toContain('last_synced:');
      expect(result).toContain('<!-- This document is synced with Notion -->');
    });

    it('should preserve existing front matter data', () => {
      const markdown = `---
existing_field: "keep this"
original_title: "Original"
---

# Test Document`;

      const notionPageId = '12345678-90ab-cdef-1234-567890abcdef';
      const result = processor.embedNotionMetadata(markdown, notionPageId);

      expect(result).toContain('existing_field: keep this');
      expect(result).toContain(`notion_page_id: ${notionPageId}`);
    });

    it('should not include undefined values in front matter', () => {
      const markdown = `# Test Document`;
      const notionPageId = '12345678-90ab-cdef-1234-567890abcdef';
      
      const result = processor.embedNotionMetadata(markdown, notionPageId, {
        notionDatabaseId: undefined // 이 값은 포함되지 않아야 함
      });

      expect(result).not.toContain('notion_database_id: ');
    });
  });

  describe('Content Analysis', () => {
    it('should extract headings with proper structure', () => {
      const markdown = `# Main Title
## Subtitle
### Sub-subtitle
Content here.`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.headings).toHaveLength(3);
      expect(metadata.headings![0]).toMatchObject({
        level: 1,
        text: 'Main Title',
        slug: 'main-title'
      });
    });

    it('should extract links', () => {
      const markdown = `Check out [Google](https://google.com) and [GitHub](https://github.com "GitHub Homepage").`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.links).toHaveLength(2);
      expect(metadata.links![0]).toMatchObject({
        text: 'Google',
        href: 'https://google.com'
      });
      expect(metadata.links![1]).toMatchObject({
        text: 'GitHub',
        href: 'https://github.com',
        title: 'GitHub Homepage'
      });
    });

    it('should extract images', () => {
      const markdown = `![Alt text](image.png "Image title")
![Another image](another.jpg)`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.images).toHaveLength(2);
      expect(metadata.images![0]).toMatchObject({
        alt: 'Alt text',
        src: 'image.png',
        title: 'Image title'
      });
    });
  });

  describe('Validation', () => {
    it('should validate correct markdown', () => {
      const markdown = `---
title: "Valid Document"
notion_page_id: 12345678-90ab-cdef-1234-567890abcdef
---

# Valid Document

This is valid content.`;

      const validation = processor.validateMarkdown(markdown);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid notion ID format', () => {
      const markdown = `---
notion_page_id: invalid-id-format
---

# Document`;

      const validation = processor.validateMarkdown(markdown);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid Notion page ID format');
    });

    it('should warn about missing title', () => {
      const markdown = `---
some_field: "value"
---

Content without heading.`;

      const validation = processor.validateMarkdown(markdown);
      expect(validation.warnings).toContain('No title found in frontmatter or content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed front matter gracefully', () => {
      const markdown = `---
invalid: yaml: structure: here
---

# Content`;

      const result = processor.parse(markdown);
      expect(result.content).toContain('# Content');
    });

    it('should handle very large documents', () => {
      const largeContent = '# Test\n\n' + 'This is a line.\n'.repeat(1000);
      const result = processor.parse(largeContent);
      
      expect(result.isEmpty).toBe(false);
      expect(result.content.length).toBeGreaterThan(10000);
    });

    it('should handle unicode and special characters', () => {
      const markdown = `---
title: "한글 제목 🎯"
---

# 한글 헤딩 📊

특수문자와 이모지가 포함된 내용입니다. ✅ 🚀 💡`;

      const metadata = processor.extractNotionMetadata(markdown);
      expect(metadata.title).toBe('한글 제목 🎯');
      expect(metadata.wordCount).toBeGreaterThan(0);
    });
  });
});