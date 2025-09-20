/**
 * TestCase model for test optimization (T018)
 * Individual test scenario within a test suite
 *
 * Source: Data model specification, FR-006 (consolidate duplicate scenarios)
 */

export { TestCase, TestCaseBuilder } from './TestSuite';
import { TestCase } from './TestSuite';
import { TestType, Priority } from './types';

// Additional TestCase-specific interfaces and utilities
export interface TestCaseMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  failureRate: number;
  stabilityScore: number; // 0-1, where 1 is completely stable
}

export interface TestCaseDependency {
  testCaseId: string;
  dependencyType: DependencyType;
  required: boolean;
}

export enum DependencyType {
  Setup = "setup",
  Data = "data",
  MockState = "mock_state",
  FileSystem = "filesystem",
  Network = "network",
  Database = "database"
}

export interface TestCaseAnalysis {
  testCase: TestCase;
  metrics: TestCaseMetrics;
  dependencies: TestCaseDependency[];
  duplicateScore: number; // 0-1, where 1 is exact duplicate
  optimizationPotential: OptimizationPotential;
}

export enum OptimizationPotential {
  High = "high",     // Can be significantly optimized or removed
  Medium = "medium", // Some optimization possible
  Low = "low",       // Already well optimized
  None = "none"      // Critical test, no optimization recommended
}

export class TestCaseAnalyzer {
  /**
   * Analyze a test case for optimization opportunities
   */
  static analyze(testCase: TestCase, allTestCases: TestCase[]): TestCaseAnalysis {
    const metrics = this.calculateMetrics(testCase);
    const dependencies = this.analyzeDependencies(testCase);
    const duplicateScore = this.calculateDuplicateScore(testCase, allTestCases);
    const optimizationPotential = this.assessOptimizationPotential(
      testCase,
      metrics,
      duplicateScore
    );

    return {
      testCase,
      metrics,
      dependencies,
      duplicateScore,
      optimizationPotential
    };
  }

  /**
   * Find similar test cases based on name and coverage areas
   */
  static findSimilarTests(target: TestCase, candidates: TestCase[]): TestCase[] {
    return candidates.filter(candidate => {
      if (candidate.id === target.id) return false;

      const namesSimilarity = this.calculateStringSimilarity(target.name, candidate.name);
      const coverageOverlap = this.calculateArrayOverlap(
        target.coverageAreas,
        candidate.coverageAreas
      );

      return namesSimilarity > 0.7 || coverageOverlap > 0.8;
    });
  }

  /**
   * Identify test cases that can be consolidated
   */
  static identifyConsolidationCandidates(testCases: TestCase[]): TestCase[][] {
    const groups: TestCase[][] = [];
    const processed = new Set<string>();

    testCases.forEach(testCase => {
      if (processed.has(testCase.id)) return;

      const similar = this.findSimilarTests(testCase, testCases);
      if (similar.length > 0) {
        const group = [testCase, ...similar];
        groups.push(group);
        group.forEach(tc => processed.add(tc.id));
      }
    });

    return groups;
  }

  private static calculateMetrics(testCase: TestCase): TestCaseMetrics {
    // Estimate metrics based on test case properties
    const baseMemory = 5; // MB
    const memoryMultiplier = testCase.type === TestType.Integration ? 3 : 1;

    const stabilityScore = testCase.isFlaky ? 0.3 : 0.95;
    const failureRate = testCase.lastFailure ? 0.1 : 0.01;

    return {
      executionTime: testCase.executionTime,
      memoryUsage: baseMemory * memoryMultiplier,
      cpuUsage: testCase.executionTime * 0.1, // Rough estimate
      failureRate,
      stabilityScore
    };
  }

  private static analyzeDependencies(testCase: TestCase): TestCaseDependency[] {
    const dependencies: TestCaseDependency[] = [];

    // Analyze test name and coverage areas for dependency hints
    const nameWords = testCase.name.toLowerCase().split(' ');

    if (nameWords.some(word => ['setup', 'init', 'before'].includes(word))) {
      dependencies.push({
        testCaseId: testCase.id,
        dependencyType: DependencyType.Setup,
        required: true
      });
    }

    if (nameWords.some(word => ['mock', 'stub', 'fake'].includes(word))) {
      dependencies.push({
        testCaseId: testCase.id,
        dependencyType: DependencyType.MockState,
        required: true
      });
    }

    if (nameWords.some(word => ['file', 'fs', 'filesystem'].includes(word))) {
      dependencies.push({
        testCaseId: testCase.id,
        dependencyType: DependencyType.FileSystem,
        required: true
      });
    }

    if (nameWords.some(word => ['api', 'http', 'network', 'request'].includes(word))) {
      dependencies.push({
        testCaseId: testCase.id,
        dependencyType: DependencyType.Network,
        required: false
      });
    }

    return dependencies;
  }

  private static calculateDuplicateScore(testCase: TestCase, allTestCases: TestCase[]): number {
    if (testCase.duplicateOf) return 1.0;

    let maxSimilarity = 0;

    allTestCases.forEach(other => {
      if (other.id === testCase.id) return;

      const nameSimilarity = this.calculateStringSimilarity(testCase.name, other.name);
      const coverageSimilarity = this.calculateArrayOverlap(
        testCase.coverageAreas,
        other.coverageAreas
      );

      const overallSimilarity = (nameSimilarity * 0.6) + (coverageSimilarity * 0.4);
      maxSimilarity = Math.max(maxSimilarity, overallSimilarity);
    });

    return maxSimilarity;
  }

  private static assessOptimizationPotential(
    testCase: TestCase,
    metrics: TestCaseMetrics,
    duplicateScore: number
  ): OptimizationPotential {
    // Critical tests have no optimization potential
    if (testCase.priority === Priority.Critical) {
      return OptimizationPotential.None;
    }

    // High duplicate score means high optimization potential
    if (duplicateScore > 0.8) {
      return OptimizationPotential.High;
    }

    // Flaky tests have high optimization potential (fix or remove)
    if (testCase.isFlaky) {
      return OptimizationPotential.High;
    }

    // Long execution time suggests optimization opportunity
    if (testCase.executionTime > 1000) { // >1 second
      return OptimizationPotential.Medium;
    }

    // Low stability suggests optimization opportunity
    if (metrics.stabilityScore < 0.8) {
      return OptimizationPotential.Medium;
    }

    return OptimizationPotential.Low;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  private static calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

// Utility functions for TestCase collections
export class TestCaseUtils {
  /**
   * Group test cases by type
   */
  static groupByType(testCases: TestCase[]): Record<TestType, TestCase[]> {
    return testCases.reduce((groups, testCase) => {
      if (!groups[testCase.type]) {
        groups[testCase.type] = [];
      }
      groups[testCase.type].push(testCase);
      return groups;
    }, {} as Record<TestType, TestCase[]>);
  }

  /**
   * Group test cases by priority
   */
  static groupByPriority(testCases: TestCase[]): Record<Priority, TestCase[]> {
    return testCases.reduce((groups, testCase) => {
      if (!groups[testCase.priority]) {
        groups[testCase.priority] = [];
      }
      groups[testCase.priority].push(testCase);
      return groups;
    }, {} as Record<Priority, TestCase[]>);
  }

  /**
   * Find the slowest test cases
   */
  static findSlowestTests(testCases: TestCase[], count: number = 10): TestCase[] {
    return [...testCases]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, count);
  }

  /**
   * Calculate total execution time for a collection of test cases
   */
  static calculateTotalTime(testCases: TestCase[]): number {
    return testCases.reduce((sum, testCase) => sum + testCase.executionTime, 0);
  }

  /**
   * Calculate failure rate for a collection of test cases
   */
  static calculateFailureRate(testCases: TestCase[]): number {
    const flakyTests = testCases.filter(tc => tc.isFlaky || tc.lastFailure);
    return testCases.length > 0 ? flakyTests.length / testCases.length : 0;
  }

  /**
   * Find test cases that cover specific areas
   */
  static findByCoverageArea(testCases: TestCase[], area: string): TestCase[] {
    return testCases.filter(testCase =>
      testCase.coverageAreas.some(ca =>
        ca.toLowerCase().includes(area.toLowerCase())
      )
    );
  }

  /**
   * Validate a collection of test cases for consistency
   */
  static validateTestCases(testCases: TestCase[]): string[] {
    const errors: string[] = [];
    const ids = new Set<string>();

    testCases.forEach((testCase, index) => {
      // Check for duplicate IDs
      if (ids.has(testCase.id)) {
        errors.push(`Duplicate test case ID at index ${index}: ${testCase.id}`);
      }
      ids.add(testCase.id);

      // Validate individual test case
      if (!testCase.name || testCase.name.trim() === '') {
        errors.push(`Test case at index ${index} has empty or invalid name`);
      }

      if (testCase.executionTime <= 0) {
        errors.push(`Test case ${testCase.id} has invalid execution time: ${testCase.executionTime}`);
      }

      // Validate duplicate reference
      if (testCase.duplicateOf && !testCases.some(tc => tc.id === testCase.duplicateOf)) {
        errors.push(`Test case ${testCase.id} references non-existent duplicate: ${testCase.duplicateOf}`);
      }
    });

    return errors;
  }
}