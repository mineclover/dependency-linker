/**
 * Shared Watcher Types - 파일 감시 시스템 공통 타입 정의
 * Unified configuration interfaces for file watching systems
 */

export interface BaseWatcherConfig {
  /** Root path to watch */
  rootPath: string;
  /** Paths to watch (can be files or directories) */
  paths: string[];
  /** Patterns to exclude from watching */
  excludePatterns?: string[];
  /** Patterns to include (if not specified, all files are included) */
  includePatterns?: string[];
  /** Enable persistent watching */
  persistent?: boolean;
  /** Ignore initial add events */
  ignoreInitial?: boolean;
  /** Follow symbolic links */
  followSymlinks?: boolean;
  /** Working directory for relative paths */
  cwd?: string;
  /** Maximum depth to watch */
  depth?: number;
  /** Ignore permission errors */
  ignorePermissionErrors?: boolean;
}

export interface AdvancedWatcherConfig extends BaseWatcherConfig {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Maximum concurrent file operations */
  maxConcurrentUpdates?: number;
  /** Enable batching of file changes */
  enableBatching?: boolean;
  /** Batch processing interval in milliseconds */
  batchIntervalMs?: number;
  /** Automatically resolve conflicts */
  autoResolveConflicts?: boolean;
  /** Wait for write operations to finish */
  awaitWriteFinish?: {
    stabilityThreshold?: number;
    pollInterval?: number;
  };
  /** Use atomic file operations */
  atomic?: boolean;
}

export interface FileChangeEvent {
  /** Type of file change */
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'created' | 'modified' | 'deleted' | 'renamed';
  /** Path of the changed file */
  filePath: string;
  /** File statistics */
  stats?: any;
  /** Timestamp of the change */
  timestamp: number;
  /** Old path for rename operations */
  oldPath?: string;
  /** File size */
  size?: number;
  /** File hash for content verification */
  hash?: string;
}

export interface WatcherStats {
  /** Total number of events processed */
  totalEvents: number;
  /** Events broken down by type */
  eventsByType: { [key: string]: number };
  /** Number of files successfully processed */
  filesProcessed: number;
  /** Number of files skipped */
  filesSkipped: number;
  /** Number of processing errors */
  processingErrors: number;
  /** Average processing time in milliseconds */
  averageProcessingTime: number;
  /** Current queue size */
  queueSize: number;
  /** Whether the watcher is currently running */
  isRunning: boolean;
  /** Paths currently being watched */
  watchedPaths: string[];
  /** Last processed file path */
  lastProcessedFile?: string;
  /** Timestamp of last processed file */
  lastProcessedTime?: number;
  /** Active watchers count */
  activeWatchers?: number;
  /** Updates performed count */
  updatesPerformed?: number;
  /** Last update time */
  lastUpdateTime?: string;
  /** Queued updates count */
  queuedUpdates?: number;
}

export interface ProcessingQueue {
  /** File path to process */
  filePath: string;
  /** File change event */
  event: FileChangeEvent;
  /** Number of retry attempts */
  retryCount: number;
  /** Scheduled processing time */
  scheduledTime: number;
}

export interface BatchUpdate {
  /** Unique batch identifier */
  id: string;
  /** Files included in the batch */
  files: string[];
  /** Batch start time */
  startTime: string;
  /** Batch end time */
  endTime?: string;
  /** Current batch status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Updates performed in this batch */
  updates: DependencyUpdateEvent[];
  /** Errors encountered in this batch */
  errors: string[];
}

export interface DependencyUpdateEvent {
  /** File path that was updated */
  filePath: string;
  /** Type of change that occurred */
  changeType: 'dependencies' | 'exports' | 'structure' | 'content';
  /** Files impacted by this change */
  impactedFiles: string[];
  /** Update processing time in milliseconds */
  updateTime: number;
  /** Whether the update was successful */
  success: boolean;
  /** Error message if update failed */
  error?: string;
}

/**
 * Factory function to create watcher config with sensible defaults
 */
export function createWatcherConfig(
  rootPath: string,
  overrides: Partial<AdvancedWatcherConfig> = {}
): AdvancedWatcherConfig {
  return {
    rootPath,
    paths: [rootPath],
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.log'
    ],
    includePatterns: ['**/*.{ts,tsx,js,jsx,py,go,rs,java,c,cpp,h,hpp}'],
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    depth: undefined,
    ignorePermissionErrors: true,
    debounceMs: 300,
    maxConcurrentUpdates: 5,
    enableBatching: true,
    batchIntervalMs: 1000,
    autoResolveConflicts: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    atomic: true,
    ...overrides
  };
}

/**
 * Factory function to create simple watcher config for basic file watching
 */
export function createSimpleWatcherConfig(
  paths: string[],
  overrides: Partial<BaseWatcherConfig> = {}
): BaseWatcherConfig {
  return {
    rootPath: process.cwd(),
    paths,
    excludePatterns: ['**/node_modules/**', '**/.git/**'],
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    ignorePermissionErrors: true,
    ...overrides
  };
}