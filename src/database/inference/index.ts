/**
 * Inference Module
 *
 * Centralized module for graph inference capabilities including:
 * - Edge type registry and hierarchy management
 * - Inference engine with three inference types (hierarchical, transitive, inheritable)
 * - Type-safe inference interfaces and options
 */

// Core inference engine
export { InferenceEngine } from './InferenceEngine';

// Edge type management
export { EdgeTypeRegistry } from './EdgeTypeRegistry';
export type { EdgeTypeDefinition } from './EdgeTypeRegistry';

// Type definitions
export type {
  // Inference types
  InferredRelationType,
  InferencePath,
  InferredRelationship,

  // Query options
  HierarchicalQueryOptions,
  TransitiveQueryOptions,
  InheritableQueryOptions,

  // Cache and configuration
  InferenceCacheEntry,
  InferenceStatistics,
  InferenceEngineConfig,
  InferenceResult,

  // Rules and validation
  EdgeTypeInferenceRule,
  InferenceValidationResult,
} from './InferenceTypes';