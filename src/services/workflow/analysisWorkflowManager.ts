/**
 * 분석-인덱스-Notion 통합 워크플로우 관리자
 * Analysis-Index-Notion Integrated Workflow Manager
 */

import { readFileSync, statSync } from 'fs';
import crypto from 'crypto';
import path from 'path';
import { parserFactory, LanguageAnalysisResult } from '../parsers';
import { analysisIndexManager, IndexedFile } from '../analysis/analysisIndexManager';
import { notionRelationalManager } from '../notion/notionRelationalManager';

export interface WorkflowOptions {
  forceReanalysis?: boolean;
  skipNotionUpload?: boolean;
  batchSize?: number;
  parallel?: boolean;
  includeMetrics?: boolean;
}

export interface WorkflowResult {
  success: boolean;
  filePath: string;
  analysisResult?: LanguageAnalysisResult;
  indexId?: number;
  notionPageId?: string;
  error?: string;
  processingTime: number;
  wasSkipped?: boolean;
  skipReason?: string;
}

export interface BatchWorkflowResult {
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: WorkflowResult[];
  totalTime: number;
  averageTimePerFile: number;
}

export class AnalysisWorkflowManager {
  private processing = new Set<string>();
  private stats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalFailed: 0,
    totalTime: 0
  };

  constructor() {}

  /**
   * 단일 파일 분석 워크플로우
   */
  async processFile(filePath: string, options: WorkflowOptions = {}): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    // 중복 처리 방지
    if (this.processing.has(filePath)) {
      return {
        success: false,
        filePath,
        error: 'File is already being processed',
        processingTime: 0,
        wasSkipped: true,
        skipReason: 'Concurrent processing detected'
      };
    }

    this.processing.add(filePath);

    try {
      // 1. 파일 존재 및 지원 여부 확인
      const validation = await this.validateFile(filePath);
      if (!validation.isValid) {
        return {
          success: false,
          filePath,
          error: validation.error,
          processingTime: Date.now() - startTime,
          wasSkipped: true,
          skipReason: validation.error
        };
      }

      // 2. 캐시 확인 및 스킵 로직
      if (!options.forceReanalysis) {
        const skipCheck = await this.shouldSkipFile(filePath);
        if (skipCheck.shouldSkip) {
          this.stats.totalSkipped++;
          return {
            success: true,
            filePath,
            processingTime: Date.now() - startTime,
            wasSkipped: true,
            skipReason: skipCheck.reason
          };
        }
      }

      // 3. 파일 분석 수행
      const analysisResult = await this.analyzeFile(filePath);
      if (!analysisResult) {
        throw new Error('Analysis failed - no result returned');
      }

      // 4. 콘텐츠 해시 계산
      const contentHash = this.calculateContentHash(filePath);

      // 5. SQLite 인덱스에 저장
      const indexId = await analysisIndexManager.storeAnalysisResult(analysisResult, contentHash);

      // 6. Notion에 저장 (옵션에 따라)
      let notionPageId: string | undefined;
      if (!options.skipNotionUpload) {
        const indexedFile = analysisIndexManager.getFile(filePath);
        if (indexedFile) {
          try {
            notionPageId = await notionRelationalManager.storeAnalysisToNotion(
              analysisResult, 
              indexedFile
            );
            
            // Notion ID를 인덱스에 업데이트
            if (notionPageId && notionPageId !== indexedFile.notionId) {
              await this.updateFileNotionId(filePath, notionPageId);
            }
          } catch (notionError) {
            console.warn(`Notion upload failed for ${filePath}:`, notionError);
            // Notion 실패는 전체 워크플로우를 실패로 만들지 않음
          }
        }
      }

      const result: WorkflowResult = {
        success: true,
        filePath,
        analysisResult,
        indexId,
        notionPageId,
        processingTime: Date.now() - startTime
      };

      this.stats.totalProcessed++;
      this.stats.totalTime += result.processingTime;

      return result;

    } catch (error) {
      this.stats.totalFailed++;
      return {
        success: false,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      };
    } finally {
      this.processing.delete(filePath);
    }
  }

  /**
   * 배치 파일 처리
   */
  async processBatch(filePaths: string[], options: WorkflowOptions = {}): Promise<BatchWorkflowResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 10;
    const parallel = options.parallel !== false; // 기본값은 true

    const results: WorkflowResult[] = [];
    
    if (parallel) {
      // 병렬 처리
      const batches = this.chunkArray(filePaths, batchSize);
      
      for (const batch of batches) {
        const batchPromises = batch.map(filePath => 
          this.processFile(filePath, options)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              filePath: 'unknown',
              error: result.reason?.message || 'Unknown error',
              processingTime: 0
            });
          }
        }
      }
    } else {
      // 순차 처리
      for (const filePath of filePaths) {
        const result = await this.processFile(filePath, options);
        results.push(result);
      }
    }

    const totalTime = Date.now() - startTime;
    const successfulFiles = results.filter(r => r.success).length;
    const skippedFiles = results.filter(r => r.wasSkipped).length;
    const failedFiles = results.filter(r => !r.success).length;

    return {
      totalFiles: filePaths.length,
      processedFiles: results.length,
      skippedFiles,
      successfulFiles,
      failedFiles,
      results,
      totalTime,
      averageTimePerFile: totalTime / results.length
    };
  }

  /**
   * 디렉토리 재귀 처리
   */
  async processDirectory(
    dirPath: string, 
    options: WorkflowOptions = {},
    recursive: boolean = true
  ): Promise<BatchWorkflowResult> {
    const filePaths = await this.findSupportedFiles(dirPath, recursive);
    return this.processBatch(filePaths, options);
  }

  /**
   * 파일 검증
   */
  private async validateFile(filePath: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // 파일 존재 확인
      const stats = statSync(filePath);
      if (!stats.isFile()) {
        return { isValid: false, error: 'Path is not a file' };
      }

      // 파일 크기 확인 (최대 10MB)
      if (stats.size > 10 * 1024 * 1024) {
        return { isValid: false, error: 'File too large (>10MB)' };
      }

      // 언어 지원 확인
      const language = parserFactory.detectLanguage(filePath);
      if (!language) {
        return { isValid: false, error: 'Unsupported file type' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'File access error' 
      };
    }
  }

  /**
   * 파일 스킵 여부 확인
   */
  private async shouldSkipFile(filePath: string): Promise<{ shouldSkip: boolean; reason?: string }> {
    const indexedFile = analysisIndexManager.getFile(filePath);
    if (!indexedFile) {
      return { shouldSkip: false };
    }

    try {
      const fileStats = statSync(filePath);
      const fileModTime = Math.floor(fileStats.mtimeMs / 1000);
      
      // 파일이 변경되지 않았으면 스킵
      if (fileModTime <= indexedFile.lastModified) {
        return { 
          shouldSkip: true, 
          reason: 'File not modified since last analysis' 
        };
      }

      return { shouldSkip: false };
    } catch (error) {
      // 파일 접근 오류가 있으면 재분석 시도
      return { shouldSkip: false };
    }
  }

  /**
   * 파일 분석 수행
   */
  private async analyzeFile(filePath: string): Promise<LanguageAnalysisResult | null> {
    return parserFactory.analyzeFile(filePath);
  }

  /**
   * 콘텐츠 해시 계산
   */
  private calculateContentHash(filePath: string): string {
    const content = readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 파일의 Notion ID 업데이트
   */
  private async updateFileNotionId(filePath: string, notionId: string): Promise<void> {
    // 실제 구현에서는 analysisIndexManager에 updateFileNotionId 메서드 추가 필요
    console.log(`Updating Notion ID for ${filePath}: ${notionId}`);
  }

  /**
   * 지원되는 파일 찾기
   */
  private async findSupportedFiles(dirPath: string, recursive: boolean): Promise<string[]> {
    const { glob } = await import('glob');
    const supportedExts = parserFactory.getSupportedExtensions();
    
    const patterns = supportedExts.map(ext => 
      recursive ? `${dirPath}/**/*${ext}` : `${dirPath}/*${ext}`
    );

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern);
      files.push(...matches);
    }

    return [...new Set(files)]; // 중복 제거
  }

  /**
   * 배열을 청크로 분할
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 워크플로우 통계
   */
  getStatistics() {
    return {
      ...this.stats,
      averageProcessingTime: this.stats.totalProcessed > 0 
        ? this.stats.totalTime / this.stats.totalProcessed 
        : 0,
      currentlyProcessing: this.processing.size,
      processingFiles: Array.from(this.processing)
    };
  }

  /**
   * 통계 리셋
   */
  resetStatistics(): void {
    this.stats = {
      totalProcessed: 0,
      totalSkipped: 0,
      totalFailed: 0,
      totalTime: 0
    };
  }

  /**
   * 인덱스와 Notion 동기화
   */
  async syncIndexWithNotion(): Promise<void> {
    console.log('Starting index-Notion sync...');
    
    // 인덱스에서 Notion ID가 없는 파일들 찾기
    const filesWithoutNotion = await this.getFilesWithoutNotionId();
    
    for (const file of filesWithoutNotion) {
      try {
        // 분석 결과 재구성
        const analysisResult = await this.reconstructAnalysisResult(file);
        if (analysisResult) {
          const notionPageId = await notionRelationalManager.storeAnalysisToNotion(
            analysisResult, 
            file
          );
          await this.updateFileNotionId(file.filePath, notionPageId);
        }
      } catch (error) {
        console.error(`Sync failed for ${file.filePath}:`, error);
      }
    }
  }

  /**
   * Notion ID가 없는 파일들 조회
   */
  private async getFilesWithoutNotionId(): Promise<IndexedFile[]> {
    // 실제 구현에서는 analysisIndexManager에 적절한 쿼리 메서드 추가
    return [];
  }

  /**
   * 인덱스 데이터로부터 분석 결과 재구성
   */
  private async reconstructAnalysisResult(file: IndexedFile): Promise<LanguageAnalysisResult | null> {
    // 실제 구현에서는 인덱스에서 전체 분석 결과를 재구성하는 로직
    return null;
  }
}

// 싱글톤 인스턴스
export const analysisWorkflowManager = new AnalysisWorkflowManager();