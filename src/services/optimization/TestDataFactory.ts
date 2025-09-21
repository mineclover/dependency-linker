/**
 * Test Data Factory (T025)
 * Creates test data objects, mock data, and fixtures for optimization testing
 */

import {
	EffortLevel,
	type OptimizationOpportunity,
	OptimizationStatus,
	OptimizationType,
	RiskLevel,
} from "../../models/optimization/OptimizationOpportunity";
import type {
	BaselineMetadata,
	PerformanceBaseline,
	TestEnvironment,
} from "../../models/optimization/PerformanceBaseline";
import type { TestCase, TestSuite } from "../../models/optimization/TestSuite";
import {
	ComplexityLevel,
	Priority,
	TestCategory,
	TestType,
} from "../../models/optimization/types";

export interface TestDataOptions {
	seed?: string | number;
	size?: "small" | "medium" | "large" | "xlarge";
	realistic?: boolean;
	includeEdgeCases?: boolean;
	customProps?: Record<string, any>;
}

export interface MockDataTemplate {
	id: string;
	name: string;
	template: any;
	generator: () => any;
	variations: string[];
}

export class TestDataFactory {
	private static instance: TestDataFactory;
	private mockTemplates: Map<string, MockDataTemplate> = new Map();
	private seedValue: number = 12345;

	constructor() {
		this.initializeDefaultTemplates();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): TestDataFactory {
		if (!TestDataFactory.instance) {
			TestDataFactory.instance = new TestDataFactory();
		}
		return TestDataFactory.instance;
	}

	/**
	 * Create a test suite with specified characteristics
	 */
	createTestSuite(options: TestDataOptions = {}): TestSuite {
		this.setSeed(options.seed);
		const size = options.size || "medium";
		const testCaseCount = this.getTestCaseCount(size);

		const testCases: TestCase[] = [];
		for (let i = 0; i < testCaseCount; i++) {
			testCases.push(
				this.createTestCase({
					...options,
					customProps: {
						...options.customProps,
						index: i,
						parentSuiteSize: size,
					},
				}),
			);
		}

		return {
			id: this.generateId("suite"),
			name: this.generateTestSuiteName(options),
			filePath: this.generateFilePath("suite", options),
			testCases,
			category: this.generateCategoryEnum(size),
			executionTime: testCases.reduce((sum, tc) => sum + tc.executionTime, 0),
			lastModified: options.realistic
				? new Date(Date.now() - this.randomInt(0, 7 * 24 * 60 * 60 * 1000))
				: new Date(),
			dependencies: this.generateDependencies(options),
			setupComplexity: this.getComplexityLevel(size),
		};
	}

	/**
	 * Create a single test case
	 */
	createTestCase(options: TestDataOptions = {}): TestCase {
		this.setSeed(options.seed);
		const size = options.size || "medium";

		const duration = this.generateDuration(size, options.includeEdgeCases);
		const category = this.categorizeByDuration(duration);

		return {
			id: this.generateId("test"),
			name: this.generateTestCaseName(options),
			type: this.generateTestType(category),
			executionTime: duration,
			estimatedDuration: duration,
			isFlaky: options.includeEdgeCases ? this.randomInt(1, 10) === 1 : false,
			duplicateOf: undefined,
			coverageAreas: this.generateCoverageAreas(options),
			lastFailure:
				options.realistic && this.randomInt(1, 5) === 1
					? new Date(Date.now() - this.randomInt(0, 30 * 24 * 60 * 60 * 1000))
					: undefined,
			priority: this.generatePriority(category),
		};
	}

	/**
	 * Create optimization opportunity
	 */
	createOptimizationOpportunity(
		options: TestDataOptions = {},
	): OptimizationOpportunity {
		this.setSeed(options.seed);

		const opportunityTypes = [
			"parallelization",
			"setup_consolidation",
			"duplicate_elimination",
			"resource_optimization",
			"execution_order",
			"mock_optimization",
			"data_reuse",
			"timeout_optimization",
		];

		const type =
			opportunityTypes[this.randomInt(0, opportunityTypes.length - 1)];
		const impact = ["low", "medium", "high", "critical"][
			this.randomInt(0, 3)
		] as "low" | "medium" | "high" | "critical";
		const effort = ["low", "medium", "high"][this.randomInt(0, 2)] as
			| "low"
			| "medium"
			| "high";
		const timeSaving = this.calculateTimeReduction(impact);

		return {
			id: this.generateId("opportunity"),
			type: this.mapToOptimizationType(type),
			targetSuite: options.customProps?.testSuiteId || this.generateId("suite"),
			targetCases: this.generateAffectedTestIds(options),
			description: this.generateOpportunityDescription(type, impact),
			impact: {
				timeReduction: timeSaving,
				complexityReduction: this.randomFloat(0.1, 0.8),
				maintainabilityImprovement: this.randomFloat(0.2, 0.7),
			},
			estimatedTimeSaving: timeSaving,
			riskLevel: this.mapToRiskLevel(impact),
			implementationEffort: this.mapToEffortLevel(effort),
			prerequisites: this.generatePrerequisites(type),
			status: OptimizationStatus.Identified,
			createdAt: new Date(),
			updatedAt: new Date(),
			validationRequired: impact !== "low",
			rollbackPlan: this.generateRollbackPlan(type),
		};
	}

	/**
	 * Create performance baseline
	 */
	createPerformanceBaseline(
		options: TestDataOptions = {},
	): PerformanceBaseline {
		this.setSeed(options.seed);
		const size = options.size || "medium";

		const baseTime = this.getBaselineTime(size);
		const baseMemory = this.getBaselineMemory(size);

		const testResults = this.generateTestResults(size);
		return {
			timestamp: options.realistic
				? new Date(Date.now() - this.randomInt(1, 30) * 24 * 60 * 60 * 1000)
				: new Date(),
			totalExecutionTime: baseTime,
			totalTests: testResults.total,
			failedTests: testResults.failed,
			failedSuites: this.randomInt(0, Math.ceil(testResults.failed / 5)),
			passRate: (testResults.passed / testResults.total) * 100,
			coveragePercentage: this.randomFloat(75, 95),
			memoryUsage: baseMemory,
			workerIssues: this.randomInt(1, 10) === 1,
			parserWarnings: this.randomInt(0, 5),
			environment: this.generateTestEnvironment(options),
			metadata: this.generateBaselineMetadata(options),
		};
	}

	/**
	 * Create multiple test suites for complex scenarios
	 */
	createTestSuiteCollection(
		count: number,
		options: TestDataOptions = {},
	): TestSuite[] {
		const suites: TestSuite[] = [];
		const sizes: Array<"small" | "medium" | "large" | "xlarge"> = [
			"small",
			"medium",
			"large",
			"xlarge",
		];

		for (let i = 0; i < count; i++) {
			const suiteOptions = {
				...options,
				size: options.size || sizes[i % sizes.length],
				customProps: {
					...options.customProps,
					collectionIndex: i,
					collectionSize: count,
				},
			};
			suites.push(this.createTestSuite(suiteOptions));
		}

		return suites;
	}

	/**
	 * Create realistic performance scenario data
	 */
	createPerformanceScenario(
		name: string,
		options: TestDataOptions = {},
	): {
		suites: TestSuite[];
		baselines: PerformanceBaseline[];
		opportunities: OptimizationOpportunity[];
	} {
		this.setSeed(options.seed);

		const suiteCount = this.randomInt(3, 8);
		const suites = this.createTestSuiteCollection(suiteCount, {
			...options,
			realistic: true,
			includeEdgeCases: true,
		});

		const baselines = suites.map((suite) =>
			this.createPerformanceBaseline({
				...options,
				customProps: { testSuiteId: suite.id, scenarioName: name },
			}),
		);

		const opportunityCount = this.randomInt(5, 15);
		const opportunities = Array.from({ length: opportunityCount }, () =>
			this.createOptimizationOpportunity({
				...options,
				customProps: { scenarioName: name },
			}),
		);

		return { suites, baselines, opportunities };
	}

	// Private helper methods

	private initializeDefaultTemplates(): void {
		// Initialize commonly used test data templates
		this.mockTemplates.set("simple-test", {
			id: "simple-test",
			name: "Simple Test Case",
			template: { duration: 100, category: "fast" },
			generator: () => ({ type: "simple", complexity: "low" }),
			variations: ["unit", "integration", "smoke"],
		});

		this.mockTemplates.set("complex-test", {
			id: "complex-test",
			name: "Complex Test Case",
			template: { duration: 2000, category: "slow" },
			generator: () => ({ type: "complex", complexity: "high" }),
			variations: ["integration", "e2e", "performance"],
		});
	}

	private setSeed(seed?: string | number): void {
		if (seed !== undefined) {
			this.seedValue =
				typeof seed === "string"
					? seed.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
					: seed;
		}
	}

	private randomInt(min: number, max: number): number {
		// Simple seeded random number generator
		this.seedValue = (this.seedValue * 9301 + 49297) % 233280;
		return Math.floor((this.seedValue / 233280) * (max - min + 1)) + min;
	}

	private randomFloat(min: number, max: number): number {
		this.seedValue = (this.seedValue * 9301 + 49297) % 233280;
		return (this.seedValue / 233280) * (max - min) + min;
	}

	private randomChoice<T>(array: T[]): T {
		return array[this.randomInt(0, array.length - 1)];
	}

	private generateId(prefix: string): string {
		return `${prefix}-${Date.now()}-${this.randomInt(1000, 9999)}`;
	}

	private getTestCaseCount(size: string): number {
		switch (size) {
			case "small":
				return this.randomInt(3, 8);
			case "medium":
				return this.randomInt(8, 20);
			case "large":
				return this.randomInt(20, 50);
			case "xlarge":
				return this.randomInt(50, 100);
			default:
				return this.randomInt(8, 20);
		}
	}

	private generateTestSuiteName(_options: TestDataOptions): string {
		const prefixes = [
			"Unit Tests",
			"Integration Tests",
			"API Tests",
			"Component Tests",
			"Service Tests",
		];
		const suffixes = ["Suite", "Spec", "Test Cases", "Validation"];
		const domains = [
			"User",
			"Authentication",
			"Database",
			"Payment",
			"Notification",
			"Analytics",
		];

		const prefix = this.randomChoice(prefixes);
		const domain = this.randomChoice(domains);
		const suffix = this.randomChoice(suffixes);

		return `${prefix} - ${domain} ${suffix}`;
	}

	private generateTestCaseName(_options: TestDataOptions): string {
		const actions = [
			"should create",
			"should update",
			"should delete",
			"should validate",
			"should process",
			"should handle",
		];
		const subjects = [
			"user data",
			"authentication",
			"payment",
			"notification",
			"file upload",
			"API request",
		];
		const conditions = [
			"successfully",
			"with validation",
			"with error handling",
			"asynchronously",
			"with retries",
		];

		const action = this.randomChoice(actions);
		const subject = this.randomChoice(subjects);
		const condition = this.randomChoice(conditions);

		return `${action} ${subject} ${condition}`;
	}

	private generateFilePath(type: string, _options: TestDataOptions): string {
		const directories = [
			"tests/unit",
			"tests/integration",
			"tests/e2e",
			"tests/api",
			"tests/component",
		];
		const fileNames = [
			"user",
			"auth",
			"payment",
			"notification",
			"analytics",
			"core",
			"utils",
		];

		const dir = this.randomChoice(directories);
		const fileName = this.randomChoice(fileNames);
		const extension = type === "suite" ? ".test.ts" : ".spec.ts";

		return `${dir}/${fileName}${extension}`;
	}

	private generateDuration(size: string, includeEdgeCases?: boolean): number {
		const baseDurations = {
			small: { min: 50, max: 300 },
			medium: { min: 200, max: 800 },
			large: { min: 500, max: 2000 },
			xlarge: { min: 1000, max: 5000 },
		};

		const range =
			baseDurations[size as keyof typeof baseDurations] || baseDurations.medium;
		let duration = this.randomInt(range.min, range.max);

		if (includeEdgeCases && this.randomInt(1, 10) === 1) {
			// 10% chance of edge case duration
			duration = this.randomInt(3000, 10000); // Very slow test
		}

		return duration;
	}

	private categorizeByDuration(duration: number): "fast" | "medium" | "slow" {
		if (duration < 300) return "fast";
		if (duration < 1000) return "medium";
		return "slow";
	}

	private generateCategoryEnum(size: string): TestCategory {
		switch (size) {
			case "small":
				return TestCategory.Critical;
			case "medium":
				return TestCategory.Optimize;
			case "large":
				return TestCategory.Optimize;
			case "xlarge":
				return TestCategory.Remove;
			default:
				return TestCategory.Optimize;
		}
	}

	private getComplexityLevel(size: string): ComplexityLevel {
		switch (size) {
			case "small":
				return ComplexityLevel.Low;
			case "medium":
				return ComplexityLevel.Medium;
			case "large":
				return ComplexityLevel.High;
			case "xlarge":
				return ComplexityLevel.High;
			default:
				return ComplexityLevel.Medium;
		}
	}

	private generateTestType(category: string): TestType {
		switch (category) {
			case "fast":
				return TestType.Unit;
			case "medium":
				return TestType.Integration;
			case "slow":
				return TestType.E2E;
			default:
				return TestType.Unit;
		}
	}

	private generatePriority(category: string): Priority {
		switch (category) {
			case "fast":
				return Priority.High;
			case "medium":
				return Priority.Medium;
			case "slow":
				return Priority.Low;
			default:
				return Priority.Medium;
		}
	}

	private generateCoverageAreas(_options: TestDataOptions): string[] {
		const areas = [
			"auth",
			"api",
			"ui",
			"database",
			"validation",
			"business-logic",
		];
		const count = this.randomInt(1, 3);
		const coverageAreas: string[] = [];

		for (let i = 0; i < count; i++) {
			const area = this.randomChoice(areas);
			if (!coverageAreas.includes(area)) {
				coverageAreas.push(area);
			}
		}

		return coverageAreas;
	}

	private generateTestResults(size: string): any {
		const testCount = this.getTestCaseCount(size);
		const failed = this.randomInt(0, Math.floor(testCount * 0.1));
		return {
			passed: testCount - failed,
			failed,
			total: testCount,
		};
	}

	private mapToOptimizationType(type: string): OptimizationType {
		const typeMap: Record<string, OptimizationType> = {
			parallelization: OptimizationType.SharedUtilities,
			setup_consolidation: OptimizationType.SimplifySetup,
			duplicate_elimination: OptimizationType.RemoveDuplicate,
			resource_optimization: OptimizationType.SharedUtilities,
			execution_order: OptimizationType.ConsolidateScenarios,
			mock_optimization: OptimizationType.BehaviorFocus,
			data_reuse: OptimizationType.SharedUtilities,
			timeout_optimization: OptimizationType.BehaviorFocus,
		};
		return typeMap[type] || OptimizationType.BehaviorFocus;
	}

	private mapToRiskLevel(impact: string): RiskLevel {
		switch (impact) {
			case "low":
				return RiskLevel.Low;
			case "medium":
				return RiskLevel.Medium;
			case "high":
				return RiskLevel.High;
			case "critical":
				return RiskLevel.High;
			default:
				return RiskLevel.Medium;
		}
	}

	private mapToEffortLevel(effort: string): EffortLevel {
		switch (effort) {
			case "low":
				return EffortLevel.Low;
			case "medium":
				return EffortLevel.Medium;
			case "high":
				return EffortLevel.High;
			default:
				return EffortLevel.Medium;
		}
	}

	private generateTestEnvironment(_options: TestDataOptions): TestEnvironment {
		const os = require("node:os");
		return {
			nodeVersion: process.version || "18.17.0",
			jestVersion: "29.5.0",
			platform: process.platform || "linux",
			arch: process.arch || "x64",
			cpuCount: os.cpus?.()?.length || 8,
			totalMemory: Math.round(
				(os.totalmem?.() || 16 * 1024 * 1024 * 1024) / 1024 / 1024,
			),
			availableMemory: Math.round(
				(os.freemem?.() || 8 * 1024 * 1024 * 1024) / 1024 / 1024,
			),
		};
	}

	private generateBaselineMetadata(options: TestDataOptions): BaselineMetadata {
		return {
			measurementDuration: this.randomInt(1000, 5000),
			retries: this.randomInt(0, 2),
			confidence: this.randomFloat(0.85, 0.99),
			notes: options.customProps?.notes || "Generated by TestDataFactory",
			gitCommit: options.customProps?.gitCommit,
			branch: options.customProps?.branch || "main",
		};
	}

	private generateRollbackPlan(type: string): string {
		const rollbackPlans: Record<string, string> = {
			parallelization: "Revert to sequential execution if parallel tests fail",
			setup_consolidation: "Restore individual setup code for each test",
			duplicate_elimination: "Restore removed tests if coverage drops",
			resource_optimization: "Restore original resource allocation",
			execution_order: "Revert to original test execution order",
			mock_optimization: "Restore original mock implementations",
			data_reuse: "Restore individual data generation for each test",
			timeout_optimization: "Restore original timeout values",
		};
		return (
			rollbackPlans[type] ||
			"Revert changes and restore original implementation"
		);
	}

	private generateDependencies(_options: TestDataOptions): string[] {
		if (this.randomInt(1, 3) === 1) return []; // 33% chance of no dependencies

		const possibleDeps = ["setup", "auth", "database", "config", "mocks"];
		const depCount = this.randomInt(1, 3);
		const dependencies: string[] = [];

		for (let i = 0; i < depCount; i++) {
			const dep = this.randomChoice(possibleDeps);
			if (!dependencies.includes(dep)) {
				dependencies.push(dep);
			}
		}

		return dependencies;
	}

	private generateOpportunityDescription(type: string, impact: string): string {
		const descriptions = {
			parallelization: `${impact} impact opportunity to run tests in parallel`,
			setup_consolidation: `Consolidate duplicate setup code (${impact} impact)`,
			duplicate_elimination: `Remove duplicate test cases (${impact} impact)`,
			resource_optimization: `Optimize resource usage (${impact} impact)`,
			execution_order: `Optimize test execution order (${impact} impact)`,
			mock_optimization: `Improve mock efficiency (${impact} impact)`,
			data_reuse: `Reuse test data across cases (${impact} impact)`,
			timeout_optimization: `Optimize test timeouts (${impact} impact)`,
		};

		return (
			descriptions[type as keyof typeof descriptions] ||
			`${type} optimization (${impact} impact)`
		);
	}

	private calculateTimeReduction(impact: string): number {
		const reductions = {
			low: this.randomInt(50, 200),
			medium: this.randomInt(200, 800),
			high: this.randomInt(800, 2000),
			critical: this.randomInt(2000, 5000),
		};

		return reductions[impact as keyof typeof reductions] || reductions.medium;
	}

	private generateAffectedTestIds(_options: TestDataOptions): string[] {
		const count = this.randomInt(1, 5);
		return Array.from({ length: count }, () => this.generateId("test"));
	}

	private generatePrerequisites(_type: string): string[] {
		return [
			"Stable test suite",
			"Performance baseline established",
			"Test isolation verified",
		];
	}

	private getBaselineTime(size: string): number {
		const baseTimes = {
			small: this.randomInt(500, 1500),
			medium: this.randomInt(1500, 4000),
			large: this.randomInt(4000, 10000),
			xlarge: this.randomInt(10000, 25000),
		};

		return baseTimes[size as keyof typeof baseTimes] || baseTimes.medium;
	}

	private getBaselineMemory(size: string): number {
		const baseMemory = {
			small: this.randomInt(20, 50),
			medium: this.randomInt(50, 150),
			large: this.randomInt(150, 400),
			xlarge: this.randomInt(400, 800),
		};

		return baseMemory[size as keyof typeof baseMemory] || baseMemory.medium;
	}
}
