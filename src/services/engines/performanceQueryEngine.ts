/**
 * Performance-Optimized Index and Query System
 * 성능 최적화된 인덱스 및 쿼리 시스템
 */

import { Database } from 'bun:sqlite';
import { AdvancedIndexingEngine } from './advancedIndexingEngine';

export interface QueryPlan {
  sql: string;
  parameters: any[];
  estimatedCost: number;
  indexesUsed: string[];
  executionTime?: number;
}

export interface SearchIndex {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'fulltext' | 'spatial';
  unique: boolean;
  partial?: string;
}

export interface QueryCache {
  key: string;
  result: any[];
  timestamp: number;
  hitCount: number;
  size: number;
}

export interface QueryStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTime: number;
  slowQueries: { sql: string; time: number }[];
}

export interface FullTextSearchOptions {
  tables: string[];
  columns?: string[];
  rank?: boolean;
  highlight?: boolean;
  fuzzy?: boolean;
  limit?: number;
  offset?: number;
}

export interface FullTextResult {
  table: string;
  id: string;
  content: string;
  rank: number;
  highlights: string[];
  metadata: any;
}

export class PerformanceQueryEngine {
  private db: Database.Database;
  private indexingEngine: AdvancedIndexingEngine;
  private queryCache: Map<string, QueryCache> = new Map();
  private queryStats: QueryStats;
  private preparedQueries: Map<string, Database.Statement> = new Map();
  private searchIndexes: Map<string, SearchIndex> = new Map();

  private readonly CACHE_SIZE_LIMIT = 1000;
  private readonly CACHE_TTL = 300000; // 5분
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms

  constructor(indexingEngine: AdvancedIndexingEngine) {
    this.indexingEngine = indexingEngine;
    this.db = indexingEngine['db'];
    this.queryStats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageExecutionTime: 0,
      slowQueries: []
    };

    this.initializeFullTextSearch();
    this.createPerformanceIndexes();
    this.setupQueryOptimizations();
  }

  /**
   * 전체 텍스트 검색 초기화
   */
  private initializeFullTextSearch(): void {
    // FTS5 가상 테이블 생성
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
        file_path,
        content,
        data,
        content='files',
        content_rowid='rowid',
        tokenize='trigram'
      )
    `);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
        file_path,
        content,
        data,
        content='docs',
        content_rowid='rowid',
        tokenize='trigram'
      )
    `);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS functions_fts USING fts5(
        name,
        description,
        parameters,
        data,
        content='functions',
        content_rowid='rowid'
      )
    `);

    // FTS 인덱스 트리거 생성
    this.createFTSTriggers();
  }

  /**
   * FTS 트리거 생성
   */
  private createFTSTriggers(): void {
    // Files FTS 트리거
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files BEGIN
        INSERT INTO files_fts(rowid, file_path, content, data) 
        VALUES (new.rowid, new.file_path, '', new.data);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, file_path, content, data) 
        VALUES('delete', old.rowid, old.file_path, '', old.data);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, file_path, content, data) 
        VALUES('delete', old.rowid, old.file_path, '', old.data);
        INSERT INTO files_fts(rowid, file_path, content, data) 
        VALUES (new.rowid, new.file_path, '', new.data);
      END
    `);

    // 유사한 트리거들을 docs와 functions에도 생성
    this.createDocsAndFunctionsFTSTriggers();
  }

  /**
   * Docs 및 Functions FTS 트리거 생성
   */
  private createDocsAndFunctionsFTSTriggers(): void {
    // Docs FTS 트리거
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS docs_fts_insert AFTER INSERT ON docs BEGIN
        INSERT INTO docs_fts(rowid, file_path, content, data) 
        VALUES (new.rowid, new.file_path, '', new.data);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS docs_fts_update AFTER UPDATE ON docs BEGIN
        INSERT INTO docs_fts(docs_fts, rowid, file_path, content, data) 
        VALUES('delete', old.rowid, old.file_path, '', old.data);
        INSERT INTO docs_fts(rowid, file_path, content, data) 
        VALUES (new.rowid, new.file_path, '', new.data);
      END
    `);

    // Functions FTS 트리거
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS functions_fts_insert AFTER INSERT ON functions BEGIN
        INSERT INTO functions_fts(rowid, name, description, parameters, data) 
        VALUES (new.rowid, JSON_EXTRACT(new.data, '$.name'), 
               JSON_EXTRACT(new.data, '$.description'), 
               JSON_EXTRACT(new.data, '$.parameters'), new.data);
      END
    `);
  }

  /**
   * 성능 최적화 인덱스 생성
   */
  private createPerformanceIndexes(): void {
    const indexes: SearchIndex[] = [
      {
        name: 'idx_files_path_status',
        table: 'files',
        columns: ['file_path', 'sync_status'],
        type: 'btree',
        unique: false
      },
      {
        name: 'idx_files_hash_modified',
        table: 'files',
        columns: ['file_hash', 'last_modified'],
        type: 'btree',
        unique: false
      },
      {
        name: 'idx_files_extension',
        table: 'files',
        columns: ["JSON_EXTRACT(data, '$.extension')"],
        type: 'btree',
        unique: false
      },
      {
        name: 'idx_dependency_graph_composite',
        table: 'dependency_graph',
        columns: ['source_id', 'target_id', 'relation_type'],
        type: 'btree',
        unique: false
      },
      {
        name: 'idx_functions_name_type',
        table: 'functions',
        columns: ["JSON_EXTRACT(data, '$.name')", "JSON_EXTRACT(data, '$.type')"],
        type: 'btree',
        unique: false
      }
    ];

    for (const index of indexes) {
      this.createIndex(index);
      this.searchIndexes.set(index.name, index);
    }
  }

  /**
   * 개별 인덱스 생성
   */
  private createIndex(index: SearchIndex): void {
    try {
      const uniqueStr = index.unique ? 'UNIQUE ' : '';
      const columnsStr = index.columns.join(', ');
      let partialStr = '';
      
      if (index.partial) {
        partialStr = ` WHERE ${index.partial}`;
      }

      const sql = `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${columnsStr})${partialStr}`;
      
      this.db.exec(sql);
      console.log(`✅ Created index: ${index.name}`);
    } catch (error) {
      console.warn(`⚠️  Failed to create index ${index.name}:`, error);
    }
  }

  /**
   * 쿼리 최적화 설정
   */
  private setupQueryOptimizations(): void {
    // SQLite 최적화 설정
    this.db.exec(`
      PRAGMA optimize;
      PRAGMA analysis_limit = 1000;
      PRAGMA cache_spill = ON;
    `);

    // 자주 사용되는 쿼리들을 미리 준비
    this.prepareFastQueries();
  }

  /**
   * 빠른 쿼리 준비
   */
  private prepareFastQueries(): void {
    const queries = {
      'find_by_path': 'SELECT * FROM files WHERE file_path = ?',
      'find_by_hash': 'SELECT * FROM files WHERE file_hash = ?',
      'find_pending_sync': 'SELECT * FROM files WHERE sync_status = ? ORDER BY created_at LIMIT ?',
      'find_dependencies': `
        SELECT t.* FROM files t 
        JOIN dependency_graph d ON t.id = d.target_id 
        WHERE d.source_id = ?
      `,
      'find_dependents': `
        SELECT s.* FROM files s 
        JOIN dependency_graph d ON s.id = d.source_id 
        WHERE d.target_id = ?
      `,
      'search_functions': `
        SELECT * FROM functions 
        WHERE JSON_EXTRACT(data, '$.name') LIKE ? 
        OR JSON_EXTRACT(data, '$.description') LIKE ?
      `,
      'circular_dependencies': `
        SELECT * FROM circular_dependencies 
        WHERE resolved = FALSE 
        ORDER BY impact DESC
      `
    };

    for (const [name, sql] of Object.entries(queries)) {
      this.preparedQueries.set(name, this.db.prepare(sql));
    }
  }

  /**
   * 고성능 쿼리 실행
   */
  executeQuery(queryName: string, parameters: any[] = []): any[] {
    const startTime = Date.now();
    const cacheKey = `${queryName}:${JSON.stringify(parameters)}`;
    
    // 캐시 확인
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.queryStats.cacheHits++;
      return cached;
    }

    // 쿼리 실행
    const stmt = this.preparedQueries.get(queryName);
    if (!stmt) {
      throw new Error(`Unknown query: ${queryName}`);
    }

    const result = stmt.all(...parameters) as any[];
    const executionTime = Date.now() - startTime;

    // 통계 업데이트
    this.updateQueryStats(queryName, executionTime);

    // 캐시에 저장
    this.setCache(cacheKey, result);

    // 느린 쿼리 추적
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      this.queryStats.slowQueries.push({
        sql: queryName,
        time: executionTime
      });
    }

    return result;
  }

  /**
   * 전체 텍스트 검색
   */
  fullTextSearch(query: string, options: FullTextSearchOptions = { tables: ['files'] }): FullTextResult[] {
    const startTime = Date.now();
    const results: FullTextResult[] = [];

    for (const table of options.tables) {
      const ftsTable = `${table}_fts`;
      let sql = `SELECT *, bm25(${ftsTable}) as rank FROM ${ftsTable}`;
      
      // 쿼리 조건 구성
      const queryConditions = this.buildFTSQuery(query, options);
      if (queryConditions) {
        sql += ` WHERE ${ftsTable} MATCH ?`;
      }

      if (options.rank !== false) {
        sql += ` ORDER BY rank`;
      }

      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
        if (options.offset) {
          sql += ` OFFSET ${options.offset}`;
        }
      }

      try {
        const stmt = this.db.prepare(sql);
        const tableResults = queryConditions ? 
          stmt.all(queryConditions) : 
          stmt.all();

        for (const row of tableResults as any[]) {
          const highlights = options.highlight ? 
            this.generateHighlights(row, query) : 
            [];

          results.push({
            table,
            id: row.rowid,
            content: row.content || row.data || '',
            rank: row.rank || 0,
            highlights,
            metadata: this.parseRowMetadata(row)
          });
        }
      } catch (error) {
        console.warn(`FTS search failed for table ${table}:`, error);
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`🔍 FTS search completed in ${executionTime}ms, ${results.length} results`);

    return results.sort((a, b) => a.rank - b.rank);
  }

  /**
   * FTS 쿼리 구성
   */
  private buildFTSQuery(query: string, options: FullTextSearchOptions): string | null {
    if (!query.trim()) return null;

    let ftsQuery = query;

    // Fuzzy 검색
    if (options.fuzzy) {
      // 간단한 fuzzy 검색: 각 단어에 * 추가
      ftsQuery = query.split(' ')
        .map(word => `${word}*`)
        .join(' ');
    }

    // 특정 컬럼 검색
    if (options.columns && options.columns.length > 0) {
      const columnQueries = options.columns.map(col => `${col}: ${ftsQuery}`);
      ftsQuery = `{${columnQueries.join(' OR ')}}`;
    }

    return ftsQuery;
  }

  /**
   * 하이라이트 생성
   */
  private generateHighlights(row: any, query: string): string[] {
    const highlights: string[] = [];
    const searchTerms = query.toLowerCase().split(' ');
    
    // 검색 가능한 필드들에서 매치 찾기
    const searchableFields = ['file_path', 'content', 'data', 'name', 'description'];
    
    for (const field of searchableFields) {
      if (row[field]) {
        const fieldValue = String(row[field]).toLowerCase();
        for (const term of searchTerms) {
          if (fieldValue.includes(term)) {
            const contextStart = Math.max(0, fieldValue.indexOf(term) - 30);
            const contextEnd = Math.min(fieldValue.length, fieldValue.indexOf(term) + term.length + 30);
            const context = fieldValue.substring(contextStart, contextEnd);
            highlights.push(`...${context}...`);
          }
        }
      }
    }

    return highlights.slice(0, 3); // 최대 3개의 하이라이트
  }

  /**
   * 행 메타데이터 파싱
   */
  private parseRowMetadata(row: any): any {
    const metadata: any = {
      table: row.table_name || 'unknown'
    };

    if (row.data) {
      try {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        metadata.data = data;
      } catch {
        metadata.data = row.data;
      }
    }

    if (row.file_path) metadata.filePath = row.file_path;
    if (row.last_modified) metadata.lastModified = row.last_modified;
    if (row.sync_status) metadata.syncStatus = row.sync_status;

    return metadata;
  }

  /**
   * 복합 쿼리 빌더
   */
  buildComplexQuery(): ComplexQueryBuilder {
    return new ComplexQueryBuilder(this.db, this);
  }

  /**
   * 캐시에서 조회
   */
  private getFromCache(key: string): any[] | null {
    const cached = this.queryCache.get(key);
    if (!cached) {
      this.queryStats.cacheMisses++;
      return null;
    }

    // TTL 확인
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.queryCache.delete(key);
      this.queryStats.cacheMisses++;
      return null;
    }

    cached.hitCount++;
    return cached.result;
  }

  /**
   * 캐시에 저장
   */
  private setCache(key: string, result: any[]): void {
    // 캐시 크기 제한
    if (this.queryCache.size >= this.CACHE_SIZE_LIMIT) {
      this.evictLeastUsedCache();
    }

    const size = JSON.stringify(result).length;
    this.queryCache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      hitCount: 0,
      size
    });
  }

  /**
   * 캐시 정리 (LRU)
   */
  private evictLeastUsedCache(): void {
    let leastUsed: QueryCache | null = null;
    let leastUsedKey = '';

    for (const [key, cache] of this.queryCache) {
      if (!leastUsed || cache.hitCount < leastUsed.hitCount) {
        leastUsed = cache;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.queryCache.delete(leastUsedKey);
    }
  }

  /**
   * 쿼리 통계 업데이트
   */
  private updateQueryStats(queryName: string, executionTime: number): void {
    this.queryStats.totalQueries++;
    
    const newAverage = (this.queryStats.averageExecutionTime * (this.queryStats.totalQueries - 1) + executionTime) / this.queryStats.totalQueries;
    this.queryStats.averageExecutionTime = newAverage;
  }

  /**
   * 쿼리 성능 분석
   */
  analyzeQueryPerformance(): {
    cacheEfficiency: number;
    slowQueriesCount: number;
    averageTime: number;
    recommendations: string[];
  } {
    const cacheEfficiency = this.queryStats.totalQueries > 0 ?
      this.queryStats.cacheHits / this.queryStats.totalQueries : 0;

    const recommendations: string[] = [];
    
    if (cacheEfficiency < 0.3) {
      recommendations.push('Consider increasing cache TTL or size');
    }
    
    if (this.queryStats.slowQueries.length > 10) {
      recommendations.push('Multiple slow queries detected - review indexes');
    }
    
    if (this.queryStats.averageExecutionTime > 50) {
      recommendations.push('Average query time is high - optimize database');
    }

    return {
      cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
      slowQueriesCount: this.queryStats.slowQueries.length,
      averageTime: Math.round(this.queryStats.averageExecutionTime * 100) / 100,
      recommendations
    };
  }

  /**
   * 인덱스 사용량 분석
   */
  analyzeIndexUsage(): { [indexName: string]: { used: boolean; effectiveness: number } } {
    const analysis: { [indexName: string]: { used: boolean; effectiveness: number } } = {};

    for (const [indexName, index] of this.searchIndexes) {
      try {
        // EXPLAIN QUERY PLAN을 사용하여 인덱스 사용 여부 확인
        const testQuery = `SELECT * FROM ${index.table} WHERE ${index.columns[0]} = 'test'`;
        const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${testQuery}`).all() as any[];
        
        const usesIndex = plan.some((step: any) => 
          step.detail && step.detail.includes(`USING INDEX ${indexName}`)
        );

        analysis[indexName] = {
          used: usesIndex,
          effectiveness: usesIndex ? 1.0 : 0.0
        };
      } catch {
        analysis[indexName] = { used: false, effectiveness: 0.0 };
      }
    }

    return analysis;
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalSize: number;
    entries: { key: string; hits: number; size: number }[];
  } {
    const totalSize = Array.from(this.queryCache.values())
      .reduce((sum, cache) => sum + cache.size, 0);

    const entries = Array.from(this.queryCache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(cache => ({
        key: cache.key,
        hits: cache.hitCount,
        size: cache.size
      }));

    const hitRate = this.queryStats.totalQueries > 0 ?
      this.queryStats.cacheHits / this.queryStats.totalQueries : 0;

    return {
      size: this.queryCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalSize,
      entries
    };
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 Query cache cleared');
  }

  /**
   * 데이터베이스 최적화
   */
  optimizeDatabase(): void {
    console.log('🚀 Optimizing database performance...');
    
    // 통계 업데이트
    this.db.exec('ANALYZE');
    
    // 쿼리 플래너 최적화
    this.db.exec('PRAGMA optimize');
    
    // 인덱스 재구축
    this.db.exec('REINDEX');
    
    console.log('✅ Database optimization completed');
  }
}

/**
 * 복합 쿼리 빌더
 */
export class ComplexQueryBuilder {
  private db: Database.Database;
  private engine: PerformanceQueryEngine;
  private selectClause: string = '*';
  private fromClause: string = '';
  private joinClauses: string[] = [];
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private parameters: any[] = [];

  constructor(db: Database.Database, engine: PerformanceQueryEngine) {
    this.db = db;
    this.engine = engine;
  }

  select(columns: string | string[]): ComplexQueryBuilder {
    this.selectClause = Array.isArray(columns) ? columns.join(', ') : columns;
    return this;
  }

  from(table: string): ComplexQueryBuilder {
    this.fromClause = table;
    return this;
  }

  join(table: string, condition: string): ComplexQueryBuilder {
    this.joinClauses.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  leftJoin(table: string, condition: string): ComplexQueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  where(condition: string, ...params: any[]): ComplexQueryBuilder {
    this.whereConditions.push(condition);
    this.parameters.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): ComplexQueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number, offset?: number): ComplexQueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    if (offset !== undefined) {
      this.limitClause += ` OFFSET ${offset}`;
    }
    return this;
  }

  build(): string {
    let sql = `SELECT ${this.selectClause} FROM ${this.fromClause}`;
    
    if (this.joinClauses.length > 0) {
      sql += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }

    return sql;
  }

  execute(): any[] {
    const sql = this.build();
    const stmt = this.db.prepare(sql);
    return stmt.all(...this.parameters);
  }

  explain(): any[] {
    const sql = `EXPLAIN QUERY PLAN ${this.build()}`;
    const stmt = this.db.prepare(sql);
    return stmt.all();
  }
}