/**
 * Sync Workflow Service - Native Clean Architecture Implementation
 * Replaces legacy bridge with native implementation
 */

// Import native implementation
export { WorkspaceSyncService as SyncWorkflowService } from './sync/workspaceSyncService.js';

// Export types for compatibility
export type {
  WorkspaceSyncOptions as SyncWorkflowOptions,
  WorkspaceSyncResult as SyncWorkflowResult
} from './sync/workspaceSyncService.js';