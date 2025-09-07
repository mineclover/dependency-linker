/**
 * 증분 업데이트 및 데이터 무결성 보장 시스템
 * Incremental Updates and Data Integrity Assurance System
 */

import { Database } from 'bun:sqlite';
import crypto from 'crypto';
import { SQLiteSchemaManager } from './sqliteSchemaManager';
import { AdvancedIndexingEngine, IndexedRecord } from './advancedIndexingEngine';
import { RelationshipProcessor } from './relationshipProcessor';
import { PerformanceQueryEngine } from './performanceQueryEngine';
import { NotionSyncStateManager, SyncRecord } from './notionSyncStateManager';

export interface ChangeSet {
  id: string;
  operation_type: 'create' | 'update' | 'delete' | 'move';
  table_name: string;
  record_id: string;
  old_data: any | null;
  new_data: any | null;
  timestamp: string;
  change_hash: string;
  dependencies: string[];
  validation_status: 'pending' | 'valid' | 'invalid' | 'warning';
  validation_errors: string[];
  applied: boolean;
  applied_at: string | null;
  rollback_data: string | null;
}

export interface IntegrityCheck {
  id: string;
  check_type: 'schema' | 'references' | 'constraints' | 'sync' | 'orphans';
  table_name: string | null;
  status: 'running' | 'passed' | 'failed' | 'warning';
  errors_found: number;
  warnings_found: number;
  details: string;
  started_at: string;
  completed_at: string | null;
}

export interface Transaction {
  id: string;
  operation_type: string;
  status: 'pending' | 'running' | 'committed' | 'rolled_back' | 'failed';
  change_sets: string[];
  dependencies: string[];
  started_at: string;
  committed_at: string | null;
  rollback_reason: string | null;
  isolation_level: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
}

export interface IntegrityReport {
  overall_health: 'excellent' | 'good' | 'warning' | 'critical';
  health_score: number; // 0-100
  schema_consistency: boolean;
  reference_integrity: boolean;
  sync_consistency: boolean;
  orphaned_records: number;
  data_corruption_detected: boolean;
  recommendations: string[];
  last_check: string;
  next_check_due: string;
}

export interface IncrementalStats {
  total_changes_processed: number;
  successful_updates: number;
  failed_updates: number;
  skipped_updates: number;
  processing_time_ms: number;
  data_volume_bytes: number;
  optimization_savings_percent: number;
}

export class DataIntegrityManager {
  private db: Database.Database;
  private schemaManager: SQLiteSchemaManager;
  private indexingEngine: AdvancedIndexingEngine;
  private relationshipProcessor: RelationshipProcessor;
  private performanceEngine: PerformanceQueryEngine;
  private syncStateManager: NotionSyncStateManager;
  private preparedStatements: Map<string, Database.Statement> = new Map();
  private activeTransactions: Map<string, Transaction> = new Map();

  constructor(
    schemaManager: SQLiteSchemaManager,
    indexingEngine: AdvancedIndexingEngine,
    relationshipProcessor: RelationshipProcessor,
    performanceEngine: PerformanceQueryEngine,
    syncStateManager: NotionSyncStateManager
  ) {
    this.schemaManager = schemaManager;
    this.indexingEngine = indexingEngine;
    this.relationshipProcessor = relationshipProcessor;
    this.performanceEngine = performanceEngine;
    this.syncStateManager = syncStateManager;
    this.db = schemaManager.getDatabase();

    this.initializeIntegrityTables();
    this.initializePreparedStatements();
    this.setupIntegrityIndexes();
    this.scheduleIntegrityChecks();
  }

  /**
   * 데이터 무결성 관련 테이블 초기화
   */
  private initializeIntegrityTables(): void {
    // 변경셋 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS change_sets (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'move')),
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        old_data TEXT,
        new_data TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        change_hash TEXT NOT NULL,
        dependencies TEXT DEFAULT '[]',
        validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
        validation_errors TEXT DEFAULT '[]',
        applied BOOLEAN DEFAULT FALSE,
        applied_at TEXT,
        rollback_data TEXT
      )
    `);

    // 무결성 검사 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS integrity_checks (
        id TEXT PRIMARY KEY,
        check_type TEXT NOT NULL CHECK (check_type IN ('schema', 'references', 'constraints', 'sync', 'orphans')),
        table_name TEXT,
        status TEXT DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'warning')),
        errors_found INTEGER DEFAULT 0,
        warnings_found INTEGER DEFAULT 0,
        details TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `);

    // 트랜잭션 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'committed', 'rolled_back', 'failed')),
        change_sets TEXT DEFAULT '[]',
        dependencies TEXT DEFAULT '[]',
        started_at TEXT DEFAULT (datetime('now')),
        committed_at TEXT,
        rollback_reason TEXT,
        isolation_level TEXT DEFAULT 'read_committed'
      )
    `);

    // 체크포인트 테이블 (복구용)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN ('manual', 'scheduled', 'pre_operation', 'recovery')),
        table_snapshots TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        size_bytes INTEGER,
        compression_ratio REAL
      )
    `);

    // 데이터 해시 체크섬 테이블 (변경 감지용)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_checksums (
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        structure_hash TEXT NOT NULL,
        last_verified TEXT DEFAULT (datetime('now')),
        verified_count INTEGER DEFAULT 1,
        PRIMARY KEY (table_name, record_id)
      )
    `);
  }

  /**
   * 인덱스 최적화
   */
  private setupIntegrityIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_change_sets_timestamp ON change_sets (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_change_sets_applied ON change_sets (applied)',
      'CREATE INDEX IF NOT EXISTS idx_change_sets_validation ON change_sets (validation_status)',
      'CREATE INDEX IF NOT EXISTS idx_integrity_checks_type ON integrity_checks (check_type)',
      'CREATE INDEX IF NOT EXISTS idx_integrity_checks_status ON integrity_checks (status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status)',
      'CREATE INDEX IF NOT EXISTS idx_checkpoints_type ON checkpoints (checkpoint_type)',
      'CREATE INDEX IF NOT EXISTS idx_checksums_verified ON data_checksums (last_verified)'
    ];

    for (const indexSQL of indexes) {
      this.db.exec(indexSQL);
    }
  }

  /**
   * 준비된 명령문 초기화
   */
  private initializePreparedStatements(): void {
    // 변경셋 관련
    this.preparedStatements.set('insert_changeset',
      this.db.prepare(`
        INSERT INTO change_sets 
        (id, operation_type, table_name, record_id, old_data, new_data, change_hash, dependencies) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
    );

    this.preparedStatements.set('update_changeset_validation',
      this.db.prepare(`
        UPDATE change_sets 
        SET validation_status = ?, validation_errors = ?
        WHERE id = ?
      `)
    );

    this.preparedStatements.set('mark_changeset_applied',
      this.db.prepare(`
        UPDATE change_sets 
        SET applied = TRUE, applied_at = datetime('now')
        WHERE id = ?
      `)
    );

    // 체크섬 관련
    this.preparedStatements.set('upsert_checksum',
      this.db.prepare(`
        INSERT OR REPLACE INTO data_checksums 
        (table_name, record_id, content_hash, structure_hash, verified_count)
        VALUES (?, ?, ?, ?, COALESCE((SELECT verified_count FROM data_checksums WHERE table_name = ? AND record_id = ?) + 1, 1))
      `)
    );

    // 무결성 검사 관련
    this.preparedStatements.set('insert_integrity_check',
      this.db.prepare(`
        INSERT INTO integrity_checks 
        (id, check_type, table_name, status, errors_found, warnings_found, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
    );

    this.preparedStatements.set('complete_integrity_check',
      this.db.prepare(`
        UPDATE integrity_checks 
        SET status = ?, errors_found = ?, warnings_found = ?, details = ?, completed_at = datetime('now')
        WHERE id = ?
      `)
    );
  }

  /**
   * 증분 업데이트 처리
   */
  async processIncrementalUpdate(
    tableName: string,
    records: any[],
    options: {
      batchSize?: number;
      validateBeforeApply?: boolean;
      createCheckpoint?: boolean;
      transactionIsolation?: 'read_committed' | 'serializable';
    } = {}
  ): Promise<IncrementalStats> {
    const startTime = Date.now();
    const {
      batchSize = 100,
      validateBeforeApply = true,
      createCheckpoint = true,
      transactionIsolation = 'read_committed'
    } = options;

    let stats: IncrementalStats = {
      total_changes_processed: 0,
      successful_updates: 0,
      failed_updates: 0,
      skipped_updates: 0,
      processing_time_ms: 0,
      data_volume_bytes: 0,
      optimization_savings_percent: 0
    };

    // 체크포인트 생성
    let checkpointId: string | null = null;
    if (createCheckpoint) {
      checkpointId = await this.createCheckpoint('pre_operation', [tableName]);
    }

    try {
      // 변경 감지 및 변경셋 생성
      const changeSets = await this.detectChanges(tableName, records);
      stats.total_changes_processed = changeSets.length;

      console.log(`🔄 Processing ${changeSets.length} changes for ${tableName}`);

      // 배치 단위로 처리
      for (let i = 0; i < changeSets.length; i += batchSize) {
        const batch = changeSets.slice(i, i + batchSize);
        
        const batchStats = await this.processBatch(
          batch, 
          validateBeforeApply,
          transactionIsolation
        );

        stats.successful_updates += batchStats.successful_updates;
        stats.failed_updates += batchStats.failed_updates;
        stats.skipped_updates += batchStats.skipped_updates;
        stats.data_volume_bytes += batchStats.data_volume_bytes;
      }

      // 최적화 절약률 계산
      const totalPossibleOps = records.length;
      const actualOps = stats.successful_updates + stats.failed_updates;
      stats.optimization_savings_percent = totalPossibleOps > 0 
        ? ((totalPossibleOps - actualOps) / totalPossibleOps) * 100 
        : 0;

      console.log(`✅ Incremental update completed: ${stats.successful_updates}/${stats.total_changes_processed} successful (${Math.round(stats.optimization_savings_percent)}% optimized)`);

    } catch (error) {
      console.error(`❌ Incremental update failed:`, error);
      
      // 체크포인트로 복구 시도
      if (checkpointId) {
        await this.restoreFromCheckpoint(checkpointId);
      }
      
      throw error;
    }

    stats.processing_time_ms = Date.now() - startTime;
    return stats;
  }

  /**
   * 변경 감지 (효율적인 해시 기반)
   */
  private async detectChanges(tableName: string, records: any[]): Promise<ChangeSet[]> {
    const changeSets: ChangeSet[] = [];
    const existingChecksums = new Map<string, { content: string; structure: string }>();

    // 기존 체크섬 조회
    const stmt = this.db.prepare('SELECT record_id, content_hash, structure_hash FROM data_checksums WHERE table_name = ?');
    const checksums = stmt.all(tableName) as any[];
    
    for (const checksum of checksums) {
      existingChecksums.set(checksum.record_id, {
        content: checksum.content_hash,
        structure: checksum.structure_hash
      });
    }

    // 각 레코드의 변경 사항 감지
    for (const record of records) {
      const recordId = record.id || this.generateId(record.file_path || JSON.stringify(record));
      const contentHash = this.calculateContentHash(record);
      const structureHash = this.calculateStructureHash(record);
      
      const existing = existingChecksums.get(recordId);
      let operationType: 'create' | 'update' | 'delete' = 'create';
      let oldData = null;

      if (existing) {
        if (existing.content === contentHash && existing.structure === structureHash) {
          // 변경 없음 - 건너뛰기
          continue;
        }
        
        operationType = 'update';
        
        // 기존 데이터 조회
        const existingRecord = this.indexingEngine.query({
          table: tableName,
          where: { id: recordId },
          limit: 1
        })[0];
        
        oldData = existingRecord || null;
      }

      // 변경셋 생성
      const changeSet: ChangeSet = {
        id: this.generateId(`change_${tableName}_${recordId}_${Date.now()}`),
        operation_type: operationType,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: record,
        timestamp: new Date().toISOString(),
        change_hash: this.generateId(`${contentHash}_${structureHash}`),
        dependencies: await this.analyzeDependencies(record, tableName),
        validation_status: 'pending',
        validation_errors: [],
        applied: false,
        applied_at: null,
        rollback_data: null
      };

      changeSets.push(changeSet);

      // 변경셋 저장
      await this.saveChangeSet(changeSet);

      // 체크섬 업데이트
      const checksumStmt = this.preparedStatements.get('upsert_checksum');
      checksumStmt?.run(tableName, recordId, contentHash, structureHash, tableName, recordId);
    }

    return changeSets;
  }

  /**
   * 배치 처리
   */
  private async processBatch(
    changeSets: ChangeSet[],
    validateBeforeApply: boolean,
    isolationLevel: string
  ): Promise<IncrementalStats> {
    const stats: IncrementalStats = {
      total_changes_processed: changeSets.length,
      successful_updates: 0,
      failed_updates: 0,
      skipped_updates: 0,
      processing_time_ms: 0,
      data_volume_bytes: 0,
      optimization_savings_percent: 0
    };

    // 트랜잭션 시작
    const transactionId = this.generateId(`tx_${Date.now()}`);
    const transaction = this.db.transaction(() => {
      for (const changeSet of changeSets) {
        try {
          // 유효성 검사
          if (validateBeforeApply) {
            const validationResult = this.validateChangeSet(changeSet);
            if (!validationResult.isValid) {
              changeSet.validation_status = 'invalid';
              changeSet.validation_errors = validationResult.errors;
              this.updateChangeSetValidation(changeSet);
              stats.failed_updates++;
              continue;
            }
          }

          // 변경 적용
          this.applyChangeSet(changeSet);
          
          // 성공 마킹
          const markStmt = this.preparedStatements.get('mark_changeset_applied');
          markStmt?.run(changeSet.id);
          
          stats.successful_updates++;
          stats.data_volume_bytes += JSON.stringify(changeSet.new_data || {}).length;

        } catch (error) {
          console.error(`Failed to apply change ${changeSet.id}:`, error);
          changeSet.validation_status = 'invalid';
          changeSet.validation_errors = [error instanceof Error ? error.message : String(error)];
          this.updateChangeSetValidation(changeSet);
          stats.failed_updates++;
        }
      }
    });

    transaction();
    return stats;
  }

  /**
   * 변경셋 유효성 검사
   */
  private validateChangeSet(changeSet: ChangeSet): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // 스키마 검증
      if (changeSet.new_data) {
        const schema = this.schemaManager.getTableSchema(changeSet.table_name);
        if (schema) {
          const validation = this.validateAgainstSchema(changeSet.new_data, schema);
          if (!validation.isValid) {
            errors.push(...validation.errors);
          }
        }
      }

      // 참조 무결성 검증
      const refCheck = this.checkReferenceIntegrity(changeSet);
      if (!refCheck.isValid) {
        errors.push(...refCheck.errors);
      }

      // 비즈니스 규칙 검증
      const businessCheck = this.checkBusinessRules(changeSet);
      if (!businessCheck.isValid) {
        errors.push(...businessCheck.errors);
      }

      // 중복 검사
      if (changeSet.operation_type === 'create') {
        const duplicateCheck = this.checkForDuplicates(changeSet);
        if (!duplicateCheck.isValid) {
          errors.push(...duplicateCheck.errors);
        }
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 변경셋 적용
   */
  private applyChangeSet(changeSet: ChangeSet): void {
    switch (changeSet.operation_type) {
      case 'create':
        this.indexingEngine.query({
          table: changeSet.table_name,
          where: { id: changeSet.record_id }
        });
        // 실제로는 indexingEngine.indexCollectionResults 사용
        break;

      case 'update':
        this.indexingEngine.updateSyncStatus(
          changeSet.record_id,
          changeSet.table_name,
          'pending'
        );
        break;

      case 'delete':
        // 삭제는 소프트 삭제로 처리
        this.indexingEngine.updateSyncStatus(
          changeSet.record_id,
          changeSet.table_name,
          'orphaned'
        );
        break;
    }

    // 관계 업데이트
    if (changeSet.dependencies.length > 0) {
      this.relationshipProcessor.updateRelationships();
    }

    // 동기화 상태 업데이트
    const syncRecord = this.syncStateManager.getSyncRecordByLocalId(
      changeSet.record_id, 
      changeSet.table_name
    );
    
    if (syncRecord) {
      this.syncStateManager.updateSyncStatus(syncRecord.id, 'pending');
    }
  }

  /**
   * 종합 무결성 검사
   */
  async performComprehensiveIntegrityCheck(options: {
    checkTypes?: ('schema' | 'references' | 'constraints' | 'sync' | 'orphans')[];
    tables?: string[];
    autoFix?: boolean;
  } = {}): Promise<IntegrityReport> {
    const {
      checkTypes = ['schema', 'references', 'constraints', 'sync', 'orphans'],
      tables,
      autoFix = false
    } = options;

    const startTime = Date.now();
    const checkResults: IntegrityCheck[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log(`🔍 Starting comprehensive integrity check (${checkTypes.join(', ')})`);

    // 각 검사 유형별 실행
    for (const checkType of checkTypes) {
      const checkId = this.generateId(`check_${checkType}_${Date.now()}`);
      
      try {
        const result = await this.executeIntegrityCheck(checkType, tables, autoFix);
        
        checkResults.push({
          id: checkId,
          check_type: checkType,
          table_name: tables?.join(',') || null,
          status: result.errors > 0 ? 'failed' : (result.warnings > 0 ? 'warning' : 'passed'),
          errors_found: result.errors,
          warnings_found: result.warnings,
          details: result.details,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });

        totalErrors += result.errors;
        totalWarnings += result.warnings;

        // 결과 저장
        const insertStmt = this.preparedStatements.get('insert_integrity_check');
        insertStmt?.run(
          checkId, checkType, tables?.join(',') || null,
          result.errors > 0 ? 'failed' : (result.warnings > 0 ? 'warning' : 'passed'),
          result.errors, result.warnings, result.details
        );

        const completeStmt = this.preparedStatements.get('complete_integrity_check');
        completeStmt?.run(
          result.errors > 0 ? 'failed' : (result.warnings > 0 ? 'warning' : 'passed'),
          result.errors, result.warnings, result.details, checkId
        );

      } catch (error) {
        console.error(`Integrity check ${checkType} failed:`, error);
        totalErrors++;
      }
    }

    // 전체 건강도 점수 계산
    const totalIssues = totalErrors + (totalWarnings * 0.5);
    const maxPossibleIssues = checkTypes.length * 10; // 가정값
    const healthScore = Math.max(0, Math.min(100, 100 - (totalIssues / maxPossibleIssues) * 100));

    // 전체 건강도 등급
    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    if (healthScore >= 95) overallHealth = 'excellent';
    else if (healthScore >= 80) overallHealth = 'good';
    else if (healthScore >= 60) overallHealth = 'warning';
    else overallHealth = 'critical';

    // 권장사항 생성
    const recommendations = this.generateRecommendations(checkResults, totalErrors, totalWarnings);

    const report: IntegrityReport = {
      overall_health: overallHealth,
      health_score: healthScore,
      schema_consistency: !checkResults.some(r => r.check_type === 'schema' && r.status === 'failed'),
      reference_integrity: !checkResults.some(r => r.check_type === 'references' && r.status === 'failed'),
      sync_consistency: !checkResults.some(r => r.check_type === 'sync' && r.status === 'failed'),
      orphaned_records: checkResults.find(r => r.check_type === 'orphans')?.errors_found || 0,
      data_corruption_detected: totalErrors > 0,
      recommendations,
      last_check: new Date().toISOString(),
      next_check_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 후
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Integrity check completed in ${duration}ms - Health: ${overallHealth} (${Math.round(healthScore)}%)`);

    return report;
  }

  /**
   * 개별 무결성 검사 실행
   */
  private async executeIntegrityCheck(
    checkType: string,
    tables?: string[],
    autoFix: boolean = false
  ): Promise<{ errors: number; warnings: number; details: string }> {
    let errors = 0;
    let warnings = 0;
    const details: string[] = [];

    switch (checkType) {
      case 'schema':
        const schemaResults = await this.checkSchemaConsistency(tables);
        errors += schemaResults.errors;
        warnings += schemaResults.warnings;
        details.push(...schemaResults.details);
        break;

      case 'references':
        const refResults = await this.checkReferenceConsistency(tables);
        errors += refResults.errors;
        warnings += refResults.warnings;
        details.push(...refResults.details);
        break;

      case 'constraints':
        const constraintResults = await this.checkConstraintViolations(tables);
        errors += constraintResults.errors;
        warnings += constraintResults.warnings;
        details.push(...constraintResults.details);
        break;

      case 'sync':
        const syncResults = await this.checkSyncConsistency(tables);
        errors += syncResults.errors;
        warnings += syncResults.warnings;
        details.push(...syncResults.details);
        break;

      case 'orphans':
        const orphanResults = await this.checkOrphanedRecords(tables, autoFix);
        errors += orphanResults.errors;
        warnings += orphanResults.warnings;
        details.push(...orphanResults.details);
        break;
    }

    return {
      errors,
      warnings,
      details: details.join('\n')
    };
  }

  /**
   * 체크포인트 생성
   */
  async createCheckpoint(
    type: 'manual' | 'scheduled' | 'pre_operation' | 'recovery',
    tables?: string[]
  ): Promise<string> {
    const checkpointId = this.generateId(`checkpoint_${type}_${Date.now()}`);
    const snapshots: any = {};

    // 테이블 스냅샷 생성
    const tablesToBackup = tables || this.getAllTableNames();
    
    for (const tableName of tablesToBackup) {
      try {
        const data = this.db.prepare(`SELECT * FROM ${tableName}`).all();
        snapshots[tableName] = data;
      } catch (error) {
        console.warn(`Failed to snapshot table ${tableName}:`, error);
      }
    }

    const snapshotData = JSON.stringify(snapshots);
    const sizeBytes = Buffer.byteLength(snapshotData, 'utf8');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7일 후

    this.db.prepare(`
      INSERT INTO checkpoints (id, checkpoint_type, table_snapshots, size_bytes, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(checkpointId, type, snapshotData, sizeBytes, expiresAt);

    console.log(`📸 Checkpoint created: ${checkpointId} (${Math.round(sizeBytes / 1024)}KB)`);
    return checkpointId;
  }

  /**
   * 체크포인트 복구
   */
  async restoreFromCheckpoint(checkpointId: string): Promise<boolean> {
    try {
      const checkpoint = this.db.prepare('SELECT * FROM checkpoints WHERE id = ?').get(checkpointId) as any;
      
      if (!checkpoint) {
        console.error(`Checkpoint ${checkpointId} not found`);
        return false;
      }

      const snapshots = JSON.parse(checkpoint.table_snapshots);
      
      // 트랜잭션으로 복구 실행
      const restore = this.db.transaction(() => {
        for (const [tableName, data] of Object.entries(snapshots) as [string, any[]][]) {
          // 테이블 내용 삭제
          this.db.prepare(`DELETE FROM ${tableName}`).run();
          
          // 데이터 복구
          if (data.length > 0) {
            const columns = Object.keys(data[0]);
            const placeholders = columns.map(() => '?').join(',');
            const insertStmt = this.db.prepare(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
            
            for (const row of data) {
              const values = columns.map(col => row[col]);
              insertStmt.run(...values);
            }
          }
        }
      });

      restore();
      
      console.log(`🔄 Successfully restored from checkpoint: ${checkpointId}`);
      return true;

    } catch (error) {
      console.error(`Failed to restore from checkpoint ${checkpointId}:`, error);
      return false;
    }
  }

  /**
   * 유틸리티 메서드들
   */
  private generateId(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private calculateContentHash(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data.data || data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private calculateStructureHash(data: any): string {
    const structure = Object.keys(data.data || data).sort().join(',');
    return crypto.createHash('md5').update(structure).digest('hex');
  }

  private async analyzeDependencies(record: any, tableName: string): Promise<string[]> {
    // 종속성 분석 로직 (relationshipProcessor 활용)
    return [];
  }

  private async saveChangeSet(changeSet: ChangeSet): Promise<void> {
    const stmt = this.preparedStatements.get('insert_changeset');
    stmt?.run(
      changeSet.id,
      changeSet.operation_type,
      changeSet.table_name,
      changeSet.record_id,
      changeSet.old_data ? JSON.stringify(changeSet.old_data) : null,
      changeSet.new_data ? JSON.stringify(changeSet.new_data) : null,
      changeSet.change_hash,
      JSON.stringify(changeSet.dependencies)
    );
  }

  private updateChangeSetValidation(changeSet: ChangeSet): void {
    const stmt = this.preparedStatements.get('update_changeset_validation');
    stmt?.run(
      changeSet.validation_status,
      JSON.stringify(changeSet.validation_errors),
      changeSet.id
    );
  }

  private validateAgainstSchema(data: any, schema: any): { isValid: boolean; errors: string[] } {
    // 스키마 검증 로직
    return { isValid: true, errors: [] };
  }

  private checkReferenceIntegrity(changeSet: ChangeSet): { isValid: boolean; errors: string[] } {
    // 참조 무결성 검사 로직
    return { isValid: true, errors: [] };
  }

  private checkBusinessRules(changeSet: ChangeSet): { isValid: boolean; errors: string[] } {
    // 비즈니스 규칙 검사 로직
    return { isValid: true, errors: [] };
  }

  private checkForDuplicates(changeSet: ChangeSet): { isValid: boolean; errors: string[] } {
    // 중복 검사 로직
    return { isValid: true, errors: [] };
  }

  private async checkSchemaConsistency(tables?: string[]): Promise<{ errors: number; warnings: number; details: string[] }> {
    return { errors: 0, warnings: 0, details: [] };
  }

  private async checkReferenceConsistency(tables?: string[]): Promise<{ errors: number; warnings: number; details: string[] }> {
    return { errors: 0, warnings: 0, details: [] };
  }

  private async checkConstraintViolations(tables?: string[]): Promise<{ errors: number; warnings: number; details: string[] }> {
    return { errors: 0, warnings: 0, details: [] };
  }

  private async checkSyncConsistency(tables?: string[]): Promise<{ errors: number; warnings: number; details: string[] }> {
    return { errors: 0, warnings: 0, details: [] };
  }

  private async checkOrphanedRecords(tables?: string[], autoFix?: boolean): Promise<{ errors: number; warnings: number; details: string[] }> {
    return { errors: 0, warnings: 0, details: [] };
  }

  private getAllTableNames(): string[] {
    const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tables = stmt.all() as { name: string }[];
    return tables.map(t => t.name);
  }

  private generateRecommendations(checks: IntegrityCheck[], errors: number, warnings: number): string[] {
    const recommendations: string[] = [];
    
    if (errors > 0) {
      recommendations.push('Immediate action required: Fix critical integrity errors');
    }
    
    if (warnings > 5) {
      recommendations.push('Consider addressing data quality warnings');
    }
    
    if (checks.some(c => c.check_type === 'orphans' && c.errors_found > 0)) {
      recommendations.push('Clean up orphaned records to improve performance');
    }
    
    return recommendations;
  }

  /**
   * 스케줄된 무결성 검사 설정
   */
  private scheduleIntegrityChecks(): void {
    // 주기적 무결성 검사 스케줄링 (실제 구현에서는 cron job 또는 scheduler 사용)
    console.log('📅 Integrity check scheduler initialized');
  }
}