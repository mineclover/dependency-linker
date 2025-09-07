/**
 * Advanced Data Indexing Engine
 * 고도화된 데이터 인덱싱 및 관리 엔진
 */

import { Database } from 'bun:sqlite';
import crypto from 'crypto';
import { SQLiteSchemaManager } from './sqliteSchemaManager';
import { CollectedData, FileCollectionResult } from './dataCollectionEngine';
import { DependencyInfo, FunctionInfo, TodoItem } from './specializeddDataCollectors';

export interface IndexedRecord {
  id: string;
  notion_page_id?: string;
  file_path: string;
  file_hash: string;
  last_modified: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
  created_at: string;
  updated_at: string;
  data: { [key: string]: any };
}

export interface IndexingStats {
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  deletedRecords: number;
  errors: number;
  processingTime: number;
}

export interface QueryOptions {
  table: string;
  where?: { [key: string]: any };
  orderBy?: string;
  limit?: number;
  offset?: number;
  includes?: string[]; // 관계 데이터 포함
}

export interface RelationshipData {
  sourceId: string;
  targetId: string;
  relationType: string;
  metadata?: { [key: string]: any };
}

export class AdvancedIndexingEngine {
  private db: Database.Database;
  private schemaManager: SQLiteSchemaManager;
  private preparedStatements: Map<string, Database.Statement> = new Map();

  constructor(schemaManager: SQLiteSchemaManager) {
    this.schemaManager = schemaManager;
    this.db = schemaManager.getDatabase();
    this.initializePreparedStatements();
  }

  /**
   * 준비된 명령문 초기화 (성능 최적화)
   */
  private initializePreparedStatements(): void {
    const tables = ['files', 'docs', 'functions'];
    
    for (const table of tables) {
      // INSERT 문
      this.preparedStatements.set(`insert_${table}`, 
        this.db.prepare(`
          INSERT OR REPLACE INTO ${table} 
          (id, notion_page_id, file_path, file_hash, last_modified, sync_status, data)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
      );

      // UPDATE 문
      this.preparedStatements.set(`update_${table}`,
        this.db.prepare(`
          UPDATE ${table} 
          SET notion_page_id = ?, file_hash = ?, last_modified = ?, sync_status = ?, data = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
      );

      // SELECT 문
      this.preparedStatements.set(`select_${table}`,
        this.db.prepare(`SELECT * FROM ${table} WHERE file_path = ?`)
      );

      // DELETE 문
      this.preparedStatements.set(`delete_${table}`,
        this.db.prepare(`DELETE FROM ${table} WHERE id = ?`)
      );
    }

    // 관계 테이블용 명령문들
    this.preparedStatements.set('insert_relation',
      this.db.prepare(`
        INSERT OR IGNORE INTO files_imports_relations 
        (id, source_id, target_id) VALUES (?, ?, ?)
      `)
    );

    this.preparedStatements.set('delete_relations',
      this.db.prepare(`DELETE FROM files_imports_relations WHERE source_id = ?`)
    );
  }

  /**
   * 수집된 데이터를 인덱싱
   */
  async indexCollectionResults(results: FileCollectionResult[], tableName: string = 'files'): Promise<IndexingStats> {
    const startTime = Date.now();
    const stats: IndexingStats = {
      totalRecords: results.length,
      newRecords: 0,
      updatedRecords: 0,
      deletedRecords: 0,
      errors: 0,
      processingTime: 0
    };

    const transaction = this.db.transaction(() => {
      for (const result of results) {
        try {
          const existingRecord = this.findRecord(result.filePath, tableName);
          const newHash = this.calculateFileHash(result);

          if (existingRecord) {
            // 기존 레코드가 있으면 업데이트 여부 확인
            if (existingRecord.file_hash !== newHash) {
              this.updateRecord(result, tableName, newHash);
              stats.updatedRecords++;
            }
          } else {
            // 새 레코드 삽입
            this.insertRecord(result, tableName, newHash);
            stats.newRecords++;
          }

          // 관계 데이터 처리
          this.processRelationships(result, tableName);

        } catch (error) {
          console.error(`Indexing error for ${result.filePath}:`, error);
          stats.errors++;
        }
      }
    });

    transaction();

    stats.processingTime = Date.now() - startTime;
    console.log(`📊 Indexing completed: ${stats.newRecords} new, ${stats.updatedRecords} updated, ${stats.errors} errors (${stats.processingTime}ms)`);
    
    return stats;
  }

  /**
   * 레코드 삽입
   */
  private insertRecord(result: FileCollectionResult, tableName: string, hash: string): void {
    const id = this.generateId(result.filePath);
    const insertStmt = this.preparedStatements.get(`insert_${tableName}`);
    
    if (!insertStmt) {
      throw new Error(`No prepared statement for table: ${tableName}`);
    }

    insertStmt.run(
      id,
      result.notionId || null,
      result.filePath,
      hash,
      new Date().toISOString(),
      'pending',
      JSON.stringify(result.data)
    );
  }

  /**
   * 레코드 업데이트
   */
  private updateRecord(result: FileCollectionResult, tableName: string, hash: string): void {
    const id = this.generateId(result.filePath);
    const updateStmt = this.preparedStatements.get(`update_${tableName}`);
    
    if (!updateStmt) {
      throw new Error(`No prepared statement for table: ${tableName}`);
    }

    updateStmt.run(
      result.notionId || null,
      hash,
      new Date().toISOString(),
      'pending', // 수정된 내용은 다시 동기화 필요
      JSON.stringify(result.data),
      id
    );
  }

  /**
   * 관계 데이터 처리
   */
  private processRelationships(result: FileCollectionResult, tableName: string): void {
    if (tableName !== 'files') return;

    const sourceId = this.generateId(result.filePath);
    
    // 기존 관계 삭제
    const deleteRelationsStmt = this.preparedStatements.get('delete_relations');
    deleteRelationsStmt?.run(sourceId);

    // 종속성 관계 추가
    const dependencies = result.data.dependencies as DependencyInfo[] | undefined;
    if (dependencies) {
      const insertRelationStmt = this.preparedStatements.get('insert_relation');
      
      for (const dep of dependencies) {
        if (dep.type === 'relative' || dep.type === 'internal') {
          // 상대 경로를 절대 경로로 변환하고 타겟 ID 찾기
          const targetPath = this.resolveRelativePath(result.filePath, dep.source);
          const targetRecord = this.findRecord(targetPath, tableName);
          
          if (targetRecord) {
            const relationId = this.generateId(`${sourceId}_${targetRecord.id}`);
            insertRelationStmt?.run(relationId, sourceId, targetRecord.id);
          }
        }
      }
    }
  }

  /**
   * 기존 레코드 찾기
   */
  private findRecord(filePath: string, tableName: string): IndexedRecord | null {
    const selectStmt = this.preparedStatements.get(`select_${tableName}`);
    const result = selectStmt?.get(filePath) as any;
    
    if (result) {
      return {
        ...result,
        data: JSON.parse(result.data || '{}')
      };
    }
    
    return null;
  }

  /**
   * 파일 해시 계산
   */
  private calculateFileHash(result: FileCollectionResult): string {
    const content = JSON.stringify(result.data) + result.filePath;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 고유 ID 생성
   */
  private generateId(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * 상대 경로 해결
   */
  private resolveRelativePath(basePath: string, relativePath: string): string {
    const path = require('path');
    const baseDir = path.dirname(basePath);
    return path.resolve(baseDir, relativePath);
  }

  /**
   * 고급 쿼리 실행
   */
  query(options: QueryOptions): any[] {
    let sql = `SELECT * FROM ${options.table}`;
    const params: any[] = [];

    // WHERE 절 구성
    if (options.where) {
      const whereConditions = Object.entries(options.where).map(([key, value], index) => {
        params.push(value);
        return `${key} = ?`;
      });
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // ORDER BY 절
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    // LIMIT과 OFFSET
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const stmt = this.db.prepare(sql);
    let results = stmt.all(...params) as any[];

    // JSON 데이터 파싱
    results = results.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));

    // 관계 데이터 포함
    if (options.includes) {
      results = this.includeRelationships(results, options.includes, options.table);
    }

    return results;
  }

  /**
   * 관계 데이터 포함
   */
  private includeRelationships(records: any[], includes: string[], tableName: string): any[] {
    for (const include of includes) {
      if (include === 'dependencies') {
        for (const record of records) {
          record.dependencies = this.getDependencies(record.id);
        }
      } else if (include === 'dependents') {
        for (const record of records) {
          record.dependents = this.getDependents(record.id);
        }
      } else if (include === 'functions') {
        for (const record of records) {
          record.functions = this.getFunctions(record.file_path);
        }
      }
    }
    return records;
  }

  /**
   * 종속성 조회
   */
  private getDependencies(sourceId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT f.* FROM files f
      JOIN files_imports_relations r ON f.id = r.target_id
      WHERE r.source_id = ?
    `);
    return stmt.all(sourceId);
  }

  /**
   * 의존하는 파일들 조회
   */
  private getDependents(targetId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT f.* FROM files f
      JOIN files_imports_relations r ON f.id = r.source_id
      WHERE r.target_id = ?
    `);
    return stmt.all(targetId);
  }

  /**
   * 파일의 함수들 조회
   */
  private getFunctions(filePath: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM functions 
      WHERE JSON_EXTRACT(data, '$.file') = ?
    `);
    return stmt.all(filePath);
  }

  /**
   * 전체 텍스트 검색
   */
  fullTextSearch(query: string, tables: string[] = ['files', 'docs', 'functions']): any[] {
    const results: any[] = [];
    
    for (const table of tables) {
      // JSON 데이터 내에서 검색
      const stmt = this.db.prepare(`
        SELECT *, '${table}' as table_name FROM ${table}
        WHERE file_path LIKE ? OR data LIKE ?
        ORDER BY last_modified DESC
      `);
      
      const searchPattern = `%${query}%`;
      const tableResults = stmt.all(searchPattern, searchPattern);
      results.push(...tableResults);
    }

    return results.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));
  }

  /**
   * 동기화 상태 업데이트
   */
  updateSyncStatus(id: string, tableName: string, status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict', notionPageId?: string): void {
    const stmt = this.db.prepare(`
      UPDATE ${tableName} 
      SET sync_status = ?, notion_page_id = COALESCE(?, notion_page_id), updated_at = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(status, notionPageId, id);
  }

  /**
   * 동기화 대기 중인 레코드 조회
   */
  getPendingSyncRecords(tableName: string, limit: number = 100): IndexedRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${tableName} 
      WHERE sync_status IN ('pending', 'error')
      ORDER BY created_at ASC
      LIMIT ?
    `);
    
    const results = stmt.all(limit) as any[];
    return results.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));
  }

  /**
   * 충돌 해결
   */
  resolveConflict(id: string, tableName: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any): void {
    if (resolution === 'merge' && mergedData) {
      const stmt = this.db.prepare(`
        UPDATE ${tableName} 
        SET data = ?, sync_status = 'pending', updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(JSON.stringify(mergedData), id);
    } else if (resolution === 'local') {
      this.updateSyncStatus(id, tableName, 'pending');
    } else if (resolution === 'remote') {
      this.updateSyncStatus(id, tableName, 'synced');
    }
  }

  /**
   * 성능 통계
   */
  getPerformanceStats(): {
    totalRecords: number;
    tableStats: { [table: string]: number };
    syncStats: { [status: string]: number };
    indexSize: number;
  } {
    const totalRecords = (this.db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
    
    const tableStats: { [table: string]: number } = {};
    const tables = ['files', 'docs', 'functions'];
    
    for (const table of tables) {
      try {
        const count = (this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }).count;
        tableStats[table] = count;
      } catch {
        tableStats[table] = 0;
      }
    }

    const syncStatsResult = this.db.prepare(`
      SELECT sync_status, COUNT(*) as count FROM files 
      GROUP BY sync_status
    `).all() as { sync_status: string; count: number }[];
    
    const syncStats: { [status: string]: number } = {};
    for (const stat of syncStatsResult) {
      syncStats[stat.sync_status] = stat.count;
    }

    const indexSize = (this.db.prepare('PRAGMA page_count').get() as any)['page_count()'] * 
                     (this.db.prepare('PRAGMA page_size').get() as any)['page_size()'];

    return {
      totalRecords,
      tableStats,
      syncStats,
      indexSize
    };
  }

  /**
   * 중복 데이터 정리
   */
  deduplicateRecords(tableName: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM ${tableName} 
      WHERE id NOT IN (
        SELECT MIN(id) FROM ${tableName} 
        GROUP BY file_path
      )
    `);
    
    const result = stmt.run();
    console.log(`🧹 Removed ${result.changes} duplicate records from ${tableName}`);
    return result.changes || 0;
  }

  /**
   * 오래된 레코드 정리
   */
  cleanupOldRecords(tableName: string, daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const stmt = this.db.prepare(`
      DELETE FROM ${tableName} 
      WHERE updated_at < ? AND sync_status = 'synced'
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    console.log(`🧹 Cleaned up ${result.changes} old records from ${tableName}`);
    return result.changes || 0;
  }

  /**
   * 백업 생성
   */
  createBackup(backupPath: string): void {
    this.db.backup(backupPath);
    console.log(`💾 Database backup created: ${backupPath}`);
  }

  /**
   * 인덱스 재구축
   */
  rebuildIndexes(): void {
    console.log('🔧 Rebuilding indexes...');
    this.db.exec('REINDEX');
    console.log('✅ Indexes rebuilt successfully');
  }
}