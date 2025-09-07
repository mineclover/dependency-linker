/**
 * Filesystem Infrastructure - Index
 * 파일시스템 인프라스트럭처 계층의 통합 export
 */

export { FileSystemExplorer, FileExplorer, createFileExplorer } from './explorer.js';
export { FileStatusTracker, createFileStatusTracker } from './statusTracker.js';
export type { FileStatus, SyncStatistics } from './statusTracker.js';

// 레거시 호환성을 위한 통합 export
export {
  FileSystemExplorer as FileExplorer,
  FileStatusTracker
} from './explorer.js';