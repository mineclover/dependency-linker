/**
 * Export Markdown CLI Command - Application Layer
 * 특정 파일과 의존성있는 파일들의 Notion 컨텐츠를 마크다운으로 내보내는 CLI 명령어
 */

import { join } from 'path';
import { logger } from '../../shared/utils/index.js';
import { dependencyExplorationService } from '../../services/dependency/DependencyExplorationService.js';
import { documentExportService, type ExportResult } from '../../services/document/DocumentExportService.js';
import { tempFolderManager } from '../../shared/utils/tempFolderManager.js';

export interface ExportMarkdownOptions {
  filePath: string; // 대상 파일 경로
  outputDir?: string; // 출력 디렉토리 (미지정시 임시폴더 생성)
  depth?: number; // 의존성 탐색 깊이 (기본: 2)
  includeReverse?: boolean; // 역방향 의존성 포함 (기본: true)
  includeSourceCode?: boolean; // 소스 코드 포함 (기본: true)
  includeNotionContent?: boolean; // Notion 컨텐츠 포함 (기본: true)
  createIndex?: boolean; // 인덱스 파일 생성 (기본: true)
  fileNameTemplate?: string; // 파일명 템플릿
  autoCleanup?: boolean; // 자동 정리 (기본: true)
  retentionMinutes?: number; // 보존 시간 (분) (기본: 60)
  notionApiKey?: string; // Notion API 키
}

export interface ExportMarkdownResult {
  success: boolean;
  outputDir: string;
  tempFolderId?: string;
  exportResult?: ExportResult;
  summary: {
    totalFiles: number;
    exportedFiles: number;
    filesWithNotionContent: number;
    notionPages: number;
    totalSize: number;
    exportTime: number;
  };
  error?: string;
}

/**
 * 마크다운 내보내기 명령어 실행
 */
export async function exportMarkdownCommand(options: ExportMarkdownOptions): Promise<ExportMarkdownResult> {
  const startTime = Date.now();
  
  logger.info(`📤 Starting markdown export for: ${options.filePath}`);
  logger.info(`📋 Options: depth=${options.depth || 2}, includeReverse=${options.includeReverse !== false}, includeNotionContent=${options.includeNotionContent !== false}`);

  let tempFolderId: string | undefined;
  let outputDir = options.outputDir;

  try {
    // 1. 출력 디렉토리 준비
    if (!outputDir) {
      const tempFolder = tempFolderManager.createTempFolder({
        prefix: 'markdown-export-',
        autoCleanup: options.autoCleanup !== false,
        retentionMinutes: options.retentionMinutes || 60
      });
      tempFolderId = tempFolder.id;
      outputDir = tempFolder.path;
      
      logger.info(`📁 Created temporary folder: ${outputDir}`);
      logger.info(`🔑 Temporary folder ID: ${tempFolderId}`);
    }

    // 2. 의존성 그래프 탐색
    logger.info(`🔍 Exploring dependencies for: ${options.filePath}`);
    const dependencyGraph = await dependencyExplorationService.exploreFileDependencies(
      options.filePath,
      {
        depth: options.depth || 2,
        includeReverse: options.includeReverse !== false,
        fileTypes: [], // 모든 파일 타입 포함
        excludePatterns: ['/node_modules/', '/.git/', '/dist/', '/build/']
      }
    );

    logger.info(`📊 Found ${dependencyGraph.totalFiles} related files`);
    logger.info(`├─ Direct dependencies: ${dependencyGraph.dependencies.filter(f => f.dependencyType === 'direct').length}`);
    logger.info(`├─ Indirect dependencies: ${dependencyGraph.dependencies.filter(f => f.dependencyType === 'indirect').length}`);
    logger.info(`└─ Reverse dependencies: ${dependencyGraph.reverseDependencies.length}`);

    // 3. Notion API 키 설정
    const notionApiKey = options.notionApiKey || process.env.NOTION_API_KEY;
    if (!notionApiKey && options.includeNotionContent !== false) {
      logger.warning('⚠️ No Notion API key provided. Notion content will be skipped.');
    }

    // 4. 문서 내보내기
    logger.info(`📝 Exporting documents to: ${outputDir}`);
    const exportResult = await documentExportService.exportDependencyDocuments(
      options.filePath,
      {
        outputDir,
        includeSourceCode: options.includeSourceCode !== false,
        includeNotionContent: options.includeNotionContent !== false && !!notionApiKey,
        createIndex: options.createIndex !== false,
        fileNameTemplate: options.fileNameTemplate,
        markdownOptions: {
          includeMetadata: true,
          preserveFormatting: true,
          includeTableOfContents: false
        }
      }
    );

    if (!exportResult.success) {
      throw new Error(exportResult.error || 'Export failed');
    }

    const exportTime = Date.now() - startTime;

    // 5. 결과 요약
    const summary = {
      totalFiles: dependencyGraph.totalFiles,
      exportedFiles: exportResult.exportedFiles.length,
      filesWithNotionContent: exportResult.exportedFiles.filter(f => f.hasNotionContent).length,
      notionPages: exportResult.summary.notionPages || 0,
      totalSize: exportResult.summary.totalSize,
      exportTime
    };

    // 6. 성공 로그
    logger.info(`✅ Export completed successfully!`);
    logger.info(`📊 Summary:`);
    logger.info(`├─ Total files found: ${summary.totalFiles}`);
    logger.info(`├─ Files exported: ${summary.exportedFiles}`);
    logger.info(`├─ Files with Notion content: ${summary.filesWithNotionContent}`);
    logger.info(`├─ Total size: ${(summary.totalSize / 1024).toFixed(2)} KB`);
    logger.info(`└─ Export time: ${exportTime}ms`);

    if (exportResult.indexFile) {
      logger.info(`📖 Index file created: ${exportResult.indexFile}`);
    }

    if (tempFolderId) {
      logger.info(`💡 To access files: cd "${outputDir}"`);
      logger.info(`💡 To clean up: Call tempFolderManager.deleteTempFolder("${tempFolderId}")`);
    }

    return {
      success: true,
      outputDir,
      tempFolderId,
      exportResult,
      summary
    };

  } catch (error) {
    const exportTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`❌ Export failed: ${errorMessage}`);

    // 실패 시 임시 폴더 정리 (autoCleanup이 true인 경우)
    if (tempFolderId && options.autoCleanup !== false) {
      tempFolderManager.deleteTempFolder(tempFolderId);
    }

    return {
      success: false,
      outputDir: outputDir || '',
      tempFolderId,
      summary: {
        totalFiles: 0,
        exportedFiles: 0,
        filesWithNotionContent: 0,
        notionPages: 0,
        totalSize: 0,
        exportTime
      },
      error: errorMessage
    };
  }
}

/**
 * CLI에서 직접 호출 가능한 헬퍼 함수
 */
export async function runExportMarkdown(
  filePath: string,
  options: Partial<ExportMarkdownOptions> = {}
): Promise<ExportMarkdownResult> {
  return exportMarkdownCommand({
    filePath,
    ...options
  });
}

/**
 * 대화형 CLI 모드 (향후 확장 가능)
 */
export async function interactiveExportMarkdown(): Promise<ExportMarkdownResult> {
  // TODO: 대화형 CLI 구현
  throw new Error('Interactive mode not implemented yet');
}

/**
 * 배치 내보내기 (여러 파일 동시 처리)
 */
export async function batchExportMarkdown(
  filePaths: string[],
  baseOptions: Partial<ExportMarkdownOptions> = {}
): Promise<ExportMarkdownResult[]> {
  logger.info(`🔄 Starting batch export for ${filePaths.length} files`);
  
  const results: ExportMarkdownResult[] = [];
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    logger.info(`📦 Processing ${i + 1}/${filePaths.length}: ${filePath}`);
    
    try {
      const result = await exportMarkdownCommand({
        filePath,
        ...baseOptions
      });
      results.push(result);
    } catch (error) {
      logger.error(`Failed to export ${filePath}: ` + (error instanceof Error ? error.message : String(error)));
      results.push({
        success: false,
        outputDir: '',
        summary: {
          totalFiles: 0,
          exportedFiles: 0,
          filesWithNotionContent: 0,
          notionPages: 0,
          totalSize: 0,
          exportTime: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  logger.info(`📊 Batch export completed: ${successCount}/${filePaths.length} successful`);
  
  return results;
}

// 기본 내보내기
export default {
  exportMarkdown: exportMarkdownCommand,
  runExportMarkdown,
  interactiveExportMarkdown,
  batchExportMarkdown
};