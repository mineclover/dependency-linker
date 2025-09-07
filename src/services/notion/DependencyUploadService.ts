/**
 * Enhanced Dependency Upload Service - Application Layer
 * 의존성 분석 결과를 체계적으로 Notion에 업로드하는 고도화된 서비스
 */

import { Client } from '@notionhq/client';
import { logger } from '../../shared/utils/index.js';
import { LibraryManagementService, type LibraryManagementResult } from './LibraryManagementService.js';
import type { 
  DependencyInfo, 
  LanguageAnalysisResult,
  ClassifiedDependency 
} from '../parsers/common/parserInterfaces.js';

export interface DependencyUploadResult {
  success: boolean;
  uploadedDependencies: number;
  createdRelations: number;
  dependencyGraphPageId?: string;
  libraryManagementResult?: LibraryManagementResult;
  summary: {
    localDependencies: number;
    externalLibraries: number;
    internalModules: number;
    circularDependencies: number;
    totalRelations: number;
    librariesCreated: number;
    librariesUpdated: number;
  };
  error?: string;
}

export interface DependencyGraphNode {
  id: string;
  name: string;
  type: 'file' | 'library' | 'module';
  path?: string;
  dependencies: string[];
  dependents: string[];
  metadata: {
    size?: number;
    language?: string;
    isExternal: boolean;
    packageName?: string;
    version?: string;
  };
}

export interface DependencyRelation {
  sourceId: string;
  targetId: string;
  type: 'import' | 'require' | 'dynamic' | 'export';
  importName?: string;
  isDefault?: boolean;
  lineNumber?: number;
  strength: 'weak' | 'medium' | 'strong'; // 의존성 강도
}

export class DependencyUploadService {
  private notionClient: Client;
  private databaseIds: {
    files?: string;
    dependencies?: string;
    dependencyRelations?: string;
    dependencyGraph?: string;
  };

  constructor(notionClient: Client, databaseIds: any) {
    this.notionClient = notionClient;
    this.databaseIds = databaseIds;
  }

  /**
   * 의존성 분석 결과를 체계적으로 Notion에 업로드
   */
  async uploadDependencyAnalysis(
    analysisResult: LanguageAnalysisResult,
    filePageId: string
  ): Promise<DependencyUploadResult> {
    logger.info(`🔗 Starting enhanced dependency upload for: ${analysisResult.filePath}`);
    
    try {
      // 1. 라이브러리 의존성 체계적 관리 (우선 처리)
      logger.info('📚 Processing library dependencies...');
      const libraryManagementService = new LibraryManagementService(this.notionClient, this.databaseIds);
      const libraryManagementResult = await libraryManagementService.manageLibraryDependencies(
        analysisResult.dependencies,
        filePageId,
        analysisResult.filePath
      );
      
      // 2. 의존성 그래프 생성
      const dependencyGraph = this.buildDependencyGraph(analysisResult);
      
      // 3. 로컬 파일 의존성 노드들을 Notion에 업로드 (라이브러리는 이미 처리됨)
      const localNodes = dependencyGraph.nodes.filter(node => node.type === 'file');
      const uploadedNodes = await this.uploadDependencyNodes(localNodes);
      
      // 4. 의존성 관계를 Notion에 업로드 (라이브러리 관계는 LibraryManagementService에서 처리됨)
      const localRelations = dependencyGraph.relations.filter(rel => {
        const targetNode = dependencyGraph.nodes.find(n => n.id === rel.targetId);
        return targetNode?.type === 'file'; // 로컬 파일간 관계만
      });
      const uploadedRelations = await this.uploadDependencyRelations(
        localRelations, 
        uploadedNodes,
        filePageId
      );
      
      // 5. 의존성 그래프 요약 페이지 생성
      const graphPageId = await this.createDependencyGraphPage(
        analysisResult, 
        dependencyGraph,
        filePageId,
        libraryManagementResult
      );
      
      // 6. 순환 의존성 탐지 및 기록
      const circularDependencies = this.detectCircularDependencies(dependencyGraph);
      
      const summary = {
        localDependencies: dependencyGraph.nodes.filter(n => n.type === 'file').length,
        externalLibraries: dependencyGraph.nodes.filter(n => n.type === 'library').length,
        internalModules: dependencyGraph.nodes.filter(n => n.type === 'module').length,
        circularDependencies: circularDependencies.length,
        totalRelations: dependencyGraph.relations.length,
        librariesCreated: libraryManagementResult.createdPages,
        librariesUpdated: libraryManagementResult.updatedPages
      };

      logger.info(`✅ Dependency upload completed: ${uploadedNodes} nodes, ${uploadedRelations} relations`);
      
      return {
        success: true,
        uploadedDependencies: uploadedNodes,
        createdRelations: uploadedRelations,
        dependencyGraphPageId: graphPageId,
        libraryManagementResult,
        summary
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Dependency upload failed: ${errorMessage}`);
      
      return {
        success: false,
        uploadedDependencies: 0,
        createdRelations: 0,
        summary: {
          localDependencies: 0,
          externalLibraries: 0,
          internalModules: 0,
          circularDependencies: 0,
          totalRelations: 0,
          librariesCreated: 0,
          librariesUpdated: 0
        },
        error: errorMessage
      };
    }
  }

  /**
   * 의존성 분석 결과로부터 그래프 구조 생성
   */
  private buildDependencyGraph(analysisResult: LanguageAnalysisResult): {
    nodes: DependencyGraphNode[];
    relations: DependencyRelation[];
  } {
    const nodes: DependencyGraphNode[] = [];
    const relations: DependencyRelation[] = [];
    const nodeMap = new Map<string, DependencyGraphNode>();

    // 1. 루트 파일 노드 생성
    const rootNodeId = this.generateNodeId(analysisResult.filePath);
    const rootNode: DependencyGraphNode = {
      id: rootNodeId,
      name: analysisResult.filePath.split('/').pop() || 'unknown',
      type: 'file',
      path: analysisResult.filePath,
      dependencies: [],
      dependents: [],
      metadata: {
        language: analysisResult.language,
        isExternal: false,
        size: analysisResult.content?.length || 0
      }
    };
    nodes.push(rootNode);
    nodeMap.set(rootNodeId, rootNode);

    // 2. 의존성 노드들 생성
    for (const dep of analysisResult.dependencies) {
      const depNodeId = this.generateNodeId(dep.source);
      
      if (!nodeMap.has(depNodeId)) {
        const depNode: DependencyGraphNode = {
          id: depNodeId,
          name: this.extractDependencyName(dep.source),
          type: this.determineDependencyType(dep),
          path: dep.resolved || dep.source,
          dependencies: [],
          dependents: [],
          metadata: {
            isExternal: !dep.isLocalFile,
            packageName: dep.isLocalFile ? undefined : this.extractPackageName(dep.source),
            version: dep.version
          }
        };
        nodes.push(depNode);
        nodeMap.set(depNodeId, depNode);
      }

      // 3. 관계 생성
      const relation: DependencyRelation = {
        sourceId: rootNodeId,
        targetId: depNodeId,
        type: this.mapImportType(dep.type),
        importName: dep.importName,
        isDefault: dep.isDefault,
        lineNumber: dep.lineNumber,
        strength: this.calculateDependencyStrength(dep)
      };
      relations.push(relation);

      // 노드 관계 업데이트
      rootNode.dependencies.push(depNodeId);
      nodeMap.get(depNodeId)!.dependents.push(rootNodeId);
    }

    return { nodes, relations };
  }

  /**
   * 의존성 노드들을 Notion에 업로드
   */
  private async uploadDependencyNodes(nodes: DependencyGraphNode[]): Promise<number> {
    if (!this.databaseIds.dependencies) {
      logger.warning('Dependencies database ID not configured');
      return 0;
    }

    let uploadedCount = 0;

    for (const node of nodes) {
      try {
        const properties = {
          "Name": { title: [{ text: { content: node.name } }] },
          "Node ID": { rich_text: [{ text: { content: node.id } }] },
          "Type": { select: { name: node.type } },
          "Path": { rich_text: [{ text: { content: node.path || '' } }] },
          "Is External": { checkbox: node.metadata.isExternal },
          "Package Name": { rich_text: [{ text: { content: node.metadata.packageName || '' } }] },
          "Version": { rich_text: [{ text: { content: node.metadata.version || '' } }] },
          "Size": { number: node.metadata.size || 0 },
          "Dependencies Count": { number: node.dependencies.length },
          "Dependents Count": { number: node.dependents.length }
        };

        await this.notionClient.pages.create({
          parent: { database_id: this.databaseIds.dependencies },
          properties
        });

        uploadedCount++;
        logger.debug(`✅ Created dependency node: ${node.name}`);

      } catch (error) {
        logger.error(`❌ Failed to create dependency node ${node.name}: ` + (error instanceof Error ? error.message : String(error)));
      }
    }

    return uploadedCount;
  }

  /**
   * 의존성 관계들을 Notion에 업로드
   */
  private async uploadDependencyRelations(
    relations: DependencyRelation[],
    uploadedNodes: number,
    filePageId: string
  ): Promise<number> {
    if (!this.databaseIds.dependencyRelations) {
      logger.warning('Dependency relations database ID not configured');
      return 0;
    }

    let uploadedCount = 0;

    for (const relation of relations) {
      try {
        const properties = {
          "Source": { rich_text: [{ text: { content: relation.sourceId } }] },
          "Target": { rich_text: [{ text: { content: relation.targetId } }] },
          "Relation Type": { select: { name: relation.type } },
          "Import Name": { rich_text: [{ text: { content: relation.importName || '' } }] },
          "Is Default": { checkbox: relation.isDefault || false },
          "Line Number": { number: relation.lineNumber || 0 },
          "Strength": { select: { name: relation.strength } },
          "File": { relation: [{ id: filePageId }] }
        };

        await this.notionClient.pages.create({
          parent: { database_id: this.databaseIds.dependencyRelations },
          properties
        });

        uploadedCount++;

      } catch (error) {
        logger.error(`❌ Failed to create dependency relation: ` + (error instanceof Error ? error.message : String(error)));
      }
    }

    return uploadedCount;
  }

  /**
   * 의존성 그래프 요약 페이지 생성
   */
  private async createDependencyGraphPage(
    analysisResult: LanguageAnalysisResult,
    graph: { nodes: DependencyGraphNode[]; relations: DependencyRelation[] },
    filePageId: string,
    libraryManagementResult?: LibraryManagementResult
  ): Promise<string | undefined> {
    if (!this.databaseIds.dependencyGraph) {
      logger.warning('Dependency graph database ID not configured');
      return undefined;
    }

    try {
      const graphContent = this.generateDependencyGraphMarkdown(graph);
      
      const properties = {
        "File": { title: [{ text: { content: analysisResult.filePath.split('/').pop() || 'Unknown' } }] },
        "Total Nodes": { number: graph.nodes.length },
        "Total Relations": { number: graph.relations.length },
        "Local Files": { number: graph.nodes.filter(n => n.type === 'file').length },
        "External Libraries": { number: graph.nodes.filter(n => n.type === 'library').length },
        "Internal Modules": { number: graph.nodes.filter(n => n.type === 'module').length },
        "Libraries Created": { number: libraryManagementResult?.createdPages || 0 },
        "Libraries Updated": { number: libraryManagementResult?.updatedPages || 0 },
        "Library Dependencies": { number: libraryManagementResult?.linkedDependencies || 0 },
        "Source File": { relation: [{ id: filePageId }] },
        "Created At": { date: { start: new Date().toISOString() } }
      };

      const response = await this.notionClient.pages.create({
        parent: { database_id: this.databaseIds.dependencyGraph },
        properties,
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: graphContent } }]
            }
          }
        ]
      });

      return response.id;

    } catch (error) {
      logger.error(`❌ Failed to create dependency graph page: ` + (error instanceof Error ? error.message : String(error)));
      return undefined;
    }
  }

  /**
   * 순환 의존성 탐지
   */
  private detectCircularDependencies(graph: { nodes: DependencyGraphNode[]; relations: DependencyRelation[] }): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // 순환 의존성 발견
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependencies = graph.relations
        .filter(r => r.sourceId === nodeId)
        .map(r => r.targetId);

      for (const depId of dependencies) {
        dfs(depId, [...path, depId]);
      }

      recursionStack.delete(nodeId);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, [node.id]);
      }
    }

    return cycles;
  }

  // Helper methods
  private generateNodeId(source: string): string {
    return Buffer.from(source).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private extractDependencyName(source: string): string {
    if (source.startsWith('./') || source.startsWith('../')) {
      return source.split('/').pop() || source;
    }
    return source.split('/')[0];
  }

  private determineDependencyType(dep: DependencyInfo): 'file' | 'library' | 'module' {
    if (dep.isLocalFile) return 'file';
    if (dep.source.startsWith('@') || !dep.source.includes('/')) return 'library';
    return 'module';
  }

  private mapImportType(type: string): 'import' | 'require' | 'dynamic' | 'export' {
    switch (type.toLowerCase()) {
      case 'import': return 'import';
      case 'require': return 'require';
      case 'dynamic': return 'dynamic';
      case 'export': return 'export';
      default: return 'import';
    }
  }

  private calculateDependencyStrength(dep: DependencyInfo): 'weak' | 'medium' | 'strong' {
    // 의존성 강도를 계산하는 로직
    if (dep.isDefault) return 'strong';
    if (dep.importName && dep.importName !== '*') return 'medium';
    return 'weak';
  }

  private extractPackageName(source: string): string {
    if (source.startsWith('@')) {
      const parts = source.split('/');
      return parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    return source.split('/')[0];
  }

  private generateDependencyGraphMarkdown(graph: { nodes: DependencyGraphNode[]; relations: DependencyRelation[] }): string {
    let markdown = '# Dependency Graph Analysis\n\n';
    
    markdown += `## Summary\n`;
    markdown += `- **Total Nodes**: ${graph.nodes.length}\n`;
    markdown += `- **Total Relations**: ${graph.relations.length}\n`;
    markdown += `- **Local Files**: ${graph.nodes.filter(n => n.type === 'file').length}\n`;
    markdown += `- **External Libraries**: ${graph.nodes.filter(n => n.type === 'library').length}\n\n`;

    markdown += `## Nodes\n`;
    for (const node of graph.nodes) {
      markdown += `### ${node.name} (${node.type})\n`;
      markdown += `- **Path**: ${node.path || 'N/A'}\n`;
      markdown += `- **Dependencies**: ${node.dependencies.length}\n`;
      markdown += `- **Dependents**: ${node.dependents.length}\n`;
      if (node.metadata.packageName) {
        markdown += `- **Package**: ${node.metadata.packageName}\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }
}