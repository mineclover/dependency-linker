# Data Model: Test Case Optimization

**Feature**: Test Case Optimization
**Date**: 2025-01-15
**Source**: Derived from functional requirements and research analysis

## Core Entities

### TestSuite
**Purpose**: Represents a collection of related test cases with metadata
**Source**: FR-001 (test suite analysis), research findings

```typescript
interface TestSuite {
  id: string                    // Unique identifier for the suite
  name: string                  // Human-readable suite name
  filePath: string              // Absolute path to test file
  category: TestCategory        // Classification tier
  testCases: TestCase[]         // Individual tests in the suite
  executionTime: number         // Current execution time in ms
  lastModified: Date            // Last modification timestamp
  dependencies: string[]        // External dependencies required
  setupComplexity: ComplexityLevel  // Setup/teardown complexity rating
}
```

**Validation Rules**:
- id must be unique across all test suites
- executionTime must be > 0
- category must be one of: Critical, Optimize, Remove
- filePath must exist and be .test.ts file

**Relationships**:
- TestSuite contains 1-n TestCases
- TestSuite belongs to 1 TestCategory
- TestSuite can reference 0-n other TestSuites (dependencies)

### TestCase
**Purpose**: Individual test scenario within a test suite
**Source**: FR-006 (consolidate duplicate scenarios), research categorization

```typescript
interface TestCase {
  id: string                    // Unique identifier within suite
  name: string                  // Test description/name
  type: TestType                // Unit, integration, contract, e2e
  executionTime: number         // Individual execution time in ms
  isFlaky: boolean             // Identified as intermittently failing
  duplicateOf?: string         // Reference to original if duplicate
  coverageAreas: string[]      // Code areas this test covers
  lastFailure?: Date           // Most recent failure timestamp
  priority: Priority           // Importance level
}
```

**Validation Rules**:
- name must be descriptive and unique within suite
- executionTime must be > 0
- if duplicateOf is set, test is marked for removal
- priority must align with TestCategory of parent suite

**Relationships**:
- TestCase belongs to 1 TestSuite
- TestCase can be duplicate of another TestCase
- TestCase covers 0-n CoverageAreas

### TestCategory
**Purpose**: Classification system for optimization strategy
**Source**: Research three-tier classification system

```typescript
enum TestCategory {
  Critical = "critical",     // Must keep - API contracts, core logic
  Optimize = "optimize",     // Can simplify - implementation details
  Remove = "remove"          // Redundant - duplicates, deprecated
}

interface TestCategoryRules {
  category: TestCategory
  description: string
  optimizationStrategy: string
  preservationRequirements: string[]
  estimatedCount: number
}
```

**Category Definitions**:
- **Critical**: Contract tests, core business logic, critical integration paths
- **Optimize**: Implementation-heavy tests, complex setups, behavior candidates
- **Remove**: Duplicate scenarios, over-specified tests, deprecated feature tests

### CoverageReport
**Purpose**: Metrics tracking for optimization impact measurement
**Source**: FR-004 (maintain coverage), FR-008 (provide metrics)

```typescript
interface CoverageReport {
  id: string                    // Report identifier
  timestamp: Date              // When report was generated
  totalTests: number           // Count of all tests
  executionTime: number        // Total execution time in ms
  passRate: number            // Percentage of passing tests
  coveragePercentage: number   // Code coverage percentage
  failedTests: TestCase[]     // List of failing tests
  flakyTests: TestCase[]      // List of intermittent failures
  optimizationOpportunities: OptimizationOpportunity[]
}
```

**Validation Rules**:
- passRate must be between 0-100
- coveragePercentage must be between 0-100
- executionTime must be > 0
- totalTests must match sum of all TestCases

### OptimizationOpportunity
**Purpose**: Identified improvement areas with impact assessment
**Source**: FR-010 (identify flaky tests), research risk assessment

```typescript
interface OptimizationOpportunity {
  id: string                    // Unique identifier
  type: OptimizationType       // Category of optimization
  targetSuite: string          // TestSuite.id this applies to
  targetCases?: string[]       // Specific TestCase.ids if applicable
  description: string          // What needs optimization
  estimatedTimeSaving: number  // Expected execution time reduction (ms)
  riskLevel: RiskLevel         // Risk assessment for this change
  implementationEffort: EffortLevel  // Required work level
  prerequisites: string[]       // What must be done first
}

enum OptimizationType {
  RemoveDuplicate = "remove_duplicate",
  SimplifySetup = "simplify_setup",
  ConsolidateScenarios = "consolidate_scenarios",
  FixFlaky = "fix_flaky",
  BehaviorFocus = "behavior_focus",
  SharedUtilities = "shared_utilities"
}

enum RiskLevel {
  Low = "low",          // Minimal chance of regression
  Medium = "medium",    // Some validation required
  High = "high"         // Extensive testing needed
}

enum EffortLevel {
  Minimal = "minimal",  // <1 hour
  Low = "low",         // 1-4 hours
  Medium = "medium",    // 1-2 days
  High = "high"        // >2 days
}
```

### PerformanceBaseline
**Purpose**: Current state metrics for comparison
**Source**: Research current state analysis

```typescript
interface PerformanceBaseline {
  totalExecutionTime: 3.17    // seconds (current)
  totalTests: 309             // count (current)
  failedTests: 23            // count (current)
  failedSuites: 5            // count (current)
  passRate: 92.6             // percentage (current)
  workerExitIssues: true     // cleanup problems detected
  parserWarnings: number     // duplicate registration warnings
}

interface PerformanceTarget {
  targetExecutionTime: 1.5    // seconds (goal)
  targetTests: 250           // count (goal)
  targetFailedTests: 2       // count (goal) - <1% failure rate
  targetPassRate: 99.0       // percentage (goal)
  targetSuiteReliability: 95.0  // percentage (goal)
}
```

## Entity Relationships

### Primary Relationships
```
TestSuite 1:n TestCase
TestCase n:1 TestCategory (via parent TestSuite)
TestCase 0:1 TestCase (duplicateOf relationship)
CoverageReport 0:n OptimizationOpportunity
OptimizationOpportunity n:1 TestSuite
OptimizationOpportunity 0:n TestCase
```

### Aggregation Rules
```
TestSuite.executionTime = sum(TestCase.executionTime) for all cases in suite
CoverageReport.totalTests = count(all TestCase entities)
CoverageReport.passRate = (totalTests - failedTests.length) / totalTests * 100
TestCategory.estimatedCount = count(TestSuite where category = this.category)
```

## State Transitions

### TestCase Lifecycle
```
New → Analyzed → Categorized → [Optimized|Removed|Preserved] → Validated
```

### TestSuite Optimization Flow
```
Current → Analyzed → Categorized → Optimized → Tested → Completed
```

**State Validation**:
- TestCase cannot be marked Removed until duplicateOf is verified
- TestSuite cannot move to Optimized until all TestCases are categorized
- CoverageReport cannot be generated until all TestCases have current executionTime

## Derived Metrics

### Optimization Impact Calculation
```typescript
interface OptimizationImpact {
  timeSavingPercentage: number  // (baseline.time - optimized.time) / baseline.time * 100
  testReduction: number         // baseline.count - optimized.count
  reliabilityImprovement: number // optimized.passRate - baseline.passRate
  coverageMaintained: boolean   // optimized.coverage >= baseline.coverage
}
```

### Success Criteria Validation
```typescript
interface SuccessValidation {
  executionTimeTarget: boolean  // actual <= 1.5 seconds
  testCountReduction: boolean   // 20% reduction achieved
  reliabilityImprovement: boolean // >95% suite reliability
  coveragePreserved: boolean    // coverage >= baseline
  flakyTestsEliminated: boolean // <1% failure rate
}
```

---

**Data Model Complete**: All entities support the functional requirements and optimization workflow