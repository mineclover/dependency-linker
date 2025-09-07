/**
 * 코드 분석 서비스 - 전체 플로우 통합
 * Code Analysis Service - Complete Flow Integration
 */

import { EventEmitter } from 'events';
import { analysisWorkflowManager, WorkflowOptions, BatchWorkflowResult } from './workflow/analysisWorkflowManager';
import { FileWatcherManager, ChokidarWatcherConfig, createFileWatcher } from './watcher/fileWatcherManager';
import { analysisIndexManager } from './analysis/analysisIndexManager';
import { parserFactory } from './parsers';
import type { ProcessedConfig } from '../domain/interfaces/index.js';
import type { INotionClient } from '../domain/interfaces/INotionClient.js';

export interface ServiceConfig extends ProcessedConfig {
  // 감시 설정
  watcher?: {
    enabled: boolean;
    paths: string[];
    config?: Partial<ChokidarWatcherConfig>;
  };
  
  // 워크플로우 설정
  workflow?: WorkflowOptions;
  
  // 인덱스 설정
  indexPath?: string;
  
  // Notion 설정
  notion?: {
    enabled: boolean;
    autoSync?: boolean;
  };
  
  // 기본 옵션
  autoStart?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ServiceStatus {
  isRunning: boolean;
  watcherStatus: {
    isActive: boolean;
    watchedPaths: string[];
    queueSize: number;
  };
  indexStatus: {
    totalFiles: number;
    lastUpdate?: Date;
  };
  notionStatus: {
    enabled: boolean;
    lastSync?: Date;
  };
  statistics: {
    totalAnalyzed: number;
    totalErrors: number;
    averageProcessingTime: number;
  };
}

export class CodeAnalysisService extends EventEmitter {
  private config: ServiceConfig;
  private watcher: FileWatcherManager | null = null;
  private notionClient: INotionClient | null = null;
  private isRunning = false;
  private startTime: number = 0;

  constructor(
    config: ServiceConfig,
    notionClient?: INotionClient
  ) {
    super();
    this.notionClient = notionClient || null;
    
    this.config = {
      autoStart: false,
      logLevel: 'info',
      workflow: {
        forceReanalysis: false,
        skipNotionUpload: false,
        batchSize: 10,
        parallel: true
      },
      notion: {
        enabled: true,
        autoSync: true
      },
      ...config
    };

    this.setupEventHandlers();
    
    if (this.config.autoStart) {
      this.start().catch(error => {
        this.emit('error', error);
      });
    }
  }

  /**
   * 서비스 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Service is already running');
    }

    this.startTime = Date.now();
    this.log('info', 'Starting Code Analysis Service...');

    try {
      // 1. Notion 데이터베이스 캐시 초기화
      if (this.config.notion?.enabled && this.notionClient) {
        this.log('info', 'Initializing Notion databases...');
        // Notion 클라이언트가 주입된 경우에만 초기화
        // await this.notionClient.initializeDatabases();
        this.log('info', 'Notion client available for operations');
      } else if (this.config.notion?.enabled) {
        this.log('warning', 'Notion enabled but no client provided - skipping Notion operations');
      }

      // 2. 파일 감시자 시작
      if (this.config.watcher?.enabled && this.config.watcher.paths.length > 0) {
        this.log('info', 'Starting file watcher...');
        await this.startFileWatcher();
      }

      this.isRunning = true;
      this.emit('started', { startTime: new Date(this.startTime) });
      this.log('info', 'Code Analysis Service started successfully');

    } catch (error) {
      this.log('error', 'Failed to start service:', error);
      throw error;
    }
  }

  /**
   * 서비스 중지
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('info', 'Stopping Code Analysis Service...');

    try {
      // 파일 감시자 중지
      if (this.watcher) {
        await this.watcher.stopWatching();
        this.watcher = null;
      }

      // 데이터베이스 연결 정리
      analysisIndexManager.close();

      this.isRunning = false;
      const uptime = Date.now() - this.startTime;
      
      this.emit('stopped', { 
        stopTime: new Date(), 
        uptime 
      });
      
      this.log('info', `Service stopped (uptime: ${uptime}ms)`);

    } catch (error) {
      this.log('error', 'Error stopping service:', error);
      throw error;
    }
  }

  /**
   * 단일 파일 분석
   */
  async analyzeFile(filePath: string, options?: WorkflowOptions): Promise<any> {
    const mergedOptions = { ...this.config.workflow, ...options };
    return analysisWorkflowManager.processFile(filePath, mergedOptions);
  }

  /**
   * 배치 파일 분석
   */
  async analyzeBatch(filePaths: string[], options?: WorkflowOptions): Promise<BatchWorkflowResult> {
    const mergedOptions = { ...this.config.workflow, ...options };
    return analysisWorkflowManager.processBatch(filePaths, mergedOptions);
  }

  /**
   * 디렉토리 분석
   */
  async analyzeDirectory(
    dirPath: string, 
    recursive: boolean = true,
    options?: WorkflowOptions
  ): Promise<BatchWorkflowResult> {
    const mergedOptions = { ...this.config.workflow, ...options };
    return analysisWorkflowManager.processDirectory(dirPath, mergedOptions, recursive);
  }

  /**
   * 프로젝트 전체 분석
   */
  async analyzeProject(): Promise<BatchWorkflowResult> {
    if (!this.config.watcher?.paths.length) {
      throw new Error('No watch paths configured for project analysis');
    }

    this.log('info', 'Starting full project analysis...');
    
    const results = await Promise.all(
      this.config.watcher.paths.map(path => 
        this.analyzeDirectory(path, true, { 
          ...this.config.workflow,
          forceReanalysis: true 
        })
      )
    );

    // 결과 병합
    const mergedResult: BatchWorkflowResult = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      results: [],
      totalTime: 0,
      averageTimePerFile: 0
    };

    for (const result of results) {
      mergedResult.totalFiles += result.totalFiles;
      mergedResult.processedFiles += result.processedFiles;
      mergedResult.skippedFiles += result.skippedFiles;
      mergedResult.successfulFiles += result.successfulFiles;
      mergedResult.failedFiles += result.failedFiles;
      mergedResult.results.push(...result.results);
      mergedResult.totalTime += result.totalTime;
    }

    mergedResult.averageTimePerFile = mergedResult.totalTime / mergedResult.processedFiles;

    this.emit('projectAnalysisCompleted', mergedResult);
    return mergedResult;
  }

  /**
   * 인덱스와 Notion 동기화
   */
  async syncWithNotion(): Promise<void> {
    if (!this.config.notion?.enabled) {
      throw new Error('Notion integration is disabled');
    }

    this.log('info', 'Starting Notion synchronization...');
    await analysisWorkflowManager.syncIndexWithNotion();
    this.emit('notionSyncCompleted');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(path: string): void {
    if (!this.watcher) {
      throw new Error('File watcher is not active');
    }

    this.watcher.addPath(path);
    if (this.config.watcher) {
      this.config.watcher.paths.push(path);
    }
  }

  /**
   * 감시 경로 제거
   */
  removeWatchPath(path: string): void {
    if (!this.watcher) {
      throw new Error('File watcher is not active');
    }

    this.watcher.removePath(path);
    if (this.config.watcher) {
      this.config.watcher.paths = this.config.watcher.paths.filter(p => p !== path);
    }
  }

  /**
   * 서비스 상태 조회
   */
  getStatus(): ServiceStatus {
    const watcherStats = this.watcher?.getStats();
    const indexStats = analysisIndexManager.getStatistics();
    const workflowStats = analysisWorkflowManager.getStatistics();

    return {
      isRunning: this.isRunning,
      watcherStatus: {
        isActive: watcherStats?.isRunning || false,
        watchedPaths: watcherStats?.watchedPaths || [],
        queueSize: watcherStats?.queueSize || 0
      },
      indexStatus: {
        totalFiles: indexStats.totalFiles.count,
        lastUpdate: undefined // TODO: 인덱스에서 마지막 업데이트 시간 가져오기
      },
      notionStatus: {
        enabled: this.config.notion?.enabled || false,
        lastSync: undefined // TODO: 마지막 동기화 시간 추적
      },
      statistics: {
        totalAnalyzed: workflowStats.totalProcessed,
        totalErrors: workflowStats.totalFailed,
        averageProcessingTime: workflowStats.averageProcessingTime
      }
    };
  }

  /**
   * 통계 정보 조회
   */
  getDetailedStats(): any {
    return {
      watcher: this.watcher?.getStats(),
      workflow: analysisWorkflowManager.getStatistics(),
      index: analysisIndexManager.getStatistics(),
      parser: parserFactory.getParserStatistics(),
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * 파일 감시자 시작
   */
  private async startFileWatcher(): Promise<void> {
    if (!this.config.watcher?.paths.length) {
      throw new Error('No watch paths configured');
    }

    const watcherConfig: ChokidarWatcherConfig = {
      rootPath: process.cwd(),
      paths: this.config.watcher.paths,
      ...this.config.watcher.config
    };

    this.watcher = createFileWatcher(watcherConfig, this.config.workflow);
    
    // 감시자 이벤트 전달
    this.watcher.on('fileProcessed', (data) => {
      this.emit('fileProcessed', data);
    });
    
    this.watcher.on('fileProcessingFailed', (data) => {
      this.emit('fileProcessingFailed', data);
    });
    
    this.watcher.on('error', (error) => {
      this.emit('watcherError', error);
    });

    await this.watcher.startWatching();
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.on('fileProcessed', (data) => {
      this.log('debug', `File processed: ${data.event.filePath}`);
    });

    this.on('fileProcessingFailed', (data) => {
      this.log('error', `File processing failed: ${data.event.filePath} - ${data.error}`);
    });

    this.on('error', (error) => {
      this.log('error', 'Service error:', error);
    });
  }

  /**
   * 로깅
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.logLevel || 'info';
    
    if (levels.indexOf(level) >= levels.indexOf(configLevel)) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [CodeAnalysisService] ${message}`, ...args);
    }
  }
}

// 팩토리 함수
export function createCodeAnalysisService(config: ServiceConfig): CodeAnalysisService {
  return new CodeAnalysisService(config);
}

// 기본 인스턴스 (필요시 사용)
export function createDefaultService(paths: string[]): CodeAnalysisService {
  return new CodeAnalysisService({
    watcher: {
      enabled: true,
      paths
    },
    workflow: {
      parallel: true,
      batchSize: 5
    },
    notion: {
      enabled: true,
      autoSync: true
    },
    autoStart: false,
    logLevel: 'info'
  });
}