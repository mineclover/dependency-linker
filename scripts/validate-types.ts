#!/usr/bin/env npx ts-node
/**
 * TypeScript Definitions Validation Script
 * Validates that all exported APIs have proper TypeScript definitions
 */

import {
	TypeScriptAnalyzer,
	analyzeTypeScriptFile,
	extractDependencies,
	getBatchAnalysis,
	analyzeDirectory,
	AnalysisResult,
	DependencyInfo,
	ImportInfo,
	ExportInfo,
	SourceLocation,
	OutputFormat,
} from "../dist/index";

import { BatchAnalyzer } from "../dist/api/BatchAnalyzer";

async function validateTypeExports(): Promise<void> {
	console.log("🔍 Validating TypeScript Definition Exports...\n");

	const validations: Array<{ name: string; test: () => void }> = [
		{
			name: "TypeScriptAnalyzer class export",
			test: () => {
				const analyzer: TypeScriptAnalyzer = new TypeScriptAnalyzer();
				console.log("  ✅ TypeScriptAnalyzer constructor");

				// Test method signatures exist
				const _analyzeFile: (filePath: string) => Promise<AnalysisResult> =
					analyzer.analyzeFile.bind(analyzer);
				const _extractDependencies: (filePath: string) => Promise<string[]> =
					analyzer.extractDependencies.bind(analyzer);
				console.log("  ✅ TypeScriptAnalyzer methods");
			},
		},

		{
			name: "Factory function exports",
			test: () => {
				// Test function signature types
				const _analyzeFile: typeof analyzeTypeScriptFile =
					analyzeTypeScriptFile;
				const _extractDeps: typeof extractDependencies = extractDependencies;
				const _batchAnalysis: typeof getBatchAnalysis = getBatchAnalysis;
				const _analyzeDir: typeof analyzeDirectory = analyzeDirectory;
				console.log("  ✅ All factory functions properly typed");
			},
		},

		{
			name: "Model type exports",
			test: () => {
				// Test that model interfaces are properly exported
				const testResult: Partial<AnalysisResult> = {
					filePath: "test.ts",
					success: true,
					parseTime: 100,
				};

				const testDep: Partial<DependencyInfo> = {
					source: "react",
					type: "external",
				};

				const testImport: Partial<ImportInfo> = {
					source: "react",
					specifiers: [],
				};

				const testExport: Partial<ExportInfo> = {
					name: "Component",
					type: "default",
				};

				const testLocation: SourceLocation = {
					line: 1,
					column: 0,
					offset: 0,
				};

				const testFormat: OutputFormat = "json";

				console.log("  ✅ All model types properly exported");
			},
		},

		{
			name: "Advanced API exports",
			test: () => {
				// Test BatchAnalyzer is properly typed
				const _BatchAnalyzer: typeof BatchAnalyzer = BatchAnalyzer;
				console.log("  ✅ BatchAnalyzer class export");
			},
		},
	];

	let passed = 0;
	let failed = 0;

	for (const validation of validations) {
		try {
			console.log(`📋 ${validation.name}:`);
			validation.test();
			passed++;
			console.log("");
		} catch (error) {
			console.error(`❌ ${validation.name} failed:`, error);
			failed++;
			console.log("");
		}
	}

	console.log("📊 Validation Results:");
	console.log(`  ✅ Passed: ${passed}`);
	console.log(`  ❌ Failed: ${failed}`);
	console.log(
		`  📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`,
	);

	if (failed > 0) {
		process.exit(1);
	} else {
		console.log("\n🎉 All TypeScript definitions are properly exported!");
	}
}

// Run validation if script is executed directly
if (require.main === module) {
	validateTypeExports().catch((error) => {
		console.error("💥 Validation failed:", error);
		process.exit(1);
	});
}

export { validateTypeExports };
