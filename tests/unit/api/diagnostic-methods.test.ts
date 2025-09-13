/**
 * Diagnostic Methods Contract Tests (T005-T013)
 * Tests for diagnostic and debugging API methods contract validation
 * These tests MUST FAIL initially - methods don't exist yet (TDD approach)
 */

import { TypeScriptAnalyzer } from "../../../src/api/TypeScriptAnalyzer";
import {
	AnalysisOptions,
	AnalyzerOptions,
	LogLevel,
} from "../../../src/api/types";
import { AnalysisResult } from "../../../src/models/AnalysisResult";
import path from "path";
import fs from "fs";
import os from "os";

interface DiagnosticReport {
	timestamp: Date;
	systemHealth: number;
	memoryUsage: MemoryUsage;
	performanceMetrics: PerformanceMetrics;
	errors: ErrorSummary[];
	warnings: WarningSummary[];
}

interface MemoryUsage {
	heapUsed: number;
	heapTotal: number;
	external: number;
}

interface PerformanceMetrics {
	averageParseTime: number;
	totalAnalysisTime: number;
	filesProcessed: number;
	cacheHitRate: number;
}

interface ErrorSummary {
	type: string;
	count: number;
	lastOccurrence: Date;
	message: string;
}

interface WarningSummary {
	type: string;
	count: number;
	severity: 'low' | 'medium' | 'high';
}

interface SystemHealth {
	score: number;
	status: 'healthy' | 'warning' | 'critical';
	issues: HealthIssue[];
	recommendations: string[];
}

interface HealthIssue {
	category: 'memory' | 'performance' | 'errors' | 'cache';
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	impact: string;
}

interface FileAnalysisDiagnostic {
	filePath: string;
	analysisTime: number;
	memoryUsage: number;
	parseErrors: ParseError[];
	dependencies: number;
	complexity: number;
	issues: DiagnosticIssue[];
}

interface ParseError {
	line: number;
	column: number;
	message: string;
	severity: 'error' | 'warning';
}

interface DiagnosticIssue {
	type: string;
	severity: 'info' | 'warning' | 'error';
	message: string;
	suggestion?: string;
}

interface BenchmarkResult {
	operation: string;
	duration: number;
	iterations: number;
	averageTime: number;
	minTime: number;
	maxTime: number;
	memoryDelta: number;
}

interface DiagnosticExport {
	format: 'json' | 'csv' | 'xml';
	timestamp: Date;
	data: DiagnosticReport;
	size: number;
}

interface ErrorStatistics {
	totalErrors: number;
	errorsByType: Record<string, number>;
	errorsByFile: Record<string, number>;
	recentErrors: RecentError[];
	trendData: ErrorTrend[];
}

interface RecentError {
	timestamp: Date;
	type: string;
	file: string;
	message: string;
	stackTrace?: string;
}

interface ErrorTrend {
	date: Date;
	errorCount: number;
	errorTypes: string[];
}

interface DebugReport {
	reportId: string;
	timestamp: Date;
	debugLevel: LogLevel;
	systemSnapshot: SystemSnapshot;
	analysisTrace: AnalysisTrace[];
	configuration: ConfigSnapshot;
	recommendations: DebugRecommendation[];
}

interface SystemSnapshot {
	nodeVersion: string;
	platform: string;
	architecture: string;
	memory: MemoryUsage;
	uptime: number;
}

interface AnalysisTrace {
	step: string;
	timestamp: Date;
	duration: number;
	result: 'success' | 'failure' | 'warning';
	details: any;
}

interface ConfigSnapshot {
	options: AnalyzerOptions;
	environment: Record<string, string>;
	features: string[];
}

interface DebugRecommendation {
	category: 'performance' | 'memory' | 'configuration' | 'usage';
	priority: 'low' | 'medium' | 'high';
	description: string;
	action: string;
}

describe("Diagnostic Methods Contract Tests", () => {
	let analyzer: TypeScriptAnalyzer;
	let testFilePath: string;
	let testTsContent: string;

	beforeEach(() => {
		analyzer = new TypeScriptAnalyzer();

		// Create temporary TypeScript file
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "diagnostic-test-"));
		testFilePath = path.join(tempDir, "test.ts");
		testTsContent = `
import { readFile } from 'fs/promises';
import * as path from 'path';
import { SomeType } from './types';

export interface TestInterface {
  name: string;
  value: number;
}

export const testFunction = async (): Promise<TestInterface> => {
  const data = await readFile('test.txt');
  return { name: 'test', value: 42 };
};
`;
		fs.writeFileSync(testFilePath, testTsContent);
	});

	afterEach(() => {
		// Cleanup
		if (fs.existsSync(testFilePath)) {
			const tempDir = path.dirname(testFilePath);
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("T005: setDebugMode Contract Test", () => {
		it("should expose setDebugMode method with correct signature", () => {
			expect(typeof analyzer.setDebugMode).toBe("function");
		});

		it("should accept boolean parameter for debug mode", () => {
			expect(() => analyzer.setDebugMode(true)).not.toThrow();
			expect(() => analyzer.setDebugMode(false)).not.toThrow();
		});

		it("should return current debug state", () => {
			const result = analyzer.setDebugMode(true);
			expect(typeof result).toBe("boolean");
		});

		it("should toggle debug mode correctly", () => {
			const initialState = analyzer.setDebugMode(false);
			const debugState = analyzer.setDebugMode(true);
			expect(debugState).toBe(true);
			
			const normalState = analyzer.setDebugMode(false);
			expect(normalState).toBe(false);
		});

		it("should affect logging behavior", () => {
			analyzer.setDebugMode(true);
			// In debug mode, should enable verbose logging
			expect(analyzer.getCurrentLogLevel()).toBe(LogLevel.DEBUG);
		});
	});

	describe("T006: getDiagnosticReport Contract Test", () => {
		it("should expose getDiagnosticReport method with correct signature", () => {
			expect(typeof analyzer.getDiagnosticReport).toBe("function");
		});

		it("should return Promise<DiagnosticReport>", async () => {
			const report = await analyzer.getDiagnosticReport();
			expect(report).toBeDefined();
			expect(report.timestamp).toBeInstanceOf(Date);
			expect(typeof report.systemHealth).toBe("number");
			expect(report.memoryUsage).toBeDefined();
			expect(report.performanceMetrics).toBeDefined();
			expect(Array.isArray(report.errors)).toBe(true);
			expect(Array.isArray(report.warnings)).toBe(true);
		});

		it("should include performance metrics", async () => {
			await analyzer.analyzeFile(testFilePath);
			const report = await analyzer.getDiagnosticReport();
			
			expect(report.performanceMetrics).toMatchObject({
				averageParseTime: expect.any(Number),
				totalAnalysisTime: expect.any(Number),
				filesProcessed: expect.any(Number),
				cacheHitRate: expect.any(Number),
			});
		});

		it("should include memory usage information", async () => {
			const report = await analyzer.getDiagnosticReport();
			
			expect(report.memoryUsage).toMatchObject({
				heapUsed: expect.any(Number),
				heapTotal: expect.any(Number),
				external: expect.any(Number),
			});
		});

		it("should include error and warning summaries", async () => {
			const report = await analyzer.getDiagnosticReport();
			
			report.errors.forEach(error => {
				expect(error).toMatchObject({
					type: expect.any(String),
					count: expect.any(Number),
					lastOccurrence: expect.any(Date),
					message: expect.any(String),
				});
			});
		});
	});

	describe("T007: getSystemHealth Contract Test", () => {
		it("should expose getSystemHealth method with correct signature", () => {
			expect(typeof analyzer.getSystemHealth).toBe("function");
		});

		it("should return Promise<SystemHealth>", async () => {
			const health = await analyzer.getSystemHealth();
			expect(health).toBeDefined();
			expect(typeof health.score).toBe("number");
			expect(health.score).toBeGreaterThanOrEqual(0);
			expect(health.score).toBeLessThanOrEqual(100);
			expect(['healthy', 'warning', 'critical']).toContain(health.status);
			expect(Array.isArray(health.issues)).toBe(true);
			expect(Array.isArray(health.recommendations)).toBe(true);
		});

		it("should categorize health issues correctly", async () => {
			const health = await analyzer.getSystemHealth();
			
			health.issues.forEach(issue => {
				expect(['memory', 'performance', 'errors', 'cache']).toContain(issue.category);
				expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
				expect(typeof issue.description).toBe("string");
				expect(typeof issue.impact).toBe("string");
			});
		});

		it("should provide actionable recommendations", async () => {
			const health = await analyzer.getSystemHealth();
			
			expect(health.recommendations.length).toBeGreaterThanOrEqual(0);
			health.recommendations.forEach(rec => {
				expect(typeof rec).toBe("string");
				expect(rec.length).toBeGreaterThan(10);
			});
		});
	});

	describe("T008: diagnoseFileAnalysis Contract Test", () => {
		it("should expose diagnoseFileAnalysis method with correct signature", () => {
			expect(typeof analyzer.diagnoseFileAnalysis).toBe("function");
		});

		it("should accept file path parameter", async () => {
			const diagnostic = await analyzer.diagnoseFileAnalysis(testFilePath);
			expect(diagnostic).toBeDefined();
		});

		it("should return Promise<FileAnalysisDiagnostic>", async () => {
			const diagnostic = await analyzer.diagnoseFileAnalysis(testFilePath);
			
			expect(diagnostic).toMatchObject({
				filePath: testFilePath,
				analysisTime: expect.any(Number),
				memoryUsage: expect.any(Number),
				parseErrors: expect.any(Array),
				dependencies: expect.any(Number),
				complexity: expect.any(Number),
				issues: expect.any(Array),
			});
		});

		it("should include parse error details", async () => {
			// Create file with syntax errors
			const errorFilePath = path.join(path.dirname(testFilePath), "error.ts");
			fs.writeFileSync(errorFilePath, "import { missing from 'invalid';");
			
			const diagnostic = await analyzer.diagnoseFileAnalysis(errorFilePath);
			
			if (diagnostic.parseErrors.length > 0) {
				diagnostic.parseErrors.forEach(error => {
					expect(error).toMatchObject({
						line: expect.any(Number),
						column: expect.any(Number),
						message: expect.any(String),
						severity: expect.stringMatching(/^(error|warning)$/),
					});
				});
			}
		});

		it("should provide diagnostic issues and suggestions", async () => {
			const diagnostic = await analyzer.diagnoseFileAnalysis(testFilePath);
			
			diagnostic.issues.forEach(issue => {
				expect(issue).toMatchObject({
					type: expect.any(String),
					severity: expect.stringMatching(/^(info|warning|error)$/),
					message: expect.any(String),
				});
				
				if (issue.suggestion) {
					expect(typeof issue.suggestion).toBe("string");
				}
			});
		});
	});

	describe("T009: benchmarkPerformance Contract Test", () => {
		it("should expose benchmarkPerformance method with correct signature", () => {
			expect(typeof analyzer.benchmarkPerformance).toBe("function");
		});

		it("should accept operation name and iterations parameters", async () => {
			const benchmark = await analyzer.benchmarkPerformance("parse", 10);
			expect(benchmark).toBeDefined();
		});

		it("should return Promise<BenchmarkResult>", async () => {
			const benchmark = await analyzer.benchmarkPerformance("analyze", 5);
			
			expect(benchmark).toMatchObject({
				operation: "analyze",
				duration: expect.any(Number),
				iterations: 5,
				averageTime: expect.any(Number),
				minTime: expect.any(Number),
				maxTime: expect.any(Number),
				memoryDelta: expect.any(Number),
			});
		});

		it("should calculate performance statistics correctly", async () => {
			const benchmark = await analyzer.benchmarkPerformance("test", 3);
			
			expect(benchmark.averageTime).toBeLessThanOrEqual(benchmark.maxTime);
			expect(benchmark.averageTime).toBeGreaterThanOrEqual(benchmark.minTime);
			expect(benchmark.minTime).toBeLessThanOrEqual(benchmark.maxTime);
		});

		it("should support different operation types", async () => {
			const operations = ["parse", "analyze", "format", "validate"];
			
			for (const op of operations) {
				const benchmark = await analyzer.benchmarkPerformance(op, 1);
				expect(benchmark.operation).toBe(op);
			}
		});
	});

	describe("T010: exportDiagnostics Contract Test", () => {
		it("should expose exportDiagnostics method with correct signature", () => {
			expect(typeof analyzer.exportDiagnostics).toBe("function");
		});

		it("should accept format parameter", async () => {
			const exportResult = await analyzer.exportDiagnostics("json");
			expect(exportResult).toBeDefined();
		});

		it("should return Promise<DiagnosticExport>", async () => {
			const exportResult = await analyzer.exportDiagnostics("json");
			
			expect(exportResult).toMatchObject({
				format: "json",
				timestamp: expect.any(Date),
				data: expect.any(Object),
				size: expect.any(Number),
			});
		});

		it("should support multiple export formats", async () => {
			const formats = ["json", "csv", "xml"] as const;
			
			for (const format of formats) {
				const exportResult = await analyzer.exportDiagnostics(format);
				expect(exportResult.format).toBe(format);
			}
		});

		it("should include complete diagnostic data", async () => {
			const exportResult = await analyzer.exportDiagnostics("json");
			
			expect(exportResult.data).toMatchObject({
				timestamp: expect.any(Date),
				systemHealth: expect.any(Number),
				memoryUsage: expect.any(Object),
				performanceMetrics: expect.any(Object),
				errors: expect.any(Array),
				warnings: expect.any(Array),
			});
		});
	});

	describe("T011: getErrorStatistics Contract Test", () => {
		it("should expose getErrorStatistics method with correct signature", () => {
			expect(typeof analyzer.getErrorStatistics).toBe("function");
		});

		it("should return Promise<ErrorStatistics>", async () => {
			const stats = await analyzer.getErrorStatistics();
			
			expect(stats).toMatchObject({
				totalErrors: expect.any(Number),
				errorsByType: expect.any(Object),
				errorsByFile: expect.any(Object),
				recentErrors: expect.any(Array),
				trendData: expect.any(Array),
			});
		});

		it("should track errors by type and file", async () => {
			const stats = await analyzer.getErrorStatistics();
			
			// Verify error categorization
			Object.entries(stats.errorsByType).forEach(([type, count]) => {
				expect(typeof type).toBe("string");
				expect(typeof count).toBe("number");
				expect(count).toBeGreaterThanOrEqual(0);
			});
			
			Object.entries(stats.errorsByFile).forEach(([file, count]) => {
				expect(typeof file).toBe("string");
				expect(typeof count).toBe("number");
				expect(count).toBeGreaterThanOrEqual(0);
			});
		});

		it("should include recent error details", async () => {
			const stats = await analyzer.getErrorStatistics();
			
			stats.recentErrors.forEach(error => {
				expect(error).toMatchObject({
					timestamp: expect.any(Date),
					type: expect.any(String),
					file: expect.any(String),
					message: expect.any(String),
				});
				
				if (error.stackTrace) {
					expect(typeof error.stackTrace).toBe("string");
				}
			});
		});

		it("should provide trend analysis data", async () => {
			const stats = await analyzer.getErrorStatistics();
			
			stats.trendData.forEach(trend => {
				expect(trend).toMatchObject({
					date: expect.any(Date),
					errorCount: expect.any(Number),
					errorTypes: expect.any(Array),
				});
			});
		});
	});

	describe("T012: generateDebugReport Contract Test", () => {
		it("should expose generateDebugReport method with correct signature", () => {
			expect(typeof analyzer.generateDebugReport).toBe("function");
		});

		it("should accept optional debug level parameter", async () => {
			const report = await analyzer.generateDebugReport(LogLevel.DEBUG);
			expect(report).toBeDefined();
		});

		it("should return Promise<DebugReport>", async () => {
			const report = await analyzer.generateDebugReport();
			
			expect(report).toMatchObject({
				reportId: expect.any(String),
				timestamp: expect.any(Date),
				debugLevel: expect.any(String),
				systemSnapshot: expect.any(Object),
				analysisTrace: expect.any(Array),
				configuration: expect.any(Object),
				recommendations: expect.any(Array),
			});
		});

		it("should include comprehensive system snapshot", async () => {
			const report = await analyzer.generateDebugReport();
			
			expect(report.systemSnapshot).toMatchObject({
				nodeVersion: expect.any(String),
				platform: expect.any(String),
				architecture: expect.any(String),
				memory: expect.any(Object),
				uptime: expect.any(Number),
			});
		});

		it("should capture analysis trace information", async () => {
			await analyzer.analyzeFile(testFilePath);
			const report = await analyzer.generateDebugReport();
			
			report.analysisTrace.forEach(trace => {
				expect(trace).toMatchObject({
					step: expect.any(String),
					timestamp: expect.any(Date),
					duration: expect.any(Number),
					result: expect.stringMatching(/^(success|failure|warning)$/),
					details: expect.anything(),
				});
			});
		});

		it("should provide actionable debug recommendations", async () => {
			const report = await analyzer.generateDebugReport();
			
			report.recommendations.forEach(rec => {
				expect(rec).toMatchObject({
					category: expect.stringMatching(/^(performance|memory|configuration|usage)$/),
					priority: expect.stringMatching(/^(low|medium|high)$/),
					description: expect.any(String),
					action: expect.any(String),
				});
			});
		});
	});

	describe("T013: clearDiagnosticData Contract Test", () => {
		it("should expose clearDiagnosticData method with correct signature", () => {
			expect(typeof analyzer.clearDiagnosticData).toBe("function");
		});

		it("should return Promise<boolean> indicating success", async () => {
			const result = await analyzer.clearDiagnosticData();
			expect(typeof result).toBe("boolean");
		});

		it("should accept optional data type filter", async () => {
			const result = await analyzer.clearDiagnosticData("errors");
			expect(typeof result).toBe("boolean");
			
			const allResult = await analyzer.clearDiagnosticData();
			expect(typeof allResult).toBe("boolean");
		});

		it("should clear specific diagnostic data types", async () => {
			const dataTypes = ["errors", "warnings", "performance", "cache"];
			
			for (const type of dataTypes) {
				const result = await analyzer.clearDiagnosticData(type);
				expect(result).toBe(true);
			}
		});

		it("should reset diagnostic counters after clearing", async () => {
			// Generate some diagnostic data
			await analyzer.analyzeFile(testFilePath);
			
			// Clear diagnostic data
			await analyzer.clearDiagnosticData();
			
			// Verify data is cleared
			const stats = await analyzer.getErrorStatistics();
			expect(stats.totalErrors).toBe(0);
			expect(Object.keys(stats.errorsByType)).toHaveLength(0);
			expect(stats.recentErrors).toHaveLength(0);
		});

		it("should preserve configuration and settings", async () => {
			const originalDebugMode = analyzer.setDebugMode(true);
			
			await analyzer.clearDiagnosticData();
			
			// Configuration should remain unchanged
			expect(analyzer.getCurrentLogLevel()).toBe(LogLevel.DEBUG);
		});
	});
});