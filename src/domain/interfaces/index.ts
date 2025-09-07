/**
 * Service Interfaces Export Hub
 * Centralized export of all service contracts for Clean Architecture
 */

// Configuration Service Interfaces
export type {
  IConfigurationService,
  ConfigProcessingOptions,
  ProcessedConfig
} from './IConfigurationService.js';

// Upload Service Interfaces
export type {
  IProjectUploadService,
  IUploadRepository,
  ProjectUploadOptions,
  ProjectUploadResult
} from './IUploadService.js';

// Validation Service Interfaces
export type {
  IValidationService,
  IConfigurationValidationService,
  IDatabaseAccessValidationService,
  ISchemaValidationService,
  ValidationOptions,
  RemediationResult
} from './IValidationService.js';

// Workflow Service Interfaces
export type {
  IWorkflowService,
  ISyncWorkflowService,
  IFileDiscoveryService,
  IGitIntegrationService,
  WorkflowContext,
  WorkflowStep,
  WorkflowExecutionResult
} from './IWorkflowService.js';

// Re-export common infrastructure interfaces that services depend on
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  WorkspaceConfig,
  ProjectFile,
  UploadResult,
  NotionConfig
} from '../../shared/types/index.js';