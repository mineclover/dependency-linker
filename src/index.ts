/**
 * TypeScript Dependency Linker - Main Entry Point
 * Multi-language AST-based code analysis framework with extensible plugin architecture
 */

// ===== CORE API =====
export * from "./api";
// ===== CLI & COMMANDS =====
export * from "./cli";
// ===== EXTRACTORS & INTERPRETERS =====
export * from "./extractors";
export * from "./interpreters";
// ===== LIBRARY FUNCTIONS =====
export * from "./lib";
// ===== CORE MODELS =====
export { AnalysisConfig } from "./models/AnalysisConfig";
export { AnalysisError } from "./models/AnalysisError";
export { AnalysisResult } from "./models/AnalysisResult";
export { CacheEntry } from "./models/CacheEntry";
export { DependencyInfo } from "./models/DependencyInfo";
export { ExportInfo } from "./models/ExportInfo";
export { ExtractedData } from "./models/ExtractedData";
export {
	FileAnalysisRequest,
	OutputFormat,
} from "./models/FileAnalysisRequest";
export { ImportInfo } from "./models/ImportInfo";
export { IntegratedAnalysisData } from "./models/IntegratedData";
// ===== OPTIMIZATION TYPES =====
export type {
	MemoryUsage,
	MonitoringOptions,
	PerformanceComparison,
	PerformanceMetrics as OptimizationPerformanceMetrics,
	PerformanceTarget,
	TestCharacteristics,
	ValidationOptions,
	ValidationResult as OptimizationValidationResult,
} from "./models/optimization";
// ===== OPTIMIZATION MODELS =====
export {
	// Test case utilities
	analyzeTestCase,
	BaselineError,
	// Enums and types
	ComplexityLevel,
	ConfigurationError as OptimizationConfigurationError,
	// Constants and configuration
	calculateImprovementPercentage,
	calculatePriorityScore,
	calculateTestCasesFailureRate,
	calculateTestCasesTotalTime,
	// Optimization opportunities
	calculateTotalSavings,
	createExecutionPlan,
	createUserErrorMessage,
	DependencyError as OptimizationDependencyError,
	EffortLevel,
	extractErrorContext,
	FileOperationError,
	findParallelExecutableOpportunities,
	findSimilarTests,
	findSlowestTestCases,
	findTestCasesByCoverageArea,
	fromValidationViolations,
	getEnvironmentConfig,
	getOptimizationStrategyName,
	groupByRiskLevel,
	groupByType,
	groupTestCasesByPriority,
	groupTestCasesByType,
	handleErrors,
	identifyConsolidationCandidates,
	// Utility functions
	isOptimizationError,
	isOptimizationType,
	isRecoverableError,
	isTestCategory,
	isTestType,
	logError,
	meetsPerformanceTargets,
	// Error classes (with different names to avoid conflicts)
	OptimizationError,
	OptimizationOpportunityBuilder,
	OptimizationTemplates,
	OptimizationType,
	// Performance baseline
	PerformanceBaselineBuilder,
	PerformanceTrackingError,
	Priority,
	prioritizeOpportunities,
	RiskLevel,
	TestAnalysisError,
	// Builders
	TestCaseBuilder,
	TestCategory,
	TestOptimizationError,
	TestSuiteBuilder,
	TestType,
	TimeoutError,
	ValidationError as OptimizationValidationError,
	validateDependencies,
	validateTestCases,
	withErrorHandling,
} from "./models/optimization";
export { PerformanceMetrics } from "./models/PerformanceMetrics";
export { SourceLocation } from "./models/SourceLocation";
export { GoParser } from "./parsers/GoParser";
// ===== LANGUAGE PARSERS =====
export { ILanguageParser } from "./parsers/ILanguageParser";
export { JavaParser } from "./parsers/JavaParser";
export { JavaScriptParser } from "./parsers/JavaScriptParser";
export { TypeScriptParser as NewTypeScriptParser } from "./parsers/TypeScriptParser";
// ===== CORE SERVICES =====
export { AnalysisEngine } from "./services/AnalysisEngine";
export { AnalysisEngineFactory } from "./services/AnalysisEngineFactory";
export { CacheManager } from "./services/CacheManager";
export { DependencyAnalyzer } from "./services/DependencyAnalyzer";
export { DirectoryAnalyzer } from "./services/DirectoryAnalyzer";
// ===== REGISTRIES =====
export { ExtractorRegistry } from "./services/ExtractorRegistry";
export { FileAnalyzer } from "./services/FileAnalyzer";
export { IAnalysisEngine } from "./services/IAnalysisEngine";
export { ICacheManager } from "./services/ICacheManager";
export { InterpreterRegistry } from "./services/InterpreterRegistry";
// ===== INTEGRATION SERVICES =====
export { DataIntegrator } from "./services/integration/DataIntegrator";
// ===== OPTIMIZATION SERVICES =====
export * from "./services/optimization";
export { ParserRegistry } from "./services/ParserRegistry";
export { TypeScriptParser } from "./services/TypeScriptParser"; // Legacy parser
// ===== TASK MANAGEMENT SYSTEM =====
export * from "./task";
// ===== TYPE SYSTEM =====
export * from "./types/TreeSitterTypes";
export * from "./types/ASTWrappers";
// ===== UTILITIES =====
export { createLogger } from "./utils/logger";
export * from "./utils/PathUtils";

// ===== CONFIGURATION =====
// Configuration is handled through CLI commands
