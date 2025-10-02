/**
 * Graph Storage Service
 * 분석 결과를 그래프 데이터베이스에 저장하는 서비스
 */

import { join } from 'node:path';
import type { SupportedLanguage } from '../core/types';
import { createGraphDatabase, type GraphDatabase, type GraphNode, type GraphRelationship, type ProjectInfo } from './GraphDatabase';

export interface StorageOptions {
  projectRoot: string;
  projectName?: string;
  sessionName?: string;
  dbPath?: string;
}

export interface ParseResult {
  imports?: string[];
  exports?: string[];
  declarations?: Array<{
    name: string;
    type: string;
    location?: {
      start?: { line: number; column: number };
      end?: { line: number; column: number };
    };
    metadata?: Record<string, any>;
  }>;
  functionCalls?: Array<{
    name: string;
    location?: any;
  }>;
  metadata?: {
    fileSize?: number;
    lastModified?: string;
    [key: string]: any;
  };
}

export interface StorageResult {
  projectId: number;
  sessionId: number;
  nodesCreated: number;
  relationshipsCreated: number;
  processingTime: number;
}

/**
 * 그래프 저장 서비스
 */
export class GraphStorage {
  private db: GraphDatabase;
  private options: Required<StorageOptions>;

  constructor(options: StorageOptions) {
    this.options = {
      ...options,
      projectName: options.projectName || 'Dependency Analysis',
      sessionName: options.sessionName || `Analysis-${new Date().toISOString()}`,
      dbPath: options.dbPath || join(options.projectRoot, '.dependency-linker', 'graph.db'),
    };

    this.db = createGraphDatabase(this.options.dbPath);
  }

  /**
   * 분석 결과를 데이터베이스에 저장
   */
  async storeAnalysisResults(results: Array<{
    filePath: string;
    language: SupportedLanguage;
    result: ParseResult;
  }>): Promise<StorageResult> {
    const startTime = Date.now();

    await this.db.initialize();

    try {
      // 1. 프로젝트 생성/업데이트
      const projectInfo: ProjectInfo = {
        name: this.options.projectName,
        rootPath: this.options.projectRoot,
        description: `Dependency analysis project`,
        metadata: {
          totalFiles: results.length,
          languages: Array.from(new Set(results.map(r => r.language))),
          lastAnalyzed: new Date().toISOString(),
        },
      };

      const projectId = await this.db.upsertProject(projectInfo);

      // 2. 분석 세션 생성
      const sessionId = await this.db.createSession({
        projectId,
        name: this.options.sessionName,
        config: {
          totalFiles: results.length,
          languages: Array.from(new Set(results.map(r => r.language))),
        },
        stats: {},
      });

      let nodesCreated = 0;
      let relationshipsCreated = 0;

      // 3. 각 파일별 노드와 관계 생성
      for (const fileResult of results) {
        const { filePath, language, result } = fileResult;

        // 3.1. 파일 노드 생성
        const fileNode: GraphNode = {
          identifier: this.normalizeFilePath(filePath),
          type: 'file',
          name: this.getFileName(filePath),
          sourceFile: this.normalizeFilePath(filePath),
          language,
          metadata: {
            extension: this.getFileExtension(filePath),
            size: result.metadata?.fileSize,
            lastModified: result.metadata?.lastModified,
          },
        };

        const fileNodeId = await this.db.upsertNode(fileNode);
        nodesCreated++;

        // 3.2. import 소스들을 노드로 생성
        if (result.imports?.length) {
          for (const importSource of result.imports) {
            // import된 파일의 노드 생성
            const importNode: GraphNode = {
              identifier: this.normalizeImportPath(importSource, filePath),
              type: this.isExternalPackage(importSource) ? 'external' : 'file',
              name: this.getImportName(importSource),
              sourceFile: this.isExternalPackage(importSource) ? importSource : this.normalizeImportPath(importSource, filePath),
              language: this.isExternalPackage(importSource) ? 'external' : language,
              metadata: {
                originalImport: importSource,
                isExternal: this.isExternalPackage(importSource),
              },
            };

            const importNodeId = await this.db.upsertNode(importNode);
            nodesCreated++;

            // import 관계 생성
            const importRelationship: GraphRelationship = {
              fromNodeId: fileNodeId,
              toNodeId: importNodeId,
              type: 'imports',
              metadata: {
                importPath: importSource,
                isNamespace: importSource.includes('*'),
              },
            };

            await this.db.upsertRelationship(importRelationship);
            relationshipsCreated++;
          }
        }

        // 3.3. exports를 노드로 생성
        if (result.exports?.length) {
          for (const exportDecl of result.exports) {
            const exportNode: GraphNode = {
              identifier: `${this.normalizeFilePath(filePath)}#${exportDecl}`,
              type: 'export',
              name: exportDecl,
              sourceFile: this.normalizeFilePath(filePath),
              language,
              metadata: {
                exportName: exportDecl,
                isDefault: exportDecl === 'default',
              },
            };

            const exportNodeId = await this.db.upsertNode(exportNode);
            nodesCreated++;

            // export 관계 생성 (파일이 export를 선언)
            const exportRelationship: GraphRelationship = {
              fromNodeId: fileNodeId,
              toNodeId: exportNodeId,
              type: 'declares',
              metadata: {
                declarationType: 'export',
              },
            };

            await this.db.upsertRelationship(exportRelationship);
            relationshipsCreated++;
          }
        }

        // 3.4. 함수/클래스 선언을 노드로 생성
        if (result.declarations?.length) {
          for (const declaration of result.declarations) {
            const declarationNode: GraphNode = {
              identifier: `${this.normalizeFilePath(filePath)}#${declaration.name}`,
              type: declaration.type,
              name: declaration.name,
              sourceFile: this.normalizeFilePath(filePath),
              language,
              metadata: {
                declarationType: declaration.type,
                isAsync: declaration.metadata?.isAsync,
                parameters: declaration.metadata?.parameters,
                returnType: declaration.metadata?.returnType,
              },
              startLine: declaration.location?.start?.line,
              startColumn: declaration.location?.start?.column,
              endLine: declaration.location?.end?.line,
              endColumn: declaration.location?.end?.column,
            };

            const declarationNodeId = await this.db.upsertNode(declarationNode);
            nodesCreated++;

            // 선언 관계 생성 (파일이 함수/클래스를 선언)
            const declarationRelationship: GraphRelationship = {
              fromNodeId: fileNodeId,
              toNodeId: declarationNodeId,
              type: 'declares',
              metadata: {
                declarationType: declaration.type,
              },
            };

            await this.db.upsertRelationship(declarationRelationship);
            relationshipsCreated++;
          }
        }

        // 3.5. 함수 호출을 관계로 생성
        if (result.functionCalls?.length) {
          for (const call of result.functionCalls) {
            // 호출하는 함수 찾기 (간단히 파일로 처리)
            const callRelationship: GraphRelationship = {
              fromNodeId: fileNodeId,
              toNodeId: fileNodeId, // 임시로 자기 자신
              type: 'calls',
              metadata: {
                functionName: call.name,
                callType: 'function',
                location: call.location,
              },
            };

            await this.db.upsertRelationship(callRelationship);
            relationshipsCreated++;
          }
        }
      }

      const processingTime = Date.now() - startTime;

      // 4. 세션 통계 업데이트
      await this.updateSessionStats(sessionId, {
        nodesCreated,
        relationshipsCreated,
        processingTime,
        completedAt: new Date().toISOString(),
      });

      return {
        projectId,
        sessionId,
        nodesCreated,
        relationshipsCreated,
        processingTime,
      };

    } finally {
      // 연결 유지 (재사용을 위해)
    }
  }

  /**
   * 세션 통계 업데이트
   */
  private async updateSessionStats(sessionId: number, stats: Record<string, any>): Promise<void> {
    // SQLite에서 직접 UPDATE 실행
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE analysis_sessions
        SET stats = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      // @ts-ignore - db는 private이지만 접근 필요
      this.db.db?.run(sql, [JSON.stringify(stats), sessionId], (err) => {
        if (err) {
          reject(new Error(`Failed to update session stats: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 파일 경로 정규화
   */
  private normalizeFilePath(filePath: string): string {
    if (filePath.startsWith(this.options.projectRoot)) {
      return filePath.substring(this.options.projectRoot.length + 1);
    }
    return filePath;
  }

  /**
   * import 경로 정규화
   */
  private normalizeImportPath(importPath: string, currentFile: string): string {
    if (this.isExternalPackage(importPath)) {
      return importPath;
    }

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // 상대 경로를 절대 경로로 변환
      const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
      return join(currentDir, importPath).replace(/\\/g, '/');
    }

    return importPath;
  }

  /**
   * 외부 패키지 여부 확인
   */
  private isExternalPackage(importPath: string): boolean {
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  /**
   * 파일명 추출
   */
  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * 파일 확장자 추출
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > 0 ? filePath.substring(lastDot) : '';
  }

  /**
   * import 이름 추출
   */
  private getImportName(importPath: string): string {
    if (this.isExternalPackage(importPath)) {
      // 패키지명에서 스코프 제거
      const parts = importPath.split('/');
      return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    return this.getFileName(importPath);
  }

  /**
   * 프로젝트 통계 조회
   */
  async getProjectStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    filesByLanguage: Record<string, number>;
    nodesByType: Record<string, number>;
    relationshipsByType: Record<string, number>;
  }> {
    await this.db.initialize();

    const basicStats = await this.db.getStats();

    // 언어별 파일 수 조회
    const files = await this.db.findNodes({ nodeTypes: ['file'] });
    const filesByLanguage: Record<string, number> = {};

    files.forEach(file => {
      if (file.language !== 'external') {
        filesByLanguage[file.language] = (filesByLanguage[file.language] || 0) + 1;
      }
    });

    return {
      ...basicStats,
      filesByLanguage,
    };
  }

  /**
   * 파일별 의존성 조회
   */
  async getFileDependencies(filePath: string): Promise<{
    dependencies: GraphNode[];
    dependents: GraphNode[];
  }> {
    await this.db.initialize();

    const normalizedPath = this.normalizeFilePath(filePath);
    const nodes = await this.db.findNodes({
      sourceFiles: [normalizedPath],
      nodeTypes: ['file']
    });

    if (!nodes.length) {
      return { dependencies: [], dependents: [] };
    }

    const fileNode = nodes[0];

    const dependencies = await this.db.findNodeDependencies(fileNode.id!, ['imports']);
    const dependents = await this.db.findNodeDependents(fileNode.id!, ['imports']);

    return {
      dependencies,
      dependents,
    };
  }

  /**
   * 순환 의존성 조회
   */
  async getCircularDependencies(): Promise<GraphNode[][]> {
    await this.db.initialize();
    return this.db.findCircularDependencies(['imports']);
  }

  /**
   * 의존성 경로 찾기
   */
  async findDependencyPath(fromFile: string, toFile: string): Promise<GraphNode[] | null> {
    await this.db.initialize();

    const fromNormalized = this.normalizeFilePath(fromFile);
    const toNormalized = this.normalizeFilePath(toFile);

    const fromNodes = await this.db.findNodes({
      sourceFiles: [fromNormalized],
      nodeTypes: ['file']
    });
    const toNodes = await this.db.findNodes({
      sourceFiles: [toNormalized],
      nodeTypes: ['file']
    });

    if (!fromNodes.length || !toNodes.length) {
      return null;
    }

    const path = await this.db.findDependencyPath(fromNodes[0].id!, toNodes[0].id!);
    return path?.nodes || null;
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * 데이터베이스 인스턴스 반환 (고급 쿼리용)
   */
  getDatabase(): GraphDatabase {
    return this.db;
  }
}

/**
 * 그래프 저장소 팩토리 함수
 */
export function createGraphStorage(options: StorageOptions): GraphStorage {
  return new GraphStorage(options);
}