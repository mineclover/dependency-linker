/**
 * API Compatibility Layer Usage Examples
 * Demonstrates how to use the compatibility layer and migrate between APIs
 */

// Example 1: Using Legacy API (Still Supported)
import { TypeScriptAnalyzer } from "../src/lib/TypeScriptAnalyzer";

async function legacyUsage() {
	console.log("=== Legacy API Usage ===");

	// Create analyzer with legacy options
	const analyzer = new TypeScriptAnalyzer({
		defaultTimeout: 5000,
		enableCache: true,
		cacheSize: 500,
	});

	try {
		// Analyze a single file
		const result = await analyzer.analyzeFile("./src/index.ts");

		console.log("Analysis successful:", result.success);
		console.log("Dependencies found:", result.dependencies.length);
		console.log("Imports found:", result.imports.length);
		console.log("Exports found:", result.exports.length);
		console.log("Parse time:", result.parseTime, "ms");

		// Extract just dependency names
		const dependencyNames =
			await analyzer.extractDependencies("./src/index.ts");
		console.log("Dependency names:", dependencyNames);

		// Batch analysis
		const batchResult = await analyzer.analyzeFiles([
			"./src/index.ts",
			"./src/utils.ts",
			"./src/types.ts",
		]);

		console.log("Batch analysis complete:");
		console.log("- Total files:", batchResult.summary.totalFiles);
		console.log("- Successful:", batchResult.summary.successfulFiles);
		console.log("- Failed:", batchResult.summary.failedFiles);
		console.log("- Total time:", batchResult.totalTime, "ms");

		// Source analysis
		const sourceResult = await analyzer.analyzeSource(
			`
      import { Component } from '@angular/core';
      import { User } from './types';

      export class UserComponent {
        users: User[] = [];
      }
    `,
			{ contextPath: "<inline-source>" },
		);

		console.log("Source analysis result:", sourceResult.success);
	} catch (error) {
		console.error("Legacy API error:", error);
	}
}

// Example 2: Using New API Directly
import { AnalysisEngine, AnalysisConfig } from "../src/services/AnalysisEngine";

async function newApiUsage() {
	console.log("=== New API Usage ===");

	// Create configuration
	const config = AnalysisConfig.createDefault();
	config.timeout = 5000;
	config.useCache = true;
	config.extractors = ["dependency", "identifier", "complexity"];
	config.interpreters = ["dependency-analysis", "identifier-analysis"];

	// Create engine
	const engine = new AnalysisEngine(config);

	try {
		// Analyze a single file
		const result = await engine.analyzeFile("./src/index.ts");

		console.log("File path:", result.filePath);
		console.log("Language:", result.language);
		console.log("Errors:", result.errors.length);

		// Access extracted data
		if (result.extractedData.dependency) {
			const depData = result.extractedData.dependency;
			console.log("Dependencies extracted:", depData.totalCount);
			console.log("Import count:", depData.importCount);
			console.log("Export count:", depData.exportCount);
		}

		if (result.extractedData.identifier) {
			const identData = result.extractedData.identifier;
			console.log("Identifiers found:", identData.totalCount);
			console.log("Exported identifiers:", identData.exportedCount);
		}

		// Performance metrics
		console.log("Performance metrics:");
		console.log("- Parsing time:", result.performanceMetrics.parsing, "ms");
		console.log(
			"- Extraction time:",
			result.performanceMetrics.extraction,
			"ms",
		);
		console.log(
			"- Interpretation time:",
			result.performanceMetrics.interpretation,
			"ms",
		);
		console.log("- Total time:", result.performanceMetrics.total, "ms");
		console.log(
			"- Memory usage:",
			result.performanceMetrics.memory.peak,
			"bytes",
		);

		// Cache information
		console.log("Cache metadata:");
		console.log("- Cached result:", result.cacheMetadata.cached);
		console.log("- Cache key:", result.cacheMetadata.key);
		console.log("- Timestamp:", result.cacheMetadata.timestamp);
	} catch (error) {
		console.error("New API error:", error);
	}
}

// Example 3: Migration Using Compatibility Utilities
import {
	toLegacyAnalysisResult,
	fromLegacyAnalysisResult,
	adaptAnalysisResult,
} from "../src/lib/compatibility";

async function migrationExample() {
	console.log("=== Migration Example ===");

	// Legacy analyzer for comparison
	const legacyAnalyzer = new TypeScriptAnalyzer();
	const newEngine = new AnalysisEngine();

	try {
		// Get results from both APIs
		const legacyResult = await legacyAnalyzer.analyzeFile("./src/index.ts");
		const newResult = await newEngine.analyzeFile("./src/index.ts");

		console.log("Legacy result format:", typeof legacyResult.success);
		console.log("New result format:", typeof newResult.errors);

		// Convert new result to legacy format
		const convertedToLegacy = toLegacyAnalysisResult(newResult);
		console.log("Converted to legacy format:", convertedToLegacy.success);
		console.log(
			"Dependencies match:",
			convertedToLegacy.dependencies.length ===
				legacyResult.dependencies.length,
		);

		// Convert legacy result to new format
		const convertedToNew = fromLegacyAnalysisResult(legacyResult);
		console.log("Converted to new format:", convertedToNew.language);
		console.log("Has extracted data:", !!convertedToNew.extractedData);

		// Use adapter utility
		const adapted = adaptAnalysisResult(legacyResult);
		console.log("Adapter provides both formats:");
		console.log("- Legacy available:", !!adapted.legacy.success);
		console.log("- New available:", !!adapted.new.metadata);

		// Access new engine through legacy facade
		const newEngineFromLegacy = legacyAnalyzer.getEngine();
		const directNewResult =
			await newEngineFromLegacy.analyzeFile("./src/index.ts");
		console.log("Direct new engine access works:", !!directNewResult.metadata);
	} catch (error) {
		console.error("Migration example error:", error);
	}
}

// Example 4: Version Management and Migration Planning
import {
	parseVersion,
	isCompatible,
	createAdapter,
	migrationUtility,
} from "../src/lib/migration";

async function versionManagementExample() {
	console.log("=== Version Management Example ===");

	try {
		// Parse version strings
		const v1 = parseVersion("1.2.3");
		const v2 = parseVersion("2.0.0-beta.1");

		console.log("Version 1:", `${v1.major}.${v1.minor}.${v1.patch}`);
		console.log(
			"Version 2:",
			`${v2.major}.${v2.minor}.${v2.patch}-${v2.prerelease}`,
		);

		// Check compatibility
		const compatible = isCompatible("2.0.0", "2.1.0");
		console.log("v2.0.0 compatible with v2.1.0:", compatible);

		const incompatible = isCompatible("1.0.0", "2.0.0");
		console.log("v1.0.0 compatible with v2.0.0:", incompatible);

		// Create version-specific adapters
		const v1Adapter = createAdapter("1.0.0");
		const v2Adapter = createAdapter("2.0.0");

		console.log(
			"V1 adapter version:",
			`${v1Adapter.version.major}.${v1Adapter.version.minor}`,
		);
		console.log(
			"V2 adapter version:",
			`${v2Adapter.version.major}.${v2Adapter.version.minor}`,
		);

		// Create analyzers through adapters
		const v1Analyzer = v1Adapter.createAnalyzer({ enableCache: true });
		const v2Analyzer = v2Adapter.createAnalyzer({ useCache: true });

		console.log("V1 analyzer created:", v1Analyzer.constructor.name);
		console.log("V2 analyzer created:", v2Analyzer.constructor.name);

		// Generate migration plan
		const fromVersion = parseVersion("1.0.0");
		const toVersion = parseVersion("2.0.0");
		const migrationPlan = migrationUtility.getMigrationPlan(
			fromVersion,
			toVersion,
		);

		console.log("Migration plan:");
		console.log("- Steps:", migrationPlan.steps.length);
		console.log("- Automatable:", migrationPlan.automatable);
		console.log("- Breaking changes:", migrationPlan.breakingChanges.length);
		console.log("- Estimated effort:", migrationPlan.estimatedEffort);

		// List migration steps
		console.log("Migration steps:");
		migrationPlan.steps.forEach((step, index) => {
			console.log(
				`  ${index + 1}. ${step.description} (${step.automated ? "automated" : "manual"})`,
			);
		});

		// List breaking changes
		console.log("Breaking changes:");
		migrationPlan.breakingChanges.forEach((change, index) => {
			console.log(
				`  ${index + 1}. ${change.component}: ${change.description} (${change.impact} impact)`,
			);
		});

		// Execute migration (dry run)
		const migrationResult = await migrationUtility.executeMigration(
			migrationPlan,
			{
				dryRun: true,
			},
		);

		console.log("Migration dry run result:");
		console.log("- Success:", migrationResult.success);
		console.log(
			"- Steps completed:",
			migrationResult.stepsCompleted,
			"/",
			migrationResult.stepsTotal,
		);
		console.log("- Warnings:", migrationResult.warnings.length);
		console.log("- Errors:", migrationResult.errors.length);
	} catch (error) {
		console.error("Version management example error:", error);
	}
}

// Example 5: Performance Comparison
async function performanceComparison() {
	console.log("=== Performance Comparison ===");

	const legacyAnalyzer = new TypeScriptAnalyzer();
	const newEngine = new AnalysisEngine();

	const testFiles = [
		"./src/index.ts",
		"./src/utils.ts",
		"./src/types.ts",
		"./src/services.ts",
	];

	try {
		// Warm up
		await legacyAnalyzer.analyzeFile("./src/index.ts");
		await newEngine.analyzeFile("./src/index.ts");

		// Measure legacy performance
		console.time("Legacy API");
		for (const file of testFiles) {
			await legacyAnalyzer.analyzeFile(file);
		}
		console.timeEnd("Legacy API");

		// Measure new API performance
		console.time("New API");
		for (const file of testFiles) {
			await newEngine.analyzeFile(file);
		}
		console.timeEnd("New API");

		// Get performance metrics
		const legacyState = legacyAnalyzer.getState();
		const newMetrics = newEngine.getPerformanceMetrics();

		console.log("Legacy metrics:");
		console.log("- Files analyzed:", legacyState.metrics.totalFilesAnalyzed);
		console.log(
			"- Average time:",
			legacyState.metrics.averageAnalysisTime,
			"ms",
		);
		console.log("- Cache hit rate:", legacyState.cacheStats.hitRate);

		console.log("New metrics:");
		console.log("- Total analyses:", newMetrics.totalAnalyses);
		console.log("- Successful:", newMetrics.successfulAnalyses);
		console.log("- Average time:", newMetrics.averageAnalysisTime, "ms");
		console.log("- Cache hit rate:", newMetrics.cacheHitRate);
		console.log("- Peak memory:", newMetrics.peakMemoryUsage, "bytes");
	} catch (error) {
		console.error("Performance comparison error:", error);
	}
}

// Example 6: Error Handling Comparison
async function errorHandlingExample() {
	console.log("=== Error Handling Example ===");

	const legacyAnalyzer = new TypeScriptAnalyzer();
	const newEngine = new AnalysisEngine();

	try {
		// Test with non-existent file
		try {
			const legacyResult =
				await legacyAnalyzer.analyzeFile("./non-existent.ts");
			console.log("Legacy result for missing file:", legacyResult.success);
		} catch (legacyError) {
			console.log("Legacy API error:", legacyError.message);
		}

		try {
			const newResult = await newEngine.analyzeFile("./non-existent.ts");
			console.log(
				"New result for missing file:",
				newResult.errors.length,
				"errors",
			);
		} catch (newError) {
			console.log("New API error:", newError.message);
		}

		// Test with invalid syntax
		const invalidSource = "invalid typescript {[}] syntax";

		try {
			const legacyResult = await legacyAnalyzer.analyzeSource(invalidSource);
			console.log("Legacy syntax error handling:", legacyResult.error?.code);
		} catch (error) {
			console.log("Legacy syntax error:", error.message);
		}

		try {
			const newResult = await newEngine.analyzeContent(invalidSource, "<test>");
			console.log(
				"New syntax error handling:",
				newResult.errors.length,
				"errors",
			);
			if (newResult.errors.length > 0) {
				console.log(
					"First error:",
					newResult.errors[0].category,
					"-",
					newResult.errors[0].message,
				);
			}
		} catch (error) {
			console.log("New syntax error:", error.message);
		}
	} catch (error) {
		console.error("Error handling example error:", error);
	}
}

// Run all examples
async function runAllExamples() {
	console.log("TypeScript Dependency Linker - API Compatibility Examples\n");

	await legacyUsage();
	console.log("\n" + "=".repeat(50) + "\n");

	await newApiUsage();
	console.log("\n" + "=".repeat(50) + "\n");

	await migrationExample();
	console.log("\n" + "=".repeat(50) + "\n");

	await versionManagementExample();
	console.log("\n" + "=".repeat(50) + "\n");

	await performanceComparison();
	console.log("\n" + "=".repeat(50) + "\n");

	await errorHandlingExample();
	console.log("\n" + "=".repeat(50) + "\n");

	console.log("All examples completed successfully!");
}

// Export for testing
export {
	legacyUsage,
	newApiUsage,
	migrationExample,
	versionManagementExample,
	performanceComparison,
	errorHandlingExample,
	runAllExamples,
};

// Run if called directly
if (require.main === module) {
	runAllExamples().catch(console.error);
}
