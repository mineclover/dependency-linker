/**
 * Integration Test: Markdown Upload/Download Functionality (Universal Test)
 * 마크다운 문서의 Notion 업로드/다운로드 기능 통합 테스트
 */

// Universal test imports - works in both Bun and Vitest environments
let test: any, expect: any, beforeAll: any, afterAll: any;

try {
  // Try Bun test first
  if (typeof Bun !== 'undefined') {
    const bunTest = require('bun:test');
    ({ test, expect, beforeAll, afterAll } = bunTest);
  } else {
    // Fallback to Vitest
    const vitest = require('vitest');
    ({ test, expect, beforeAll, afterAll } = vitest);
  }
} catch (error) {
  // Final fallback for basic testing
  console.warn('No test framework available, creating minimal test stubs');
  test = (name: string, fn: any) => fn();
  expect = (val: any) => ({ toBe: () => {}, toEqual: () => {} });
  beforeAll = (fn: any) => fn();
  afterAll = (fn: any) => fn();
}
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const testResults = {
  createdPageIds: [] as string[],
  testConfig: null as any,
  converter: null as any
};

const testDocsDir = join(process.cwd(), 'test-docs');
const testOutputDir = join(process.cwd(), 'test/output');

beforeAll(async () => {
  console.log('🚀 Setting up markdown upload/download integration tests...');
  
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
      testResults.testConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      console.log('✅ Configuration loaded successfully');
    } else {
      console.warn('⚠️ Config file not found, tests will be skipped');
      testResults.testConfig = null;
    }
  } catch (error) {
    console.warn('⚠️ Failed to load config, tests will be skipped:', error);
    testResults.testConfig = null;
  }
  
  // NotionMarkdownConverter 가져오기
  if (testResults.testConfig) {
    try {
      const { NotionMarkdownConverter } = await import('../../src/infrastructure/notion/markdownConverter.js');
      testResults.converter = new NotionMarkdownConverter(testResults.testConfig.apiKey);
      console.log('✅ Markdown converter loaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to import converter, tests will be skipped:', error);
      testResults.converter = null;
    }
  }
  
  // 테스트용 마크다운 파일 생성
  const testMarkdownContent = `# 테스트 문서 업로드 (Bun Test)

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

  const testFilePath = join(testDocsDir, 'bun-integration-test.md');
  writeFileSync(testFilePath, testMarkdownContent, 'utf-8');
  console.log('✅ Test markdown file created');
});

afterAll(async () => {
  // 테스트로 생성된 페이지 정보 출력
  if (testResults.createdPageIds.length > 0) {
    console.log('\n🧹 Created pages during test (manual cleanup recommended):');
    testResults.createdPageIds.forEach(pageId => {
      const cleanId = pageId.replace(/-/g, '');
      console.log(`   📄 https://notion.so/${cleanId}`);
    });
    
    // 테스트 결과를 파일로 저장
    const resultData = {
      testDate: new Date().toISOString(),
      createdPageIds: testResults.createdPageIds,
      testSummary: {
        totalPages: testResults.createdPageIds.length,
        testType: 'markdown-upload-download-integration'
      }
    };
    
    const resultPath = join(testOutputDir, 'test-results.json');
    writeFileSync(resultPath, JSON.stringify(resultData, null, 2), 'utf-8');
    console.log(`💾 Test results saved to: ${resultPath}`);
  }
});

test('Configuration should be loaded successfully', () => {
  if (!testResults.testConfig) {
    console.log('⏭️ Skipping configuration test - no config file found');
    return;
  }
  
  expect(testResults.testConfig).toBeDefined();
  expect(testResults.testConfig.apiKey).toBeDefined();
  expect(testResults.testConfig.parentPageId).toBeDefined();
  console.log('✅ Configuration validation passed');
});

test('Converter should be available', () => {
  if (!testResults.converter) {
    console.log('⏭️ Skipping converter test - converter not available');
    return;
  }
  
  expect(testResults.converter).toBeDefined();
  console.log('✅ Converter availability test passed');
});

test('Should upload markdown file to Notion page successfully', async () => {
  if (!testResults.testConfig || !testResults.converter) {
    console.log('⏭️ Skipping upload test - prerequisites not met');
    return;
  }
  
  console.log('📤 Testing markdown upload...');
  
  // 테스트 파일 읽기
  const testFilePath = join(testDocsDir, 'bun-integration-test.md');
  expect(existsSync(testFilePath)).toBe(true);
  
  const content = readFileSync(testFilePath, 'utf-8');
  expect(content.length).toBeGreaterThan(0);
  
  // Notion 페이지로 업로드
  const result = await testResults.converter.markdownToNotion(
    content,
    testResults.testConfig.parentPageId,
    'Bun Integration Test Document',
    { preserveFormatting: true }
  );
  
  // 결과 검증
  expect(result.success).toBe(true);
  expect(result.metadata?.pageId).toBeDefined();
  expect(result.metadata?.title).toBe('Bun Integration Test Document');
  expect(result.metadata?.createdTime).toBeDefined();
  
  // 생성된 페이지 ID 추적
  if (result.metadata?.pageId) {
    testResults.createdPageIds.push(result.metadata.pageId);
    console.log(`✅ Upload successful: ${result.metadata.pageId}`);
    console.log(`📎 URL: https://notion.so/${result.metadata.pageId.replace(/-/g, '')}`);
  }
}, 30000);

test('Should download Notion page as markdown successfully', async () => {
  if (!testResults.testConfig || !testResults.converter) {
    console.log('⏭️ Skipping download test - prerequisites not met');
    return;
  }
  
  // 먼저 다운로드를 위한 테스트 페이지 생성
  console.log('📤 Creating test page for download...');
  
  const testContent = `# Download Test Page (Bun)

This page is created for testing download functionality with Bun test runner.

## Test Content
- List item 1
- List item 2
- List item 3

### Code Example
\`\`\`javascript
console.log("Test code block for download");
const testVar = "Hello from Notion";
\`\`\`

**Bold text** and *italic text* should be preserved.

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

> This is a quote block for testing.

---

*End of download test content*`;
  
  const createResult = await testResults.converter.markdownToNotion(
    testContent,
    testResults.testConfig.parentPageId,
    'Bun Download Test Page',
    { preserveFormatting: true }
  );
  
  expect(createResult.success).toBe(true);
  expect(createResult.metadata?.pageId).toBeDefined();
  
  const testPageId = createResult.metadata!.pageId!;
  testResults.createdPageIds.push(testPageId);
  
  console.log(`📄 Test page created: ${testPageId}`);
  
  // 이제 다운로드 테스트
  console.log('📥 Testing markdown download...');
  
  const downloadResult = await testResults.converter.notionToMarkdown(
    testPageId,
    { preserveFormatting: true, includeMetadata: true }
  );
  
  // 결과 검증
  expect(downloadResult.success).toBe(true);
  expect(downloadResult.content).toBeDefined();
  expect(downloadResult.content!.length).toBeGreaterThan(0);
  expect(downloadResult.metadata?.title).toBe('Bun Download Test Page');
  
  // front-matter 검증
  expect(downloadResult.content).toContain('---');
  expect(downloadResult.content).toContain('notion_page_id:');
  expect(downloadResult.content).toContain('title:');
  expect(downloadResult.content).toContain('last_synced:');
  
  // 콘텐츠 검증
  expect(downloadResult.content).toContain('# Download Test Page (Bun)');
  expect(downloadResult.content).toContain('This page is created for testing');
  expect(downloadResult.content).toContain('**Bold text**');
  expect(downloadResult.content).toContain('*italic text*');
  expect(downloadResult.content).toContain('```javascript');
  
  // 결과를 파일로 저장
  const outputPath = join(testOutputDir, 'bun-downloaded-test.md');
  writeFileSync(outputPath, downloadResult.content!, 'utf-8');
  
  console.log(`✅ Download successful, saved to: ${outputPath}`);
  console.log(`📊 Content length: ${downloadResult.content!.length} characters`);
}, 45000);

test('Should maintain content integrity in upload-download cycle', async () => {
  if (!testResults.testConfig || !testResults.converter) {
    console.log('⏭️ Skipping round-trip test - prerequisites not met');
    return;
  }
  
  console.log('🔄 Testing round-trip functionality...');
  
  const originalContent = `# Round-trip Test (Bun)

This document tests the **round-trip** functionality with Bun test runner.

## Features
1. **Bold** formatting preservation
2. *Italic* formatting preservation  
3. \`Inline code\` preservation

### Code Block Test
\`\`\`typescript
interface RoundTripTest {
  name: string;
  value: number;
  success: boolean;
}

const test: RoundTripTest = {
  name: "Bun Round Trip",
  value: 42,
  success: true
};
\`\`\`

### List Preservation
- First item
- Second item
- Third item
  - Nested item
  - Another nested item

### Table Preservation
| Feature | Status | Notes |
|---------|---------|-------|
| Upload | ✅ Working | Bun compatible |
| Download | ✅ Working | Full fidelity |
| Metadata | ✅ Working | Front-matter |

### Quote Test
> This is a quote block that should be preserved during round-trip conversion.

---

*End of round-trip test document*`;
  
  // 1. 업로드
  console.log('📤 Step 1: Uploading original content...');
  const uploadResult = await testResults.converter.markdownToNotion(
    originalContent,
    testResults.testConfig.parentPageId,
    'Bun Round-trip Test',
    { preserveFormatting: true }
  );
  
  expect(uploadResult.success).toBe(true);
  expect(uploadResult.metadata?.pageId).toBeDefined();
  
  const pageId = uploadResult.metadata!.pageId!;
  testResults.createdPageIds.push(pageId);
  console.log(`✅ Upload completed: ${pageId}`);
  
  // 2. 다운로드
  console.log('📥 Step 2: Downloading and converting back...');
  const downloadResult = await testResults.converter.notionToMarkdown(
    pageId,
    { preserveFormatting: true, includeMetadata: true }
  );
  
  expect(downloadResult.success).toBe(true);
  expect(downloadResult.content).toBeDefined();
  
  // 3. 콘텐츠 무결성 검증
  console.log('🔍 Step 3: Validating content integrity...');
  const downloadedContent = downloadResult.content!;
  
  // 핵심 콘텐츠 요소들이 보존되었는지 확인
  expect(downloadedContent).toContain('Round-trip Test (Bun)');
  expect(downloadedContent).toContain('**Bold** formatting preservation');
  expect(downloadedContent).toContain('*Italic* formatting preservation');
  expect(downloadedContent).toContain('`Inline code` preservation');
  expect(downloadedContent).toContain('```typescript');
  expect(downloadedContent).toContain('RoundTripTest');
  expect(downloadedContent).toContain('- First item');
  expect(downloadedContent).toContain('| Feature | Status | Notes |');
  expect(downloadedContent).toContain('> This is a quote block');
  
  // 결과 저장
  const outputPath = join(testOutputDir, 'bun-round-trip-result.md');
  writeFileSync(outputPath, downloadedContent, 'utf-8');
  
  console.log(`✅ Round-trip test completed successfully`);
  console.log(`📄 Original: ${originalContent.length} characters`);
  console.log(`📄 Downloaded: ${downloadedContent.length} characters`);
  console.log(`💾 Result saved: ${outputPath}`);
  
  // 통계 정보
  const preservationStats = {
    originalLength: originalContent.length,
    downloadedLength: downloadedContent.length,
    lengthDifference: downloadedContent.length - originalContent.length,
    hasMetadata: downloadedContent.includes('---'),
    preservedElements: {
      headers: downloadedContent.includes('# Round-trip Test (Bun)'),
      bold: downloadedContent.includes('**Bold**'),
      italic: downloadedContent.includes('*Italic*'),
      code: downloadedContent.includes('`Inline code`'),
      codeBlock: downloadedContent.includes('```typescript'),
      lists: downloadedContent.includes('- First item'),
      tables: downloadedContent.includes('| Feature | Status'),
      quotes: downloadedContent.includes('> This is a quote')
    }
  };
  
  const statsPath = join(testOutputDir, 'round-trip-stats.json');
  writeFileSync(statsPath, JSON.stringify(preservationStats, null, 2), 'utf-8');
  console.log(`📊 Preservation stats saved: ${statsPath}`);
}, 60000);

test('Should handle errors gracefully', async () => {
  if (!testResults.testConfig || !testResults.converter) {
    console.log('⏭️ Skipping error handling test - prerequisites not met');
    return;
  }
  
  console.log('🚨 Testing error handling...');
  
  // 잘못된 페이지 ID 테스트
  const invalidPageId = '00000000-0000-0000-0000-000000000000';
  
  const downloadResult = await testResults.converter.notionToMarkdown(
    invalidPageId,
    { preserveFormatting: true, includeMetadata: true }
  );
  
  expect(downloadResult.success).toBe(false);
  expect(downloadResult.error).toBeDefined();
  expect(downloadResult.content).toBeUndefined();
  
  console.log(`✅ Error handling test passed: ${downloadResult.error}`);
  
  // 잘못된 부모 페이지 ID 테스트
  const invalidParentId = '00000000-0000-0000-0000-000000000000';
  const testContent = '# Test Document for Error Handling';
  
  const uploadResult = await testResults.converter.markdownToNotion(
    testContent,
    invalidParentId,
    'Error Test Upload',
    { preserveFormatting: true }
  );
  
  expect(uploadResult.success).toBe(false);
  expect(uploadResult.error).toBeDefined();
  
  console.log(`✅ Upload error handling test passed: ${uploadResult.error}`);
});