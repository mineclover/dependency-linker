/**
 * Test Contract: TypeScriptAnalyzer Diagnostic Methods
 *
 * This contract defines the expected behavior and interfaces for
 * diagnostic and debug methods in the TypeScriptAnalyzer class.
 */

export interface DiagnosticMethodsContract {
	// Debug mode management
	setDebugMode(enabled: boolean): void;

	// System diagnostics
	getDiagnosticReport(): Promise<DiagnosticReport>;
	getSystemHealth(): Promise<HealthReport>;
	diagnoseFileAnalysis(filePath: string): Promise<FileAnalysisDiagnostic>;

	// Performance and benchmarking
	benchmarkPerformance(options?: BenchmarkOptions): Promise<BenchmarkResult[]>;

	// Data export and reporting
	exportDiagnostics(format?: "json" | "text"): Promise<string>;
	generateDebugReport(): string;

	// Statistics and cleanup
	getErrorStatistics(): ErrorStatistics;
	clearDiagnosticData(): void;
}

// Supporting interfaces for method contracts
export interface DiagnosticReport {
	systemInfo: {
		nodeVersion: string;
		memoryUsage: NodeJS.MemoryUsage;
		timestamp: Date;
	};
	analysisStats: {
		totalFilesAnalyzed: number;
		totalErrors: number;
		averageProcessingTime: number;
	};
	performanceMetrics: {
		cacheHitRate: number;
		memoryEfficiency: number;
	};
}

export interface HealthReport {
	overallHealth: "healthy" | "degraded" | "critical";
	healthScore: number; // 0-100
	issues: HealthIssue[];
	recommendations: string[];
}

export interface HealthIssue {
	category: "performance" | "memory" | "errors" | "system";
	severity: "low" | "medium" | "high" | "critical";
	description: string;
	affectedComponent: string;
}

export interface FileAnalysisDiagnostic {
	filePath: string;
	analysisTime: number;
	success: boolean;
	errorDetails?: {
		type: string;
		message: string;
		stack?: string;
	};
	performanceIssues?: {
		slowParsing: boolean;
		memoryUsage: number;
		bottlenecks: string[];
	};
}

export interface BenchmarkOptions {
	iterations?: number;
	warmupRuns?: number;
	includeMemoryProfiling?: boolean;
	testFiles?: string[];
}

export interface BenchmarkResult {
	testName: string;
	averageTime: number;
	minTime: number;
	maxTime: number;
	standardDeviation: number;
	memoryUsage?: {
		peak: number;
		average: number;
	};
}

export interface ErrorStatistics {
	totalErrors: number;
	errorsByCategory: Record<string, number>;
	recentErrors: Array<{
		timestamp: Date;
		category: string;
		message: string;
	}>;
	topErrorCategories: Array<{
		category: string;
		count: number;
		percentage: number;
	}>;
}

// Test scenario contracts
export interface DiagnosticTestScenarios {
	debugModeToggle: {
		input: { enabled: boolean };
		expectedBehavior: "logging_enabled" | "logging_disabled";
		verificationMethod: "log_capture" | "state_check";
	};

	diagnosticReportGeneration: {
		preconditions: string[];
		expectedReportSections: Array<keyof DiagnosticReport>;
		performanceThreshold: number; // max time in ms
	};

	systemHealthAssessment: {
		mockConditions: Array<"low_memory" | "high_errors" | "slow_performance">;
		expectedHealthScore: {
			min: number;
			max: number;
		};
		expectedRecommendations: number; // minimum number
	};

	fileAnalysisDiagnostic: {
		testFiles: Array<{
			path: string;
			expectedSuccess: boolean;
			expectedIssues?: string[];
		}>;
	};

	performanceBenchmarking: {
		benchmarkSuites: Array<{
			name: string;
			iterations: number;
			expectedMaxTime: number;
		}>;
	};

	dataExportValidation: {
		formats: Array<"json" | "text">;
		expectedKeys: string[];
		validationRules: Array<{
			field: string;
			type: "string" | "number" | "object" | "array";
			required: boolean;
		}>;
	};

	statisticsAccuracy: {
		errorInjectionScenarios: Array<{
			category: string;
			count: number;
			timespan: number; // minutes
		}>;
		expectedCategorization: Record<string, number>;
	};

	dataCleanupVerification: {
		dataTypesToClear: Array<"cache" | "statistics" | "reports">;
		verificationMethod: "memory_check" | "state_validation";
	};
}
