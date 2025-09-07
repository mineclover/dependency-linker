/**
 * Enhanced Dependency Analyzer
 * 캐싱과 패턴 매칭을 통합한 향상된 의존성 분석기
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { DependencyAnalyzer as BaseDependencyAnalyzer } from './analyzer.js';
import { DependencyCacheManager } from '../database/dependencyCacheManager.js';
import { PatternEngine } from '../database/patternEngine.js';
import type { FileMetadata, DirectDependency, PatternReference } from '../database/dependencyCacheManager.js';
import { logger } from '../../shared/utils/index.js';

export interface EnhancedAnalysisResult {
  directDependencies: DirectDependency[];
  patternMatches: PatternMatchResult[];
  documentLinks: DocumentLinkResult[];
  circularDependencies: CircularDependency[];
  statistics: AnalysisStatistics;
  cacheHitRate: number;
}

export interface PatternMatchResult {
  pattern: PatternReference;
  matchedFiles: FileMetadata[];
  confidence: number;
  scope: string;
}

export interface DocumentLinkResult {
  documentFile: FileMetadata;
  linkedCodeFiles: FileMetadata[];
  patterns: PatternReference[];
  linkStrength: number;
}

export interface CircularDependency {
  cycle: FileMetadata[];
  severity: 'info' | 'warning' | 'error';
  length: number;
}

export interface AnalysisStatistics {
  totalFiles: number;
  analyzedFiles: number;
  cachedFiles: number;
  directDependencies: number;
  resolvedDependencies: number;
  externalDependencies: number;
  patternReferences: number;
  activePatternMatches: number;
  documentCodeLinks: number;
  circularDependencies: number;
  analysisTimeMs: number;
  cacheEfficiency: number;
}

export class EnhancedDependencyAnalyzer {
  private baseAnalyzer: BaseDependencyAnalyzer;
  private cacheManager: DependencyCacheManager;
  private patternEngine: PatternEngine;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.baseAnalyzer = new BaseDependencyAnalyzer(projectPath);
    this.cacheManager = new DependencyCacheManager(projectPath);
    this.patternEngine = new PatternEngine(projectPath);
  }

  /**
   * 향상된 프로젝트 분석 수행
   */
  async analyzeProject(): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();
    logger.info('향상된 의존성 분석 시작', '🔍');

    try {
      // 1. 파일 메타데이터 수집 및 캐시 확인
      const { allFiles, changedFiles, cacheHits } = await this.collectFileMetadata();
      
      // 2. 직접 의존성 분석 (변경된 파일만)
      const directDependencies = await this.analyzeDirectDependencies(changedFiles);
      
      // 3. 패턴 기반 간접 참조 분석
      const patternResults = await this.analyzePatternReferences(allFiles);
      
      // 4. 문서-코드 링크 분석
      const documentLinks = await this.analyzeDocumentLinks(allFiles);
      
      // 5. 순환 의존성 감지
      const circularDependencies = await this.detectCircularDependencies();
      
      const endTime = Date.now();
      const analysisTimeMs = endTime - startTime;
      
      // 통계 생성
      const statistics = await this.generateStatistics(
        allFiles, 
        changedFiles, 
        cacheHits, 
        analysisTimeMs
      );

      logger.success(
        `향상된 의존성 분석 완료: ${statistics.totalFiles}개 파일, ` +
        `${statistics.directDependencies}개 직접 의존성, ` +
        `${statistics.activePatternMatches}개 패턴 매치 (${analysisTimeMs}ms)`
      );

      return {
        directDependencies,
        patternMatches: patternResults,
        documentLinks,
        circularDependencies,
        statistics,
        cacheHitRate: cacheHits / Math.max(allFiles.length, 1)
      };

    } catch (error) {
      logger.error(`향상된 의존성 분석 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 파일 메타데이터 수집 및 캐시 확인
   */
  private async collectFileMetadata(): Promise<{
    allFiles: FileMetadata[];
    changedFiles: FileMetadata[];
    cacheHits: number;
  }> {
    logger.info('파일 메타데이터 수집 중...', '📋');
    
    const allFiles: FileMetadata[] = [];
    const changedFiles: FileMetadata[] = [];
    let cacheHits = 0;

    // 기본 분석기를 사용해 파일 목록 가져오기
    const legacyGraph = await this.baseAnalyzer.analyzeProject();
    
    for (const [filePath, fileNode] of legacyGraph.files) {
      const absolutePath = path.resolve(this.projectPath, filePath);
      
      try {
        const stats = await fs.stat(absolutePath);
        const currentHash = await this.cacheManager.calculateFileHash(absolutePath);
        
        const metadata: FileMetadata = {
          filePath: absolutePath,
          relativePath: filePath,
          fileHash: currentHash,
          fileSize: stats.size,
          lastModified: stats.mtimeMs,
          extension: path.extname(filePath),
          projectPath: this.projectPath,
          notionId: fileNode.notionId
        };

        // 캐시에서 확인
        const existingFile = await this.getExistingFileMetadata(absolutePath);
        if (existingFile && existingFile.fileHash === currentHash) {
          // 캐시 히트 - 변경되지 않음
          cacheHits++;
          metadata.id = existingFile.id;
        } else {
          // 캐시 미스 - 변경되었거나 새 파일
          changedFiles.push(metadata);
          if (existingFile) {
            await this.cacheManager.invalidateFileCache(existingFile.id!);
          }
        }

        // 파일 메타데이터 저장/업데이트
        metadata.id = await this.cacheManager.upsertFile(metadata);
        allFiles.push(metadata);

      } catch (error) {
        logger.warning(`파일 메타데이터 수집 실패: ${filePath} - ${error}`);
      }
    }

    logger.info(
      `파일 메타데이터 수집 완료: ${allFiles.length}개 파일, ` +
      `${cacheHits}개 캐시 히트, ${changedFiles.length}개 변경됨`
    );

    return { allFiles, changedFiles, cacheHits };
  }

  /**
   * 직접 의존성 분석 (변경된 파일만)
   */
  private async analyzeDirectDependencies(changedFiles: FileMetadata[]): Promise<DirectDependency[]> {
    if (changedFiles.length === 0) {
      logger.info('변경된 파일이 없어 직접 의존성 분석을 건너뜀');
      return this.cacheManager.getFileDependencies(0); // 모든 의존성 반환
    }

    logger.info(`${changedFiles.length}개 변경된 파일의 직접 의존성 분석 중...`, '🔗');
    
    const dependencies: DirectDependency[] = [];

    for (const file of changedFiles) {
      try {
        // 기본 분석기를 사용해 파일의 import 구문 분석
        const fileNode = await this.baseAnalyzer.analyzeFile(file.filePath);
        
        for (const importStatement of fileNode.imports) {
          // import 구문을 실제 파일로 해결
          const resolvedPath = await this.resolveImportPath(
            importStatement.source, 
            file.filePath
          );

          if (resolvedPath) {
            const targetFile = await this.getFileByPath(resolvedPath);
            if (targetFile) {
              const dependency: DirectDependency = {
                sourceFileId: file.id!,
                targetFileId: targetFile.id!,
                dependencyType: importStatement.type as any,
                importStatement: importStatement.raw,
                specifiers: JSON.stringify(importStatement.specifiers || []),
                lineNumber: importStatement.line,
                isResolved: true
              };

              const depId = await this.cacheManager.saveDependency(dependency);
              dependencies.push({ ...dependency, id: depId });
            }
          }
        }
      } catch (error) {
        logger.error(`파일 의존성 분석 실패: ${file.relativePath} - ${error}`);
      }
    }

    return dependencies;
  }

  /**
   * 패턴 기반 간접 참조 분석
   */
  private async analyzePatternReferences(allFiles: FileMetadata[]): Promise<PatternMatchResult[]> {
    logger.info('패턴 기반 간접 참조 분석 중...', '🎯');
    
    const results: PatternMatchResult[] = [];
    const documentFiles = allFiles.filter(f => 
      ['.md', '.txt', '.rst', '.json', '.yaml', '.yml', '.toml'].includes(f.extension)
    );

    for (const docFile of documentFiles) {
      try {
        // 문서에서 패턴 추출
        const patternExtraction = await this.patternEngine.extractPatternsFromDocument(
          docFile.filePath
        );

        for (const extractedPattern of patternExtraction.patterns) {
          // 패턴 참조 저장
          const patternRef: PatternReference = {
            pattern: extractedPattern.pattern,
            patternType: extractedPattern.type === 'exact' ? 'glob' : extractedPattern.type,
            scopeType: extractedPattern.scope,
            ownerFileId: docFile.id,
            description: extractedPattern.context
          };

          const patternId = await this.cacheManager.savePatternReference(patternRef);
          patternRef.id = patternId;

          // 패턴 매칭 수행
          const matches = await this.cacheManager.performPatternMatching(patternId);
          const matchedFiles = await Promise.all(
            matches.map(m => this.getFileById(m.matchedFileId))
          ).then(files => files.filter(f => f !== null) as FileMetadata[]);

          if (matchedFiles.length > 0) {
            results.push({
              pattern: patternRef,
              matchedFiles,
              confidence: extractedPattern.confidence,
              scope: extractedPattern.scope
            });

            // 문서-코드 링크 생성
            for (const matchedFile of matchedFiles) {
              await this.cacheManager.saveDocumentCodeLink({
                documentFileId: docFile.id!,
                codeFileId: matchedFile.id,
                patternId,
                linkType: 'pattern',
                linkContext: extractedPattern.context
              });
            }
          }
        }
      } catch (error) {
        logger.error(`패턴 분석 실패: ${docFile.relativePath} - ${error}`);
      }
    }

    logger.info(`${results.length}개 패턴 매칭 결과 생성`);
    return results;
  }

  /**
   * 문서-코드 링크 분석
   */
  private async analyzeDocumentLinks(allFiles: FileMetadata[]): Promise<DocumentLinkResult[]> {
    logger.info('문서-코드 링크 분석 중...', '📚');
    
    const results: DocumentLinkResult[] = [];
    const documentFiles = allFiles.filter(f => 
      ['.md', '.txt', '.rst'].includes(f.extension)
    );

    for (const docFile of documentFiles) {
      const links = this.cacheManager.getDocumentCodeLinks(docFile.id!);
      
      if (links.length > 0) {
        const linkedCodeFiles = await Promise.all(
          links
            .filter(link => link.codeFileId)
            .map(link => this.getFileById(link.codeFileId!))
        ).then(files => files.filter(f => f !== null) as FileMetadata[]);

        const patterns = await Promise.all(
          links
            .filter(link => link.patternId)
            .map(link => this.getPatternById(link.patternId!))
        ).then(patterns => patterns.filter(p => p !== null) as PatternReference[]);

        const linkStrength = this.calculateLinkStrength(links);

        results.push({
          documentFile: docFile,
          linkedCodeFiles,
          patterns,
          linkStrength
        });
      }
    }

    return results;
  }

  /**
   * 순환 의존성 감지
   */
  private async detectCircularDependencies(): Promise<CircularDependency[]> {
    logger.info('순환 의존성 감지 중...', '🔄');
    
    this.cacheManager.detectAndSaveCircularDependencies();
    
    // 감지된 순환 의존성 조회
    const cycles = this.getCachedCircularDependencies();
    
    const results: CircularDependency[] = [];
    for (const cycle of cycles) {
      const fileIds = JSON.parse(cycle.cycle_path);
      const files = await Promise.all(
        fileIds.map((id: number) => this.getFileById(id))
      ).then(files => files.filter(f => f !== null) as FileMetadata[]);

      results.push({
        cycle: files,
        severity: cycle.severity as any,
        length: cycle.cycle_length
      });
    }

    return results;
  }

  /**
   * 통계 생성
   */
  private async generateStatistics(
    allFiles: FileMetadata[],
    changedFiles: FileMetadata[],
    cacheHits: number,
    analysisTimeMs: number
  ): Promise<AnalysisStatistics> {
    const dbStats = this.cacheManager.getStatistics();
    
    return {
      totalFiles: allFiles.length,
      analyzedFiles: changedFiles.length,
      cachedFiles: cacheHits,
      directDependencies: dbStats.direct_dependencies,
      resolvedDependencies: dbStats.direct_dependencies, // 모두 해결된 것으로 가정
      externalDependencies: this.calculateExternalDependencies(dbStats.direct_dependencies),
      patternReferences: dbStats.pattern_references,
      activePatternMatches: dbStats.active_pattern_matches,
      documentCodeLinks: dbStats.document_code_links,
      circularDependencies: dbStats.circular_dependencies,
      analysisTimeMs,
      cacheEfficiency: cacheHits / Math.max(allFiles.length, 1)
    };
  }

  /**
   * Import 경로 해결
   */
  private async resolveImportPath(importPath: string, fromFile: string): Promise<string | null> {
    if (importPath.startsWith('.')) {
      // 상대 경로
      const resolved = path.resolve(path.dirname(fromFile), importPath);
      
      // 확장자가 없으면 .ts, .js 등을 시도
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {}
      }
      
      // index 파일 확인
      for (const ext of extensions) {
        const indexFile = path.join(resolved, `index${ext}`);
        try {
          await fs.access(indexFile);
          return indexFile;
        } catch {}
      }
    }
    
    // 외부 모듈이거나 해결할 수 없는 경우
    return null;
  }

  /**
   * 링크 강도 계산
   */
  private calculateLinkStrength(links: any[]): number {
    if (links.length === 0) return 0;
    
    const directLinks = links.filter(l => l.linkType === 'direct').length;
    const patternLinks = links.filter(l => l.linkType === 'pattern').length;
    const mentionLinks = links.filter(l => l.linkType === 'mention').length;
    
    // 가중치 적용
    const score = (directLinks * 1.0) + (patternLinks * 0.8) + (mentionLinks * 0.5);
    
    return Math.min(score / 10, 1.0); // 0-1 범위로 정규화
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.cacheManager.close();
  }

  // 헬퍼 메서드들
  private calculateExternalDependencies(totalDependencies: number): number {
    // Simple heuristic: assume 20% of dependencies are external
    // In a real implementation, this would analyze import statements
    // to distinguish between internal and external (npm/third-party) dependencies
    return Math.floor(totalDependencies * 0.2);
  }

  private async getExistingFileMetadata(filePath: string): Promise<FileMetadata | null> {
    return this.cacheManager.getFileByPath(filePath);
  }

  private async getFileByPath(filePath: string): Promise<FileMetadata | null> {
    return this.cacheManager.getFileByPath(filePath);
  }

  private async getFileById(fileId: number): Promise<FileMetadata | null> {
    return this.cacheManager.getFileById(fileId);
  }

  private async getPatternById(patternId: number): Promise<PatternReference | null> {
    return this.cacheManager.getPatternById(patternId);
  }

  private getCachedCircularDependencies(): any[] {
    return this.cacheManager.getCircularDependencies();
  }
}