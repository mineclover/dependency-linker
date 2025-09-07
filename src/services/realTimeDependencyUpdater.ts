/**
 * 실시간 종속성 업데이트 시스템
 * Real-time Dependency Update System
 */

import { Database } from "bun:sqlite";
import { watch, FSWatcher } from 'fs';
import { MultiLanguageParserIntegration, FallbackAnalysisResult } from './multiLanguageParserIntegration';
import { DependencyExtractionEngine, DependencyGraph, DependencyNode } from './dependencyExtractionEngine';
import { FileAnalysisResult } from './treeSitterDependencyAnalyzer';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  AdvancedWatcherConfig,
  FileChangeEvent,
  DependencyUpdateEvent,
  BatchUpdate,
  WatcherStats,
  createWatcherConfig
} from '../shared/types/watcher.js';

export class RealTimeDependencyUpdater extends EventEmitter {
  private db: Database;
  private parserIntegration: MultiLanguageParserIntegration;
  private extractionEngine: DependencyExtractionEngine;
  private watchers: Map<string, FSWatcher> = new Map();
  private config: AdvancedWatcherConfig;
  private updateQueue: Map<string, FileChangeEvent> = new Map();
  private batchQueue: Set<string> = new Set();
  private processingQueue: Set<string> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private stats: WatcherStats;
  private isActive: boolean = false;

  constructor(
    extractionEngine: DependencyExtractionEngine,
    parserIntegration: MultiLanguageParserIntegration,
    config: Partial<AdvancedWatcherConfig> = {}
  ) {
    super();
    this.extractionEngine = extractionEngine;
    this.parserIntegration = parserIntegration;
    this.db = new Database(':memory:'); // 실시간 상태 추적용

    // Use factory function for consistent defaults
    this.config = createWatcherConfig(process.cwd(), config);

    this.stats = {
      totalWatches: 0,
      activeWatchers: 0,
      filesProcessed: 0,
      updatesPerformed: 0,
      errorsEncountered: 0,
      averageUpdateTime: 0,
      lastUpdateTime: new Date().toISOString(),
      queuedUpdates: 0
    };

    this.initializeDatabase();
  }

  /**
   * 실시간 상태 추적 데이터베이스 초기화
   */
  private initializeDatabase(): void {
    // 파일 변경 이벤트 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_changes (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('created', 'modified', 'deleted', 'renamed')),
        timestamp TEXT NOT NULL,
        old_path TEXT,
        size INTEGER,
        hash TEXT,
        processed BOOLEAN DEFAULT FALSE,
        processing_time INTEGER,
        error TEXT
      )
    `);

    // 배치 업데이트 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS batch_updates (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        file_count INTEGER DEFAULT 0,
        updates_count INTEGER DEFAULT 0,
        errors_count INTEGER DEFAULT 0
      )
    `);

    // 종속성 충돌 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependency_conflicts (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        description TEXT NOT NULL,
        detected_at TEXT DEFAULT (datetime('now')),
        resolved BOOLEAN DEFAULT FALSE,
        resolution_strategy TEXT
      )
    `);

    // 인덱스 생성
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes (file_path);
      CREATE INDEX IF NOT EXISTS idx_file_changes_timestamp ON file_changes (timestamp);
      CREATE INDEX IF NOT EXISTS idx_file_changes_processed ON file_changes (processed);
      CREATE INDEX IF NOT EXISTS idx_batch_updates_status ON batch_updates (status);
      CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON dependency_conflicts (resolved);
    `);

    console.log('🔄 Real-time dependency updater database initialized');
  }

  /**
   * 실시간 감시 시작
   */
  async startWatching(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️ Watcher is already active');
      return;
    }

    console.log(`🔍 Starting real-time dependency watching for: ${this.config.rootPath}`);
    
    try {
      await this.setupFileWatchers();
      this.isActive = true;
      
      // 배치 처리 타이머 시작
      if (this.config.enableBatching) {
        this.startBatchProcessing();
      }

      this.emit('watcherStarted', {
        rootPath: this.config.rootPath,
        watchersCount: this.watchers.size
      });

      console.log(`✅ Real-time dependency watching started with ${this.watchers.size} watchers`);

    } catch (error) {
      console.error('❌ Failed to start dependency watcher:', error);
      throw error;
    }
  }

  /**
   * 파일 감시자 설정
   */
  private async setupFileWatchers(): Promise<void> {
    const rootPath = resolve(this.config.rootPath);
    
    // 루트 디렉토리 감시
    const rootWatcher = watch(rootPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const filePath = resolve(rootPath, filename);
      const relativePath = relative(rootPath, filePath);

      // 제외 패턴 확인
      if (this.shouldExcludeFile(relativePath)) {
        return;
      }

      // 포함 패턴 확인
      if (!this.shouldIncludeFile(relativePath)) {
        return;
      }

      this.handleFileChange(eventType, filePath);
    });

    this.watchers.set(rootPath, rootWatcher);
    this.stats.totalWatches++;
    this.stats.activeWatchers++;

    console.log(`📁 Watching directory: ${rootPath}`);
  }

  /**
   * 파일 포함 여부 확인
   */
  private shouldIncludeFile(filePath: string): boolean {
    // 간단한 glob 패턴 매칭 (실제로는 minimatch 등을 사용)
    for (const pattern of this.config.includePatterns) {
      const regex = this.globToRegex(pattern);
      if (regex.test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 파일 제외 여부 확인
   */
  private shouldExcludeFile(filePath: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      const regex = this.globToRegex(pattern);
      if (regex.test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 간단한 glob to regex 변환
   */
  private globToRegex(pattern: string): RegExp {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.');
    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * 파일 변경 처리
   */
  private handleFileChange(eventType: string, filePath: string): void {
    const changeEvent: FileChangeEvent = {
      type: this.mapEventType(eventType),
      filePath,
      timestamp: new Date().toISOString()
    };

    // 파일 정보 추가
    if (existsSync(filePath) && changeEvent.type !== 'deleted') {
      try {
        const stats = statSync(filePath);
        changeEvent.size = stats.size;

        const content = readFileSync(filePath, 'utf-8');
        changeEvent.hash = crypto.createHash('md5').update(content).digest('hex');
      } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}:`, error);
      }
    }

    // 디바운스 처리
    this.debounceFileUpdate(filePath, changeEvent);
  }

  /**
   * 이벤트 타입 매핑
   */
  private mapEventType(eventType: string): FileChangeEvent['type'] {
    switch (eventType) {
      case 'change':
        return 'modified';
      case 'rename':
        return existsSync ? 'created' : 'deleted';
      default:
        return 'modified';
    }
  }

  /**
   * 디바운스된 파일 업데이트
   */
  private debounceFileUpdate(filePath: string, changeEvent: FileChangeEvent): void {
    // 기존 타이머 클리어
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 새 타이머 설정
    const timer = setTimeout(() => {
      this.queueFileUpdate(filePath, changeEvent);
      this.debounceTimers.delete(filePath);
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * 파일 업데이트 큐에 추가
   */
  private queueFileUpdate(filePath: string, changeEvent: FileChangeEvent): void {
    this.updateQueue.set(filePath, changeEvent);
    this.stats.queuedUpdates = this.updateQueue.size;

    // 배치 처리 활성화된 경우
    if (this.config.enableBatching) {
      this.batchQueue.add(filePath);
    } else {
      // 즉시 처리
      this.processFileUpdate(filePath, changeEvent);
    }

    this.emit('fileQueued', { filePath, changeEvent });
  }

  /**
   * 배치 처리 시작
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.size > 0) {
        this.processBatch();
      }
    }, this.config.batchIntervalMs);
  }

  /**
   * 배치 처리
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.size === 0) return;

    const batchId = this.generateBatchId();
    const filesToProcess = Array.from(this.batchQueue);
    
    console.log(`📦 Processing batch ${batchId} with ${filesToProcess.length} files`);

    // 배치 기록 생성
    const batchUpdate: BatchUpdate = {
      id: batchId,
      files: filesToProcess,
      startTime: new Date().toISOString(),
      status: 'processing',
      updates: [],
      errors: []
    };

    this.saveBatchRecord(batchUpdate);

    // 파일들을 병렬로 처리 (동시 처리 수 제한)
    const concurrentLimit = this.config.maxConcurrentUpdates;
    const batches = this.chunkArray(filesToProcess, concurrentLimit);

    try {
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (filePath) => {
            const changeEvent = this.updateQueue.get(filePath);
            if (changeEvent) {
              try {
                const updateEvent = await this.processFileUpdate(filePath, changeEvent);
                batchUpdate.updates.push(updateEvent);
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                batchUpdate.errors.push(`${filePath}: ${errorMsg}`);
                this.stats.errorsEncountered++;
              }
            }
          })
        );
      }

      batchUpdate.status = 'completed';
      batchUpdate.endTime = new Date().toISOString();

    } catch (error) {
      batchUpdate.status = 'failed';
      batchUpdate.endTime = new Date().toISOString();
      batchUpdate.errors.push(`Batch processing failed: ${error}`);
    }

    // 배치 정리
    this.batchQueue.clear();
    for (const filePath of filesToProcess) {
      this.updateQueue.delete(filePath);
      this.processingQueue.delete(filePath);
    }

    this.updateBatchRecord(batchUpdate);
    this.stats.queuedUpdates = this.updateQueue.size;

    this.emit('batchCompleted', batchUpdate);
  }

  /**
   * 개별 파일 업데이트 처리
   */
  private async processFileUpdate(filePath: string, changeEvent: FileChangeEvent): Promise<DependencyUpdateEvent> {
    const startTime = Date.now();
    
    this.processingQueue.add(filePath);
    
    try {
      // 변경 이벤트 저장
      this.saveFileChangeEvent(changeEvent);

      let updateEvent: DependencyUpdateEvent;

      switch (changeEvent.type) {
        case 'created':
        case 'modified':
          updateEvent = await this.handleFileCreateOrUpdate(filePath, changeEvent);
          break;
        case 'deleted':
          updateEvent = await this.handleFileDelete(filePath, changeEvent);
          break;
        case 'renamed':
          updateEvent = await this.handleFileRename(filePath, changeEvent);
          break;
        default:
          throw new Error(`Unknown change type: ${changeEvent.type}`);
      }

      updateEvent.updateTime = Date.now() - startTime;
      updateEvent.success = true;

      // 통계 업데이트
      this.stats.filesProcessed++;
      this.stats.updatesPerformed++;
      this.stats.averageUpdateTime = 
        (this.stats.averageUpdateTime * (this.stats.updatesPerformed - 1) + updateEvent.updateTime) / this.stats.updatesPerformed;
      this.stats.lastUpdateTime = new Date().toISOString();

      // 처리 완료 마킹
      this.markFileChangeProcessed(changeEvent, updateEvent.updateTime);

      this.emit('fileUpdated', updateEvent);
      return updateEvent;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const updateEvent: DependencyUpdateEvent = {
        filePath,
        changeType: 'content',
        impactedFiles: [],
        updateTime: Date.now() - startTime,
        success: false,
        error: errorMsg
      };

      // 에러 기록
      this.markFileChangeProcessed(changeEvent, updateEvent.updateTime, errorMsg);
      this.stats.errorsEncountered++;

      this.emit('updateError', { filePath, error: errorMsg });
      return updateEvent;

    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  /**
   * 파일 생성/수정 처리
   */
  private async handleFileCreateOrUpdate(filePath: string, changeEvent: FileChangeEvent): Promise<DependencyUpdateEvent> {
    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // 파일 분석
    const analysis = await this.parserIntegration.analyzeFile(filePath);
    
    // 기존 종속성 그래프에서 이 파일의 이전 종속성들 조회
    const dependencyGraph = this.extractionEngine.getDependencyGraph();
    const nodeId = this.generateNodeId(filePath);
    const existingNode = dependencyGraph.nodes.get(nodeId);

    // 영향받는 파일들 식별
    const impactedFiles = this.extractionEngine.getImpactAnalysis(filePath);

    // 종속성 변경 타입 결정
    const changeType = this.determineChangeType(existingNode, analysis);

    // 종속성 그래프 업데이트
    await this.updateDependencyGraph(filePath, analysis);

    // 충돌 감지 및 해결
    if (this.config.autoResolveConflicts) {
      await this.detectAndResolveConflicts(filePath, analysis);
    }

    return {
      filePath,
      changeType,
      impactedFiles,
      updateTime: 0, // 나중에 설정됨
      success: true
    };
  }

  /**
   * 파일 삭제 처리
   */
  private async handleFileDelete(filePath: string, changeEvent: FileChangeEvent): Promise<DependencyUpdateEvent> {
    const dependencyGraph = this.extractionEngine.getDependencyGraph();
    const nodeId = this.generateNodeId(filePath);
    const existingNode = dependencyGraph.nodes.get(nodeId);

    if (!existingNode) {
      return {
        filePath,
        changeType: 'content',
        impactedFiles: [],
        updateTime: 0,
        success: true
      };
    }

    // 이 파일에 의존하는 파일들 찾기
    const dependentFiles = existingNode.dependents.map(depId => {
      const depNode = dependencyGraph.nodes.get(depId);
      return depNode ? depNode.filePath : null;
    }).filter(path => path !== null) as string[];

    // 노드 제거
    dependencyGraph.nodes.delete(nodeId);

    // 관련 엣지들 제거
    const edgesToRemove = Array.from(dependencyGraph.edges.values()).filter(
      edge => edge.sourceId === nodeId || edge.targetId === nodeId
    );

    for (const edge of edgesToRemove) {
      dependencyGraph.edges.delete(edge.id);
    }

    // 종속성 충돌 기록
    if (dependentFiles.length > 0) {
      await this.recordDependencyConflict(filePath, 'missing_dependency', 
        `File deleted but still referenced by ${dependentFiles.length} files`);
    }

    return {
      filePath,
      changeType: 'structure',
      impactedFiles: dependentFiles,
      updateTime: 0,
      success: true
    };
  }

  /**
   * 파일 이름 변경 처리
   */
  private async handleFileRename(filePath: string, changeEvent: FileChangeEvent): Promise<DependencyUpdateEvent> {
    const oldPath = changeEvent.oldPath;
    if (!oldPath) {
      // 단순 생성으로 처리
      return this.handleFileCreateOrUpdate(filePath, changeEvent);
    }

    // 이전 파일 삭제 처리
    const deleteEvent = await this.handleFileDelete(oldPath, {
      ...changeEvent,
      type: 'deleted',
      filePath: oldPath
    });

    // 새 파일 생성 처리
    const createEvent = await this.handleFileCreateOrUpdate(filePath, changeEvent);

    // 영향받는 파일들 합치기
    const allImpactedFiles = [...new Set([...deleteEvent.impactedFiles, ...createEvent.impactedFiles])];

    return {
      filePath,
      changeType: 'structure',
      impactedFiles: allImpactedFiles,
      updateTime: 0,
      success: true
    };
  }

  /**
   * 변경 타입 결정
   */
  private determineChangeType(
    existingNode: DependencyNode | undefined, 
    analysis: FileAnalysisResult | FallbackAnalysisResult
  ): DependencyUpdateEvent['changeType'] {
    if (!existingNode) {
      return 'structure'; // 새 파일
    }

    // 종속성 변경 확인
    const newDependencies = new Set(analysis.dependencies.map(d => d.source));
    const oldDependencies = new Set(existingNode.dependencies);

    if (!this.setsEqual(newDependencies, oldDependencies)) {
      return 'dependencies';
    }

    // Export 변경 확인 (FileAnalysisResult인 경우)
    if ('exports' in analysis) {
      const newExports = new Set(analysis.exports.map(e => e.name));
      const hasExportChanges = newExports.size !== (existingNode.analysis?.exports?.length || 0);
      
      if (hasExportChanges) {
        return 'exports';
      }
    }

    // 기본적으로 내용 변경
    return 'content';
  }

  /**
   * Set 동등성 확인
   */
  private setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
    return set1.size === set2.size && Array.from(set1).every(item => set2.has(item));
  }

  /**
   * 종속성 그래프 업데이트
   */
  private async updateDependencyGraph(
    filePath: string, 
    analysis: FileAnalysisResult | FallbackAnalysisResult
  ): Promise<void> {
    // 기존 종속성 추출 엔진의 processFile 로직을 재사용
    // 실제로는 extractionEngine의 내부 메서드를 호출하거나 
    // 유사한 로직을 구현해야 함
    console.log(`🔄 Updating dependency graph for: ${filePath}`);
  }

  /**
   * 충돌 감지 및 해결
   */
  private async detectAndResolveConflicts(
    filePath: string,
    analysis: FileAnalysisResult | FallbackAnalysisResult
  ): Promise<void> {
    // 종속성 충돌 감지 로직
    const dependencyGraph = this.extractionEngine.getDependencyGraph();
    
    for (const dep of analysis.dependencies) {
      if (dep.isLocal) {
        const resolvedPath = this.resolveDependencyPath(filePath, dep.source);
        if (!resolvedPath || !existsSync(resolvedPath)) {
          await this.recordDependencyConflict(
            filePath,
            'broken_dependency',
            `Cannot resolve dependency: ${dep.source}`
          );
        }
      }
    }
  }

  /**
   * 종속성 경로 해결
   */
  private resolveDependencyPath(currentFile: string, dependencySource: string): string | null {
    if (!dependencySource.startsWith('.')) return null;

    const currentDir = dirname(currentFile);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp'];
    
    for (const ext of extensions) {
      const candidatePath = resolve(currentDir, dependencySource + ext);
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    return null;
  }

  /**
   * 종속성 충돌 기록
   */
  private async recordDependencyConflict(
    filePath: string,
    conflictType: string,
    description: string
  ): Promise<void> {
    const conflictId = crypto.createHash('md5')
      .update(`${filePath}_${conflictType}_${description}`)
      .digest('hex').substring(0, 16);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dependency_conflicts 
      (id, file_path, conflict_type, description) 
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(conflictId, filePath, conflictType, description);

    this.emit('conflictDetected', {
      filePath,
      conflictType,
      description
    });
  }

  /**
   * 파일 변경 이벤트 저장
   */
  private saveFileChangeEvent(changeEvent: FileChangeEvent): void {
    const eventId = crypto.createHash('md5')
      .update(`${changeEvent.filePath}_${changeEvent.timestamp}`)
      .digest('hex').substring(0, 16);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_changes 
      (id, file_path, change_type, timestamp, old_path, size, hash) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventId,
      changeEvent.filePath,
      changeEvent.type,
      changeEvent.timestamp,
      changeEvent.oldPath || null,
      changeEvent.size || null,
      changeEvent.hash || null
    );
  }

  /**
   * 파일 변경 처리 완료 마킹
   */
  private markFileChangeProcessed(
    changeEvent: FileChangeEvent,
    processingTime: number,
    error?: string
  ): void {
    const stmt = this.db.prepare(`
      UPDATE file_changes 
      SET processed = TRUE, processing_time = ?, error = ?
      WHERE file_path = ? AND timestamp = ?
    `);

    stmt.run(processingTime, error || null, changeEvent.filePath, changeEvent.timestamp);
  }

  /**
   * 배치 기록 저장
   */
  private saveBatchRecord(batch: BatchUpdate): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO batch_updates 
      (id, start_time, status, file_count) 
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(batch.id, batch.startTime, batch.status, batch.files.length);
  }

  /**
   * 배치 기록 업데이트
   */
  private updateBatchRecord(batch: BatchUpdate): void {
    const stmt = this.db.prepare(`
      UPDATE batch_updates 
      SET end_time = ?, status = ?, updates_count = ?, errors_count = ?
      WHERE id = ?
    `);

    stmt.run(
      batch.endTime,
      batch.status,
      batch.updates.length,
      batch.errors.length,
      batch.id
    );
  }

  /**
   * 감시 중지
   */
  async stopWatching(): Promise<void> {
    if (!this.isActive) {
      console.log('⚠️ Watcher is not active');
      return;
    }

    console.log('🛑 Stopping real-time dependency watching...');

    // 모든 감시자 해제
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      console.log(`📁 Stopped watching: ${path}`);
    }

    this.watchers.clear();
    
    // 타이머들 정리
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // 큐 정리
    this.updateQueue.clear();
    this.batchQueue.clear();
    this.processingQueue.clear();

    this.isActive = false;
    this.stats.activeWatchers = 0;

    this.emit('watcherStopped');
    console.log('✅ Real-time dependency watching stopped');
  }

  /**
   * 통계 조회
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * 처리 대기 중인 업데이트들 조회
   */
  getPendingUpdates(): FileChangeEvent[] {
    return Array.from(this.updateQueue.values());
  }

  /**
   * 현재 처리 중인 파일들 조회
   */
  getProcessingFiles(): string[] {
    return Array.from(this.processingQueue);
  }

  /**
   * 최근 충돌들 조회
   */
  getRecentConflicts(limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM dependency_conflicts 
      WHERE resolved = FALSE 
      ORDER BY detected_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit) as any[];
  }

  /**
   * 배치 히스토리 조회
   */
  getBatchHistory(limit: number = 20): BatchUpdate[] {
    const stmt = this.db.prepare(`
      SELECT * FROM batch_updates 
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    
    const records = stmt.all(limit) as any[];
    return records.map(record => ({
      id: record.id,
      files: [], // 실제로는 별도 테이블에서 조회
      startTime: record.start_time,
      endTime: record.end_time,
      status: record.status,
      updates: [], // 실제로는 별도 테이블에서 조회
      errors: []
    }));
  }

  /**
   * 수동 파일 업데이트 트리거
   */
  async triggerUpdate(filePath: string): Promise<DependencyUpdateEvent> {
    if (!existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const changeEvent: FileChangeEvent = {
      type: 'modified',
      filePath,
      timestamp: new Date().toISOString()
    };

    return this.processFileUpdate(filePath, changeEvent);
  }

  /**
   * 유틸리티 메서드들
   */
  private generateBatchId(): string {
    return crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
  }

  private generateNodeId(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 정리
   */
  cleanup(): void {
    this.stopWatching();
    this.db.close();
    this.removeAllListeners();
  }
}