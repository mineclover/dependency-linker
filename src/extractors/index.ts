/**
 * Data Extractors
 * Built-in data extraction plugins for AST analysis
 */

export {
	type ComplexityExtractionResult,
	ComplexityExtractor,
	type ComplexityInfo,
} from "./ComplexityExtractor";

// ===== BUILT-IN EXTRACTORS =====
export {
	type DependencyExtractionResult,
	DependencyExtractor,
	type DependencyInfo,
} from "./DependencyExtractor";
// ===== BASE INTERFACE =====
export { IDataExtractor } from "./IDataExtractor";
export {
	type IdentifierExtractionResult,
	IdentifierExtractor,
	type IdentifierInfo,
} from "./IdentifierExtractor";
