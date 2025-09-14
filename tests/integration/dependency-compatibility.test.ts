/**
 * Integration test for dependency analysis compatibility
 * Validates backward compatibility with existing TypeScriptAnalyzer API
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { TypeScriptAnalyzer } from '../../src/lib/TypeScriptAnalyzer';
import { createDefaultAnalysisEngine } from '../../src/lib/factory';
import { AnalysisConfig, AnalysisConfigUtils } from '../../src/models/AnalysisConfig';
import type { AnalysisEngine } from '../../src/services/AnalysisEngine';
import * as path from 'path';

describe('Dependency Analysis Compatibility', () => {
  let legacyAnalyzer: TypeScriptAnalyzer;
  let newEngine: AnalysisEngine;
  const testFile = path.join(__dirname, '../fixtures/sample-typescript.ts');

  beforeEach(() => {
    legacyAnalyzer = new TypeScriptAnalyzer();
    newEngine = createDefaultAnalysisEngine();
  });

  test('legacy API should maintain compatibility', async () => {
    const legacyResult = await legacyAnalyzer.analyzeFile(testFile);

    // Verify legacy API structure
    expect(legacyResult).toHaveProperty('dependencies');
    expect(legacyResult).toHaveProperty('exports');
    expect(legacyResult).toHaveProperty('imports');
    expect(legacyResult).toHaveProperty('filePath');
    expect(legacyResult.filePath).toBe(testFile);
  });

  test('new engine should provide equivalent results to legacy analyzer', async () => {
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const [legacyResult, newResult] = await Promise.all([
      legacyAnalyzer.analyzeFile(testFile),
      newEngine.analyzeFile(testFile, config)
    ]);

    // Compare dependency extraction
    const legacyDependencies = legacyResult.dependencies;
    const newDependencies = newResult.interpretedData['dependency-analysis']?.dependencies || [];

    expect(newDependencies.length).toBeGreaterThanOrEqual(legacyDependencies.length * 0.9); // Allow 10% variance

    // Check that major dependencies are present in both
    const legacyDepNames = legacyDependencies.map((dep: any) => dep.source || dep.name);
    const newDepNames = newDependencies.map((dep: any) => dep.source || dep.name);

    const commonDeps = legacyDepNames.filter((name: string) =>
      newDepNames.includes(name)
    );

    expect(commonDeps.length).toBeGreaterThanOrEqual(legacyDepNames.length * 0.8); // 80% overlap minimum
  });

  test('migration helper should convert legacy results to new format', async () => {
    const legacyResult = await legacyAnalyzer.analyzeFile(testFile);

    // Test migration utility (assuming it exists)
    const { migrateToNewFormat } = await import('../../src/lib/migration');
    const migratedResult = migrateToNewFormat(legacyResult);

    expect(migratedResult).toHaveProperty('extractedData');
    expect(migratedResult).toHaveProperty('interpretedData');
    expect(migratedResult).toHaveProperty('performanceMetrics');
    expect(migratedResult.filePath).toBe(legacyResult.filePath);
  });

  test('batch analysis compatibility', async () => {
    const testFiles = [
      testFile,
      path.join(__dirname, '../fixtures/another-sample.ts')
    ];

    const legacyResults = await Promise.all(
      testFiles.map(file => legacyAnalyzer.analyzeFile(file))
    );

    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const newResults = await newEngine.analyzeBatch(testFiles, config);

    expect(newResults).toHaveLength(legacyResults.length);

    // Verify structural compatibility
    newResults.forEach((newResult, index) => {
      const legacyResult = legacyResults[index];
      expect(newResult.filePath).toBe(legacyResult.filePath);
      expect(newResult.extractedData).toBeDefined();
      expect(newResult.interpretedData).toBeDefined();
    });
  });

  test('performance should be comparable or better than legacy', async () => {
    const startLegacy = Date.now();
    await legacyAnalyzer.analyzeFile(testFile);
    const legacyDuration = Date.now() - startLegacy;

    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const startNew = Date.now();
    const newResult = await newEngine.analyzeFile(testFile, config);
    const newDuration = Date.now() - startNew;

    // New implementation should be comparable or better
    expect(newDuration).toBeLessThanOrEqual(legacyDuration * 1.2); // Allow 20% performance variance
    expect(newResult.performanceMetrics.totalTime).toBeLessThanOrEqual(legacyDuration * 1.2);
  });

  test('error handling compatibility', async () => {
    const nonExistentFile = path.join(__dirname, '../fixtures/does-not-exist.ts');

    // Test legacy error handling
    let legacyError: Error | null = null;
    try {
      await legacyAnalyzer.analyzeFile(nonExistentFile);
    } catch (error) {
      legacyError = error as Error;
    }

    // Test new engine error handling
    const config = AnalysisConfigUtils.create({
      extractors: ['dependency'],
      interpreters: ['dependency-analysis']
    });

    const newResult = await newEngine.analyzeFile(nonExistentFile, config);

    // New engine should handle errors gracefully without throwing
    expect(newResult.errors).toBeDefined();
    expect(newResult.errors.length).toBeGreaterThan(0);

    if (legacyError) {
      // Should capture similar error information
      const errorTypes = newResult.errors.map(e => e.type);
      expect(errorTypes).toContain('FileNotFound');
    }
  });

  test('custom extractor integration maintains compatibility', async () => {
    // Register a custom extractor that mimics legacy behavior
    const customExtractor = {
      extract: (ast: any, filePath: string) => {
        return {
          customDependencies: [],
          customExports: [],
          metadata: { source: 'custom-extractor' }
        };
      },
      supports: (language: string) => language === 'typescript'
    };

    newEngine.registerExtractor('custom-legacy', customExtractor);

    const config = new AnalysisConfig({
      extractors: ['custom-legacy'],
      interpreters: []
    });

    const result = await newEngine.analyzeFile(testFile, config);

    expect(result.extractedData['custom-legacy']).toBeDefined();
    expect(result.extractedData['custom-legacy']).toHaveProperty('customDependencies');
    expect(result.extractedData['custom-legacy']).toHaveProperty('customExports');
  });
});