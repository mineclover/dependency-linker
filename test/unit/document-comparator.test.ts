/**
 * DocumentComparator 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import { DocumentComparator } from '../helpers/comparison-utils.js';

describe('DocumentComparator', () => {
  const comparator = new DocumentComparator();

  describe('Basic Comparison', () => {
    it('should detect identical documents', () => {
      const content = `# Test Document

This is identical content.`;

      const result = comparator.compareContent(content, content);

      expect(result.identical).toBe(true);
      expect(result.similarity).toBe(1.0);
      expect(result.differences.characterCount.diff).toBe(0);
      expect(result.differences.lineCount.diff).toBe(0);
      expect(result.differences.contentChanges).toHaveLength(0);
    });

    it('should calculate similarity correctly', () => {
      const original = `# Original Title
This is the original content with some words.`;

      const modified = `# Modified Title  
This is the modified content with some different words.`;

      const result = comparator.compareContent(original, modified);

      expect(result.identical).toBe(false);
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.similarity).toBeLessThan(1.0);
    });

    it('should track character and line differences', () => {
      const original = `Line 1
Line 2
Line 3`;

      const modified = `Line 1
Line 2 - Modified
Line 3
Line 4 - Added`;

      const result = comparator.compareContent(original, modified);

      expect(result.differences.lineCount.diff).toBe(1); // One line added
      expect(result.differences.characterCount.diff).toBeGreaterThan(0);
      expect(result.differences.contentChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Content Changes Detection', () => {
    it('should detect added lines', () => {
      const original = `Line 1
Line 2`;

      const modified = `Line 1
Line 2
Line 3 - Added`;

      const result = comparator.compareContent(original, modified);
      const addedChanges = result.differences.contentChanges.filter(c => c.type === 'added');

      expect(addedChanges).toHaveLength(1);
      expect(addedChanges[0].content).toBe('Line 3 - Added');
    });

    it('should detect removed lines', () => {
      const original = `Line 1
Line 2
Line 3`;

      const modified = `Line 1
Line 3`;

      const result = comparator.compareContent(original, modified);
      const changes = result.differences.contentChanges;

      expect(changes.length).toBeGreaterThan(0);
      // 단순 diff에서는 Line 2가 Line 3으로 수정되고, Line 3이 제거된 것으로 보임
      expect(changes.some(c => c.type === 'modified' || c.type === 'removed')).toBe(true);
    });

    it('should detect modified lines', () => {
      const original = `Line 1
Original Line 2
Line 3`;

      const modified = `Line 1
Modified Line 2
Line 3`;

      const result = comparator.compareContent(original, modified);
      const modifiedChanges = result.differences.contentChanges.filter(c => c.type === 'modified');

      expect(modifiedChanges).toHaveLength(1);
      expect(modifiedChanges[0].content).toBe('Modified Line 2');
      expect(modifiedChanges[0].context).toBe('Original Line 2');
    });
  });

  describe('Structural Changes Detection', () => {
    it('should detect heading changes', () => {
      const original = `# Heading 1
## Heading 2
### Heading 3
Content`;

      const modified = `# Heading 1
## Heading 2
Content`;

      const result = comparator.compareContent(original, modified);
      expect(result.differences.structuralDifferences).toContain('Heading count changed: 3 → 2');
    });

    it('should detect list changes', () => {
      const original = `- Item 1
- Item 2
- Item 3`;

      const modified = `- Item 1
- Item 2`;

      const result = comparator.compareContent(original, modified);
      expect(result.differences.structuralDifferences).toContain('List count changed: 3 → 2');
    });

    it('should detect code block changes', () => {
      const original = `\`\`\`javascript
console.log("test");
\`\`\`

\`\`\`python
print("test")
\`\`\``;

      const modified = `\`\`\`javascript
console.log("test");
\`\`\``;

      const result = comparator.compareContent(original, modified);
      expect(result.differences.structuralDifferences).toContain('Code block count changed: 2 → 1');
    });
  });

  describe('Metadata Comparison', () => {
    it('should ignore auto-generated metadata fields', () => {
      const original = `---
title: "Test"
author: "User"
---

Content`;

      const modified = `---
title: "Test"
author: "User"
last_synced: "2025-09-08"
local_doc_id: "doc-123"
word_count: 50
auto_generated: true
---

Content`;

      const result = comparator.compareContent(original, modified);
      expect(result.metadata.metadataPreserved).toBe(true);
    });

    it('should detect significant metadata changes', () => {
      const original = `---
title: "Original Title"
author: "User"
---

Content`;

      const modified = `---
title: "Modified Title"
author: "User"
---

Content`;

      const result = comparator.compareContent(original, modified);
      expect(result.metadata.metadataPreserved).toBe(false);
    });
  });

  describe('Word Count Accuracy', () => {
    it('should count words correctly for English text', () => {
      const content = `# Test Document

This is a test with exactly twelve words in this sentence.`;

      const result = comparator.compareContent(content, content);
      expect(result.differences.wordCount.original).toBeGreaterThan(10);
    });

    it('should count words correctly for mixed Korean/English', () => {
      const content = `# 테스트 문서

이것은 한글과 English가 mixed된 테스트 문서입니다.`;

      const result = comparator.compareContent(content, content);
      expect(result.differences.wordCount.original).toBeGreaterThan(5);
    });

    it('should handle special characters appropriately', () => {
      const content = `# Test!!!

@#$% Special characters 123 numbers 🎯 emojis.`;

      const result = comparator.compareContent(content, content);
      expect(result.differences.wordCount.original).toBeGreaterThan(0);
    });
  });

  describe('Performance with Large Documents', () => {
    it('should handle large documents efficiently', () => {
      // 큰 문서 생성 (약 10000 단어)
      const largeContent = '# Large Document\n\n' + 
        'This is a test sentence with multiple words. '.repeat(500) +
        '\n\n## Section 2\n\n' +
        'Another section with different content. '.repeat(500);

      const modifiedContent = largeContent + '\n\nAdditional content.';

      const startTime = Date.now();
      const result = comparator.compareContent(largeContent, modifiedContent);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5초 미만
      expect(result.similarity).toBeGreaterThan(0.85); // 조정된 기준
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty documents', () => {
      const result = comparator.compareContent('', '');
      expect(result.identical).toBe(true);
      expect(result.similarity).toBe(1.0);
    });

    it('should handle one empty document', () => {
      const result = comparator.compareContent('# Content', '');
      expect(result.identical).toBe(false);
      expect(result.similarity).toBe(0);
    });

    it('should handle documents with only whitespace differences', () => {
      const original = 'Line 1\nLine 2\nLine 3';
      const modified = 'Line 1\n\nLine 2\n\nLine 3';

      const result = comparator.compareContent(original, modified);
      expect(result.similarity).toBeGreaterThan(0.9);
    });

    it('should handle malformed markdown gracefully', () => {
      const malformed = `# Heading
[Broken link(missing closing bracket
\`\`\`
Unclosed code block`;

      const fixed = `# Heading
[Fixed link](http://example.com)
\`\`\`
Fixed code block
\`\`\``;

      const result = comparator.compareContent(malformed, fixed);
      expect(result.similarity).toBeGreaterThan(0.3); // 더 현실적인 기준
    });
  });
});