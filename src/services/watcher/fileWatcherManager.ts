/**
 * 실시간 파일 변경 감지 및 동기화 관리자
 * Real-time File Change Detection and Sync Manager
 */

import { watch, FSWatcher, WatchOptions } from 'chokidar';
import { EventEmitter } from 'events';
import { analysisWorkflowManager, WorkflowOptions } from '../workflow/analysisWorkflowManager';
import { parserFactory } from '../parsers';
import { debounce } from 'lodash';
import path from 'path';
import {
  BaseWatcherConfig,
  FileChangeEvent,
  ProcessingQueue,
  WatcherStats,
  createSimpleWatcherConfig
} from '../../shared/types/watcher.js';

// Extend base config with chokidar-specific options
export interface ChokidarWatcherConfig extends BaseWatcherConfig {
  ignored?: string | string[];
  awaitWriteFinish?: {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
  atomic?: boolean;
}

export class FileWatcherManager extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private config: ChokidarWatcherConfig;
  private processingQueue: Map<string, ProcessingQueue> = new Map();
  private isProcessing = false;
  private stats: WatcherStats;
  private debouncedProcessFile: { [key: string]: () => void } = {};
  private workflowOptions: WorkflowOptions;

  // 디바운스 시간 설정
  private readonly DEBOUNCE_DELAY = 500; // ms
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 2000; // ms

  constructor(config: ChokidarWatcherConfig, workflowOptions: WorkflowOptions = {}) {
    super();
    // Use factory function for consistent defaults
    const baseConfig = createSimpleWatcherConfig(config.paths, config);
    this.config = {
      ...baseConfig,
      ignored: config.ignored,
      awaitWriteFinish: config.awaitWriteFinish || {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      atomic: config.atomic ?? true
    } as ChokidarWatcherConfig;
    
    this.workflowOptions = workflowOptions;
    
    this.stats = {
      totalEvents: 0,
      eventsByType: {},
      filesProcessed: 0,
      filesSkipped: 0,
      processingErrors: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      isRunning: false,
      watchedPaths: [...this.config.paths]
    };

    this.setupEventHandlers();
  }

  /**
   * 파일 감시 시작
   */
  async startWatching(): Promise<void> {
    if (this.watcher) {
      throw new Error('Watcher is already running');
    }

    const watchOptions: WatchOptions = {
      ignored: this.config.ignored || [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.nuxt/**',
        '**/coverage/**'
      ],
      persistent: this.config.persistent,
      ignoreInitial: this.config.ignoreInitial,
      followSymlinks: this.config.followSymlinks,
      cwd: this.config.cwd,
      depth: this.config.depth,
      awaitWriteFinish: this.config.awaitWriteFinish,
      ignorePermissionErrors: this.config.ignorePermissionErrors,
      atomic: this.config.atomic
    };

    this.watcher = watch(this.config.paths, watchOptions);

    this.watcher
      .on('add', (filePath, stats) => this.handleFileEvent('add', filePath, stats))
      .on('change', (filePath, stats) => this.handleFileEvent('change', filePath, stats))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('addDir', (dirPath, stats) => this.handleFileEvent('addDir', dirPath, stats))
      .on('unlinkDir', (dirPath) => this.handleFileEvent('unlinkDir', dirPath))
      .on('error', (error) => this.handleWatcherError(error))
      .on('ready', () => this.handleWatcherReady());

    this.stats.isRunning = true;
    this.emit('started');
  }

  /**
   * 파일 감시 중지
   */
  async stopWatching(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    await this.watcher.close();
    this.watcher = null;
    this.stats.isRunning = false;

    // 디바운스된 함수들 정리
    this.debouncedProcessFile = {};

    // 큐 정리
    this.processingQueue.clear();

    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addPath(pathToAdd: string): void {
    if (!this.watcher) {
      throw new Error('Watcher is not running');
    }

    this.watcher.add(pathToAdd);
    this.config.paths.push(pathToAdd);
    this.stats.watchedPaths.push(pathToAdd);
    this.emit('pathAdded', pathToAdd);
  }

  /**
   * 감시 경로 제거
   */
  removePath(pathToRemove: string): void {
    if (!this.watcher) {
      throw new Error('Watcher is not running');
    }

    this.watcher.unwatch(pathToRemove);
    this.config.paths = this.config.paths.filter(p => p !== pathToRemove);
    this.stats.watchedPaths = this.stats.watchedPaths.filter(p => p !== pathToRemove);
    this.emit('pathRemoved', pathToRemove);
  }

  /**
   * 파일 이벤트 처리
   */
  private handleFileEvent(eventType: FileChangeEvent['type'], filePath: string, stats?: any): void {
    // 지원되는 파일 타입인지 확인
    if (eventType === 'add' || eventType === 'change') {
      const language = parserFactory.detectLanguage(filePath);
      if (!language) {
        return; // 지원하지 않는 파일 타입은 무시
      }
    }

    const event: FileChangeEvent = {
      type: eventType,
      filePath: path.resolve(filePath),
      stats,
      timestamp: Date.now()
    };

    this.stats.totalEvents++;
    this.stats.eventsByType[eventType] = (this.stats.eventsByType[eventType] || 0) + 1;

    this.emit('fileEvent', event);

    // 파일 삭제 이벤트 처리
    if (eventType === 'unlink') {
      this.handleFileDeleted(filePath);
      return;
    }

    // 디렉토리 이벤트는 무시
    if (eventType === 'addDir' || eventType === 'unlinkDir') {
      return;
    }

    // 디바운스된 처리 함수 설정
    if (!this.debouncedProcessFile[filePath]) {
      this.debouncedProcessFile[filePath] = debounce(
        () => this.queueFileForProcessing(event),
        this.DEBOUNCE_DELAY
      );
    }

    this.debouncedProcessFile[filePath]();
  }

  /**
   * 파일 처리 큐에 추가
   */
  private queueFileForProcessing(event: FileChangeEvent): void {
    const queueItem: ProcessingQueue = {
      filePath: event.filePath,
      event,
      retryCount: 0,
      scheduledTime: Date.now()
    };

    this.processingQueue.set(event.filePath, queueItem);
    this.stats.queueSize = this.processingQueue.size;
    
    this.emit('fileQueued', event);
    this.processQueue();
  }

  /**
   * 처리 큐 실행
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const queueItems = Array.from(this.processingQueue.values());
      
      for (const item of queueItems) {
        await this.processQueueItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 큐 아이템 처리
   */
  private async processQueueItem(item: ProcessingQueue): Promise<void> {
    try {
      const startTime = Date.now();
      
      this.emit('fileProcessingStarted', item.event);

      const result = await analysisWorkflowManager.processFile(
        item.filePath,
        this.workflowOptions
      );

      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        this.stats.filesProcessed++;
        this.stats.lastProcessedFile = item.filePath;
        this.stats.lastProcessedTime = Date.now();
        
        // 평균 처리 시간 업데이트
        this.updateAverageProcessingTime(processingTime);
        
        this.emit('fileProcessed', {
          event: item.event,
          result,
          processingTime
        });
      } else {
        if (result.wasSkipped) {
          this.stats.filesSkipped++;
          this.emit('fileSkipped', {
            event: item.event,
            reason: result.skipReason,
            result
          });
        } else {
          // 재시도 로직
          if (item.retryCount < this.MAX_RETRY_COUNT) {
            item.retryCount++;
            item.scheduledTime = Date.now() + this.RETRY_DELAY;
            
            setTimeout(() => {
              this.processQueueItem(item);
            }, this.RETRY_DELAY);
            
            this.emit('fileRetry', {
              event: item.event,
              retryCount: item.retryCount,
              error: result.error
            });
            return;
          } else {
            this.stats.processingErrors++;
            this.emit('fileProcessingFailed', {
              event: item.event,
              error: result.error,
              result
            });
          }
        }
      }

      // 큐에서 제거
      this.processingQueue.delete(item.filePath);
      this.stats.queueSize = this.processingQueue.size;

    } catch (error) {
      this.stats.processingErrors++;
      this.emit('fileProcessingError', {
        event: item.event,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 큐에서 제거
      this.processingQueue.delete(item.filePath);
      this.stats.queueSize = this.processingQueue.size;
    }
  }

  /**
   * 파일 삭제 처리
   */
  private async handleFileDeleted(filePath: string): Promise<void> {
    try {
      // 처리 큐에서 제거
      if (this.processingQueue.has(filePath)) {
        this.processingQueue.delete(filePath);
        this.stats.queueSize = this.processingQueue.size;
      }

      // 디바운스된 함수 제거
      if (this.debouncedProcessFile[filePath]) {
        delete this.debouncedProcessFile[filePath];
      }

      // 인덱스에서 파일 정보 제거 (선택적)
      // 실제 구현에서는 analysisIndexManager에 deleteFile 메서드 추가 필요

      this.emit('fileDeleted', { filePath, timestamp: Date.now() });
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * 평균 처리 시간 업데이트
   */
  private updateAverageProcessingTime(newTime: number): void {
    if (this.stats.filesProcessed === 1) {
      this.stats.averageProcessingTime = newTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.filesProcessed - 1) + newTime) / 
        this.stats.filesProcessed;
    }
  }

  /**
   * 감시자 에러 처리
   */
  private handleWatcherError(error: Error): void {
    this.emit('watcherError', error);
  }

  /**
   * 감시자 준비 완료 처리
   */
  private handleWatcherReady(): void {
    this.emit('watcherReady', {
      watchedPaths: this.stats.watchedPaths,
      totalWatchedFiles: this.watcher?.getWatched ? 
        Object.values(this.watcher.getWatched()).flat().length : 0
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.on('fileProcessed', (data) => {
      console.log(`✓ Processed: ${data.event.filePath} (${data.processingTime}ms)`);
    });

    this.on('fileSkipped', (data) => {
      console.log(`⚠ Skipped: ${data.event.filePath} - ${data.reason}`);
    });

    this.on('fileProcessingFailed', (data) => {
      console.error(`✗ Failed: ${data.event.filePath} - ${data.error}`);
    });

    this.on('watcherError', (error) => {
      console.error('Watcher error:', error);
    });
  }

  /**
   * 통계 정보 조회
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * 통계 리셋
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      eventsByType: {},
      filesProcessed: 0,
      filesSkipped: 0,
      processingErrors: 0,
      averageProcessingTime: 0,
      queueSize: this.processingQueue.size,
      isRunning: this.stats.isRunning,
      watchedPaths: [...this.config.paths]
    };
  }

  /**
   * 감시 중인 파일 목록 조회
   */
  getWatchedFiles(): { [dir: string]: string[] } {
    if (!this.watcher) {
      return {};
    }
    return this.watcher.getWatched ? this.watcher.getWatched() : {};
  }

  /**
   * 강제 처리
   */
  async forceProcessFile(filePath: string): Promise<void> {
    const event: FileChangeEvent = {
      type: 'change',
      filePath: path.resolve(filePath),
      timestamp: Date.now()
    };

    await this.queueFileForProcessing(event);
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): {
    size: number;
    items: { filePath: string; retryCount: number; scheduledTime: number }[]
  } {
    return {
      size: this.processingQueue.size,
      items: Array.from(this.processingQueue.values()).map(item => ({
        filePath: item.filePath,
        retryCount: item.retryCount,
        scheduledTime: item.scheduledTime
      }))
    };
  }
}

// 팩토리 함수
export function createFileWatcher(
  config: ChokidarWatcherConfig, 
  workflowOptions?: WorkflowOptions
): FileWatcherManager {
  return new FileWatcherManager(config, workflowOptions);
}