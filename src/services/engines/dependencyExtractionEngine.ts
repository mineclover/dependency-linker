/**
 * 종속성 추출 및 파싱 엔진
 * Dependency Extraction and Parsing Engine using Bun SQLite
 */

import { Database } from "bun:sqlite";
import { TreeSitterDependencyAnalyzer, FileAnalysisResult, DependencyInfo } from './treeSitterDependencyAnalyzer';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, relative, dirname, join } from 'path';
import { glob } from 'glob';
import crypto from 'crypto';

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge>;
  roots: string[];  // 루트 노드들 (다른 노드가 참조하지 않는 노드)
  leaves: string[]; // 리프 노드들 (다른 노드를 참조하지 않는 노드)
  cycles: string[][]; // 순환 참조 경로들
  metadata: GraphMetadata;
}

export interface DependencyNode {
  id: string;
  filePath: string;
  relativePath: string;
  type: 'file' | 'package' | 'module';
  language: string;
  size: number;
  lastModified: string;
  hash: string;
  dependencies: string[]; // 이 노드가 의존하는 노드들
  dependents: string[];   // 이 노드에 의존하는 노드들
  notionId?: string;
  analysis?: FileAnalysisResult;
  metrics: {
    complexity: number;
    functions: number;
    classes: number;
    exports: number;
    imports: number;
  };
}

export interface DependencyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: DependencyInfo['type'];
  weight: number; // 의존성 강도 (1-10)
  metadata: {
    line: number;
    column: number;
    importType?: string;
    alias?: string;
    members?: string[];
  };
}

export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  avgComplexity: number;
  packageDependencies: number;
  localDependencies: number;
  circularDependencies: number;
  lastUpdated: string;
  analysisTime: number;
}

export interface ExtractionOptions {
  rootPath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxDepth?: number;
  followSymlinks?: boolean;
  includeNodeModules?: boolean;
  resolveExternals?: boolean;
  languages?: string[];
  batchSize?: number;
}

export interface ExtractionStats {
  filesAnalyzed: number;
  dependenciesFound: number;
  errors: number;
  processingTime: number;
  averageFileTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export class DependencyExtractionEngine {
  private db: Database;
  private analyzer: TreeSitterDependencyAnalyzer;
  private graph: DependencyGraph;
  private cache: Map<string, FileAnalysisResult> = new Map();
  private rootPath: string = process.cwd();

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.analyzer = new TreeSitterDependencyAnalyzer();
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      roots: [],
      leaves: [],
      cycles: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        maxDepth: 0,
        avgComplexity: 0,
        packageDependencies: 0,
        localDependencies: 0,
        circularDependencies: 0,
        lastUpdated: new Date().toISOString(),
        analysisTime: 0
      }
    };

    this.initializeDatabase();
  }

  /**
   * 데이터베이스 초기화
   */
  private initializeDatabase(): void {
    // 노드 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_nodes (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL UNIQUE,
        relative_path TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('file', 'package', 'module')),
        language TEXT NOT NULL,
        size INTEGER NOT NULL,
        last_modified TEXT NOT NULL,
        hash TEXT NOT NULL,
        notion_id TEXT,
        complexity INTEGER DEFAULT 0,
        functions INTEGER DEFAULT 0,
        classes INTEGER DEFAULT 0,
        exports INTEGER DEFAULT 0,
        imports INTEGER DEFAULT 0,
        analysis_data TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 엣지 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        weight INTEGER DEFAULT 1,
        line INTEGER,
        column INTEGER,
        import_type TEXT,
        alias TEXT,
        members TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (source_id) REFERENCES dependency_nodes (id),
        FOREIGN KEY (target_id) REFERENCES dependency_nodes (id),
        UNIQUE(source_id, target_id, type, line)
      )
    `);

    // 메타데이터 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS graph_metadata (
        id INTEGER PRIMARY KEY,
        total_nodes INTEGER DEFAULT 0,
        total_edges INTEGER DEFAULT 0,
        max_depth INTEGER DEFAULT 0,
        avg_complexity REAL DEFAULT 0.0,
        package_dependencies INTEGER DEFAULT 0,
        local_dependencies INTEGER DEFAULT 0,
        circular_dependencies INTEGER DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now')),
        analysis_time INTEGER DEFAULT 0
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_path ON dependency_nodes (file_path);
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON dependency_nodes (type);
      CREATE INDEX IF NOT EXISTS idx_nodes_language ON dependency_nodes (language);
      CREATE INDEX IF NOT EXISTS idx_nodes_hash ON dependency_nodes (hash);
      CREATE INDEX IF NOT EXISTS idx_edges_source ON dependency_edges (source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON dependency_edges (target_id);
      CREATE INDEX IF NOT EXISTS idx_edges_type ON dependency_edges (type);
    `);

    // 메타데이터 초기 레코드 삽입
    this.db.exec(`INSERT OR IGNORE INTO graph_metadata (id) VALUES (1)`);

    console.log('📊 Dependency extraction database initialized');
  }

  /**
   * 파일들을 분석하여 종속성 그래프 구축
   */
  async extractDependencies(options: ExtractionOptions): Promise<ExtractionStats> {
    const startTime = Date.now();
    this.rootPath = resolve(options.rootPath);
    
    const stats: ExtractionStats = {
      filesAnalyzed: 0,
      dependenciesFound: 0,
      errors: 0,
      processingTime: 0,
      averageFileTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    try {
      // 파일 목록 수집
      const files = await this.collectFiles(options);
      console.log(`🔍 Found ${files.length} files to analyze`);

      // 배치 처리
      const batchSize = options.batchSize || 50;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchStats = await this.processBatch(batch, options);
        
        stats.filesAnalyzed += batchStats.filesAnalyzed;
        stats.dependenciesFound += batchStats.dependenciesFound;
        stats.errors += batchStats.errors;
        stats.cacheHits += batchStats.cacheHits;
        stats.cacheMisses += batchStats.cacheMisses;

        // 진행 상황 출력
        console.log(`📈 Progress: ${Math.min(i + batchSize, files.length)}/${files.length} files processed`);
      }

      // 종속성 해결 및 그래프 구축
      await this.resolveDependencies();
      
      // 순환 참조 탐지
      this.detectCircularDependencies();
      
      // 메타데이터 업데이트
      await this.updateGraphMetadata();

      stats.processingTime = Date.now() - startTime;
      stats.averageFileTime = stats.filesAnalyzed > 0 ? stats.processingTime / stats.filesAnalyzed : 0;

      console.log(`✅ Dependency extraction completed: ${stats.filesAnalyzed} files, ${stats.dependenciesFound} dependencies in ${stats.processingTime}ms`);

    } catch (error) {
      console.error('❌ Dependency extraction failed:', error);
      stats.errors++;
      throw error;
    }

    return stats;
  }

  /**
   * 파일 목록 수집
   */
  private async collectFiles(options: ExtractionOptions): Promise<string[]> {
    const {
      includePatterns = ['**/*.{ts,tsx,js,jsx,py,go,rs,java,c,cpp,h,hpp}'],
      excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      maxDepth = 10
    } = options;

    let files: string[] = [];

    for (const pattern of includePatterns) {
      const matchedFiles = await glob(pattern, {
        cwd: this.rootPath,
        ignore: excludePatterns,
        maxDepth,
        followSymbolicLinks: options.followSymlinks || false
      });
      files.push(...matchedFiles);
    }

    // 중복 제거 및 절대 경로 변환
    files = [...new Set(files)].map(f => resolve(this.rootPath, f));

    // 언어 필터링
    if (options.languages && options.languages.length > 0) {
      const langExtensions = new Map([
        ['typescript', ['.ts', '.tsx']],
        ['javascript', ['.js', '.jsx', '.mjs', '.cjs']],
        ['python', ['.py']],
        ['go', ['.go']],
        ['rust', ['.rs']],
        ['java', ['.java']],
        ['c', ['.c', '.h']],
        ['cpp', ['.cpp', '.cc', '.cxx', '.hpp']]
      ]);

      const allowedExtensions = options.languages.flatMap(lang => 
        langExtensions.get(lang) || []
      );

      files = files.filter(file => {
        const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
        return allowedExtensions.includes(ext);
      });
    }

    return files.filter(file => existsSync(file));
  }

  /**
   * 배치 처리
   */
  private async processBatch(files: string[], options: ExtractionOptions): Promise<ExtractionStats> {
    const batchStats: ExtractionStats = {
      filesAnalyzed: 0,
      dependenciesFound: 0,
      errors: 0,
      processingTime: 0,
      averageFileTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    const transaction = this.db.transaction((files: string[]) => {
      for (const filePath of files) {
        try {
          const result = this.processFile(filePath, options);
          if (result) {
            batchStats.filesAnalyzed++;
            batchStats.dependenciesFound += result.dependencies.length;
            batchStats.cacheMisses++;
          } else {
            batchStats.cacheHits++;
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          batchStats.errors++;
        }
      }
    });

    transaction(files);
    return batchStats;
  }

  /**
   * 개별 파일 처리
   */
  private processFile(filePath: string, options: ExtractionOptions): FileAnalysisResult | null {
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const relativePath = relative(this.rootPath, filePath);

    // 캐시 확인
    const cachedResult = this.getCachedResult(filePath, hash);
    if (cachedResult) {
      return null; // 캐시된 결과 사용
    }

    // Tree-sitter 분석
    const analysis = this.analyzer.analyzeFile(filePath);
    
    // 노드 생성/업데이트
    const nodeId = this.generateNodeId(filePath);
    const node: DependencyNode = {
      id: nodeId,
      filePath,
      relativePath,
      type: 'file',
      language: analysis.language,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      hash,
      dependencies: [],
      dependents: [],
      notionId: analysis.notionId,
      analysis,
      metrics: {
        complexity: analysis.metrics.complexity,
        functions: analysis.metrics.functions,
        classes: analysis.metrics.classes,
        exports: analysis.metrics.exports,
        imports: analysis.metrics.dependencies
      }
    };

    // 데이터베이스에 노드 저장
    this.saveNode(node);

    // 종속성 엣지 저장
    this.saveDependencies(nodeId, analysis.dependencies);

    // 캐시 업데이트
    this.cache.set(filePath, analysis);
    
    return analysis;
  }

  /**
   * 노드를 데이터베이스에 저장
   */
  private saveNode(node: DependencyNode): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dependency_nodes 
      (id, file_path, relative_path, type, language, size, last_modified, hash, notion_id, 
       complexity, functions, classes, exports, imports, analysis_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      node.id,
      node.filePath,
      node.relativePath,
      node.type,
      node.language,
      node.size,
      node.lastModified,
      node.hash,
      node.notionId,
      node.metrics.complexity,
      node.metrics.functions,
      node.metrics.classes,
      node.metrics.exports,
      node.metrics.imports,
      JSON.stringify(node.analysis)
    );

    this.graph.nodes.set(node.id, node);
  }

  /**
   * 종속성 엣지 저장
   */
  private saveDependencies(sourceId: string, dependencies: DependencyInfo[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dependency_edges 
      (id, source_id, target_id, type, weight, line, column, import_type, alias, members)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dep of dependencies) {
      // 대상 노드 ID 해결
      const targetId = this.resolveDependencyTarget(dep, sourceId);
      if (!targetId) continue;

      const edgeId = this.generateEdgeId(sourceId, targetId, dep.type, dep.location.line);
      
      const edge: DependencyEdge = {
        id: edgeId,
        sourceId,
        targetId,
        type: dep.type,
        weight: this.calculateDependencyWeight(dep),
        metadata: {
          line: dep.location.line,
          column: dep.location.column,
          importType: dep.metadata?.isDefault ? 'default' : 
                     dep.metadata?.isNamespace ? 'namespace' : 'named',
          alias: dep.metadata?.alias,
          members: dep.metadata?.members
        }
      };

      stmt.run(
        edge.id,
        edge.sourceId,
        edge.targetId,
        edge.type,
        edge.weight,
        edge.metadata.line,
        edge.metadata.column,
        edge.metadata.importType,
        edge.metadata.alias,
        edge.metadata.members ? JSON.stringify(edge.metadata.members) : null
      );

      this.graph.edges.set(edge.id, edge);
    }
  }

  /**
   * 종속성 대상 해결
   */
  private resolveDependencyTarget(dep: DependencyInfo, sourceId: string): string | null {
    if (dep.isLocal) {
      // 로컬 파일 종속성 해결
      const sourceNode = this.graph.nodes.get(sourceId);
      if (!sourceNode) return null;

      const sourceDirPath = dirname(sourceNode.filePath);
      const targetPath = this.resolveLocalPath(sourceDirPath, dep.source);
      
      if (targetPath && existsSync(targetPath)) {
        return this.generateNodeId(targetPath);
      }
    } else {
      // 외부 패키지 종속성 - 패키지 노드 생성
      return this.createPackageNode(dep.source);
    }

    return null;
  }

  /**
   * 로컬 경로 해결
   */
  private resolveLocalPath(baseDir: string, relativePath: string): string | null {
    const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp'];
    const possiblePaths = [];

    // 직접 경로
    possiblePaths.push(resolve(baseDir, relativePath));

    // 확장자 추가
    for (const ext of possibleExtensions) {
      possiblePaths.push(resolve(baseDir, relativePath + ext));
    }

    // index 파일
    possiblePaths.push(resolve(baseDir, relativePath, 'index.ts'));
    possiblePaths.push(resolve(baseDir, relativePath, 'index.js'));

    for (const path of possiblePaths) {
      if (existsSync(path) && statSync(path).isFile()) {
        return path;
      }
    }

    return null;
  }

  /**
   * 패키지 노드 생성
   */
  private createPackageNode(packageName: string): string {
    const nodeId = this.generateNodeId(packageName);
    
    // 이미 존재하는지 확인
    if (this.graph.nodes.has(nodeId)) {
      return nodeId;
    }

    const packageNode: DependencyNode = {
      id: nodeId,
      filePath: packageName,
      relativePath: packageName,
      type: 'package',
      language: 'unknown',
      size: 0,
      lastModified: new Date().toISOString(),
      hash: crypto.createHash('md5').update(packageName).digest('hex'),
      dependencies: [],
      dependents: [],
      metrics: {
        complexity: 0,
        functions: 0,
        classes: 0,
        exports: 0,
        imports: 0
      }
    };

    this.saveNode(packageNode);
    return nodeId;
  }

  /**
   * 종속성 가중치 계산
   */
  private calculateDependencyWeight(dep: DependencyInfo): number {
    let weight = 1;

    // 종속성 타입에 따른 가중치
    switch (dep.type) {
      case 'import':
      case 'require':
        weight = 3;
        break;
      case 'dynamic_import':
        weight = 1;
        break;
      case 'export':
        weight = 2;
        break;
      default:
        weight = 1;
    }

    // 로컬 종속성은 가중치 증가
    if (dep.isLocal) {
      weight += 2;
    }

    // named imports가 많을 경우 가중치 증가
    if (dep.metadata?.members && dep.metadata.members.length > 0) {
      weight += Math.min(dep.metadata.members.length, 3);
    }

    return Math.min(weight, 10);
  }

  /**
   * 종속성 해결 및 그래프 구축
   */
  private async resolveDependencies(): Promise<void> {
    console.log('🔗 Resolving dependencies and building graph...');

    // 모든 노드의 종속성과 dependents 업데이트
    const nodes = this.db.prepare('SELECT * FROM dependency_nodes').all() as any[];
    const edges = this.db.prepare('SELECT * FROM dependency_edges').all() as any[];

    // 노드들을 메모리에 로드
    for (const nodeData of nodes) {
      const node: DependencyNode = {
        id: nodeData.id,
        filePath: nodeData.file_path,
        relativePath: nodeData.relative_path,
        type: nodeData.type,
        language: nodeData.language,
        size: nodeData.size,
        lastModified: nodeData.last_modified,
        hash: nodeData.hash,
        dependencies: [],
        dependents: [],
        notionId: nodeData.notion_id,
        analysis: nodeData.analysis_data ? JSON.parse(nodeData.analysis_data) : undefined,
        metrics: {
          complexity: nodeData.complexity,
          functions: nodeData.functions,
          classes: nodeData.classes,
          exports: nodeData.exports,
          imports: nodeData.imports
        }
      };

      this.graph.nodes.set(node.id, node);
    }

    // 엣지들을 처리하여 종속성 관계 구축
    for (const edgeData of edges) {
      const edge: DependencyEdge = {
        id: edgeData.id,
        sourceId: edgeData.source_id,
        targetId: edgeData.target_id,
        type: edgeData.type,
        weight: edgeData.weight,
        metadata: {
          line: edgeData.line,
          column: edgeData.column,
          importType: edgeData.import_type,
          alias: edgeData.alias,
          members: edgeData.members ? JSON.parse(edgeData.members) : undefined
        }
      };

      this.graph.edges.set(edge.id, edge);

      // 노드 간 관계 설정
      const sourceNode = this.graph.nodes.get(edge.sourceId);
      const targetNode = this.graph.nodes.get(edge.targetId);

      if (sourceNode && targetNode) {
        if (!sourceNode.dependencies.includes(edge.targetId)) {
          sourceNode.dependencies.push(edge.targetId);
        }
        if (!targetNode.dependents.includes(edge.sourceId)) {
          targetNode.dependents.push(edge.sourceId);
        }
      }
    }

    // 루트와 리프 노드 찾기
    this.findRootsAndLeaves();
  }

  /**
   * 루트와 리프 노드 찾기
   */
  private findRootsAndLeaves(): void {
    this.graph.roots = [];
    this.graph.leaves = [];

    for (const [nodeId, node] of this.graph.nodes) {
      // 루트: dependents가 없는 파일 노드
      if (node.dependents.length === 0 && node.type === 'file') {
        this.graph.roots.push(nodeId);
      }

      // 리프: dependencies가 없는 노드
      if (node.dependencies.length === 0) {
        this.graph.leaves.push(nodeId);
      }
    }
  }

  /**
   * 순환 참조 탐지
   */
  private detectCircularDependencies(): void {
    console.log('🔄 Detecting circular dependencies...');
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // 순환 참조 발견
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(nodeId); // 사이클 완성
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = this.graph.nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          // 파일 노드만 순환 참조 검사 (패키지 제외)
          const depNode = this.graph.nodes.get(depId);
          if (depNode && depNode.type === 'file') {
            dfs(depId, [...path]);
          }
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    // 모든 파일 노드에서 DFS 시작
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type === 'file' && !visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    this.graph.cycles = cycles;
    this.graph.metadata.circularDependencies = cycles.length;

    if (cycles.length > 0) {
      console.warn(`⚠️ Found ${cycles.length} circular dependencies:`);
      cycles.slice(0, 5).forEach((cycle, index) => {
        const paths = cycle.map(id => this.graph.nodes.get(id)?.relativePath || id);
        console.warn(`  ${index + 1}. ${paths.join(' → ')}`);
      });
    }
  }

  /**
   * 그래프 메타데이터 업데이트
   */
  private async updateGraphMetadata(): Promise<void> {
    const fileNodes = Array.from(this.graph.nodes.values()).filter(n => n.type === 'file');
    const packageNodes = Array.from(this.graph.nodes.values()).filter(n => n.type === 'package');
    
    const totalComplexity = fileNodes.reduce((sum, node) => sum + node.metrics.complexity, 0);
    const avgComplexity = fileNodes.length > 0 ? totalComplexity / fileNodes.length : 0;

    const localEdges = Array.from(this.graph.edges.values()).filter(e => {
      const target = this.graph.nodes.get(e.targetId);
      return target && target.type === 'file';
    });

    const packageEdges = Array.from(this.graph.edges.values()).filter(e => {
      const target = this.graph.nodes.get(e.targetId);
      return target && target.type === 'package';
    });

    // 최대 깊이 계산
    const maxDepth = this.calculateMaxDepth();

    this.graph.metadata = {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      maxDepth,
      avgComplexity,
      packageDependencies: packageNodes.length,
      localDependencies: localEdges.length,
      circularDependencies: this.graph.cycles.length,
      lastUpdated: new Date().toISOString(),
      analysisTime: Date.now()
    };

    // 데이터베이스에 메타데이터 저장
    const stmt = this.db.prepare(`
      UPDATE graph_metadata 
      SET total_nodes = ?, total_edges = ?, max_depth = ?, avg_complexity = ?,
          package_dependencies = ?, local_dependencies = ?, circular_dependencies = ?,
          last_updated = ?, analysis_time = ?
      WHERE id = 1
    `);

    stmt.run(
      this.graph.metadata.totalNodes,
      this.graph.metadata.totalEdges,
      this.graph.metadata.maxDepth,
      this.graph.metadata.avgComplexity,
      this.graph.metadata.packageDependencies,
      this.graph.metadata.localDependencies,
      this.graph.metadata.circularDependencies,
      this.graph.metadata.lastUpdated,
      this.graph.metadata.analysisTime
    );
  }

  /**
   * 최대 깊이 계산 (DFS)
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    const visited = new Set<string>();

    const dfs = (nodeId: string, depth: number): number => {
      if (visited.has(nodeId)) return depth;
      
      visited.add(nodeId);
      let currentMaxDepth = depth;
      
      const node = this.graph.nodes.get(nodeId);
      if (node && node.type === 'file') {
        for (const depId of node.dependencies) {
          const depNode = this.graph.nodes.get(depId);
          if (depNode && depNode.type === 'file') {
            currentMaxDepth = Math.max(currentMaxDepth, dfs(depId, depth + 1));
          }
        }
      }
      
      return currentMaxDepth;
    };

    for (const rootId of this.graph.roots) {
      visited.clear();
      maxDepth = Math.max(maxDepth, dfs(rootId, 1));
    }

    return maxDepth;
  }

  /**
   * 캐시된 결과 조회
   */
  private getCachedResult(filePath: string, hash: string): FileAnalysisResult | null {
    const stmt = this.db.prepare(`
      SELECT analysis_data FROM dependency_nodes 
      WHERE file_path = ? AND hash = ?
    `);
    
    const result = stmt.get(filePath, hash) as any;
    if (result?.analysis_data) {
      const analysis = JSON.parse(result.analysis_data);
      this.cache.set(filePath, analysis);
      return analysis;
    }

    return null;
  }

  /**
   * 종속성 그래프 조회
   */
  getDependencyGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * 특정 노드의 종속성 트리 조회
   */
  getDependencyTree(nodeId: string, maxDepth: number = 10): any {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return null;

    const buildTree = (id: string, depth: number): any => {
      if (depth >= maxDepth) return null;
      
      const currentNode = this.graph.nodes.get(id);
      if (!currentNode) return null;

      return {
        id: currentNode.id,
        name: currentNode.relativePath,
        type: currentNode.type,
        language: currentNode.language,
        metrics: currentNode.metrics,
        children: currentNode.dependencies
          .map(depId => buildTree(depId, depth + 1))
          .filter(child => child !== null)
      };
    };

    return buildTree(nodeId, 0);
  }

  /**
   * 영향 분석 - 특정 파일이 변경되었을 때 영향받는 파일들
   */
  getImpactAnalysis(filePath: string): string[] {
    const nodeId = this.generateNodeId(filePath);
    const impactedNodes = new Set<string>();
    const visited = new Set<string>();

    const findDependents = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = this.graph.nodes.get(id);
      if (!node) return;

      for (const dependentId of node.dependents) {
        if (!impactedNodes.has(dependentId)) {
          impactedNodes.add(dependentId);
          findDependents(dependentId);
        }
      }
    };

    findDependents(nodeId);
    
    return Array.from(impactedNodes)
      .map(id => this.graph.nodes.get(id)?.filePath)
      .filter(path => path !== undefined) as string[];
  }

  /**
   * 유틸리티 메서드들
   */
  private generateNodeId(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
  }

  private generateEdgeId(sourceId: string, targetId: string, type: string, line: number): string {
    return crypto.createHash('sha256')
      .update(`${sourceId}_${targetId}_${type}_${line}`)
      .digest('hex').substring(0, 16);
  }

  /**
   * 데이터베이스 정리
   */
  cleanup(): void {
    this.db.close();
    this.cache.clear();
    this.graph.nodes.clear();
    this.graph.edges.clear();
  }

  /**
   * 통계 출력
   */
  printStatistics(): void {
    const stats = this.graph.metadata;
    console.log('\n📊 Dependency Graph Statistics:');
    console.log(`   Total Nodes: ${stats.totalNodes}`);
    console.log(`   Total Edges: ${stats.totalEdges}`);
    console.log(`   Max Depth: ${stats.maxDepth}`);
    console.log(`   Avg Complexity: ${stats.avgComplexity.toFixed(2)}`);
    console.log(`   Package Dependencies: ${stats.packageDependencies}`);
    console.log(`   Local Dependencies: ${stats.localDependencies}`);
    console.log(`   Circular Dependencies: ${stats.circularDependencies}`);
    console.log(`   Roots: ${this.graph.roots.length}`);
    console.log(`   Leaves: ${this.graph.leaves.length}`);
  }
}