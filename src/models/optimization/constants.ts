/**
 * Constants for test optimization framework
 * Centralized configuration values and defaults
 */

/**
 * Performance targets for optimization
 */
export const PERFORMANCE_TARGETS = {
  /** Target execution time in milliseconds (1.5 seconds) */
  TARGET_EXECUTION_TIME: 1500,

  /** Target number of tests after optimization */
  TARGET_TEST_COUNT: 250,

  /** Target pass rate percentage (>99%) */
  TARGET_PASS_RATE: 99,

  /** Target memory usage in MB */
  TARGET_MEMORY_USAGE: 100,

  /** Target suite reliability percentage */
  TARGET_SUITE_RELIABILITY: 95,

  /** Maximum allowed failed tests */
  MAX_FAILED_TESTS: 2
} as const;

/**
 * Current baseline performance (before optimization)
 */
export const CURRENT_BASELINE = {
  /** Current execution time in milliseconds */
  EXECUTION_TIME: 3170,

  /** Current total test count */
  TOTAL_TESTS: 309,

  /** Current failed test count */
  FAILED_TESTS: 23,

  /** Current pass rate percentage */
  PASS_RATE: 92.6,

  /** Current memory usage in MB */
  MEMORY_USAGE: 120,

  /** Current parser warnings count */
  PARSER_WARNINGS: 15,

  /** Whether worker issues are present */
  WORKER_ISSUES: true
} as const;

/**
 * Optimization thresholds and limits
 */
export const OPTIMIZATION_LIMITS = {
  /** Maximum number of optimizations to apply in a single run */
  MAX_OPTIMIZATIONS_PER_RUN: 10,

  /** Maximum execution time for a single test (ms) */
  MAX_SINGLE_TEST_TIME: 5000,

  /** Minimum similarity score for duplicate detection (0-1) */
  DUPLICATE_SIMILARITY_THRESHOLD: 0.8,

  /** Maximum retry attempts for flaky test detection */
  MAX_FLAKY_TEST_RETRIES: 3,

  /** Minimum confidence level for baseline establishment */
  MIN_BASELINE_CONFIDENCE: 0.9,

  /** Maximum number of parallel optimizations */
  MAX_PARALLEL_OPTIMIZATIONS: 5
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  /** Default timeout for test execution (ms) */
  TEST_EXECUTION_TIMEOUT: 30000,

  /** Default performance tolerance percentage */
  PERFORMANCE_TOLERANCE_PERCENT: 10,

  /** Default number of warmup runs */
  WARMUP_RUNS: 2,

  /** Default number of measurement runs */
  MEASUREMENT_RUNS: 5,

  /** Default monitoring interval (ms) */
  MONITORING_INTERVAL_MS: 100,

  /** Default memory alert threshold (MB) */
  MEMORY_ALERT_THRESHOLD_MB: 50,

  /** Default duration alert threshold (ms) */
  DURATION_ALERT_THRESHOLD_MS: 1000
} as const;

/**
 * Risk level priorities for optimization ordering
 */
export const RISK_PRIORITIES = {
  low: 3,
  medium: 2,
  high: 1
} as const;

/**
 * Effort level weights for optimization prioritization
 */
export const EFFORT_WEIGHTS = {
  minimal: 4,
  low: 3,
  medium: 2,
  high: 1
} as const;

/**
 * Test type execution time estimates (ms)
 */
export const TEST_TYPE_ESTIMATES = {
  unit: 50,
  integration: 200,
  contract: 100,
  e2e: 1000
} as const;

/**
 * Priority level weights
 */
export const PRIORITY_WEIGHTS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
} as const;

/**
 * Complexity level multipliers
 */
export const COMPLEXITY_MULTIPLIERS = {
  low: 1.0,
  medium: 1.5,
  high: 2.0
} as const;

/**
 * File patterns for test detection
 */
export const TEST_FILE_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.js',
  '**/*.spec.ts',
  '**/*.spec.js',
  '**/test/**/*.ts',
  '**/test/**/*.js',
  '**/tests/**/*.ts',
  '**/tests/**/*.js'
] as const;

/**
 * Excluded patterns for test analysis
 */
export const EXCLUDED_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.*'
] as const;

/**
 * Optimization strategy names mapping
 */
export const STRATEGY_NAMES = {
  remove_duplicate: 'duplicate-removal',
  simplify_setup: 'setup-optimization',
  consolidate_scenarios: 'scenario-consolidation',
  fix_flaky: 'flaky-test-fix',
  behavior_focus: 'behavior-driven-focus',
  shared_utilities: 'shared-utilities'
} as const;

/**
 * Memory usage categories (MB)
 */
export const MEMORY_CATEGORIES = {
  /** Low memory usage threshold */
  LOW: 10,

  /** Medium memory usage threshold */
  MEDIUM: 50,

  /** High memory usage threshold */
  HIGH: 100,

  /** Critical memory usage threshold */
  CRITICAL: 200
} as const;

/**
 * Performance validation thresholds
 */
export const VALIDATION_THRESHOLDS = {
  /** Minimum pass rate for validation */
  MIN_PASS_RATE: 95,

  /** Maximum execution time deviation (%) */
  MAX_EXECUTION_TIME_DEVIATION: 20,

  /** Maximum memory usage deviation (%) */
  MAX_MEMORY_DEVIATION: 30,

  /** Minimum coverage retention (%) */
  MIN_COVERAGE_RETENTION: 80
} as const;

/**
 * Real-time monitoring configuration
 */
export const MONITORING_CONFIG = {
  /** Default sampling interval (ms) */
  DEFAULT_INTERVAL_MS: 100,

  /** Maximum data points to retain */
  MAX_DATA_POINTS: 1000,

  /** Alert cooldown period (ms) */
  ALERT_COOLDOWN_MS: 5000,

  /** Maximum alert count per session */
  MAX_ALERTS_PER_SESSION: 50
} as const;

/**
 * Error retry configuration
 */
export const RETRY_CONFIG = {
  /** Default number of retries */
  DEFAULT_RETRIES: 3,

  /** Default retry delay (ms) */
  DEFAULT_RETRY_DELAY: 1000,

  /** Maximum retry delay (ms) */
  MAX_RETRY_DELAY: 10000,

  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2
} as const;

/**
 * Log level priorities
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
} as const;

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    enableDetailedLogging: true,
    performanceTolerancePercent: 20,
    maxExecutionTime: 60000
  },
  testing: {
    enableDetailedLogging: false,
    performanceTolerancePercent: 5,
    maxExecutionTime: 30000
  },
  production: {
    enableDetailedLogging: false,
    performanceTolerancePercent: 10,
    maxExecutionTime: 45000
  }
} as const;

/**
 * Utility function to get environment-specific config
 */
export function getEnvironmentConfig(env: string = process.env.NODE_ENV || 'development') {
  return ENVIRONMENT_CONFIG[env as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development;
}

/**
 * Utility function to calculate priority score
 */
export function calculatePriorityScore(
  timeSaving: number,
  riskLevel: keyof typeof RISK_PRIORITIES,
  effortLevel: keyof typeof EFFORT_WEIGHTS
): number {
  const savingsScore = timeSaving / 1000; // Normalize to seconds
  const riskScore = RISK_PRIORITIES[riskLevel];
  const effortScore = EFFORT_WEIGHTS[effortLevel];

  return savingsScore * 0.5 + riskScore * 0.3 + effortScore * 0.2;
}

/**
 * Utility function to determine if performance meets targets
 */
export function meetsPerformanceTargets(metrics: {
  executionTime: number;
  testCount: number;
  passRate: number;
  memoryUsage: number;
}): boolean {
  return (
    metrics.executionTime <= PERFORMANCE_TARGETS.TARGET_EXECUTION_TIME &&
    metrics.testCount <= PERFORMANCE_TARGETS.TARGET_TEST_COUNT &&
    metrics.passRate >= PERFORMANCE_TARGETS.TARGET_PASS_RATE &&
    metrics.memoryUsage <= PERFORMANCE_TARGETS.TARGET_MEMORY_USAGE
  );
}

/**
 * Utility function to calculate improvement percentage
 */
export function calculateImprovementPercentage(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((baseline - current) / baseline) * 100;
}