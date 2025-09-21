/**
 * TestAnalyzer service implementation (T021)
 * Analyzes test suites for optimization opportunities
 *
 * Implements ITestAnalyzer contract from test-optimization.contract.ts
 */

import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";

// Import from local models instead of external contract

import {
	ErrorUtils,
	FileOperationError,
	TestAnalysisError,
	ValidationError,
} from "../../models/optimization/errors";

import {
	EffortLevel,
	type OptimizationOpportunity,
	OptimizationType,
	RiskLevel,
} from "../../models/optimization/OptimizationOpportunity";
import {
	type TestCase,
	TestCaseBuilder,
	type TestSuite,
	TestSuiteBuilder,
} from "../../models/optimization/TestSuite";
import {
	ComplexityLevel,
	Priority,
	TestCategory,
	TestType,
} from "../../models/optimization/types";

export interface TestFileInfo {
	filePath: string;
	content: string;
	lastModified: Date;
	size: number;
}

export interface TestSuiteAnalysis {
	testSuites: TestSuite[];
	categorizedTests: CategorizedTests;
	opportunities: OptimizationOpportunity[];
	totalTests: number;
	totalSuites: number;
	totalTime: number;
	duplicates: number;
	flakyTests: number;
}

export interface CategorizedTests {
	critical: TestSuite[];
	optimize: TestSuite[];
	remove: TestSuite[];
	duplicates: any[];
}

export interface TestAnalysisOptions {
	includePatterns: string[];
	excludePatterns: string[];
	maxFileSize: number; // Maximum file size to analyze (bytes)
	timeout: number; // Analysis timeout (ms)
	enableParallelProcessing: boolean;
}

export interface TestIssue {
	type: "flaky" | "slow" | "duplicate" | "complex_setup" | "missing_coverage";
	severity: "low" | "medium" | "high";
	description: string;
	location: string;
	impact: number; // Estimated impact score (0-10)
}

export interface DuplicateTest {
	originalId: string;
	duplicateId: string;
	similarity: number; // Similarity score (0-1)
	reason: string;
}

export class TestAnalyzer {
	private options: TestAnalysisOptions;

	constructor(options: Partial<TestAnalysisOptions> = {}) {
		this.options = {
			includePatterns: ["**/*.test.ts", "**/*.spec.ts"],
			excludePatterns: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
			maxFileSize: 1024 * 1024, // 1MB
			timeout: 30000, // 30 seconds
			enableParallelProcessing: true,
			...options,
		};
	}

	async analyzeTestSuite(testDirectory: string): Promise<TestSuiteAnalysis> {
		if (!testDirectory || typeof testDirectory !== "string") {
			throw new Error("Test directory is required and must be a string");
		}

		if (!fs.existsSync(testDirectory)) {
			throw new Error(`Test directory does not exist: ${testDirectory}`);
		}

		const startTime = performance.now();

		try {
			// Find all test files
			const testFiles = await this.findTestFiles(testDirectory);
			console.log(`📁 Found ${testFiles.length} test files`);

			// Analyze each test file
			const testSuites = await this.analyzeTestFiles(testFiles);
			console.log(`🔍 Analyzed ${testSuites.length} test suites`);

			// Calculate aggregate metrics
			const totalTests = testSuites.reduce(
				(sum, suite) => sum + suite.testCases.length,
				0,
			);
			const totalSuites = testSuites.length;
			const executionTime = testSuites.reduce(
				(sum, suite) => sum + suite.executionTime,
				0,
			);

			// Calculate failure rate
			const failedTests = testSuites.reduce(
				(sum, suite) =>
					sum +
					suite.testCases.filter((tc) => tc.isFlaky || tc.lastFailure).length,
				0,
			);
			const failureRate = totalTests > 0 ? failedTests / totalTests : 0;

			// Identify issues
			const issues = await this.identifyIssues(testSuites);

			const analysis: TestSuiteAnalysis = {
				testSuites,
				categorizedTests: {
					critical: [],
					optimize: testSuites,
					remove: [],
					duplicates: [],
				},
				opportunities: [],
				totalTests,
				totalSuites,
				totalTime: executionTime,
				duplicates: 0,
				flakyTests: failedTests,
			};

			const endTime = performance.now();
			console.log(
				`✅ Analysis completed in ${(endTime - startTime).toFixed(2)}ms`,
			);

			return analysis;
		} catch (error) {
			throw new Error(
				`Test suite analysis failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async categorizeTests(
		analysis: TestSuiteAnalysis,
	): Promise<CategorizedTests> {
		if (!analysis) {
			throw new Error("Analysis is required for categorization");
		}

		const critical: TestSuite[] = [];
		const optimize: TestSuite[] = [];
		const remove: TestSuite[] = [];
		const duplicates: DuplicateTest[] = [];

		for (const suite of analysis.testSuites) {
			const category = await this.categorizeSuite(suite);

			switch (category) {
				case TestCategory.Critical:
					critical.push(suite);
					break;
				case TestCategory.Optimize:
					optimize.push(suite);
					break;
				case TestCategory.Remove:
					remove.push(suite);
					break;
			}
		}

		// Find duplicates across all test suites
		for (const suite of analysis.testSuites) {
			const suiteDuplicates = await this.findDuplicatesInSuite(
				suite,
				analysis.testSuites,
			);
			duplicates.push(...suiteDuplicates);
		}

		return {
			critical,
			optimize,
			remove,
			duplicates,
		};
	}

	async identifyOptimizations(
		categorized: CategorizedTests,
	): Promise<OptimizationOpportunity[]> {
		if (!categorized) {
			throw new Error(
				"Categorized tests are required for optimization identification",
			);
		}

		const opportunities: OptimizationOpportunity[] = [];

		// Process duplicates for removal
		if (categorized.duplicates.length > 0) {
			const duplicateOpportunities = this.createDuplicateRemovalOpportunities(
				categorized.duplicates,
			);
			opportunities.push(...duplicateOpportunities);
		}

		// Process optimize category for various optimizations
		for (const suite of categorized.optimize) {
			const suiteOpportunities = await this.identifySuiteOptimizations(suite);
			opportunities.push(...suiteOpportunities);
		}

		// Process remove category for complete removal
		for (const suite of categorized.remove) {
			const removeOpportunity = this.createRemovalOpportunity(suite);
			opportunities.push(removeOpportunity);
		}

		// Identify cross-suite optimizations
		const crossSuiteOpportunities = this.identifyCrossSuiteOptimizations([
			...categorized.critical,
			...categorized.optimize,
		]);
		opportunities.push(...crossSuiteOpportunities);

		return opportunities;
	}

	private async findTestFiles(directory: string): Promise<TestFileInfo[]> {
		const files: TestFileInfo[] = [];

		for (const pattern of this.options.includePatterns) {
			const globPattern = path.join(directory, pattern);
			const foundFiles = await glob(globPattern, {
				ignore: this.options.excludePatterns,
				absolute: true,
			});

			for (const filePath of foundFiles) {
				try {
					const stats = fs.statSync(filePath);

					if (stats.size > this.options.maxFileSize) {
						console.warn(
							`⚠️ Skipping large file: ${filePath} (${stats.size} bytes)`,
						);
						continue;
					}

					const content = fs.readFileSync(filePath, "utf-8");

					files.push({
						filePath,
						content,
						lastModified: stats.mtime,
						size: stats.size,
					});
				} catch (error) {
					console.warn(`⚠️ Could not read file: ${filePath}`, error);
				}
			}
		}

		return files;
	}

	private async analyzeTestFiles(
		testFiles: TestFileInfo[],
	): Promise<TestSuite[]> {
		const testSuites: TestSuite[] = [];

		for (const file of testFiles) {
			try {
				const suite = await this.analyzeTestFile(file);
				if (suite) {
					testSuites.push(suite);
				}
			} catch (error) {
				console.warn(`⚠️ Failed to analyze ${file.filePath}:`, error);
			}
		}

		return testSuites;
	}

	private async analyzeTestFile(file: TestFileInfo): Promise<TestSuite | null> {
		const { filePath, content, lastModified } = file;

		// Extract test cases from file content
		const testCases = this.extractTestCases(content, filePath);

		if (testCases.length === 0) {
			return null;
		}

		// Determine suite category based on content analysis
		const category = this.determineSuiteCategory(content, testCases);

		// Estimate setup complexity
		const setupComplexity = this.estimateSetupComplexity(content);

		// Extract dependencies
		const dependencies = this.extractDependencies(content);

		const suiteName = this.extractSuiteName(filePath, content);
		const suiteId = this.generateSuiteId(filePath);

		const suite = new TestSuiteBuilder(suiteId, suiteName)
			.withFilePath(filePath)
			.withCategory(category)
			.withSetupComplexity(setupComplexity)
			.withLastModified(lastModified);

		// Add dependencies
		dependencies.forEach((dep) => suite.addDependency(dep));

		// Add test cases
		testCases.forEach((testCase) => suite.addTestCase(testCase));

		return suite.build();
	}

	private extractTestCases(content: string, filePath: string): TestCase[] {
		const testCases: TestCase[] = [];

		// Find test cases using regex patterns
		const testPatterns = [
			/(?:test|it)\s*\(\s*['"`](.*?)['"`]/g,
			/(?:describe|context)\s*\(\s*['"`](.*?)['"`]/g,
		];

		let testIndex = 0;

		for (const pattern of testPatterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				const testName = match[1];
				const testType = this.determineTestType(testName, content);
				const priority = this.determinePriority(testName, content);
				const executionTime = this.estimateExecutionTime(testName, content);
				const isFlaky = this.detectFlakyTest(testName, content);
				const coverageAreas = this.extractCoverageAreas(testName, content);

				const testCase = new TestCaseBuilder(
					`${path.basename(filePath, ".test.ts")}_${testIndex}`,
					testName,
				)
					.withType(testType)
					.withPriority(priority)
					.withExecutionTime(executionTime)
					.markAsFlaky(isFlaky);

				coverageAreas.forEach((area) => testCase.addCoverageArea(area));

				testCases.push(testCase.build());
				testIndex++;
			}
		}

		return testCases;
	}

	private determineTestType(testName: string, content: string): TestType {
		const name = testName.toLowerCase();
		const contentLower = content.toLowerCase();

		if (
			name.includes("contract") ||
			name.includes("interface") ||
			contentLower.includes("contract")
		) {
			return TestType.Contract;
		}

		if (
			name.includes("integration") ||
			name.includes("e2e") ||
			contentLower.includes("integration")
		) {
			return TestType.Integration;
		}

		if (
			name.includes("unit") ||
			(!name.includes("integration") && !name.includes("e2e"))
		) {
			return TestType.Unit;
		}

		return TestType.Unit;
	}

	private determinePriority(testName: string, content: string): Priority {
		const name = testName.toLowerCase();
		const contentLower = content.toLowerCase();

		if (
			name.includes("critical") ||
			name.includes("core") ||
			contentLower.includes("critical") ||
			contentLower.includes("essential")
		) {
			return Priority.Critical;
		}

		if (name.includes("important") || name.includes("main")) {
			return Priority.High;
		}

		if (
			name.includes("edge") ||
			name.includes("error") ||
			name.includes("fail")
		) {
			return Priority.Medium;
		}

		return Priority.Medium;
	}

	private estimateExecutionTime(testName: string, content: string): number {
		const name = testName.toLowerCase();
		const contentLower = content.toLowerCase();

		// Base execution time
		let estimatedTime = 50; // 50ms default

		// Adjust based on test type and content
		if (name.includes("integration") || contentLower.includes("integration")) {
			estimatedTime = 200; // Integration tests are slower
		}

		if (
			name.includes("async") ||
			contentLower.includes("await") ||
			contentLower.includes("promise")
		) {
			estimatedTime += 100; // Async operations add time
		}

		if (contentLower.includes("settimeout") || contentLower.includes("delay")) {
			estimatedTime += 500; // Explicit delays
		}

		if (contentLower.includes("mock") || contentLower.includes("stub")) {
			estimatedTime += 50; // Mock setup overhead
		}

		return estimatedTime;
	}

	private detectFlakyTest(testName: string, content: string): boolean {
		const name = testName.toLowerCase();
		const contentLower = content.toLowerCase();

		// Look for flaky indicators
		const flakyIndicators = [
			"flaky",
			"intermittent",
			"sometimes",
			"random",
			"settimeout",
			"retry",
			"attempt",
			"timing",
		];

		return flakyIndicators.some(
			(indicator) =>
				name.includes(indicator) || contentLower.includes(indicator),
		);
	}

	private extractCoverageAreas(testName: string, content: string): string[] {
		const areas: string[] = [];

		// Extract from imports
		const importMatches = content.match(/from\s+['"`]([^'"`]+)['"`]/g);
		if (importMatches) {
			importMatches.forEach((match) => {
				const modulePath = match.match(/from\s+['"`]([^'"`]+)['"`]/)?.[1];
				if (modulePath && !modulePath.startsWith(".")) {
					areas.push(modulePath);
				}
			});
		}

		// Extract from test name
		const nameWords = testName.toLowerCase().split(/[\s\-_]/);
		areas.push(...nameWords.filter((word) => word.length > 2));

		return [...new Set(areas)]; // Remove duplicates
	}

	private categorizeSuite(suite: TestSuite): TestCategory {
		// Critical criteria
		if (this.isCriticalSuite(suite)) {
			return TestCategory.Critical;
		}

		// Remove criteria
		if (this.shouldRemoveSuite(suite)) {
			return TestCategory.Remove;
		}

		// Default to optimize
		return TestCategory.Optimize;
	}

	private isCriticalSuite(suite: TestSuite): boolean {
		const fileName = path.basename(suite.filePath, ".test.ts");
		const criticalIndicators = [
			"api",
			"contract",
			"interface",
			"core",
			"engine",
			"parser",
		];

		// Check filename
		if (
			criticalIndicators.some((indicator) =>
				fileName.toLowerCase().includes(indicator),
			)
		) {
			return true;
		}

		// Check if majority of tests are critical priority
		const criticalTests = suite.testCases.filter(
			(tc) => tc.priority === Priority.Critical,
		);
		return criticalTests.length > suite.testCases.length * 0.5;
	}

	private shouldRemoveSuite(suite: TestSuite): boolean {
		// Remove if all tests are duplicates
		const duplicates = suite.testCases.filter((tc) => tc.duplicateOf);
		if (
			duplicates.length === suite.testCases.length &&
			suite.testCases.length > 0
		) {
			return true;
		}

		// Remove if all tests are flaky and low priority
		const flakyLowPriority = suite.testCases.filter(
			(tc) => tc.isFlaky && tc.priority === Priority.Low,
		);
		if (
			flakyLowPriority.length === suite.testCases.length &&
			suite.testCases.length > 0
		) {
			return true;
		}

		return false;
	}

	private async findDuplicatesInSuite(
		suite: TestSuite,
		allSuites: TestSuite[],
	): Promise<DuplicateTest[]> {
		const duplicates: DuplicateTest[] = [];

		for (const testCase of suite.testCases) {
			for (const otherSuite of allSuites) {
				if (otherSuite.id === suite.id) continue;

				for (const otherTestCase of otherSuite.testCases) {
					const similarity = this.calculateTestSimilarity(
						testCase,
						otherTestCase,
					);

					if (similarity > 0.8) {
						// 80% similarity threshold
						duplicates.push({
							originalId: otherTestCase.id,
							duplicateId: testCase.id,
							similarity,
							reason: `Similar test names and coverage areas (${(similarity * 100).toFixed(1)}% match)`,
						});
					}
				}
			}
		}

		return duplicates;
	}

	private calculateTestSimilarity(test1: TestCase, test2: TestCase): number {
		// Name similarity
		const nameSimilarity = this.calculateStringSimilarity(
			test1.name,
			test2.name,
		);

		// Coverage area similarity
		const coverageSimilarity = this.calculateArraySimilarity(
			test1.coverageAreas,
			test2.coverageAreas,
		);

		// Type and priority similarity
		const typeSimilarity = test1.type === test2.type ? 1 : 0;
		const prioritySimilarity = test1.priority === test2.priority ? 1 : 0;

		// Weighted average
		return (
			nameSimilarity * 0.4 +
			coverageSimilarity * 0.3 +
			typeSimilarity * 0.2 +
			prioritySimilarity * 0.1
		);
	}

	private calculateStringSimilarity(str1: string, str2: string): number {
		const words1 = str1.toLowerCase().split(/\s+/);
		const words2 = str2.toLowerCase().split(/\s+/);

		const intersection = words1.filter((word) => words2.includes(word));
		const union = [...new Set([...words1, ...words2])];

		return intersection.length / union.length;
	}

	private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
		if (arr1.length === 0 && arr2.length === 0) return 1;
		if (arr1.length === 0 || arr2.length === 0) return 0;

		const set1 = new Set(arr1);
		const set2 = new Set(arr2);

		const intersection = new Set([...set1].filter((x) => set2.has(x)));
		const union = new Set([...set1, ...set2]);

		return intersection.size / union.size;
	}

	private createDuplicateRemovalOpportunities(
		duplicates: DuplicateTest[],
	): OptimizationOpportunity[] {
		const opportunities: OptimizationOpportunity[] = [];

		// Group duplicates by original test
		const grouped = duplicates.reduce(
			(groups, duplicate) => {
				if (!groups[duplicate.originalId]) {
					groups[duplicate.originalId] = [];
				}
				groups[duplicate.originalId].push(duplicate);
				return groups;
			},
			{} as Record<string, DuplicateTest[]>,
		);

		Object.entries(grouped).forEach(([originalId, dups]) => {
			const timeSaving = dups.length * 50; // Assume 50ms per duplicate
			opportunities.push({
				id: `remove-duplicates-${originalId}`,
				type: OptimizationType.RemoveDuplicate,
				targetSuite: "multiple", // Will be refined during execution
				targetCases: [originalId, ...dups.map((d) => d.duplicateId)],
				description: `Remove ${dups.length} duplicate test(s) of ${originalId}`,
				impact: {
					timeReduction: timeSaving,
					complexityReduction: dups.length * 0.1,
					maintainabilityImprovement: dups.length * 0.2,
				},
				estimatedTimeSaving: timeSaving,
				riskLevel: RiskLevel.Low,
				implementationEffort: EffortLevel.Minimal,
				prerequisites: [],
				status: "identified" as any,
				createdAt: new Date(),
				updatedAt: new Date(),
				validationRequired: true,
			});
		});

		return opportunities;
	}

	private async identifySuiteOptimizations(
		suite: TestSuite,
	): Promise<OptimizationOpportunity[]> {
		const opportunities: OptimizationOpportunity[] = [];

		// Check for flaky tests
		const flakyTests = suite.testCases.filter((tc) => tc.isFlaky);
		if (flakyTests.length > 0) {
			const timeSaving = flakyTests.length * 200; // Flaky tests often take longer
			opportunities.push({
				id: `fix-flaky-${suite.id}`,
				type: OptimizationType.FixFlaky,
				targetSuite: suite.id,
				targetCases: flakyTests.map((tc) => tc.id),
				description: `Fix ${flakyTests.length} flaky test(s) in ${suite.name}`,
				impact: {
					timeReduction: timeSaving,
					complexityReduction: flakyTests.length * 0.3,
					maintainabilityImprovement: flakyTests.length * 0.4,
				},
				estimatedTimeSaving: timeSaving,
				riskLevel: RiskLevel.Medium,
				implementationEffort: EffortLevel.Medium,
				prerequisites: [],
				status: "identified" as any,
				createdAt: new Date(),
				updatedAt: new Date(),
				validationRequired: true,
			});
		}

		// Check for complex setup
		if (suite.setupComplexity === ComplexityLevel.High) {
			const timeSaving = 100; // Reduced setup time
			opportunities.push({
				id: `simplify-setup-${suite.id}`,
				type: OptimizationType.SimplifySetup,
				targetSuite: suite.id,
				description: `Simplify complex setup/teardown in ${suite.name}`,
				impact: {
					timeReduction: timeSaving,
					complexityReduction: 0.6,
					maintainabilityImprovement: 0.5,
				},
				estimatedTimeSaving: timeSaving,
				riskLevel: RiskLevel.Medium,
				implementationEffort: EffortLevel.Low,
				prerequisites: [],
				status: "identified" as any,
				createdAt: new Date(),
				updatedAt: new Date(),
				validationRequired: true,
			});
		}

		return opportunities;
	}

	private createRemovalOpportunity(suite: TestSuite): OptimizationOpportunity {
		return {
			id: `remove-suite-${suite.id}`,
			type: OptimizationType.RemoveDuplicate,
			targetSuite: suite.id,
			description: `Remove redundant test suite: ${suite.name}`,
			impact: {
				timeReduction: suite.executionTime,
				complexityReduction: 0.8,
				maintainabilityImprovement: 0.6,
			},
			estimatedTimeSaving: suite.executionTime,
			riskLevel: RiskLevel.Low,
			implementationEffort: EffortLevel.Minimal,
			prerequisites: [],
			status: "identified" as any,
			createdAt: new Date(),
			updatedAt: new Date(),
			validationRequired: true,
		};
	}

	private identifyCrossSuiteOptimizations(
		suites: TestSuite[],
	): OptimizationOpportunity[] {
		const opportunities: OptimizationOpportunity[] = [];

		// Look for shared utilities opportunity
		const duplicatedSetups = this.findDuplicatedSetups(suites);
		if (duplicatedSetups.length > 2) {
			const timeSaving = duplicatedSetups.length * 50;
			opportunities.push({
				id: "shared-utilities-global",
				type: OptimizationType.SharedUtilities,
				targetSuite: "multiple",
				description: `Create shared test utilities for ${duplicatedSetups.length} suites`,
				impact: {
					timeReduction: timeSaving,
					complexityReduction: duplicatedSetups.length * 0.2,
					maintainabilityImprovement: duplicatedSetups.length * 0.3,
				},
				estimatedTimeSaving: timeSaving,
				riskLevel: RiskLevel.Low,
				implementationEffort: EffortLevel.Low,
				prerequisites: [],
				status: "identified" as any,
				createdAt: new Date(),
				updatedAt: new Date(),
				validationRequired: true,
			});
		}

		return opportunities;
	}

	private findDuplicatedSetups(suites: TestSuite[]): string[] {
		// Simple heuristic: suites with similar dependencies might have duplicated setups
		const dependencyGroups = suites.reduce(
			(groups, suite) => {
				const depKey = suite.dependencies.sort().join(",");
				if (!groups[depKey]) {
					groups[depKey] = [];
				}
				groups[depKey].push(suite.id);
				return groups;
			},
			{} as Record<string, string[]>,
		);

		return Object.values(dependencyGroups)
			.filter((group) => group.length > 1)
			.flat();
	}

	private async identifyIssues(testSuites: TestSuite[]): Promise<TestIssue[]> {
		const issues: TestIssue[] = [];

		testSuites.forEach((suite) => {
			// Flaky test issues
			const flakyTests = suite.testCases.filter((tc) => tc.isFlaky);
			flakyTests.forEach((test) => {
				issues.push({
					type: "flaky",
					severity: "high",
					description: `Flaky test: ${test.name}`,
					location: `${suite.filePath}:${test.id}`,
					impact: 8,
				});
			});

			// Slow test issues
			const slowTests = suite.testCases.filter((tc) => tc.executionTime > 1000);
			slowTests.forEach((test) => {
				issues.push({
					type: "slow",
					severity: "medium",
					description: `Slow test: ${test.name} (${test.executionTime}ms)`,
					location: `${suite.filePath}:${test.id}`,
					impact: 6,
				});
			});

			// Complex setup issues
			if (suite.setupComplexity === ComplexityLevel.High) {
				issues.push({
					type: "complex_setup",
					severity: "medium",
					description: `Complex setup detected in ${suite.name}`,
					location: suite.filePath,
					impact: 5,
				});
			}
		});

		return issues;
	}

	private determineSuiteCategory(
		content: string,
		testCases: TestCase[],
	): TestCategory {
		// Analyze content and test cases to determine category
		const contentLower = content.toLowerCase();

		if (
			contentLower.includes("contract") ||
			contentLower.includes("interface") ||
			testCases.some((tc) => tc.priority === Priority.Critical)
		) {
			return TestCategory.Critical;
		}

		const flakyTests = testCases.filter((tc) => tc.isFlaky);
		if (flakyTests.length === testCases.length && testCases.length > 0) {
			return TestCategory.Remove;
		}

		return TestCategory.Optimize;
	}

	private estimateSetupComplexity(content: string): ComplexityLevel {
		const contentLower = content.toLowerCase();

		let complexityScore = 0;

		// Look for complexity indicators
		if (
			contentLower.includes("beforeall") ||
			contentLower.includes("beforeeach")
		)
			complexityScore += 2;
		if (contentLower.includes("afterall") || contentLower.includes("aftereach"))
			complexityScore += 2;
		if (contentLower.includes("mock")) complexityScore += 1;
		if (contentLower.includes("stub")) complexityScore += 1;
		if (contentLower.includes("spy")) complexityScore += 1;
		if (contentLower.includes("fixture")) complexityScore += 2;
		if (contentLower.includes("database") || contentLower.includes("db"))
			complexityScore += 3;
		if (contentLower.includes("server") || contentLower.includes("api"))
			complexityScore += 3;

		if (complexityScore >= 6) return ComplexityLevel.High;
		if (complexityScore >= 3) return ComplexityLevel.Medium;
		return ComplexityLevel.Low;
	}

	private extractDependencies(content: string): string[] {
		const dependencies: string[] = [];

		// Extract from import statements
		const importMatches = content.match(
			/(?:import|from)\s+['"`]([^'"`]+)['"`]/g,
		);
		if (importMatches) {
			importMatches.forEach((match) => {
				const dep = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
				if (dep && !dep.startsWith(".")) {
					dependencies.push(dep);
				}
			});
		}

		return [...new Set(dependencies)];
	}

	private extractSuiteName(filePath: string, content: string): string {
		// Try to extract from describe blocks
		const describeMatch = content.match(/describe\s*\(\s*['"`](.*?)['"`]/);
		if (describeMatch) {
			return describeMatch[1];
		}

		// Fallback to filename
		return path.basename(filePath, path.extname(filePath));
	}

	private generateSuiteId(filePath: string): string {
		const relativePath = path.relative(process.cwd(), filePath);
		return relativePath.replace(/[/\\]/g, "_").replace(/\.test\.ts$/, "");
	}
}
