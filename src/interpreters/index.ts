/**
 * Data Interpreters
 * Built-in data interpretation plugins for analysis results processing
 */

// ===== BUILT-IN INTERPRETERS =====
export {
	DependencyAnalysisInterpreter,
	type DependencyAnalysisResult,
	type DependencyEdge,
	type DependencyNode,
	type Recommendation,
	type RiskFactor,
} from "./DependencyAnalysisInterpreter";
// ===== BASE INTERFACE =====
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

export {
	DependencyCategory,
	IssueSeverity,
	IssueType,
	type LinkAnalysisOptions,
	type LinkDependencyAnalysis,
	LinkDependencyInterpreter,
	type LinkIssue,
	LinkStatus,
	type LinkSummary,
	type ProcessedDependency,
} from "./LinkDependencyInterpreter";

export {
	type PathResolutionResult,
	type PathResolverConfig,
	PathResolverInterpreter,
	type ResolvedDependency,
} from "./PathResolverInterpreter";
