#!/usr/bin/env node

/**
 * Baseline performance measurement script (T005)
 * Measures current test performance before optimization
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestPerformanceMeasurer {
  constructor() {
    this.results = {
      timestamp: Date.now(),
      measurements: []
    };
  }

  async measureBaseline() {
    console.log('📊 Starting baseline performance measurement...');

    try {
      // Measure full test suite
      const fullSuite = await this.measureTestCommand('npm test');
      this.results.measurements.push({
        name: 'Full Test Suite',
        ...fullSuite
      });

      // Measure unit tests only
      const unitTests = await this.measureTestCommand('npx jest tests/unit/');
      this.results.measurements.push({
        name: 'Unit Tests Only',
        ...unitTests
      });

      // Measure integration tests only
      const integrationTests = await this.measureTestCommand('npx jest tests/integration/');
      this.results.measurements.push({
        name: 'Integration Tests Only',
        ...integrationTests
      });

      // Measure contract tests only
      const contractTests = await this.measureTestCommand('npx jest tests/contract/');
      this.results.measurements.push({
        name: 'Contract Tests Only',
        ...contractTests
      });

      this.saveResults();
      this.generateReport();

    } catch (error) {
      console.error('❌ Performance measurement failed:', error.message);
      process.exit(1);
    }
  }

  async measureTestCommand(command) {
    console.log(`  Running: ${command}`);

    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 60000,
        stdio: 'pipe'
      });

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      // Parse Jest output for test counts
      const testResults = this.parseJestOutput(output);

      return {
        duration: endTime - startTime,
        memoryUsage: (endMemory - startMemory) / 1024 / 1024, // MB
        success: true,
        ...testResults
      };

    } catch (error) {
      const endTime = performance.now();
      return {
        duration: endTime - startTime,
        memoryUsage: 0,
        success: false,
        error: error.message,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0
      };
    }
  }

  parseJestOutput(output) {
    const lines = output.split('\n');
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Look for Jest summary line
    const summaryLine = lines.find(line =>
      line.includes('Tests:') || line.includes('passed') || line.includes('failed')
    );

    if (summaryLine) {
      const passedMatch = summaryLine.match(/(\d+) passed/);
      const failedMatch = summaryLine.match(/(\d+) failed/);

      passedTests = passedMatch ? parseInt(passedMatch[1]) : 0;
      failedTests = failedMatch ? parseInt(failedMatch[1]) : 0;
      totalTests = passedTests + failedTests;
    }

    const passRate = totalTests > 0 ? passedTests / totalTests : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate
    };
  }

  saveResults() {
    const resultsPath = path.join(__dirname, '../.performance-baseline.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`💾 Results saved to ${resultsPath}`);
  }

  generateReport() {
    console.log('\n📈 Baseline Performance Report');
    console.log('='.repeat(50));

    this.results.measurements.forEach(measurement => {
      console.log(`\n${measurement.name}:`);
      console.log(`  Duration: ${measurement.duration.toFixed(2)}ms`);
      console.log(`  Memory: ${measurement.memoryUsage.toFixed(2)}MB`);
      console.log(`  Tests: ${measurement.totalTests} total`);
      console.log(`  Pass Rate: ${(measurement.passRate * 100).toFixed(1)}%`);
      console.log(`  Success: ${measurement.success ? '✅' : '❌'}`);

      if (!measurement.success && measurement.error) {
        console.log(`  Error: ${measurement.error}`);
      }
    });

    // Overall summary
    const fullSuite = this.results.measurements.find(m => m.name === 'Full Test Suite');
    if (fullSuite) {
      console.log('\n📊 Optimization Targets:');
      console.log(`  Current: ${fullSuite.duration.toFixed(0)}ms, ${fullSuite.passRate.toFixed(3)} pass rate`);
      console.log(`  Target: <1500ms, >0.99 pass rate`);

      const durationImprovement = Math.max(0, fullSuite.duration - 1500);
      const passRateImprovement = Math.max(0, 0.99 - fullSuite.passRate);

      console.log(`  Required improvements:`);
      console.log(`    - Reduce duration by ${durationImprovement.toFixed(0)}ms`);
      console.log(`    - Improve pass rate by ${(passRateImprovement * 100).toFixed(1)}%`);
    }

    console.log('\n✅ Baseline measurement completed');
  }
}

// Run measurement if called directly
if (require.main === module) {
  const measurer = new TestPerformanceMeasurer();
  measurer.measureBaseline().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestPerformanceMeasurer;