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
export {
	type EnhancedDependencyExtractionResult,
	EnhancedDependencyExtractor,
	type EnhancedDependencyInfo,
	type UsedMethodInfo,
} from "./EnhancedDependencyExtractor";
export {
	type EnhancedExportExtractionResult,
	type ExportMethodInfo,
	type ExportStatistics,
	type ClassExportInfo,
	type ClassMethodInfo,
	type ClassPropertyInfo,
	EnhancedExportExtractor,
} from "./EnhancedExportExtractor";
// ===== BASE INTERFACE =====
export { IDataExtractor } from "./IDataExtractor";
export {
	type IdentifierExtractionResult,
	IdentifierExtractor,
	type IdentifierInfo,
} from "./IdentifierExtractor";
export {
	type MarkdownLinkDependency,
	type MarkdownLinkExtractionOptions,
	MarkdownLinkExtractor,
} from "./MarkdownLinkExtractor";
