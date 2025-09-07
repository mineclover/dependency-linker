/**
 * Relational Data and Dependency Processing System
 * 관계형 데이터 및 종속성 처리 시스템
 */

import { Database } from 'bun:sqlite';
import { AdvancedIndexingEngine } from './advancedIndexingEngine';
import { DependencyInfo, FunctionInfo } from './specializeddDataCollectors';

export interface DependencyNode {
  id: string;
  filePath: string;
  type: 'file' | 'function' | 'class' | 'module';
  name: string;
  metadata: {
    size?: number;
    lastModified?: string;
    complexity?: string;
    exports?: string[];
  };
}

export interface DependencyEdge {
  sourceId: string;
  targetId: string;
  type: 'imports' | 'calls' | 'extends' | 'implements' | 'references';
  weight: number; // 관계의 강도
  metadata: {
    importType?: 'default' | 'named' | 'namespace' | 'dynamic';
    line?: number;
    usageCount?: number;
  };
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge>;
  cycles: string[][]; // 순환 종속성
  levels: Map<string, number>; // 종속성 레벨
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  impact: number;
  suggestions: string[];
}

export interface DependencyAnalysis {
  totalFiles: number;
  totalDependencies: number;
  circularDependencies: CircularDependency[];
  isolatedFiles: string[];
  heaviestDependencies: { file: string; dependencyCount: number }[];
  mostDependent: { file: string; dependentCount: number }[];
  complexityMetrics: {
    averageDependencies: number;
    maxDependencyDepth: number;
    modularity: number;
  };
}

export class RelationshipProcessor {
  private db: Database.Database;
  private indexingEngine: AdvancedIndexingEngine;
  private dependencyGraph: DependencyGraph;

  constructor(indexingEngine: AdvancedIndexingEngine) {
    this.indexingEngine = indexingEngine;
    this.db = indexingEngine['db']; // private 멤버 접근
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      cycles: [],
      levels: new Map()
    };
    
    this.initializeRelationshipTables();
  }

  /**
   * 관계형 데이터 테이블 초기화
   */
  private initializeRelationshipTables(): void {
    // 종속성 그래프 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_graph (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT DEFAULT datetime('now'),
        FOREIGN KEY (source_id) REFERENCES files(id),
        FOREIGN KEY (target_id) REFERENCES files(id)
      )
    `);

    // 순환 종속성 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS circular_dependencies (
        id TEXT PRIMARY KEY,
        cycle_path TEXT NOT NULL,
        severity TEXT NOT NULL,
        impact REAL NOT NULL,
        detected_at TEXT DEFAULT datetime('now'),
        resolved BOOLEAN DEFAULT FALSE
      )
    `);

    // 함수 호출 관계 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS function_calls (
        id TEXT PRIMARY KEY,
        caller_file TEXT NOT NULL,
        caller_function TEXT NOT NULL,
        callee_file TEXT NOT NULL,
        callee_function TEXT NOT NULL,
        call_count INTEGER DEFAULT 1,
        line_numbers TEXT,
        created_at TEXT DEFAULT datetime('now')
      )
    `);

    // 모듈 관계 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS module_relationships (
        id TEXT PRIMARY KEY,
        source_module TEXT NOT NULL,
        target_module TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL NOT NULL,
        created_at TEXT DEFAULT datetime('now')
      )
    `);

    // 인덱스 생성
    this.createRelationshipIndexes();
  }

  /**
   * 관계형 인덱스 생성
   */
  private createRelationshipIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_dependency_source ON dependency_graph(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_dependency_target ON dependency_graph(target_id)',
      'CREATE INDEX IF NOT EXISTS idx_dependency_type ON dependency_graph(relation_type)',
      'CREATE INDEX IF NOT EXISTS idx_circular_severity ON circular_dependencies(severity)',
      'CREATE INDEX IF NOT EXISTS idx_function_calls_caller ON function_calls(caller_file, caller_function)',
      'CREATE INDEX IF NOT EXISTS idx_function_calls_callee ON function_calls(callee_file, callee_function)',
      'CREATE INDEX IF NOT EXISTS idx_module_relationships_source ON module_relationships(source_module)'
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  /**
   * 종속성 그래프 구축
   */
  buildDependencyGraph(): DependencyGraph {
    console.log('🔗 Building dependency graph...');
    
    this.dependencyGraph = {
      nodes: new Map(),
      edges: new Map(),
      cycles: [],
      levels: new Map()
    };

    // 1. 노드 생성 (파일들)
    const files = this.indexingEngine.query({ table: 'files' });
    for (const file of files) {
      const node: DependencyNode = {
        id: file.id,
        filePath: file.file_path,
        type: 'file',
        name: this.extractFileName(file.file_path),
        metadata: {
          size: file.data.size,
          lastModified: file.last_modified,
          exports: file.data.exports || []
        }
      };
      this.dependencyGraph.nodes.set(file.id, node);
    }

    // 2. 엣지 생성 (종속성 관계)
    this.createDependencyEdges();

    // 3. 순환 종속성 검출
    this.detectCircularDependencies();

    // 4. 종속성 레벨 계산
    this.calculateDependencyLevels();

    // 5. 그래프 데이터 저장
    this.persistDependencyGraph();

    console.log(`✅ Dependency graph built: ${this.dependencyGraph.nodes.size} nodes, ${this.dependencyGraph.edges.size} edges`);
    return this.dependencyGraph;
  }

  /**
   * 종속성 엣지 생성
   */
  private createDependencyEdges(): void {
    // 파일간 import 관계 조회
    const relationQuery = `
      SELECT 
        r.source_id,
        r.target_id,
        sf.file_path as source_path,
        tf.file_path as target_path,
        sf.data as source_data
      FROM files_imports_relations r
      JOIN files sf ON r.source_id = sf.id
      JOIN files tf ON r.target_id = tf.id
    `;

    const relations = this.db.prepare(relationQuery).all() as any[];

    for (const relation of relations) {
      const edgeId = `${relation.source_id}_${relation.target_id}`;
      const sourceData = JSON.parse(relation.source_data || '{}');
      const dependencies = sourceData.dependencies as DependencyInfo[] || [];

      // 해당 타겟 파일에 대한 종속성 정보 찾기
      const depInfo = dependencies.find(dep => 
        this.resolveImportPath(relation.source_path, dep.source) === relation.target_path
      );

      const edge: DependencyEdge = {
        sourceId: relation.source_id,
        targetId: relation.target_id,
        type: 'imports',
        weight: this.calculateDependencyWeight(depInfo),
        metadata: {
          importType: depInfo?.isDefault ? 'default' : 'named',
          line: depInfo?.line,
          usageCount: depInfo?.imports.length || 1
        }
      };

      this.dependencyGraph.edges.set(edgeId, edge);
    }
  }

  /**
   * 종속성 가중치 계산
   */
  private calculateDependencyWeight(depInfo?: DependencyInfo): number {
    if (!depInfo) return 1.0;
    
    let weight = 1.0;
    
    // import 타입에 따른 가중치
    if (depInfo.isDefault) weight += 0.5;
    weight += depInfo.imports.length * 0.2;
    
    // 종속성 타입에 따른 가중치
    switch (depInfo.type) {
      case 'external': weight += 0.1; break;
      case 'internal': weight += 0.3; break;
      case 'relative': weight += 0.5; break;
    }
    
    return Math.min(weight, 5.0); // 최대 5.0
  }

  /**
   * 순환 종속성 검출
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // 순환 발견
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart).concat(nodeId);
        cycles.push(cycle);
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      // 이 노드에서 나가는 엣지들 탐색
      for (const edge of this.dependencyGraph.edges.values()) {
        if (edge.sourceId === nodeId) {
          dfs(edge.targetId, [...path]);
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
    };

    // 모든 노드에서 DFS 시작
    for (const nodeId of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    this.dependencyGraph.cycles = cycles;
    
    // 순환 종속성 저장
    this.persistCircularDependencies(cycles);
  }

  /**
   * 순환 종속성 저장
   */
  private persistCircularDependencies(cycles: string[][]): void {
    const deleteStmt = this.db.prepare('DELETE FROM circular_dependencies WHERE resolved = FALSE');
    deleteStmt.run();

    const insertStmt = this.db.prepare(`
      INSERT INTO circular_dependencies (id, cycle_path, severity, impact)
      VALUES (?, ?, ?, ?)
    `);

    for (const cycle of cycles) {
      const id = this.generateId(cycle.join('->'));
      const severity = this.calculateCycleSeverity(cycle);
      const impact = this.calculateCycleImpact(cycle);
      
      insertStmt.run(id, JSON.stringify(cycle), severity, impact);
    }
  }

  /**
   * 순환 종속성 심각도 계산
   */
  private calculateCycleSeverity(cycle: string[]): 'low' | 'medium' | 'high' {
    const cycleLength = cycle.length;
    const avgWeight = this.getAverageCycleWeight(cycle);
    
    if (cycleLength <= 2 && avgWeight < 2.0) return 'low';
    if (cycleLength <= 4 && avgWeight < 3.0) return 'medium';
    return 'high';
  }

  /**
   * 순환 종속성 영향도 계산
   */
  private calculateCycleImpact(cycle: string[]): number {
    const cycleLength = cycle.length;
    const avgWeight = this.getAverageCycleWeight(cycle);
    const involvedFilesCount = new Set(cycle).size;
    
    return (cycleLength * 0.3) + (avgWeight * 0.4) + (involvedFilesCount * 0.3);
  }

  /**
   * 순환의 평균 가중치 계산
   */
  private getAverageCycleWeight(cycle: string[]): number {
    let totalWeight = 0;
    let edgeCount = 0;

    for (let i = 0; i < cycle.length - 1; i++) {
      const edgeId = `${cycle[i]}_${cycle[i + 1]}`;
      const edge = this.dependencyGraph.edges.get(edgeId);
      if (edge) {
        totalWeight += edge.weight;
        edgeCount++;
      }
    }

    return edgeCount > 0 ? totalWeight / edgeCount : 1.0;
  }

  /**
   * 종속성 레벨 계산 (위상 정렬)
   */
  private calculateDependencyLevels(): void {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (nodeId: string): number => {
      if (temp.has(nodeId)) {
        // 순환 종속성이 있는 경우
        return 0;
      }
      if (visited.has(nodeId)) {
        return levels.get(nodeId) || 0;
      }

      temp.add(nodeId);
      
      let maxLevel = 0;
      
      // 이 노드가 의존하는 모든 노드들의 레벨을 계산
      for (const edge of this.dependencyGraph.edges.values()) {
        if (edge.sourceId === nodeId) {
          const targetLevel = visit(edge.targetId);
          maxLevel = Math.max(maxLevel, targetLevel + 1);
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      levels.set(nodeId, maxLevel);
      
      return maxLevel;
    };

    // 모든 노드의 레벨 계산
    for (const nodeId of this.dependencyGraph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    this.dependencyGraph.levels = levels;
  }

  /**
   * 종속성 그래프 저장
   */
  private persistDependencyGraph(): void {
    // 기존 그래프 데이터 삭제
    this.db.exec('DELETE FROM dependency_graph');

    const insertStmt = this.db.prepare(`
      INSERT INTO dependency_graph (id, source_id, target_id, relation_type, weight, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const [edgeId, edge] of this.dependencyGraph.edges) {
      insertStmt.run(
        edgeId,
        edge.sourceId,
        edge.targetId,
        edge.type,
        edge.weight,
        JSON.stringify(edge.metadata)
      );
    }
  }

  /**
   * 종속성 분석 수행
   */
  analyzeDependencies(): DependencyAnalysis {
    console.log('📊 Analyzing dependencies...');

    const analysis: DependencyAnalysis = {
      totalFiles: this.dependencyGraph.nodes.size,
      totalDependencies: this.dependencyGraph.edges.size,
      circularDependencies: [],
      isolatedFiles: [],
      heaviestDependencies: [],
      mostDependent: [],
      complexityMetrics: {
        averageDependencies: 0,
        maxDependencyDepth: 0,
        modularity: 0
      }
    };

    // 순환 종속성 분석
    analysis.circularDependencies = this.analyzeCircularDependencies();

    // 고립된 파일 찾기
    analysis.isolatedFiles = this.findIsolatedFiles();

    // 가장 많은 종속성을 가진 파일들
    analysis.heaviestDependencies = this.findHeaviestDependencies();

    // 가장 많이 의존되는 파일들
    analysis.mostDependent = this.findMostDependentFiles();

    // 복잡도 메트릭 계산
    analysis.complexityMetrics = this.calculateComplexityMetrics();

    return analysis;
  }

  /**
   * 순환 종속성 상세 분석
   */
  private analyzeCircularDependencies(): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];

    for (const cycle of this.dependencyGraph.cycles) {
      const severity = this.calculateCycleSeverity(cycle);
      const impact = this.calculateCycleImpact(cycle);
      const suggestions = this.generateCycleSuggestions(cycle);

      circularDeps.push({
        cycle,
        severity,
        impact,
        suggestions
      });
    }

    return circularDeps.sort((a, b) => b.impact - a.impact);
  }

  /**
   * 순환 종속성 해결 제안 생성
   */
  private generateCycleSuggestions(cycle: string[]): string[] {
    const suggestions: string[] = [];
    
    if (cycle.length === 2) {
      suggestions.push('Consider merging these two files or extracting common functionality');
      suggestions.push('Use dependency injection to break the circular dependency');
    } else {
      suggestions.push('Extract common interfaces or abstract classes');
      suggestions.push('Consider using the mediator pattern');
      suggestions.push('Split large files into smaller, more focused modules');
    }

    return suggestions;
  }

  /**
   * 고립된 파일 찾기
   */
  private findIsolatedFiles(): string[] {
    const isolated: string[] = [];
    
    for (const [nodeId, node] of this.dependencyGraph.nodes) {
      const hasIncoming = Array.from(this.dependencyGraph.edges.values())
        .some(edge => edge.targetId === nodeId);
      const hasOutgoing = Array.from(this.dependencyGraph.edges.values())
        .some(edge => edge.sourceId === nodeId);
      
      if (!hasIncoming && !hasOutgoing) {
        isolated.push(node.filePath);
      }
    }

    return isolated;
  }

  /**
   * 가장 많은 종속성을 가진 파일들
   */
  private findHeaviestDependencies(limit: number = 10): { file: string; dependencyCount: number }[] {
    const dependencyCounts = new Map<string, number>();

    for (const edge of this.dependencyGraph.edges.values()) {
      const current = dependencyCounts.get(edge.sourceId) || 0;
      dependencyCounts.set(edge.sourceId, current + 1);
    }

    const sorted = Array.from(dependencyCounts.entries())
      .map(([nodeId, count]) => ({
        file: this.dependencyGraph.nodes.get(nodeId)?.filePath || nodeId,
        dependencyCount: count
      }))
      .sort((a, b) => b.dependencyCount - a.dependencyCount)
      .slice(0, limit);

    return sorted;
  }

  /**
   * 가장 많이 의존되는 파일들
   */
  private findMostDependentFiles(limit: number = 10): { file: string; dependentCount: number }[] {
    const dependentCounts = new Map<string, number>();

    for (const edge of this.dependencyGraph.edges.values()) {
      const current = dependentCounts.get(edge.targetId) || 0;
      dependentCounts.set(edge.targetId, current + 1);
    }

    const sorted = Array.from(dependentCounts.entries())
      .map(([nodeId, count]) => ({
        file: this.dependencyGraph.nodes.get(nodeId)?.filePath || nodeId,
        dependentCount: count
      }))
      .sort((a, b) => b.dependentCount - a.dependentCount)
      .slice(0, limit);

    return sorted;
  }

  /**
   * 복잡도 메트릭 계산
   */
  private calculateComplexityMetrics(): DependencyAnalysis['complexityMetrics'] {
    const totalDependencies = this.dependencyGraph.edges.size;
    const totalFiles = this.dependencyGraph.nodes.size;
    const averageDependencies = totalFiles > 0 ? totalDependencies / totalFiles : 0;

    const maxDepth = Math.max(...Array.from(this.dependencyGraph.levels.values()));

    // 모듈성 계산 (간단한 근사치)
    const modularity = this.calculateModularity();

    return {
      averageDependencies: Math.round(averageDependencies * 100) / 100,
      maxDependencyDepth: maxDepth,
      modularity: Math.round(modularity * 100) / 100
    };
  }

  /**
   * 모듈성 계산
   */
  private calculateModularity(): number {
    // 간단한 모듈성 계산: 내부 연결 / 전체 연결
    const totalEdges = this.dependencyGraph.edges.size;
    if (totalEdges === 0) return 1.0;

    let internalConnections = 0;
    for (const edge of this.dependencyGraph.edges.values()) {
      const sourceNode = this.dependencyGraph.nodes.get(edge.sourceId);
      const targetNode = this.dependencyGraph.nodes.get(edge.targetId);
      
      if (sourceNode && targetNode) {
        // 같은 디렉토리면 내부 연결로 간주
        const sourceDir = this.getDirectoryPath(sourceNode.filePath);
        const targetDir = this.getDirectoryPath(targetNode.filePath);
        
        if (sourceDir === targetDir) {
          internalConnections++;
        }
      }
    }

    return totalEdges > 0 ? internalConnections / totalEdges : 0;
  }

  // === 유틸리티 메서드들 ===

  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  private resolveImportPath(basePath: string, importPath: string): string {
    const path = require('path');
    if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(basePath), importPath);
    }
    return importPath;
  }

  private getDirectoryPath(filePath: string): string {
    return filePath.substring(0, filePath.lastIndexOf('/'));
  }

  private generateId(input: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * 관계형 데이터 정리
   */
  cleanup(): void {
    const tables = ['dependency_graph', 'circular_dependencies', 'function_calls', 'module_relationships'];
    
    for (const table of tables) {
      this.db.exec(`DELETE FROM ${table} WHERE created_at < datetime('now', '-30 days')`);
    }
    
    console.log('🧹 Relationship data cleanup completed');
  }

  /**
   * 종속성 그래프 시각화 데이터 생성
   */
  generateVisualizationData(): {
    nodes: { id: string; name: string; group: string; size: number }[];
    links: { source: string; target: string; weight: number; type: string }[];
  } {
    const nodes = Array.from(this.dependencyGraph.nodes.values()).map(node => ({
      id: node.id,
      name: node.name,
      group: this.getDirectoryPath(node.filePath),
      size: (this.dependencyGraph.levels.get(node.id) || 0) + 1
    }));

    const links = Array.from(this.dependencyGraph.edges.values()).map(edge => ({
      source: edge.sourceId,
      target: edge.targetId,
      weight: edge.weight,
      type: edge.type
    }));

    return { nodes, links };
  }
}