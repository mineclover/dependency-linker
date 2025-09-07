/**
 * Document Export Service - Application Layer
 * 의존성 관련 문서들을 마크다운으로 내보내는 서비스
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { logger } from '../../shared/utils/index.js';
import { NotionMarkdownConverter } from '../../infrastructure/notion/markdownConverter.js';
import { DependencyGraph, ExploredFile, dependencyExplorationService } from '../dependency/DependencyExplorationService.js';

export interface DocumentExportOptions {
  outputDir: string;
  includeSourceCode?: boolean; // 소스 코드 포함 여부 (기본: true)
  includeNotionContent?: boolean; // Notion 콘텐츠 포함 여부 (기본: true)
  createIndex?: boolean; // 인덱스 파일 생성 여부 (기본: true)
  fileNameTemplate?: string; // 파일명 템플릿 (기본: '{name}')
  markdownOptions?: {
    includeMetadata?: boolean;
    preserveFormatting?: boolean;
    includeTableOfContents?: boolean;
  };
}

export interface ExportResult {
  success: boolean;
  outputDir: string;
  exportedFiles: ExportedFile[];
  indexFile?: string;
  summary: ExportSummary;
  error?: string;
}

export interface ExportedFile {
  originalPath: string;
  exportedPath: string;
  type: 'source' | 'notion' | 'index' | 'page';
  size: number;
  hasNotionContent: boolean;
  notionPageId?: string;
  relatedFiles?: string[]; // 해당 페이지에 연결된 파일들
}

export interface ExportSummary {
  totalFiles: number;
  sourceFiles: number;
  notionFiles: number;
  notionPages: number; // 생성된 Notion 페이지 수
  totalSize: number;
  exportTime: number;
}

export class DocumentExportService {
  private markdownConverter: NotionMarkdownConverter | null = null;

  constructor(notionApiKey?: string) {
    if (notionApiKey) {
      this.markdownConverter = new NotionMarkdownConverter(notionApiKey);
    }
  }

  /**
   * 의존성 그래프 기반 문서 내보내기
   */
  async exportDependencyDocuments(
    filePath: string,
    options: DocumentExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();
    logger.info(`📤 Starting document export for: ${filePath}`);

    try {
      // 의존성 그래프 탐색
      const graph = await dependencyExplorationService.exploreFileDependencies(filePath, {
        depth: 2,
        includeReverse: true
      });

      // 출력 디렉토리 준비
      this.prepareOutputDirectory(options.outputDir);

      // 파일 내보내기
      const exportedFiles = await this.exportFiles(graph, options);

      // 인덱스 파일 생성
      let indexFile: string | undefined;
      if (options.createIndex !== false) {
        indexFile = await this.createIndexFile(graph, exportedFiles, options);
      }

      const exportTime = Date.now() - startTime;
      const summary = this.generateExportSummary(exportedFiles, exportTime);

      logger.info(`✅ Export completed in ${exportTime}ms`);

      return {
        success: true,
        outputDir: options.outputDir,
        exportedFiles,
        indexFile,
        summary
      };

    } catch (error) {
      logger.error('Failed to export documents: ' + (error instanceof Error ? error.message : String(error)));
      return {
        success: false,
        outputDir: options.outputDir,
        exportedFiles: [],
        summary: {
          totalFiles: 0,
          sourceFiles: 0,
          notionFiles: 0,
          totalSize: 0,
          exportTime: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 파일들 내보내기 - Notion 페이지 단위로 그룹화
   */
  private async exportFiles(
    graph: DependencyGraph,
    options: DocumentExportOptions
  ): Promise<ExportedFile[]> {
    const exportedFiles: ExportedFile[] = [];
    const allFiles = [graph.rootFile, ...graph.dependencies, ...graph.reverseDependencies];

    logger.info(`📄 Exporting ${allFiles.length} files...`);

    // 1. Notion 페이지별로 파일들 그룹화
    const pageGroups = this.groupFilesByNotionPage(allFiles);
    
    logger.info(`📋 Found ${pageGroups.size} Notion pages (including files without pages)`);

    // 2. 각 페이지 그룹별로 마크다운 생성
    for (const [pageId, filesInPage] of pageGroups) {
      try {
        const exported = await this.exportNotionPageGroup(pageId, filesInPage, options);
        if (exported) {
          exportedFiles.push(exported);
        }
      } catch (error) {
        logger.error(`Failed to export page group ${pageId}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }

    return exportedFiles;
  }

  /**
   * Notion 페이지별로 파일들 그룹화
   */
  private groupFilesByNotionPage(files: ExploredFile[]): Map<string, ExploredFile[]> {
    const pageGroups = new Map<string, ExploredFile[]>();

    for (const file of files) {
      const pageId = file.notionId || 'no-notion-page';
      
      if (!pageGroups.has(pageId)) {
        pageGroups.set(pageId, []);
      }
      
      pageGroups.get(pageId)!.push(file);
    }

    return pageGroups;
  }

  /**
   * Notion 페이지 그룹을 하나의 마크다운 파일로 내보내기
   */
  private async exportNotionPageGroup(
    pageId: string,
    files: ExploredFile[],
    options: DocumentExportOptions
  ): Promise<ExportedFile | null> {
    const isNoNotionPage = pageId === 'no-notion-page';
    const fileName = isNoNotionPage 
      ? 'files-without-notion-page.md'
      : `notion-page-${pageId.slice(0, 8)}.md`;
    const exportPath = join(options.outputDir, fileName);

    let content = '';
    let hasNotionContent = false;

    // 페이지 헤더 생성
    content += this.generatePageHeader(pageId, files, isNoNotionPage);

    // Notion 컨텐츠 포함 (페이지가 있는 경우)
    if (!isNoNotionPage && options.includeNotionContent !== false && this.markdownConverter) {
      try {
        const notionContent = await this.getNotionContent(pageId);
        if (notionContent) {
          content += '\n## 📄 Notion Page Content\n\n';
          content += notionContent;
          content += '\n\n';
          hasNotionContent = true;
        }
      } catch (error) {
        logger.warning(`Failed to fetch Notion content for page ${pageId}:`, error);
      }
    }

    // 연결된 파일들의 소스 코드 포함
    if (options.includeSourceCode !== false) {
      content += '\n## 📁 Related Source Files\n\n';
      
      for (const file of files) {
        content += `### ${basename(file.path)}\n\n`;
        content += this.generateFileMetadata(file);
        
        const sourceContent = this.getSourceContent(file.path);
        if (sourceContent) {
          content += '\n**Source Code:**\n\n';
          content += '```' + this.getLanguageForHighlighting(file.language) + '\n';
          content += sourceContent;
          content += '\n```\n\n';
        }
        
        content += '---\n\n';
      }
    }

    // 파일 저장
    try {
      this.ensureDirectoryExists(dirname(exportPath));
      writeFileSync(exportPath, content, 'utf-8');

      return {
        originalPath: files.map(f => f.path).join(', '),
        exportedPath: exportPath,
        type: 'page',
        size: Buffer.byteLength(content, 'utf-8'),
        hasNotionContent,
        notionPageId: isNoNotionPage ? undefined : pageId,
        relatedFiles: files.map(f => f.path)
      };
    } catch (error) {
      logger.error(`Failed to write page file ${exportPath}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 단일 파일 내보내기
   */
  private async exportSingleFile(
    file: ExploredFile,
    options: DocumentExportOptions
  ): Promise<ExportedFile | null> {
    const fileName = this.generateFileName(file, options.fileNameTemplate);
    const exportPath = join(options.outputDir, fileName);

    let content = '';
    let hasNotionContent = false;

    // 메타데이터 헤더 추가
    content += this.generateFileHeader(file);

    // 소스 코드 포함
    if (options.includeSourceCode !== false) {
      const sourceContent = this.getSourceContent(file.path);
      if (sourceContent) {
        content += '\n## Source Code\n\n';
        content += '```' + this.getLanguageForHighlighting(file.language) + '\n';
        content += sourceContent;
        content += '\n```\n\n';
      }
    }

    // Notion 콘텐츠 포함
    if (options.includeNotionContent !== false && file.notionId && this.markdownConverter) {
      try {
        const notionContent = await this.getNotionContent(file.notionId);
        if (notionContent) {
          content += '\n## Notion Documentation\n\n';
          content += notionContent;
          content += '\n\n';
          hasNotionContent = true;
        }
      } catch (error) {
        logger.warning(`Failed to fetch Notion content for ${file.path}:`, error);
      }
    }

    // 파일 저장
    try {
      this.ensureDirectoryExists(dirname(exportPath));
      writeFileSync(exportPath, content, 'utf-8');

      return {
        originalPath: file.path,
        exportedPath: exportPath,
        type: 'source',
        size: Buffer.byteLength(content, 'utf-8'),
        hasNotionContent
      };
    } catch (error) {
      logger.error(`Failed to write file ${exportPath}: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * Notion 페이지 헤더 생성
   */
  private generatePageHeader(pageId: string, files: ExploredFile[], isNoNotionPage: boolean): string {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const languages = [...new Set(files.map(f => f.language))];
    const dependencyTypes = [...new Set(files.map(f => f.dependencyType))];

    const title = isNoNotionPage 
      ? '📄 Files without Notion Page'
      : `📄 Notion Page: ${pageId.slice(0, 8)}`;

    return `---
title: ${title}
notion_page_id: ${isNoNotionPage ? 'N/A' : pageId}
related_files_count: ${files.length}
total_size: ${totalSize} bytes
languages: [${languages.join(', ')}]
dependency_types: [${dependencyTypes.join(', ')}]
exported_at: ${new Date().toISOString()}
---

# ${title}

**📋 Summary:**
- **Related Files**: ${files.length}
- **Total Size**: ${(totalSize / 1024).toFixed(2)} KB
- **Languages**: ${languages.join(', ')}
- **Dependency Types**: ${dependencyTypes.join(', ')}
- **Notion Page ID**: \`${isNoNotionPage ? 'N/A' : pageId}\`

`;
  }

  /**
   * 파일 메타데이터 생성
   */
  private generateFileMetadata(file: ExploredFile): string {
    const dependencyTypeEmoji = {
      'direct': '🔗',
      'indirect': '🔗🔗',
      'reverse': '🔙'
    };

    return `**${dependencyTypeEmoji[file.dependencyType]} File Information:**
- **Path**: \`${file.relativePath}\`
- **Language**: ${file.language}
- **Dependency Type**: ${file.dependencyType} (depth: ${file.depth})
- **Size**: ${file.size} bytes
- **Last Modified**: ${file.lastModified.toLocaleDateString()}
- **Notion ID**: ${file.notionId || 'N/A'}

`;
  }

  /**
   * 파일 헤더 생성 (기존 단일 파일용 - 호환성 유지)
   */
  private generateFileHeader(file: ExploredFile): string {
    const dependencyTypeEmoji = {
      'direct': '🔗',
      'indirect': '🔗🔗',
      'reverse': '🔙'
    };

    return `---
title: ${basename(file.path)}
path: ${file.relativePath}
language: ${file.language}
dependency_type: ${file.dependencyType}
depth: ${file.depth}
size: ${file.size} bytes
last_modified: ${file.lastModified.toISOString()}
notion_id: ${file.notionId || 'N/A'}
---

# ${dependencyTypeEmoji[file.dependencyType]} ${basename(file.path)}

**Path**: \`${file.relativePath}\`  
**Language**: ${file.language}  
**Dependency Type**: ${file.dependencyType}  
**Depth**: ${file.depth}  
**Size**: ${file.size} bytes  
**Last Modified**: ${file.lastModified.toLocaleDateString()}  

`;
  }

  /**
   * 소스 코드 내용 가져오기
   */
  private getSourceContent(filePath: string): string | null {
    try {
      const fs = require('fs');
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      logger.warning(`Failed to read source file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Notion 콘텐츠 가져오기
   */
  private async getNotionContent(notionId: string): Promise<string | null> {
    if (!this.markdownConverter) {
      return null;
    }

    try {
      const result = await this.markdownConverter.pageToMarkdown(notionId);
      return result.success ? result.content : null;
    } catch (error) {
      logger.error(`Failed to convert Notion page ${notionId} to markdown: ` + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }

  /**
   * 인덱스 파일 생성 - 페이지 단위로 수정
   */
  private async createIndexFile(
    graph: DependencyGraph,
    exportedFiles: ExportedFile[],
    options: DocumentExportOptions
  ): Promise<string> {
    const indexPath = join(options.outputDir, 'README.md');
    
    const summary = dependencyExplorationService.generateGraphSummary(graph);
    
    // 페이지별 통계 계산
    const pageFiles = exportedFiles.filter(f => f.type === 'page');
    const pagesWithNotion = pageFiles.filter(f => f.hasNotionContent);
    const filesWithoutNotion = pageFiles.find(f => f.notionPageId === undefined);
    
    let content = `# Dependency Documentation Export (Page-Based)

Generated on: ${new Date().toLocaleString()}

${summary.summary}

## 📄 Notion Pages Export

This export is organized by **Notion pages**. Each markdown file represents one Notion page and contains all related source files.

### Generated Pages

${pageFiles.map(page => {
  const fileName = basename(page.exportedPath);
  const fileCount = page.relatedFiles ? page.relatedFiles.length : 0;
  const hasNotion = page.hasNotionContent ? '📄' : '📁';
  const pageInfo = page.notionPageId ? `Page: ${page.notionPageId.slice(0, 8)}` : 'No Notion Page';
  
  return `- ${hasNotion} [${fileName}](./${fileName}) - ${pageInfo} (${fileCount} files, ${(page.size / 1024).toFixed(2)} KB)`;
}).join('\n')}

## 📊 Export Statistics

- **Total source files analyzed**: ${graph.totalFiles}
- **Generated Notion page documents**: ${pageFiles.length}
- **Pages with Notion content**: ${pagesWithNotion.length}
- **Pages without Notion content**: ${pageFiles.length - pagesWithNotion.length}
- **Total export size**: ${(exportedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB

## 🔍 Dependency Analysis

### Direct Dependencies
${graph.dependencies
  .filter(f => f.dependencyType === 'direct')
  .map(f => `- \`${f.relativePath}\` (${f.language}) ${f.notionId ? '📄' : '📁'}`)
  .join('\n')}

### Indirect Dependencies
${graph.dependencies
  .filter(f => f.dependencyType === 'indirect')
  .map(f => `- \`${f.relativePath}\` (${f.language}, depth: ${f.depth}) ${f.notionId ? '📄' : '📁'}`)
  .join('\n')}

### Reverse Dependencies
${graph.reverseDependencies
  .map(f => `- \`${f.relativePath}\` (${f.language}) ${f.notionId ? '📄' : '📁'}`)
  .join('\n')}

## 🏷️ File Types
${Object.entries(summary.filesByType)
  .map(([lang, count]) => `- **${lang}**: ${count} files`)
  .join('\n')}

## 📝 Export Method

- **Organization**: Files grouped by Notion page
- **Structure**: Each page contains all related source files
- **Content**: Notion page content + source code + metadata
- **Format**: Structured markdown with frontmatter

---
Generated by Dependency Linker (Page-Based Export)
`;

    writeFileSync(indexPath, content, 'utf-8');
    return indexPath;
  }

  /**
   * 파일명 생성
   */
  private generateFileName(file: ExploredFile, template?: string): string {
    const baseName = basename(file.path, '.' + file.path.split('.').pop());
    const extension = file.path.split('.').pop();
    
    if (template) {
      return template
        .replace('{name}', baseName)
        .replace('{extension}', extension || '')
        .replace('{language}', file.language)
        .replace('{depth}', file.depth.toString())
        .replace('{type}', file.dependencyType);
    }

    const prefix = file.dependencyType === 'reverse' ? 'reverse_' : '';
    const depthSuffix = file.depth > 0 ? `_d${file.depth}` : '';
    
    return `${prefix}${baseName}${depthSuffix}.md`;
  }

  /**
   * 언어별 하이라이팅 언어 매핑
   */
  private getLanguageForHighlighting(language: string): string {
    const languageMap: Record<string, string> = {
      'TypeScript': 'typescript',
      'JavaScript': 'javascript',
      'Python': 'python',
      'Go': 'go',
      'Rust': 'rust',
      'Java': 'java',
      'C++': 'cpp',
      'C': 'c'
    };
    
    return languageMap[language] || language.toLowerCase();
  }

  /**
   * 출력 디렉토리 준비
   */
  private prepareOutputDirectory(outputDir: string): void {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 내보내기 요약 생성 - 페이지 단위
   */
  private generateExportSummary(exportedFiles: ExportedFile[], exportTime: number): ExportSummary {
    const pageFiles = exportedFiles.filter(f => f.type === 'page');
    const totalSourceFiles = pageFiles.reduce((sum, f) => sum + (f.relatedFiles?.length || 0), 0);
    
    return {
      totalFiles: totalSourceFiles, // 실제 소스 파일 수
      sourceFiles: totalSourceFiles,
      notionFiles: exportedFiles.filter(f => f.hasNotionContent).length,
      notionPages: pageFiles.length, // 생성된 페이지 수
      totalSize: exportedFiles.reduce((sum, f) => sum + f.size, 0),
      exportTime
    };
  }
}

export const documentExportService = new DocumentExportService();