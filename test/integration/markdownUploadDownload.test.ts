/**
 * Integration Test: Markdown Upload/Download Functionality
 * 마크다운 문서의 Notion 업로드/다운로드 기능 통합 테스트
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Markdown Upload/Download Integration Tests', () => {
  let testConfig: any;
  let converter: any;
  let createdPageIds: string[] = [];
  
  const testDocsDir = join(process.cwd(), 'test-docs');
  const testOutputDir = join(process.cwd(), 'test/output');
  
  beforeAll(async () => {
    // 테스트 디렉토리 생성
    if (!existsSync(testDocsDir)) {
      mkdirSync(testDocsDir, { recursive: true });
    }
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
    
    // 설정 로드
    try {
      const configPath = join(process.env.HOME || '', '.deplink-config.json');
      if (existsSync(configPath)) {
        testConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      } else {
        console.warn('⚠️ Config file not found, skipping integration tests');
        testConfig = null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load config, skipping integration tests:', error);
      testConfig = null;
    }
    
    // NotionMarkdownConverter 가져오기
    if (testConfig) {
      try {
        const { NotionMarkdownConverter } = await import('../../src/infrastructure/notion/markdownConverter.js');
        converter = new NotionMarkdownConverter(testConfig.apiKey);
      } catch (error) {
        console.warn('⚠️ Failed to import converter, skipping integration tests:', error);
        converter = null;
      }
    }
    
    // 테스트용 마크다운 파일 생성
    const testMarkdownContent = `# 테스트 문서 업로드

이 문서는 마크다운 업로드/다운로드 기능을 테스트하기 위한 문서입니다.

## 기능 테스트

### 1. 텍스트 포맷팅
- **굵은 글자** 테스트
- *기울임 글자* 테스트  
- \`코드 블록\` 테스트

### 2. 코드 블록
\`\`\`typescript
function testFunction() {
  console.log("Hello, Notion!");
  return "Upload/Download test complete";
}
\`\`\`

### 3. 리스트 테스트
1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

- 불릿 포인트 1
- 불릿 포인트 2
- 불릿 포인트 3

### 4. 테이블 테스트
| 기능 | 상태 | 비고 |
|------|------|------|
| Upload | 테스트 중 | Notion API 사용 |
| Download | 테스트 예정 | Markdown 변환 |
| Sync | 개발 필요 | 양방향 동기화 |

## 메타데이터
- 생성일: ${new Date().toISOString().split('T')[0]}
- 테스트 목적: Notion 문서 업로드/다운로드 기능 검증
- 예상 결과: Notion 페이지로 성공적 변환

---
*이 문서는 dependency-linker 프로젝트의 테스트를 위해 생성되었습니다.*`;

    const testFilePath = join(testDocsDir, 'integration-test.md');
    writeFileSync(testFilePath, testMarkdownContent, 'utf-8');
  });
  
  afterAll(async () => {
    // 테스트로 생성된 페이지 정리 (선택사항)
    // 실제 환경에서는 수동으로 정리할 수 있도록 로그만 출력
    if (createdPageIds.length > 0) {
      console.log('\n🧹 Created pages during test (manual cleanup recommended):');
      createdPageIds.forEach(pageId => {
        const cleanId = pageId.replace(/-/g, '');
        console.log(`   📄 https://notion.so/${cleanId}`);
      });
    }
  });
  
  describe('Configuration Tests', () => {
    it('should load configuration successfully', () => {
      if (!testConfig) {
        console.log('⏭️ Skipping configuration test - no config file found');
        return;
      }
      
      expect(testConfig).toBeDefined();
      expect(testConfig.apiKey).toBeDefined();
      expect(testConfig.parentPageId).toBeDefined();
    });
    
    it('should have converter instance', () => {
      if (!converter) {
        console.log('⏭️ Skipping converter test - converter not available');
        return;
      }
      
      expect(converter).toBeDefined();
    });
  });
  
  describe('Markdown Upload Tests', () => {
    it('should upload markdown file to Notion page successfully', async () => {
      if (!testConfig || !converter) {
        console.log('⏭️ Skipping upload test - configuration or converter not available');
        return;
      }
      
      // 테스트 파일 읽기
      const testFilePath = join(testDocsDir, 'integration-test.md');
      expect(existsSync(testFilePath)).toBe(true);
      
      const content = readFileSync(testFilePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      
      // Notion 페이지로 업로드
      const result = await converter.markdownToNotion(
        content,
        testConfig.parentPageId,
        'Integration Test Document',
        { preserveFormatting: true }
      );
      
      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.metadata?.pageId).toBeDefined();
      expect(result.metadata?.title).toBe('Integration Test Document');
      expect(result.metadata?.createdTime).toBeDefined();
      
      // 생성된 페이지 ID 추적
      if (result.metadata?.pageId) {
        createdPageIds.push(result.metadata.pageId);
      }
      
      console.log(`✅ Upload successful: ${result.metadata?.pageId}`);
    }, 30000); // 30초 타임아웃
  });
  
  describe('Markdown Download Tests', () => {
    let testPageId: string;
    
    it('should create test page for download', async () => {
      if (!testConfig || !converter) {
        console.log('⏭️ Skipping download setup - configuration or converter not available');
        return;
      }
      
      const testContent = `# Download Test Page

This page is created for testing download functionality.

## Test Content
- List item 1
- List item 2

\`\`\`javascript
console.log("Test code block");
\`\`\`

**Bold text** and *italic text*.`;
      
      const result = await converter.markdownToNotion(
        testContent,
        testConfig.parentPageId,
        'Download Test Page',
        { preserveFormatting: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata?.pageId).toBeDefined();
      
      testPageId = result.metadata!.pageId!;
      createdPageIds.push(testPageId);
      
      console.log(`✅ Test page created: ${testPageId}`);
    }, 30000);
    
    it('should download Notion page as markdown successfully', async () => {
      if (!testConfig || !converter || !testPageId) {
        console.log('⏭️ Skipping download test - prerequisites not met');
        return;
      }
      
      // Notion 페이지를 마크다운으로 다운로드
      const result = await converter.notionToMarkdown(
        testPageId,
        { preserveFormatting: true, includeMetadata: true }
      );
      
      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content!.length).toBeGreaterThan(0);
      expect(result.metadata?.title).toBe('Download Test Page');
      
      // front-matter 검증
      expect(result.content).toContain('---');
      expect(result.content).toContain('notion_page_id:');
      expect(result.content).toContain('title:');
      expect(result.content).toContain('last_synced:');
      
      // 콘텐츠 검증
      expect(result.content).toContain('# Download Test Page');
      expect(result.content).toContain('This page is created for testing');
      expect(result.content).toContain('**Bold text**');
      expect(result.content).toContain('*italic text*');
      
      // 결과를 파일로 저장
      const outputPath = join(testOutputDir, 'downloaded-test.md');
      writeFileSync(outputPath, result.content!, 'utf-8');
      
      console.log(`✅ Download successful, saved to: ${outputPath}`);
      console.log(`📊 Content length: ${result.content!.length} characters`);
    }, 30000);
  });
  
  describe('Round-trip Tests', () => {
    it('should maintain content integrity in upload-download cycle', async () => {
      if (!testConfig || !converter) {
        console.log('⏭️ Skipping round-trip test - configuration or converter not available');
        return;
      }
      
      const originalContent = `# Round-trip Test

This document tests the **round-trip** functionality.

## Features
1. **Bold** formatting
2. *Italic* formatting  
3. \`Inline code\`

### Code Block
\`\`\`typescript
interface TestInterface {
  name: string;
  value: number;
}
\`\`\`

### List
- Item 1
- Item 2
- Item 3

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |

> This is a quote block.

---

*End of test document*`;
      
      // 1. 업로드
      const uploadResult = await converter.markdownToNotion(
        originalContent,
        testConfig.parentPageId,
        'Round-trip Test',
        { preserveFormatting: true }
      );
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.metadata?.pageId).toBeDefined();
      
      const pageId = uploadResult.metadata!.pageId!;
      createdPageIds.push(pageId);
      
      // 2. 다운로드
      const downloadResult = await converter.notionToMarkdown(
        pageId,
        { preserveFormatting: true, includeMetadata: true }
      );
      
      expect(downloadResult.success).toBe(true);
      expect(downloadResult.content).toBeDefined();
      
      // 3. 콘텐츠 무결성 검증
      const downloadedContent = downloadResult.content!;
      
      // 핵심 콘텐츠 요소들이 보존되었는지 확인
      expect(downloadedContent).toContain('Round-trip Test');
      expect(downloadedContent).toContain('**Bold** formatting');
      expect(downloadedContent).toContain('*Italic* formatting');
      expect(downloadedContent).toContain('`Inline code`');
      expect(downloadedContent).toContain('```typescript');
      expect(downloadedContent).toContain('TestInterface');
      expect(downloadedContent).toContain('- Item 1');
      expect(downloadedContent).toContain('| Column 1 | Column 2 |');
      
      // 결과 저장
      const outputPath = join(testOutputDir, 'round-trip-result.md');
      writeFileSync(outputPath, downloadedContent, 'utf-8');
      
      console.log(`✅ Round-trip test completed`);
      console.log(`📄 Original: ${originalContent.length} characters`);
      console.log(`📄 Downloaded: ${downloadedContent.length} characters`);
      console.log(`💾 Result saved: ${outputPath}`);
    }, 45000); // 45초 타임아웃
  });
  
  describe('Error Handling Tests', () => {
    it('should handle invalid page ID gracefully', async () => {
      if (!testConfig || !converter) {
        console.log('⏭️ Skipping error handling test - configuration or converter not available');
        return;
      }
      
      const invalidPageId = '00000000-0000-0000-0000-000000000000';
      
      const result = await converter.notionToMarkdown(
        invalidPageId,
        { preserveFormatting: true, includeMetadata: true }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.content).toBeUndefined();
      
      console.log(`✅ Error handling test passed: ${result.error}`);
    });
    
    it('should handle invalid parent page ID gracefully', async () => {
      if (!testConfig || !converter) {
        console.log('⏭️ Skipping error handling test - configuration or converter not available');
        return;
      }
      
      const invalidParentId = '00000000-0000-0000-0000-000000000000';
      const testContent = '# Test Document';
      
      const result = await converter.markdownToNotion(
        testContent,
        invalidParentId,
        'Test Upload with Invalid Parent',
        { preserveFormatting: true }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      console.log(`✅ Error handling test passed: ${result.error}`);
    });
  });
});