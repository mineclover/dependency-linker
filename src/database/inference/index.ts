/**
 * Inference Module
 *
 * Centralized module for graph inference capabilities including:
 * - Edge type registry and hierarchy management
 * - Inference engine with three inference types (hierarchical, transitive, inheritable)
 * - Type-safe inference interfaces and options
 */

export type { EdgeTypeDefinition } from "./EdgeTypeRegistry";

// Edge type management
export { EdgeTypeRegistry } from "./EdgeTypeRegistry";
// Core inference engine
export { InferenceEngine } from "./InferenceEngine";
// Unknown node resolver
export { UnknownNodeResolver } from "./UnknownNodeResolver";
export type {
	ResolutionResult,
	ResolvedNode,
	UnresolvedNode,
	UnresolvedReason,
	ResolutionStatistics,
} from "./UnknownNodeResolver";

// Type definitions
export type {
	// Rules and validation
	EdgeTypeInferenceRule,
	// Query options
	HierarchicalQueryOptions,
	// Cache and configuration
	InferenceCacheEntry,
	InferenceEngineConfig,
	InferencePath,
	InferenceResult,
	InferenceStatistics,
	InferenceValidationResult,
	InferredRelationship,
	// Inference types
	InferredRelationType,
	InheritableQueryOptions,
	TransitiveQueryOptions,
} from "./InferenceTypes";
