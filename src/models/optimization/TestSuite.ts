/**
 * TestSuite model for test optimization (T017)
 * Represents a collection of related test cases with metadata
 *
 * Source: Data model specification, FR-001 (test suite analysis)
 */

export enum TestCategory {
  Critical = "critical",  // Must keep - API contracts, core logic
  Optimize = "optimize",  // Can simplify - implementation details
  Remove = "remove"       // Redundant - duplicates, deprecated
}

export enum ComplexityLevel {
  Low = "low",
  Medium = "medium",
  High = "high"
}

export interface TestCase {
  id: string;                    // Unique identifier within suite
  name: string;                  // Test description/name
  type: TestType;                // Unit, integration, contract, e2e
  executionTime: number;         // Individual execution time in ms
  isFlaky: boolean;             // Identified as intermittently failing
  duplicateOf?: string;         // Reference to original if duplicate
  coverageAreas: string[];      // Code areas this test covers
  lastFailure?: Date;           // Most recent failure timestamp
  priority: Priority;           // Importance level
}

export enum TestType {
  Unit = "unit",
  Integration = "integration",
  Contract = "contract",
  E2E = "e2e"
}

export enum Priority {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low"
}

export interface TestSuite {
  id: string;                    // Unique identifier for the suite
  name: string;                  // Human-readable suite name
  filePath: string;              // Absolute path to test file
  category: TestCategory;        // Classification tier
  testCases: TestCase[];         // Individual tests in the suite
  executionTime: number;         // Current execution time in ms
  lastModified: Date;            // Last modification timestamp
  dependencies: string[];        // External dependencies required
  setupComplexity: ComplexityLevel;  // Setup/teardown complexity rating
}

export class TestSuiteBuilder {
  private suite: Partial<TestSuite> = {};

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
    this.suite.testCases!.push(testCase);
    this.recalculateExecutionTime();
    return this;
  }

  addDependency(dependency: string): TestSuiteBuilder {
    if (!this.suite.dependencies!.includes(dependency)) {
      this.suite.dependencies!.push(dependency);
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

    return {
      id: this.suite.id!,
      name: this.suite.name!,
      filePath: this.suite.filePath || '',
      category: this.suite.category || TestCategory.Optimize,
      testCases: this.suite.testCases!,
      executionTime: this.suite.executionTime || 0,
      lastModified: this.suite.lastModified || new Date(),
      dependencies: this.suite.dependencies!,
      setupComplexity: this.suite.setupComplexity || ComplexityLevel.Medium
    };
  }

  private validateSuite(): void {
    if (!this.suite.id) {
      throw new Error('TestSuite id is required');
    }
    if (!this.suite.name) {
      throw new Error('TestSuite name is required');
    }
    if (this.suite.filePath && !this.suite.filePath.endsWith('.test.ts')) {
      throw new Error('TestSuite filePath must be a .test.ts file');
    }
  }

  private recalculateExecutionTime(): void {
    this.suite.executionTime = this.suite.testCases!.reduce(
      (sum, testCase) => sum + testCase.executionTime,
      0
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
      throw new Error('Execution time must be greater than 0');
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
    if (!this.testCase.coverageAreas!.includes(area)) {
      this.testCase.coverageAreas!.push(area);
    }
    return this;
  }

  withLastFailure(date: Date): TestCaseBuilder {
    this.testCase.lastFailure = date;
    return this;
  }

  build(): TestCase {
    this.validateTestCase();

    return {
      id: this.testCase.id!,
      name: this.testCase.name!,
      type: this.testCase.type || TestType.Unit,
      executionTime: this.testCase.executionTime || 50,
      isFlaky: this.testCase.isFlaky || false,
      duplicateOf: this.testCase.duplicateOf,
      coverageAreas: this.testCase.coverageAreas!,
      lastFailure: this.testCase.lastFailure,
      priority: this.testCase.priority || Priority.Medium
    };
  }

  private validateTestCase(): void {
    if (!this.testCase.id) {
      throw new Error('TestCase id is required');
    }
    if (!this.testCase.name) {
      throw new Error('TestCase name is required');
    }
  }
}

// Utility functions for TestSuite operations
export class TestSuiteUtils {
  static calculateTotalExecutionTime(testSuites: TestSuite[]): number {
    return testSuites.reduce((sum, suite) => sum + suite.executionTime, 0);
  }

  static categorizeTestSuites(testSuites: TestSuite[]): {
    critical: TestSuite[];
    optimize: TestSuite[];
    remove: TestSuite[];
  } {
    return testSuites.reduce(
      (categorized, suite) => {
        categorized[suite.category].push(suite);
        return categorized;
      },
      {
        critical: [] as TestSuite[],
        optimize: [] as TestSuite[],
        remove: [] as TestSuite[]
      }
    );
  }

  static findDuplicateTests(testSuites: TestSuite[]): TestCase[] {
    const duplicates: TestCase[] = [];

    testSuites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        if (testCase.duplicateOf) {
          duplicates.push(testCase);
        }
      });
    });

    return duplicates;
  }

  static findFlakyTests(testSuites: TestSuite[]): TestCase[] {
    const flakyTests: TestCase[] = [];

    testSuites.forEach(suite => {
      suite.testCases.forEach(testCase => {
        if (testCase.isFlaky) {
          flakyTests.push(testCase);
        }
      });
    });

    return flakyTests;
  }

  static validateTestSuite(suite: TestSuite): string[] {
    const errors: string[] = [];

    if (!suite.id || suite.id.trim() === '') {
      errors.push('TestSuite id must be unique and non-empty');
    }

    if (suite.executionTime <= 0) {
      errors.push('TestSuite executionTime must be greater than 0');
    }

    if (!suite.filePath.endsWith('.test.ts')) {
      errors.push('TestSuite filePath must be a .test.ts file');
    }

    // Validate test cases
    const testCaseIds = new Set<string>();
    suite.testCases.forEach(testCase => {
      if (testCaseIds.has(testCase.id)) {
        errors.push(`Duplicate test case ID: ${testCase.id}`);
      }
      testCaseIds.add(testCase.id);

      if (testCase.executionTime <= 0) {
        errors.push(`Test case ${testCase.id} executionTime must be greater than 0`);
      }
    });

    return errors;
  }
}