/**
 * Notion 동기화 상태 추적 및 관리 시스템
 * Advanced Notion Synchronization State Management System
 */

import { Database } from 'bun:sqlite';
import crypto from 'crypto';
import { SQLiteSchemaManager } from './sqliteSchemaManager';
import { AdvancedIndexingEngine, IndexedRecord } from './advancedIndexingEngine';
import { PerformanceQueryEngine } from './performanceQueryEngine';

export interface SyncRecord {
  id: string;
  local_id: string;
  notion_page_id: string | null;
  table_name: string;
  sync_status: SyncStatus;
  last_local_hash: string;
  last_notion_hash: string | null;
  local_modified_at: string;
  notion_modified_at: string | null;
  sync_attempts: number;
  last_sync_attempt: string | null;
  last_successful_sync: string | null;
  error_message: string | null;
  conflict_data: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface SyncConflict {
  record_id: string;
  conflict_type: 'content' | 'metadata' | 'structure';
  local_data: any;
  notion_data: any;
  suggested_resolution: 'local' | 'notion' | 'merge';
  confidence_score: number;
}

export interface SyncBatch {
  id: string;
  batch_type: 'upload' | 'download' | 'bidirectional';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  processed_records: number;
  successful_syncs: number;
  failed_syncs: number;
  conflicts_detected: number;
  started_at: string;
  completed_at: string | null;
  error_summary: string | null;
}

export interface SyncStats {
  total_records: number;
  synced_records: number;
  pending_records: number;
  error_records: number;
  conflict_records: number;
  last_successful_sync: string | null;
  sync_health_score: number;
}

export type SyncStatus = 
  | 'pending'        // 동기화 대기 중
  | 'syncing'        // 현재 동기화 중
  | 'synced'         // 동기화 완료
  | 'error'          // 동기화 오류
  | 'conflict'       // 충돌 감지
  | 'orphaned'       // Notion에서 삭제됨
  | 'local_only'     // 로컬에만 존재
  | 'notion_only';   // Notion에만 존재

export class NotionSyncStateManager {
  private db: Database.Database;
  private schemaManager: SQLiteSchemaManager;
  private indexingEngine: AdvancedIndexingEngine;
  private performanceEngine: PerformanceQueryEngine;
  private preparedStatements: Map<string, Database.Statement> = new Map();

  constructor(
    schemaManager: SQLiteSchemaManager,
    indexingEngine: AdvancedIndexingEngine,
    performanceEngine: PerformanceQueryEngine
  ) {
    this.schemaManager = schemaManager;
    this.indexingEngine = indexingEngine;
    this.performanceEngine = performanceEngine;
    this.db = schemaManager.getDatabase();
    
    this.initializeSyncTables();
    this.initializePreparedStatements();
    this.setupSyncIndexes();
  }

  /**
   * 동기화 관련 테이블 초기화
   */
  private initializeSyncTables(): void {
    // 동기화 레코드 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_records (
        id TEXT PRIMARY KEY,
        local_id TEXT NOT NULL,
        notion_page_id TEXT,
        table_name TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error', 'conflict', 'orphaned', 'local_only', 'notion_only')),
        last_local_hash TEXT NOT NULL,
        last_notion_hash TEXT,
        local_modified_at TEXT NOT NULL,
        notion_modified_at TEXT,
        sync_attempts INTEGER DEFAULT 0,
        last_sync_attempt TEXT,
        last_successful_sync TEXT,
        error_message TEXT,
        conflict_data TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(local_id, table_name)
      )
    `);

    // 동기화 배치 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_batches (
        id TEXT PRIMARY KEY,
        batch_type TEXT NOT NULL CHECK (batch_type IN ('upload', 'download', 'bidirectional')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        total_records INTEGER DEFAULT 0,
        processed_records INTEGER DEFAULT 0,
        successful_syncs INTEGER DEFAULT 0,
        failed_syncs INTEGER DEFAULT 0,
        conflicts_detected INTEGER DEFAULT 0,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        error_summary TEXT
      )
    `);

    // 충돌 해결 기록 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        sync_record_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL CHECK (conflict_type IN ('content', 'metadata', 'structure')),
        local_data TEXT NOT NULL,
        notion_data TEXT NOT NULL,
        suggested_resolution TEXT NOT NULL CHECK (suggested_resolution IN ('local', 'notion', 'merge')),
        confidence_score REAL DEFAULT 0.0,
        resolved BOOLEAN DEFAULT FALSE,
        resolution_action TEXT,
        resolved_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sync_record_id) REFERENCES sync_records (id)
      )
    `);

    // 동기화 히스토리 테이블 (성능 분석용)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id TEXT PRIMARY KEY,
        sync_record_id TEXT NOT NULL,
        sync_type TEXT NOT NULL CHECK (sync_type IN ('upload', 'download', 'update', 'delete')),
        operation_result TEXT NOT NULL CHECK (operation_result IN ('success', 'failure', 'conflict', 'skip')),
        processing_time_ms INTEGER,
        data_size_bytes INTEGER,
        error_details TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (sync_record_id) REFERENCES sync_records (id)
      )
    `);
  }

  /**
   * 인덱스 최적화 설정
   */
  private setupSyncIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sync_records_status ON sync_records (sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_records_table_name ON sync_records (table_name)',
      'CREATE INDEX IF NOT EXISTS idx_sync_records_notion_id ON sync_records (notion_page_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_records_modified ON sync_records (local_modified_at)',
      'CREATE INDEX IF NOT EXISTS idx_sync_batches_status ON sync_batches (status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts (resolved)',
      'CREATE INDEX IF NOT EXISTS idx_sync_history_timestamp ON sync_history (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sync_history_result ON sync_history (operation_result)'
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  /**
   * 준비된 명령문 초기화
   */
  private initializePreparedStatements(): void {
    // 동기화 레코드 관련
    this.preparedStatements.set('insert_sync_record',
      this.db.prepare(`
        INSERT OR REPLACE INTO sync_records 
        (id, local_id, notion_page_id, table_name, sync_status, last_local_hash, last_notion_hash, 
         local_modified_at, notion_modified_at, metadata) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    );

    this.preparedStatements.set('update_sync_status',
      this.db.prepare(`
        UPDATE sync_records 
        SET sync_status = ?, sync_attempts = sync_attempts + 1, 
            last_sync_attempt = datetime('now'), updated_at = datetime('now'),
            error_message = ?, last_successful_sync = CASE WHEN ? = 'synced' THEN datetime('now') ELSE last_successful_sync END
        WHERE id = ?
      `)
    );

    this.preparedStatements.set('update_notion_data',
      this.db.prepare(`
        UPDATE sync_records 
        SET notion_page_id = ?, last_notion_hash = ?, notion_modified_at = ?, 
            updated_at = datetime('now')
        WHERE id = ?
      `)
    );

    // 충돌 관련
    this.preparedStatements.set('insert_conflict',
      this.db.prepare(`
        INSERT INTO sync_conflicts 
        (id, sync_record_id, conflict_type, local_data, notion_data, suggested_resolution, confidence_score) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
    );

    // 배치 관련
    this.preparedStatements.set('insert_batch',
      this.db.prepare(`
        INSERT INTO sync_batches (id, batch_type, total_records) 
        VALUES (?, ?, ?)
      `)
    );

    this.preparedStatements.set('update_batch_progress',
      this.db.prepare(`
        UPDATE sync_batches 
        SET processed_records = ?, successful_syncs = ?, failed_syncs = ?, conflicts_detected = ?
        WHERE id = ?
      `)
    );

    // 히스토리 관련
    this.preparedStatements.set('insert_history',
      this.db.prepare(`
        INSERT INTO sync_history 
        (id, sync_record_id, sync_type, operation_result, processing_time_ms, data_size_bytes, error_details) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
    );
  }

  /**
   * 로컬 레코드의 동기화 상태 추가/업데이트
   */
  registerLocalRecord(
    localRecord: IndexedRecord,
    tableName: string,
    notionPageId?: string
  ): string {
    const syncId = this.generateSyncId(localRecord.id, tableName);
    const localHash = this.calculateRecordHash(localRecord);
    
    const stmt = this.preparedStatements.get('insert_sync_record');
    stmt?.run(
      syncId,
      localRecord.id,
      notionPageId || null,
      tableName,
      notionPageId ? 'pending' : 'local_only',
      localHash,
      null, // last_notion_hash
      localRecord.updated_at,
      null, // notion_modified_at
      JSON.stringify({ file_path: localRecord.file_path })
    );

    console.log(`📝 Registered sync record: ${localRecord.file_path} → ${syncId}`);
    return syncId;
  }

  /**
   * Notion 페이지 ID 매핑 업데이트
   */
  updateNotionMapping(syncId: string, notionPageId: string, notionModifiedAt?: string): void {
    const stmt = this.preparedStatements.get('update_notion_data');
    stmt?.run(
      notionPageId,
      null, // notion_hash will be calculated later
      notionModifiedAt || new Date().toISOString(),
      syncId
    );

    // 상태를 pending으로 변경 (동기화 필요)
    this.updateSyncStatus(syncId, 'pending');
    console.log(`🔗 Updated Notion mapping: ${syncId} → ${notionPageId}`);
  }

  /**
   * 동기화 상태 업데이트
   */
  updateSyncStatus(
    syncId: string, 
    status: SyncStatus, 
    errorMessage?: string
  ): void {
    const stmt = this.preparedStatements.get('update_sync_status');
    stmt?.run(status, errorMessage || null, status, syncId);

    // 인덱싱 엔진의 동기화 상태도 업데이트
    const syncRecord = this.getSyncRecord(syncId);
    if (syncRecord) {
      this.indexingEngine.updateSyncStatus(
        syncRecord.local_id, 
        syncRecord.table_name, 
        status, 
        syncRecord.notion_page_id || undefined
      );
    }
  }

  /**
   * 충돌 감지 및 등록
   */
  detectAndRegisterConflict(
    syncId: string,
    localData: any,
    notionData: any
  ): SyncConflict | null {
    const conflictType = this.analyzeConflictType(localData, notionData);
    const suggestedResolution = this.suggestResolution(localData, notionData, conflictType);
    const confidence = this.calculateResolutionConfidence(localData, notionData, suggestedResolution);

    const conflict: SyncConflict = {
      record_id: syncId,
      conflict_type: conflictType,
      local_data: localData,
      notion_data: notionData,
      suggested_resolution: suggestedResolution,
      confidence_score: confidence
    };

    // 충돌 레코드 저장
    const conflictId = this.generateId(`conflict_${syncId}_${Date.now()}`);
    const stmt = this.preparedStatements.get('insert_conflict');
    stmt?.run(
      conflictId,
      syncId,
      conflictType,
      JSON.stringify(localData),
      JSON.stringify(notionData),
      suggestedResolution,
      confidence
    );

    // 동기화 상태를 conflict로 변경
    this.updateSyncStatus(syncId, 'conflict');

    console.log(`⚠️ Conflict detected: ${syncId} (${conflictType}) → ${suggestedResolution} (${Math.round(confidence * 100)}%)`);
    return conflict;
  }

  /**
   * 동기화 배치 생성 및 실행
   */
  createSyncBatch(
    batchType: 'upload' | 'download' | 'bidirectional',
    recordIds?: string[]
  ): string {
    const batchId = this.generateId(`batch_${batchType}_${Date.now()}`);
    let totalRecords = 0;

    if (recordIds) {
      totalRecords = recordIds.length;
    } else {
      // 전체 대기 중인 레코드 수 계산
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM sync_records 
        WHERE sync_status IN ('pending', 'error')
      `);
      totalRecords = (stmt.get() as { count: number }).count;
    }

    const insertStmt = this.preparedStatements.get('insert_batch');
    insertStmt?.run(batchId, batchType, totalRecords);

    console.log(`📦 Created sync batch: ${batchId} (${batchType}, ${totalRecords} records)`);
    return batchId;
  }

  /**
   * 배치 진행 상황 업데이트
   */
  updateBatchProgress(
    batchId: string,
    processed: number,
    successful: number,
    failed: number,
    conflicts: number
  ): void {
    const stmt = this.preparedStatements.get('update_batch_progress');
    stmt?.run(processed, successful, failed, conflicts, batchId);
  }

  /**
   * 동기화 히스토리 기록
   */
  recordSyncHistory(
    syncRecordId: string,
    syncType: 'upload' | 'download' | 'update' | 'delete',
    result: 'success' | 'failure' | 'conflict' | 'skip',
    processingTime?: number,
    dataSize?: number,
    errorDetails?: string
  ): void {
    const historyId = this.generateId(`history_${syncRecordId}_${Date.now()}`);
    const stmt = this.preparedStatements.get('insert_history');
    stmt?.run(
      historyId,
      syncRecordId,
      syncType,
      result,
      processingTime || null,
      dataSize || null,
      errorDetails || null
    );
  }

  /**
   * 특정 동기화 레코드 조회
   */
  getSyncRecord(syncId: string): SyncRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sync_records WHERE id = ?');
    const result = stmt.get(syncId) as any;
    
    if (result) {
      return {
        ...result,
        metadata: JSON.parse(result.metadata || '{}')
      };
    }
    
    return null;
  }

  /**
   * 로컬 ID로 동기화 레코드 조회
   */
  getSyncRecordByLocalId(localId: string, tableName: string): SyncRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sync_records WHERE local_id = ? AND table_name = ?');
    const result = stmt.get(localId, tableName) as any;
    
    if (result) {
      return {
        ...result,
        metadata: JSON.parse(result.metadata || '{}')
      };
    }
    
    return null;
  }

  /**
   * Notion ID로 동기화 레코드 조회
   */
  getSyncRecordByNotionId(notionPageId: string): SyncRecord | null {
    const stmt = this.db.prepare('SELECT * FROM sync_records WHERE notion_page_id = ?');
    const result = stmt.get(notionPageId) as any;
    
    if (result) {
      return {
        ...result,
        metadata: JSON.parse(result.metadata || '{}')
      };
    }
    
    return null;
  }

  /**
   * 상태별 동기화 레코드 조회
   */
  getSyncRecordsByStatus(
    status: SyncStatus | SyncStatus[], 
    tableName?: string,
    limit: number = 100
  ): SyncRecord[] {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    
    let sql = `SELECT * FROM sync_records WHERE sync_status IN (${placeholders})`;
    const params: any[] = [...statuses];
    
    if (tableName) {
      sql += ' AND table_name = ?';
      params.push(tableName);
    }
    
    sql += ' ORDER BY local_modified_at DESC LIMIT ?';
    params.push(limit);
    
    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as any[];
    
    return results.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * 충돌 레코드 조회
   */
  getUnresolvedConflicts(limit: number = 50): SyncConflict[] {
    const stmt = this.db.prepare(`
      SELECT c.*, sr.local_id, sr.table_name
      FROM sync_conflicts c
      JOIN sync_records sr ON c.sync_record_id = sr.id
      WHERE c.resolved = FALSE
      ORDER BY c.created_at DESC
      LIMIT ?
    `);
    
    const results = stmt.all(limit) as any[];
    return results.map(row => ({
      record_id: row.sync_record_id,
      conflict_type: row.conflict_type,
      local_data: JSON.parse(row.local_data),
      notion_data: JSON.parse(row.notion_data),
      suggested_resolution: row.suggested_resolution,
      confidence_score: row.confidence_score
    }));
  }

  /**
   * 동기화 통계
   */
  getSyncStats(tableName?: string): SyncStats {
    let baseQuery = 'SELECT sync_status, COUNT(*) as count FROM sync_records';
    const params: any[] = [];
    
    if (tableName) {
      baseQuery += ' WHERE table_name = ?';
      params.push(tableName);
    }
    
    baseQuery += ' GROUP BY sync_status';
    
    const stmt = this.db.prepare(baseQuery);
    const results = stmt.all(...params) as { sync_status: string; count: number }[];
    
    const stats = {
      total_records: 0,
      synced_records: 0,
      pending_records: 0,
      error_records: 0,
      conflict_records: 0,
      last_successful_sync: null,
      sync_health_score: 0
    };

    for (const result of results) {
      stats.total_records += result.count;
      
      switch (result.sync_status) {
        case 'synced':
          stats.synced_records += result.count;
          break;
        case 'pending':
        case 'syncing':
          stats.pending_records += result.count;
          break;
        case 'error':
          stats.error_records += result.count;
          break;
        case 'conflict':
          stats.conflict_records += result.count;
          break;
      }
    }

    // 마지막 성공 동기화 시간
    const lastSyncStmt = this.db.prepare(`
      SELECT MAX(last_successful_sync) as last_sync FROM sync_records 
      WHERE last_successful_sync IS NOT NULL
      ${tableName ? 'AND table_name = ?' : ''}
    `);
    
    const lastSyncResult = lastSyncStmt.get(...(tableName ? [tableName] : [])) as any;
    stats.last_successful_sync = lastSyncResult?.last_sync || null;

    // 동기화 건강도 점수 계산 (0-100)
    if (stats.total_records > 0) {
      const healthScore = (stats.synced_records / stats.total_records) * 100;
      const errorPenalty = (stats.error_records + stats.conflict_records) * 2;
      stats.sync_health_score = Math.max(0, Math.min(100, healthScore - errorPenalty));
    }

    return stats;
  }

  /**
   * 고급 분석: 동기화 성능 메트릭
   */
  getPerformanceMetrics(hours: number = 24): {
    sync_throughput: number;
    average_processing_time: number;
    error_rate: number;
    conflict_rate: number;
    bottlenecks: string[];
  } {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    const cutoffISO = cutoff.toISOString();

    // 처리량 계산
    const throughputStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sync_history 
      WHERE timestamp >= ? AND operation_result = 'success'
    `);
    const throughputCount = (throughputStmt.get(cutoffISO) as { count: number }).count;
    const syncThroughput = throughputCount / hours;

    // 평균 처리 시간
    const avgTimeStmt = this.db.prepare(`
      SELECT AVG(processing_time_ms) as avg_time FROM sync_history 
      WHERE timestamp >= ? AND processing_time_ms IS NOT NULL
    `);
    const avgTime = (avgTimeStmt.get(cutoffISO) as { avg_time: number }).avg_time || 0;

    // 오류율 및 충돌율
    const errorStmt = this.db.prepare(`
      SELECT operation_result, COUNT(*) as count FROM sync_history 
      WHERE timestamp >= ? 
      GROUP BY operation_result
    `);
    const results = errorStmt.all(cutoffISO) as { operation_result: string; count: number }[];
    
    let totalOps = 0;
    let errorOps = 0;
    let conflictOps = 0;

    for (const result of results) {
      totalOps += result.count;
      if (result.operation_result === 'failure') errorOps += result.count;
      if (result.operation_result === 'conflict') conflictOps += result.count;
    }

    const errorRate = totalOps > 0 ? (errorOps / totalOps) * 100 : 0;
    const conflictRate = totalOps > 0 ? (conflictOps / totalOps) * 100 : 0;

    // 병목 분석
    const bottlenecks: string[] = [];
    if (avgTime > 5000) bottlenecks.push('high_processing_time');
    if (errorRate > 5) bottlenecks.push('high_error_rate');
    if (conflictRate > 10) bottlenecks.push('frequent_conflicts');
    if (syncThroughput < 10) bottlenecks.push('low_throughput');

    return {
      sync_throughput: syncThroughput,
      average_processing_time: avgTime,
      error_rate: errorRate,
      conflict_rate: conflictRate,
      bottlenecks
    };
  }

  /**
   * 동기화 상태 정리 및 최적화
   */
  cleanupSyncState(daysOld: number = 30): {
    deleted_history_records: number;
    deleted_resolved_conflicts: number;
    orphaned_records_updated: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    // 오래된 히스토리 정리
    const deleteHistoryStmt = this.db.prepare(`
      DELETE FROM sync_history 
      WHERE timestamp < ? AND operation_result = 'success'
    `);
    const historyResult = deleteHistoryStmt.run(cutoffISO);

    // 해결된 충돌 정리
    const deleteConflictsStmt = this.db.prepare(`
      DELETE FROM sync_conflicts 
      WHERE resolved = TRUE AND resolved_at < ?
    `);
    const conflictsResult = deleteConflictsStmt.run(cutoffISO);

    // 고아 레코드 상태 업데이트
    const updateOrphanedStmt = this.db.prepare(`
      UPDATE sync_records 
      SET sync_status = 'orphaned' 
      WHERE notion_page_id IS NOT NULL 
        AND sync_status = 'synced' 
        AND updated_at < ?
    `);
    const orphanedResult = updateOrphanedStmt.run(cutoffISO);

    console.log(`🧹 Cleanup completed: ${historyResult.changes} history, ${conflictsResult.changes} conflicts, ${orphanedResult.changes} orphaned`);

    return {
      deleted_history_records: historyResult.changes || 0,
      deleted_resolved_conflicts: conflictsResult.changes || 0,
      orphaned_records_updated: orphanedResult.changes || 0
    };
  }

  /**
   * 유틸리티 메서드들
   */
  private generateSyncId(localId: string, tableName: string): string {
    return this.generateId(`${tableName}_${localId}`);
  }

  private generateId(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private calculateRecordHash(record: any): string {
    const content = JSON.stringify({
      data: record.data,
      file_path: record.file_path,
      last_modified: record.last_modified
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private analyzeConflictType(localData: any, notionData: any): 'content' | 'metadata' | 'structure' {
    // 구조적 차이 검사
    const localKeys = Object.keys(localData.data || {});
    const notionKeys = Object.keys(notionData.properties || {});
    if (localKeys.length !== notionKeys.length || !localKeys.every(k => notionKeys.includes(k))) {
      return 'structure';
    }

    // 메타데이터 차이 검사
    if (localData.file_path !== notionData.file_path || 
        localData.last_modified !== notionData.last_modified) {
      return 'metadata';
    }

    // 기본적으로 내용 충돌
    return 'content';
  }

  private suggestResolution(
    localData: any, 
    notionData: any, 
    conflictType: string
  ): 'local' | 'notion' | 'merge' {
    // 최근 수정 시간 기준으로 판단
    const localTime = new Date(localData.last_modified || 0).getTime();
    const notionTime = new Date(notionData.last_modified || 0).getTime();

    if (conflictType === 'structure') {
      return 'merge'; // 구조 충돌은 항상 병합 제안
    }

    if (Math.abs(localTime - notionTime) < 60000) { // 1분 내 차이
      return 'merge';
    }

    return localTime > notionTime ? 'local' : 'notion';
  }

  private calculateResolutionConfidence(
    localData: any, 
    notionData: any, 
    resolution: string
  ): number {
    const localTime = new Date(localData.last_modified || 0).getTime();
    const notionTime = new Date(notionData.last_modified || 0).getTime();
    const timeDiff = Math.abs(localTime - notionTime);

    // 시간 차이가 클수록 신뢰도 높음
    if (timeDiff > 86400000) return 0.9; // 1일 이상
    if (timeDiff > 3600000) return 0.7;  // 1시간 이상
    if (timeDiff > 300000) return 0.5;   // 5분 이상
    return 0.3; // 5분 이내
  }
}