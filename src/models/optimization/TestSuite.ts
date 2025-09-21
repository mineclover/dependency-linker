/**
 * TestSuite model for test optimization (T017)
 * Represents a collection of related test cases with metadata
 *
 * Source: Data model specification, FR-001 (test suite analysis)
 */

import {
	ComplexityLevel,
	Priority,
	TestCategory,
	type TestCharacteristics,
	TestType,
} from "./types";

export interface ITestCase {
	id: string; // Unique identifier within suite
	name: string; // Test description/name
	type: TestType; // Unit, integration, contract, e2e
	executionTime: number; // Individual execution time in ms
	isFlaky: boolean; // Identified as intermittently failing
	duplicateOf?: string; // Reference to original if duplicate
	coverageAreas: string[]; // Code areas this test covers
	lastFailure?: Date; // Most recent failure timestamp
	priority: Priority; // Importance level
	filePath?: string; // File path for the test
	estimatedDuration: number; // Estimated duration (alias for executionTime) - make required
	lineStart?: number; // Line number where test starts
	lineEnd?: number; // Line number where test ends
	category?: string; // Test category for optimization
	constraints?: string[]; // Optimization constraints
	characteristics?: TestCharacteristics; // Test characteristics for optimization
	setupCode?: string; // Setup code for the test
	dependsOn?: string[]; // Dependencies on other tests
}

export class TestCase implements ITestCase {
	id: string;
	name: string;
	type: TestType;
	executionTime: number;
	isFlaky: boolean;
	duplicateOf?: string;
	coverageAreas: string[];
	lastFailure?: Date;
	priority: Priority;
	filePath?: string;
	estimatedDuration: number;
	lineStart?: number;
	lineEnd?: number;
	category?: string;
	constraints?: string[];
	characteristics?: TestCharacteristics;
	setupCode?: string;
	dependsOn?: string[];

	constructor(data: Partial<ITestCase> & { id: string; name: string }) {
		this.id = data.id;
		this.name = data.name;
		this.type = data.type || TestType.Unit;
		this.executionTime = data.executionTime || 50;
		this.isFlaky = data.isFlaky || false;
		this.duplicateOf = data.duplicateOf;
		this.coverageAreas = data.coverageAreas || [];
		this.lastFailure = data.lastFailure;
		this.priority = data.priority || Priority.Medium;
		this.filePath = data.filePath;
		this.estimatedDuration = data.estimatedDuration || this.executionTime;
		this.lineStart = data.lineStart;
		this.lineEnd = data.lineEnd;
		this.category = data.category;
		this.constraints = data.constraints;
		this.characteristics = data.characteristics;
		this.setupCode = data.setupCode;
		this.dependsOn = data.dependsOn;
	}
}

export interface ITestSuite {
	id: string; // Unique identifier for the suite
	name: string; // Human-readable suite name
	filePath: string; // Absolute path to test file
	category: TestCategory; // Classification tier
	testCases: TestCase[]; // Individual tests in the suite
	executionTime: number; // Current execution time in ms
	lastModified: Date; // Last modification timestamp
	dependencies: string[]; // External dependencies required
	setupComplexity: ComplexityLevel; // Setup/teardown complexity rating
}

export class TestSuite implements ITestSuite {
	id: string;
	name: string;
	filePath: string;
	category: TestCategory;
	testCases: TestCase[];
	executionTime: number;
	lastModified: Date;
	dependencies: string[];
	setupComplexity: ComplexityLevel;

	constructor(data: Partial<ITestSuite> & { id: string; name: string }) {
		this.id = data.id;
		this.name = data.name;
		this.filePath = data.filePath || "";
		this.category = data.category || TestCategory.Optimize;
		this.testCases = data.testCases || [];
		this.executionTime = data.executionTime || 0;
		this.lastModified = data.lastModified || new Date();
		this.dependencies = data.dependencies || [];
		this.setupComplexity = data.setupComplexity || ComplexityLevel.Medium;
	}
}

export class TestSuiteBuilder {
	private suite: Partial<ITestSuite> = {};

	constructor(id: string, name: string) {
		this.suite.id = id;
		this.suite.name = name;
		this.suite.testCases = [];
		this.suite.dependencies = [];
	}

	withFilePath(filePath: string): TestSuiteBuilder {
		this.suite.filePath = filePath;
		return this;
	}

	withCategory(category: TestCategory): TestSuiteBuilder {
		this.suite.category = category;
		return this;
	}

	withSetupComplexity(complexity: ComplexityLevel): TestSuiteBuilder {
		this.suite.setupComplexity = complexity;
		return this;
	}

	addTestCase(testCase: TestCase): TestSuiteBuilder {
		this.suite.testCases?.push(testCase);
		this.recalculateExecutionTime();
		return this;
	}

	addDependency(dependency: string): TestSuiteBuilder {
		if (!this.suite.dependencies?.includes(dependency)) {
			this.suite.dependencies?.push(dependency);
		}
		return this;
	}

	withLastModified(date: Date): TestSuiteBuilder {
		this.suite.lastModified = date;
		return this;
	}

	build(): TestSuite {
		this.validateSuite();
		this.recalculateExecutionTime();

		// After validation, these fields are guaranteed to exist
		if (
			!this.suite.id ||
			!this.suite.name ||
			!this.suite.testCases ||
			!this.suite.dependencies
		) {
			throw new Error("Required suite fields are missing after validation");
		}

		return {
			id: this.suite.id,
			name: this.suite.name,
			filePath: this.suite.filePath || "",
			category: this.suite.category || TestCategory.Optimize,
			testCases: this.suite.testCases,
			executionTime: this.suite.executionTime || 0,
			lastModified: this.suite.lastModified || new Date(),
			dependencies: this.suite.dependencies,
			setupComplexity: this.suite.setupComplexity || ComplexityLevel.Medium,
		};
	}

	private validateSuite(): void {
		if (!this.suite.id) {
			throw new Error("TestSuite id is required");
		}
		if (!this.suite.name) {
			throw new Error("TestSuite name is required");
		}
		if (this.suite.filePath && !this.suite.filePath.endsWith(".test.ts")) {
			throw new Error("TestSuite filePath must be a .test.ts file");
		}
	}

	private recalculateExecutionTime(): void {
		this.suite.executionTime = this.suite.testCases?.reduce(
			(sum, testCase) => sum + testCase.executionTime,
			0,
		);
	}
}

export class TestCaseBuilder {
	private testCase: Partial<TestCase> = {};

	constructor(id: string, name: string) {
		this.testCase.id = id;
		this.testCase.name = name;
		this.testCase.coverageAreas = [];
	}

	withType(type: TestType): TestCaseBuilder {
		this.testCase.type = type;
		return this;
	}

	withExecutionTime(executionTime: number): TestCaseBuilder {
		if (executionTime <= 0) {
			throw new Error("Execution time must be greater than 0");
		}
		this.testCase.executionTime = executionTime;
		return this;
	}

	withPriority(priority: Priority): TestCaseBuilder {
		this.testCase.priority = priority;
		return this;
	}

	markAsFlaky(isFlaky: boolean = true): TestCaseBuilder {
		this.testCase.isFlaky = isFlaky;
		return this;
	}

	markAsDuplicateOf(originalId: string): TestCaseBuilder {
		this.testCase.duplicateOf = originalId;
		return this;
	}

	addCoverageArea(area: string): TestCaseBuilder {
		if (!this.testCase.coverageAreas?.includes(area)) {
			this.testCase.coverageAreas?.push(area);
		}
		return this;
	}

	withLastFailure(date: Date): TestCaseBuilder {
		this.testCase.lastFailure = date;
		return this;
	}

	build(): TestCase {
		this.validateTestCase();

		// After validation, these fields are guaranteed to exist
		if (
			!this.testCase.id ||
			!this.testCase.name ||
			!this.testCase.coverageAreas
		) {
			throw new Error("Required test case fields are missing after validation");
		}

		const executionTime = this.testCase.executionTime || 50;
		return {
			id: this.testCase.id,
			name: this.testCase.name,
			type: this.testCase.type || TestType.Unit,
			executionTime,
			isFlaky: this.testCase.isFlaky || false,
			duplicateOf: this.testCase.duplicateOf,
			coverageAreas: this.testCase.coverageAreas,
			lastFailure: this.testCase.lastFailure,
			priority: this.testCase.priority || Priority.Medium,
			estimatedDuration: this.testCase.estimatedDuration || executionTime,
			filePath: this.testCase.filePath,
			lineStart: this.testCase.lineStart,
			lineEnd: this.testCase.lineEnd,
			category: this.testCase.category,
			constraints: this.testCase.constraints,
			characteristics: this.testCase.characteristics,
			setupCode: this.testCase.setupCode,
			dependsOn: this.testCase.dependsOn,
		};
	}

	private validateTestCase(): void {
		if (!this.testCase.id) {
			throw new Error("TestCase id is required");
		}
		if (!this.testCase.name) {
			throw new Error("TestCase name is required");
		}
	}
}

// Utility functions for TestSuite operations
export function calculateTotalExecutionTime(testSuites: ITestSuite[]): number {
	return testSuites.reduce((sum, suite) => sum + suite.executionTime, 0);
}

export function categorizeTestSuites(testSuites: ITestSuite[]): {
	critical: ITestSuite[];
	optimize: ITestSuite[];
	remove: ITestSuite[];
} {
	return testSuites.reduce(
		(categorized, suite) => {
			categorized[suite.category].push(suite);
			return categorized;
		},
		{
			critical: [] as ITestSuite[],
			optimize: [] as ITestSuite[],
			remove: [] as ITestSuite[],
		},
	);
}

export function findDuplicateTests(testSuites: ITestSuite[]): ITestCase[] {
	const duplicates: ITestCase[] = [];

	for (const suite of testSuites) {
		for (const testCase of suite.testCases) {
			if (testCase.duplicateOf) {
				duplicates.push(testCase);
			}
		}
	}

	return duplicates;
}

export function findFlakyTests(testSuites: ITestSuite[]): ITestCase[] {
	const flakyTests: ITestCase[] = [];

	for (const suite of testSuites) {
		for (const testCase of suite.testCases) {
			if (testCase.isFlaky) {
				flakyTests.push(testCase);
			}
		}
	}

	return flakyTests;
}

export function validateTestSuite(suite: ITestSuite): string[] {
	const errors: string[] = [];

	if (!suite.id || suite.id.trim() === "") {
		errors.push("TestSuite id must be unique and non-empty");
	}

	if (suite.executionTime <= 0) {
		errors.push("TestSuite executionTime must be greater than 0");
	}

	if (!suite.filePath.endsWith(".test.ts")) {
		errors.push("TestSuite filePath must be a .test.ts file");
	}

	// Validate test cases
	const testCaseIds = new Set<string>();
	for (const testCase of suite.testCases) {
		if (testCaseIds.has(testCase.id)) {
			errors.push(`Duplicate test case ID: ${testCase.id}`);
		}
		testCaseIds.add(testCase.id);

		if (testCase.executionTime <= 0) {
			errors.push(
				`Test case ${testCase.id} executionTime must be greater than 0`,
			);
		}
	}

	return errors;
}

// Legacy class export removed - use individual functions instead

// Re-export types from the types module for convenience
export { ComplexityLevel, Priority, TestCategory, TestType } from "./types";
