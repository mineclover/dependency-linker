/**
 * Interpreters Module - Built-in data interpreters
 * Exports all built-in data interpretation plugins
 */

// Built-in interpreters
export {
	DependencyAnalysisInterpreter,
	type DependencyAnalysisResult,
	type DependencyEdge,
	type DependencyNode,
	type Recommendation,
	type RiskFactor,
} from "./DependencyAnalysisInterpreter";
// Base interface
export { IDataInterpreter } from "./IDataInterpreter";

export {
	type ArchitectureRecommendation,
	type CodeQualityRecommendation,
	type DetectedAntiPattern,
	type DetectedPattern,
	IdentifierAnalysisInterpreter,
	type IdentifierAnalysisResult,
	type NamingConventionAnalysis,
	type RefactoringRecommendation,
} from "./IdentifierAnalysisInterpreter";
