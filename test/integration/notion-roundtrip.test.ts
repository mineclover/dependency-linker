/**
 * 노션 업로드/다운로드 라운드트립 통합 테스트
 * 
 * 이 테스트는 실제 노션 API를 사용하므로 다음 환경 변수가 필요합니다:
 * - NOTION_API_KEY: 노션 API 키
 * - TEST_DATABASE_ID: 테스트용 데이터베이스 ID (선택사항)
 * - TEST_PARENT_PAGE_ID: 테스트용 부모 페이지 ID
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { testEnv } from '../helpers/test-config.js';
import { comparator, ComparisonResult } from '../helpers/comparison-utils.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Notion Round-trip Integration Tests', () => {
  const testTimeout = 60000; // 60초 타임아웃
  const uploadedPages: string[] = []; // 정리용 페이지 ID 추적

  beforeAll(async () => {
    await testEnv.setup();
    
    // 필수 설정 확인
    if (!testEnv.isConfigured()) {
      console.warn('⚠️ Notion configuration missing. Set NOTION_API_KEY and TEST_PARENT_PAGE_ID');
      return;
    }

    // 임시 디렉토리 생성
    const tempDir = path.join(process.cwd(), 'test', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }, testTimeout);

  afterAll(async () => {
    // 테스트에서 생성한 페이지들 정리 (선택사항)
    console.log(`📋 Created ${uploadedPages.length} test pages during testing`);
    
    await testEnv.cleanup();
  }, testTimeout);

  describe('Sample Document Round-trip', () => {
    let originalPath: string;
    let downloadedPath: string;
    let notionPageId: string;

    beforeEach(() => {
      originalPath = testEnv.getFixturePath('sample-document.md');
      downloadedPath = testEnv.getTempPath('sample-document-downloaded.md');
    });

    afterEach(() => {
      // 테스트 후 임시 파일 정리
      if (fs.existsSync(downloadedPath)) {
        fs.unlinkSync(downloadedPath);
      }
    });

    it('should upload and download simple document with high fidelity', async () => {
      // Skip if not configured
      if (!testEnv.isConfigured()) {
        console.log('🔄 Skipping integration test - configuration missing');
        return;
      }

      const documentTracker = testEnv.getDocumentTracker();

      // 1. 업로드 테스트
      const uploadResult = await documentTracker.uploadAndEmbedToNotion(
        originalPath,
        testEnv.getConfig().notion.testParentPageId,
        '테스트 문서 - Sample'
      );

      expect(uploadResult).toBeDefined();
      expect(uploadResult.length).toBeGreaterThan(0);
      notionPageId = uploadResult;
      uploadedPages.push(notionPageId);

      console.log(`📤 Uploaded document with ID: ${notionPageId}`);

      // 2. 다운로드 테스트
      const downloadResult = await documentTracker.downloadAndEmbedFromNotion(
        notionPageId,
        downloadedPath
      );

      expect(downloadResult).toBeDefined();
      expect(fs.existsSync(downloadedPath)).toBe(true);

      console.log(`📥 Downloaded document to: ${downloadedPath}`);

      // 3. 비교 및 분석
      const comparison = comparator.compare(originalPath, downloadedPath);

      console.log('📊 Comparison Results:');
      console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
      console.log(`   Character diff: ${comparison.differences.characterCount.diff}`);
      console.log(`   Line diff: ${comparison.differences.lineCount.diff}`);
      console.log(`   Word diff: ${comparison.differences.wordCount.diff}`);
      console.log(`   Structural changes: ${comparison.differences.structuralDifferences.length}`);

      // 4. 품질 검증
      expect(comparison.similarity).toBeGreaterThan(0.95); // 95% 이상 유사도
      expect(Math.abs(comparison.differences.characterCount.diff)).toBeLessThan(100); // 문자 차이 100자 미만
      expect(comparison.differences.structuralDifferences.length).toBeLessThan(3); // 구조적 변경 3개 미만

      // 메타데이터 검증
      expect(comparison.metadata.convertedMetadata.notion_page_id).toBeTruthy();
      expect(comparison.metadata.convertedMetadata.title).toBeTruthy();
    }, testTimeout);

    it('should preserve all essential content elements', async () => {
      // Skip if not configured
      if (!testEnv.isConfigured()) {
        console.log('🔄 Skipping integration test - configuration missing');
        return;
      }

      // 이전 테스트에서 업로드된 페이지 사용
      if (!notionPageId) {
        console.log('🔄 Skipping content preservation test - no uploaded page');
        return;
      }

      const documentTracker = testEnv.getDocumentTracker();
      await documentTracker.downloadAndEmbedFromNotion(notionPageId, downloadedPath);

      const original = fs.readFileSync(originalPath, 'utf-8');
      const downloaded = fs.readFileSync(downloadedPath, 'utf-8');

      // 핵심 내용 요소들이 보존되었는지 확인
      const essentialElements = [
        '# 테스트 문서',
        '## 주요 특징',
        '볼드 텍스트',
        'function testFunction()',
        '번호 있는 리스트',
        '| 컬럼 1 | 컬럼 2 | 컬럼 3 |'
      ];

      for (const element of essentialElements) {
        expect(downloaded).toContain(element);
      }

      console.log('✅ All essential content elements preserved');
    }, testTimeout);
  });

  describe('Complex Document Round-trip', () => {
    let originalPath: string;
    let downloadedPath: string;
    let notionPageId: string;

    beforeEach(() => {
      originalPath = testEnv.getFixturePath('complex-document.md');
      downloadedPath = testEnv.getTempPath('complex-document-downloaded.md');
    });

    afterEach(() => {
      if (fs.existsSync(downloadedPath)) {
        fs.unlinkSync(downloadedPath);
      }
    });

    it('should handle complex document with front matter', async () => {
      // Skip if not configured
      if (!testEnv.isConfigured()) {
        console.log('🔄 Skipping integration test - configuration missing');
        return;
      }

      const documentTracker = testEnv.getDocumentTracker();

      // 복잡한 문서 업로드
      const uploadResult = await documentTracker.uploadAndEmbedToNotion(
        originalPath,
        testEnv.getConfig().notion.testParentPageId,
        '복합 테스트 문서'
      );

      expect(uploadResult).toBeDefined();
      notionPageId = uploadResult;
      uploadedPages.push(notionPageId);

      // 다운로드
      await documentTracker.downloadAndEmbedFromNotion(notionPageId, downloadedPath);

      // 비교
      const comparison = comparator.compare(originalPath, downloadedPath);

      console.log('📊 Complex Document Results:');
      console.log(`   Similarity: ${(comparison.similarity * 100).toFixed(1)}%`);
      console.log(`   Content changes: ${comparison.differences.contentChanges.length}`);

      // 복잡한 문서도 높은 품질로 보존되어야 함
      expect(comparison.similarity).toBeGreaterThan(0.90); // 90% 이상 유사도
      expect(comparison.metadata.metadataPreserved).toBe(true);

      // Front matter의 핵심 정보 보존 확인
      expect(comparison.metadata.convertedMetadata.title).toContain('복합 테스트 문서');
    }, testTimeout);

    it('should preserve code blocks with different languages', async () => {
      if (!testEnv.isConfigured() || !notionPageId) {
        console.log('🔄 Skipping code block test');
        return;
      }

      const downloaded = fs.readFileSync(downloadedPath, 'utf-8');

      // 다양한 언어의 코드 블록이 보존되었는지 확인
      expect(downloaded).toContain('```javascript');
      expect(downloaded).toContain('```python');
      expect(downloaded).toContain('class NotionTest');
      expect(downloaded).toContain('def test_notion_conversion');

      console.log('✅ Code blocks with languages preserved');
    }, testTimeout);
  });

  describe('Performance and Quality Metrics', () => {
    it('should meet performance benchmarks', async () => {
      if (!testEnv.isConfigured()) {
        console.log('🔄 Skipping performance test - configuration missing');
        return;
      }

      const originalPath = testEnv.getFixturePath('sample-document.md');
      const documentTracker = testEnv.getDocumentTracker();

      // 업로드 성능 측정
      const uploadStart = Date.now();
      const notionPageId = await documentTracker.uploadAndEmbedToNotion(
        originalPath,
        testEnv.getConfig().notion.testParentPageId,
        '성능 테스트 문서'
      );
      const uploadTime = Date.now() - uploadStart;

      uploadedPages.push(notionPageId);

      // 다운로드 성능 측정
      const downloadPath = testEnv.getTempPath('performance-test-downloaded.md');
      const downloadStart = Date.now();
      await documentTracker.downloadAndEmbedFromNotion(notionPageId, downloadPath);
      const downloadTime = Date.now() - downloadStart;

      console.log(`⚡ Performance Metrics:`);
      console.log(`   Upload time: ${uploadTime}ms`);
      console.log(`   Download time: ${downloadTime}ms`);

      // 성능 기준 (네트워크 상황에 따라 조정 가능)
      expect(uploadTime).toBeLessThan(30000); // 30초 미만
      expect(downloadTime).toBeLessThan(15000); // 15초 미만

      // 정리
      if (fs.existsSync(downloadPath)) {
        fs.unlinkSync(downloadPath);
      }
    }, 60000);
  });
});