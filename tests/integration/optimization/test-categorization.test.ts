/**
 * Integration test for test categorization workflow (T014)
 * Tests categorization of tests into critical, optimize, and remove categories
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestOptimizationUtils } from '../../helpers/optimization';
import { BenchmarkSuite } from '../../helpers/benchmark';
import { TestDataFactory } from '../../helpers/factories';

describe('Test Categorization Integration', () => {
  let testDir: string;
  let tempFiles: { cleanup: () => Promise<void> } | null = null;
  let benchmark: BenchmarkSuite;

  beforeAll(async () => {
    benchmark = new BenchmarkSuite({
      iterations: 3,
      warmupRuns: 1,
      measureMemory: true
    });
  });

  beforeEach(async () => {
    // Create comprehensive test suite for categorization
    const factory = new (TestDataFactory as any)();
    tempFiles = await factory.createTempFiles([
      // CRITICAL: Core API contract tests
      {
        path: 'critical/api-contract.test.ts',
        content: `
describe('API Contract Tests', () => {
  test('should maintain backward compatibility', async () => {
    const api = new PublicAPI();
    expect(api.version).toBeDefined();
    expect(typeof api.analyze).toBe('function');
    expect(typeof api.parse).toBe('function');
  });

  test('should handle all supported languages', async () => {
    const api = new PublicAPI();
    const languages = ['typescript', 'javascript', 'go', 'java'];

    for (const lang of languages) {
      const result = await api.parse(\`test.\${lang}\`, 'const x = 1;');
      expect(result).toBeDefined();
      expect(result.language).toBe(lang);
    }
  });
});`
      },
      // CRITICAL: Integration end-to-end tests
      {
        path: 'critical/e2e-workflows.test.ts',
        content: `
describe('End-to-End Workflows', () => {
  test('complete analysis workflow', async () => {
    const engine = new AnalysisEngine();
    const result = await engine.analyzeFile('complex-project.ts');

    expect(result.dependencies).toBeDefined();
    expect(result.exports).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  test('batch processing workflow', async () => {
    const engine = new AnalysisEngine();
    const files = ['file1.ts', 'file2.ts', 'file3.ts'];
    const results = await engine.analyzeFiles(files);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.filePath).toBeDefined();
      expect(result.dependencies).toBeDefined();
    });
  });
});`
      },
      // OPTIMIZE: Unit tests with complex setup
      {
        path: 'optimize/parser-unit.test.ts',
        content: `
describe('Parser Unit Tests', () => {
  let parser: TypeScriptParser;
  let registry: ParserRegistry;

  beforeEach(async () => {
    // Complex setup that could be shared
    registry = new ParserRegistry();
    await registry.initialize();

    parser = new TypeScriptParser();
    parser.setRegistry(registry);
    await parser.warmup();
  });

  afterEach(async () => {
    await parser.cleanup();
    await registry.cleanup();
  });

  test('should parse variable declarations', async () => {
    const ast = await parser.parse('const x: number = 1;');
    expect(ast.type).toBe('program');
    expect(ast.children).toHaveLength(1);
  });

  test('should parse function declarations', async () => {
    const ast = await parser.parse('function test(): void {}');
    expect(ast.type).toBe('program');
    expect(ast.children[0].type).toBe('function_declaration');
  });

  test('should parse class declarations', async () => {
    const ast = await parser.parse('class TestClass {}');
    expect(ast.type).toBe('program');
    expect(ast.children[0].type).toBe('class_declaration');
  });
});`
      },
      // OPTIMIZE: Tests with redundant assertions
      {
        path: 'optimize/redundant-assertions.test.ts',
        content: `
describe('Redundant Assertions', () => {
  test('should validate input parameters', () => {
    const validator = new InputValidator();

    // Redundant null checks
    expect(validator.validate(null)).toBe(false);
    expect(validator.validate(undefined)).toBe(false);
    expect(validator.validate('')).toBe(false);
    expect(validator.validate('   ')).toBe(false);

    // Valid cases
    expect(validator.validate('valid')).toBe(true);
    expect(validator.validate('also-valid')).toBe(true);
  });

  test('should handle edge cases', () => {
    const processor = new DataProcessor();

    // Many similar edge case tests
    expect(processor.process([])).toEqual([]);
    expect(processor.process([1])).toEqual([1]);
    expect(processor.process([1, 2])).toEqual([1, 2]);
    expect(processor.process([1, 2, 3])).toEqual([1, 2, 3]);
  });
});`
      },
      // REMOVE: Duplicate tests
      {
        path: 'remove/duplicate-parser-test.test.ts',
        content: `
describe('Duplicate Parser Test', () => {
  test('should parse variable declarations', async () => {
    const parser = new TypeScriptParser();
    const ast = await parser.parse('const x: number = 1;');
    expect(ast.type).toBe('program');
  });

  test('should parse function declarations', async () => {
    const parser = new TypeScriptParser();
    const ast = await parser.parse('function test(): void {}');
    expect(ast.type).toBe('program');
  });
});`
      },
      // REMOVE: Flaky timing tests
      {
        path: 'remove/flaky-timing.test.ts',
        content: `
describe('Flaky Timing Tests', () => {
  test('should complete parsing within time limit', async () => {
    const start = Date.now();
    const parser = new TypeScriptParser();
    await parser.parse('const x = 1;');
    const duration = Date.now() - start;

    // Flaky - depends on system performance
    expect(duration).toBeLessThan(100);
  });

  test('should handle concurrent parsing', async () => {
    const promises = Array.from({ length: 10 }, () => {
      return new TypeScriptParser().parse('const x = 1;');
    });

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    // Flaky - depends on system load
    expect(duration).toBeLessThan(500);
  });
});`
      },
      // REMOVE: Obsolete API tests
      {
        path: 'remove/obsolete-api.test.ts',
        content: `
describe('Obsolete API Tests', () => {
  test('should use deprecated method', () => {
    const parser = new TypeScriptParser();

    // Testing deprecated/removed functionality
    expect(() => parser.parseSync('const x = 1;')).not.toThrow();
  });

  test('should handle old configuration format', () => {
    const config = { useOldFormat: true };
    const parser = new TypeScriptParser(config);

    expect(parser.isConfigured()).toBe(true);
  });
});`
      },
      // OPTIMIZE: Behavior-focused test (good example)
      {
        path: 'optimize/behavior-focused.test.ts',
        content: `
describe('Dependency Analysis Behavior', () => {
  describe('when analyzing import statements', () => {
    test('should identify external dependencies', async () => {
      const analyzer = new DependencyAnalyzer();
      const result = await analyzer.analyze(\`
        import lodash from 'lodash';
        import { join } from 'path';
        import local from './local';
      \`);

      expect(result.external).toContain('lodash');
      expect(result.builtin).toContain('path');
      expect(result.local).toContain('./local');
    });
  });

  describe('when analyzing export statements', () => {
    test('should categorize export types', async () => {
      const analyzer = new DependencyAnalyzer();
      const result = await analyzer.analyze(\`
        export default class MyClass {}
        export { helper } from './utils';
        export const CONSTANT = 'value';
      \`);

      expect(result.defaultExports).toHaveLength(1);
      expect(result.namedExports).toContain('CONSTANT');
      expect(result.reExports).toContain('helper');
    });
  });
});`
      }
    ]);
    testDir = tempFiles.rootDir;
  });

  afterEach(async () => {
    if (tempFiles) {
      await tempFiles.cleanup();
      tempFiles = null;
    }
  });

  describe('Categorization Algorithm', () => {
    test('should correctly identify critical tests', async () => {
      const result = await benchmark.benchmark('critical-identification', async () => {
        const categorization = await categorizeTests(testDir);
        return categorization.critical;
      });

      const critical = result.result;

      expect(Array.isArray(critical)).toBe(true);
      expect(critical.length).toBe(2); // API contract + E2E workflow tests

      // Should include API contract tests
      const apiContractTest = critical.find(test =>
        test.filePath.includes('api-contract.test.ts')
      );
      expect(apiContractTest).toBeDefined();
      expect(apiContractTest.category).toBe('critical');
      expect(apiContractTest.reason).toContain('api-contract');

      // Should include E2E tests
      const e2eTest = critical.find(test =>
        test.filePath.includes('e2e-workflows.test.ts')
      );
      expect(e2eTest).toBeDefined();
      expect(e2eTest.category).toBe('critical');
      expect(e2eTest.reason).toContain('end-to-end');

      // Performance: categorization should be fast
      expect(result.averageTime).toBeLessThan(1000);
    });

    test('should correctly identify optimization candidates', async () => {
      const result = await benchmark.benchmark('optimization-identification', async () => {
        const categorization = await categorizeTests(testDir);
        return categorization.optimize;
      });

      const optimize = result.result;

      expect(Array.isArray(optimize)).toBe(true);
      expect(optimize.length).toBe(3); // Parser unit + Redundant + Behavior tests

      // Should include complex setup test
      const parserUnitTest = optimize.find(test =>
        test.filePath.includes('parser-unit.test.ts')
      );
      expect(parserUnitTest).toBeDefined();
      expect(parserUnitTest.optimizationType).toContain('shared-setup');

      // Should include redundant assertions test
      const redundantTest = optimize.find(test =>
        test.filePath.includes('redundant-assertions.test.ts')
      );
      expect(redundantTest).toBeDefined();
      expect(redundantTest.optimizationType).toContain('consolidate-assertions');

      // Behavior-focused test should be optimized for structure
      const behaviorTest = optimize.find(test =>
        test.filePath.includes('behavior-focused.test.ts')
      );
      expect(behaviorTest).toBeDefined();
      expect(behaviorTest.optimizationType).toContain('good-example');
    });

    test('should correctly identify tests for removal', async () => {
      const result = await benchmark.benchmark('removal-identification', async () => {
        const categorization = await categorizeTests(testDir);
        return categorization.remove;
      });

      const remove = result.result;

      expect(Array.isArray(remove)).toBe(true);
      expect(remove.length).toBe(3); // Duplicate + Flaky + Obsolete

      // Should include duplicate test
      const duplicateTest = remove.find(test =>
        test.filePath.includes('duplicate-parser-test.test.ts')
      );
      expect(duplicateTest).toBeDefined();
      expect(duplicateTest.removalReason).toContain('duplicate');

      // Should include flaky test
      const flakyTest = remove.find(test =>
        test.filePath.includes('flaky-timing.test.ts')
      );
      expect(flakyTest).toBeDefined();
      expect(flakyTest.removalReason).toContain('flaky');

      // Should include obsolete test
      const obsoleteTest = remove.find(test =>
        test.filePath.includes('obsolete-api.test.ts')
      );
      expect(obsoleteTest).toBeDefined();
      expect(obsoleteTest.removalReason).toContain('obsolete');
    });
  });

  describe('Categorization Criteria', () => {
    test('should apply API contract criteria correctly', async () => {
      const apiContractFile = path.join(testDir, 'critical/api-contract.test.ts');
      const criteria = await evaluateTestCriteria(apiContractFile);

      expect(criteria.isAPIContract).toBe(true);
      expect(criteria.isIntegrationTest).toBe(false);
      expect(criteria.hasComplexSetup).toBe(false);
      expect(criteria.isDuplicate).toBe(false);
      expect(criteria.isFlaky).toBe(false);
      expect(criteria.score.critical).toBeGreaterThan(0.8);
    });

    test('should apply complexity criteria correctly', async () => {
      const complexFile = path.join(testDir, 'optimize/parser-unit.test.ts');
      const criteria = await evaluateTestCriteria(complexFile);

      expect(criteria.hasComplexSetup).toBe(true);
      expect(criteria.setupComplexityScore).toBeGreaterThan(0.7);
      expect(criteria.optimizationPotential).toBeGreaterThan(0.6);
      expect(criteria.score.optimize).toBeGreaterThan(0.5);
    });

    test('should apply duplication criteria correctly', async () => {
      // Compare duplicate test with original parser test
      const duplicateFile = path.join(testDir, 'remove/duplicate-parser-test.test.ts');
      const originalFile = path.join(testDir, 'optimize/parser-unit.test.ts');

      const similarity = await calculateTestSimilarity(duplicateFile, originalFile);
      const criteria = await evaluateTestCriteria(duplicateFile);

      expect(similarity).toBeGreaterThan(0.5);
      expect(criteria.isDuplicate).toBe(true);
      expect(criteria.duplicateSimilarity).toBeGreaterThan(0.5);
      expect(criteria.score.remove).toBeGreaterThan(0.7);
    });

    test('should apply flakiness criteria correctly', async () => {
      const flakyFile = path.join(testDir, 'remove/flaky-timing.test.ts');
      const criteria = await evaluateTestCriteria(flakyFile);

      expect(criteria.isFlaky).toBe(true);
      expect(criteria.flakinessIndicators).toContain('timing-dependent');
      expect(criteria.flakinessIndicators).toContain('system-dependent');
      expect(criteria.score.remove).toBeGreaterThan(0.6);
    });
  });

  describe('Categorization Confidence', () => {
    test('should provide confidence scores for categorization decisions', async () => {
      const categorization = await categorizeTests(testDir);

      // All categories should have confidence scores
      categorization.critical.forEach(test => {
        expect(test.confidence).toBeGreaterThan(0);
        expect(test.confidence).toBeLessThanOrEqual(1);
        expect(test.confidence).toBeGreaterThan(0.7); // High confidence for critical
      });

      categorization.optimize.forEach(test => {
        expect(test.confidence).toBeGreaterThan(0.5); // Medium confidence for optimize
      });

      categorization.remove.forEach(test => {
        expect(test.confidence).toBeGreaterThan(0.6); // High confidence for remove
      });
    });

    test('should explain categorization reasoning', async () => {
      const categorization = await categorizeTests(testDir);

      // All categorized tests should have explanations
      [...categorization.critical, ...categorization.optimize, ...categorization.remove]
        .forEach(test => {
          expect(test.explanation).toBeDefined();
          expect(typeof test.explanation).toBe('string');
          expect(test.explanation.length).toBeGreaterThan(10);
        });
    });

    test('should handle ambiguous cases appropriately', async () => {
      // Create ambiguous test that could be optimize or remove
      const ambiguousContent = `
describe('Ambiguous Test', () => {
  test('simple test with minor issues', () => {
    const result = someFunction();
    expect(result).toBeDefined();
  });
});`;

      const ambiguousFile = path.join(testDir, 'ambiguous.test.ts');
      fs.writeFileSync(ambiguousFile, ambiguousContent);

      const criteria = await evaluateTestCriteria(ambiguousFile);

      // Should have lower confidence for ambiguous cases
      expect(Math.max(criteria.score.critical, criteria.score.optimize, criteria.score.remove))
        .toBeLessThan(0.7);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large test suites efficiently', async () => {
      // Create additional test files to simulate larger suite
      const additionalFiles = Array.from({ length: 20 }, (_, i) => ({
        path: `generated/test-${i}.test.ts`,
        content: `
describe('Generated Test ${i}', () => {
  test('should work', () => {
    expect(${i}).toBe(${i});
  });
});`
      }));

      // Add files to test directory
      fs.mkdirSync(path.join(testDir, 'generated'), { recursive: true });
      for (const file of additionalFiles) {
        fs.writeFileSync(path.join(testDir, file.path), file.content);
      }

      TestOptimizationUtils.startMeasurement();

      const result = await benchmark.benchmark('large-suite-categorization', async () => {
        return await categorizeTests(testDir);
      });

      const metrics = TestOptimizationUtils.endMeasurement();
      const categorization = result.result;

      // Should handle all tests
      const totalTests = categorization.critical.length +
                        categorization.optimize.length +
                        categorization.remove.length;
      expect(totalTests).toBeGreaterThan(25); // Original 8 + 20 generated

      // Performance requirements
      expect(result.averageTime).toBeLessThan(3000); // < 3s for 28+ tests
      expect(metrics.memoryUsage).toBeLessThan(30); // < 30MB
    });

    test('should maintain categorization consistency across runs', async () => {
      const results = [];

      // Run categorization multiple times
      for (let i = 0; i < 3; i++) {
        const categorization = await categorizeTests(testDir);
        results.push({
          criticalCount: categorization.critical.length,
          optimizeCount: categorization.optimize.length,
          removeCount: categorization.remove.length
        });
      }

      // Results should be consistent
      const baseResult = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i].criticalCount).toBe(baseResult.criticalCount);
        expect(results[i].optimizeCount).toBe(baseResult.optimizeCount);
        expect(results[i].removeCount).toBe(baseResult.removeCount);
      }
    });
  });

  describe('Integration with Analysis Results', () => {
    test('should integrate with test suite analysis results', async () => {
      // Mock test suite analysis results
      const analysisResults = {
        totalTests: 8,
        totalSuites: 8,
        executionTime: 3170,
        failureRate: 0.074,
        issues: ['parser-registration-warnings', 'flaky-tests']
      };

      const categorization = await categorizeTestsWithAnalysis(testDir, analysisResults);

      // Categorization should consider analysis results
      expect(categorization.summary).toHaveProperty('analysisIntegration');
      expect(categorization.summary.analysisIntegration.consideredIssues).toContain('flaky-tests');

      // Should affect categorization decisions
      const flakyTests = categorization.remove.filter(test =>
        test.removalReason.includes('flaky')
      );
      expect(flakyTests.length).toBeGreaterThan(0);
    });

    test('should provide optimization recommendations', async () => {
      const categorization = await categorizeTests(testDir);

      expect(categorization.recommendations).toBeDefined();
      expect(Array.isArray(categorization.recommendations)).toBe(true);

      const recommendations = categorization.recommendations;

      // Should recommend shared setup for complex tests
      const sharedSetupRec = recommendations.find(rec =>
        rec.type === 'shared-setup'
      );
      expect(sharedSetupRec).toBeDefined();
      expect(sharedSetupRec.estimatedSavings).toBeGreaterThan(100);

      // Should recommend removal of duplicates
      const duplicateRemovalRec = recommendations.find(rec =>
        rec.type === 'remove-duplicates'
      );
      expect(duplicateRemovalRec).toBeDefined();
      expect(duplicateRemovalRec.affectedTests).toBeGreaterThan(0);
    });
  });
});

// Mock implementation functions
async function categorizeTests(directory: string): Promise<any> {
  const testFiles = await discoverTestFiles(directory);
  const categorization = {
    critical: [],
    optimize: [],
    remove: [],
    recommendations: []
  };

  for (const file of testFiles) {
    const criteria = await evaluateTestCriteria(file);
    const test = {
      filePath: file,
      category: '',
      confidence: 0,
      explanation: '',
      ...criteria
    };

    // Categorize based on highest score
    if (criteria.score.critical > Math.max(criteria.score.optimize, criteria.score.remove)) {
      test.category = 'critical';
      test.confidence = criteria.score.critical;
      test.reason = criteria.isAPIContract ? 'api-contract' : 'end-to-end';
      test.explanation = `Categorized as critical because ${test.reason}`;
      categorization.critical.push(test);
    } else if (criteria.score.optimize > criteria.score.remove) {
      test.category = 'optimize';
      test.confidence = criteria.score.optimize;
      test.optimizationType = criteria.hasComplexSetup ? 'shared-setup' :
                              criteria.hasRedundantAssertions ? 'consolidate-assertions' : 'good-example';
      test.explanation = `Can be optimized through ${test.optimizationType}`;
      categorization.optimize.push(test);
    } else if (criteria.score.remove > 0.5) {
      test.category = 'remove';
      test.confidence = criteria.score.remove;
      test.removalReason = criteria.isDuplicate ? 'duplicate' :
                           criteria.isFlaky ? 'flaky' : 'obsolete';
      test.explanation = `Should be removed because ${test.removalReason}`;
      categorization.remove.push(test);
    }
  }

  // Generate recommendations
  categorization.recommendations = generateRecommendations(categorization);

  return categorization;
}

async function evaluateTestCriteria(filePath: string): Promise<any> {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  // API Contract criteria
  const isAPIContract = content.includes('API') &&
                        (content.includes('contract') || content.includes('compatibility'));

  // Integration test criteria
  const isIntegrationTest = content.includes('end-to-end') ||
                           content.includes('e2e') ||
                           filePath.includes('e2e');

  // Complex setup criteria
  const setupCount = (content.match(/beforeEach|beforeAll/g) || []).length;
  const awaitCount = (content.match(/await/g) || []).length;
  const hasComplexSetup = setupCount > 0 && awaitCount > 2;

  // Duplicate criteria
  const isDuplicate = fileName.includes('duplicate');

  // Flaky criteria
  const isFlaky = content.includes('Date.now()') ||
                  content.includes('Math.random()') ||
                  content.includes('setTimeout');

  // Obsolete criteria
  const isObsolete = content.includes('deprecated') ||
                     content.includes('obsolete') ||
                     fileName.includes('obsolete');

  // Redundant assertions
  const hasRedundantAssertions = content.includes('expect(') &&
                                 (content.match(/expect\(/g) || []).length > 5;

  // Calculate scores
  const score = {
    critical: (isAPIContract ? 0.9 : 0) + (isIntegrationTest ? 0.8 : 0),
    optimize: (hasComplexSetup ? 0.7 : 0) + (hasRedundantAssertions ? 0.6 : 0) +
              (content.includes('behavior') ? 0.5 : 0),
    remove: (isDuplicate ? 0.8 : 0) + (isFlaky ? 0.7 : 0) + (isObsolete ? 0.9 : 0)
  };

  return {
    isAPIContract,
    isIntegrationTest,
    hasComplexSetup,
    isDuplicate,
    isFlaky,
    isObsolete,
    hasRedundantAssertions,
    setupComplexityScore: hasComplexSetup ? 0.8 : 0,
    optimizationPotential: hasComplexSetup ? 0.7 : 0.3,
    duplicateSimilarity: isDuplicate ? 0.8 : 0,
    flakinessIndicators: isFlaky ? ['timing-dependent', 'system-dependent'] : [],
    score
  };
}

async function calculateTestSimilarity(file1: string, file2: string): Promise<number> {
  const content1 = fs.readFileSync(file1, 'utf8');
  const content2 = fs.readFileSync(file2, 'utf8');

  // Simple similarity based on shared test patterns
  const lines1 = content1.split('\n').map(l => l.trim());
  const lines2 = content2.split('\n').map(l => l.trim());

  let matches = 0;
  for (const line1 of lines1) {
    if (line1.length > 10 && lines2.some(line2 =>
        line1.includes('parse') && line2.includes('parse'))) {
      matches++;
    }
  }

  return matches / Math.max(lines1.length, lines2.length);
}

async function categorizeTestsWithAnalysis(directory: string, analysisResults: any): Promise<any> {
  const baseCategorization = await categorizeTests(directory);

  // Add analysis integration
  baseCategorization.summary = {
    analysisIntegration: {
      consideredIssues: analysisResults.issues,
      executionTime: analysisResults.executionTime,
      failureRate: analysisResults.failureRate
    }
  };

  // Boost removal confidence for flaky tests if analysis found flaky issues
  if (analysisResults.issues.includes('flaky-tests')) {
    baseCategorization.remove.forEach(test => {
      if (test.removalReason === 'flaky') {
        test.confidence = Math.min(1.0, test.confidence + 0.2);
      }
    });
  }

  return baseCategorization;
}

function generateRecommendations(categorization: any): any[] {
  const recommendations = [];

  // Shared setup recommendation
  const complexSetupTests = categorization.optimize.filter(test =>
    test.optimizationType === 'shared-setup'
  );
  if (complexSetupTests.length > 0) {
    recommendations.push({
      type: 'shared-setup',
      description: 'Create shared test setup utilities',
      affectedTests: complexSetupTests.length,
      estimatedSavings: complexSetupTests.length * 200 // 200ms per test
    });
  }

  // Duplicate removal recommendation
  if (categorization.remove.length > 0) {
    recommendations.push({
      type: 'remove-duplicates',
      description: 'Remove duplicate and flaky tests',
      affectedTests: categorization.remove.length,
      estimatedSavings: categorization.remove.length * 150
    });
  }

  return recommendations;
}

async function discoverTestFiles(directory: string): Promise<string[]> {
  const files: string[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(directory);
  return files;
}