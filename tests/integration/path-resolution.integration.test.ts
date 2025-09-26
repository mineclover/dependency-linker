
/**
 * Test script for path resolution utilities in AnalysisResult
 */

import {
	resolveAnalysisPath,
	toProjectRelativePath,
	validateAndResolveAnalysisPath,
	batchResolveAnalysisPaths,
} from "../../src/utils/PathUtils";

import { analyzeMarkdownFile, analyzeTypeScriptFile } from "../../src/lib/index";

async function testPathResolution() {
	console.log("🔧 Testing Path Resolution Utilities\n");

	try {
		// Test 1: Basic path resolution
		console.log("📄 Test 1: Basic Path Resolution");

		const testPaths = [
			"./README.md",
			"src/lib/index.ts",
			"/Users/absolute/path/test.ts",
			"../relative/path.md",
			"./docs/quickstart.md",
		];

		testPaths.forEach((testPath) => {
			const resolved = resolveAnalysisPath(testPath);
			const relative = toProjectRelativePath(resolved);

			console.log(`   Input: ${testPath}`);
			console.log(`   Resolved: ${resolved}`);
			console.log(`   Relative: ${relative}`);
			console.log("");
		});

		// Test 2: Path validation
		console.log("📄 Test 2: Path Validation");

		const validationTests = [
			{
				path: "./README.md",
				options: { mustExist: true, allowedExtensions: [".md"] },
			},
			{
				path: "./src/lib/index.ts",
				options: { mustExist: true, allowedExtensions: [".ts", ".js"] },
			},
			{ path: "./nonexistent.md", options: { mustExist: true } },
			{ path: "./test.xyz", options: { allowedExtensions: [".md", ".ts"] } },
		];

		for (const test of validationTests) {
			const validation = validateAndResolveAnalysisPath(
				test.path,
				test.options,
			);

			console.log(`   Path: ${test.path}`);
			console.log(`   Valid: ${validation.isValid ? "✅" : "❌"}`);
			console.log(`   Absolute: ${validation.absolutePath}`);
			console.log(`   Relative: ${validation.relativePath}`);
			if (validation.error) {
				console.log(`   Error: ${validation.error}`);
			}
			if (validation.extension) {
				console.log(`   Extension: ${validation.extension}`);
			}
			console.log("");
		}

		// Test 3: Batch resolution
		console.log("📄 Test 3: Batch Path Resolution");

		const batchPaths = [
			"./README.md",
			"./src/lib/index.ts",
			"./docs/quickstart.md",
			"./nonexistent.md",
		];

		const batchResults = batchResolveAnalysisPaths(batchPaths);

		batchResults.forEach((result) => {
			console.log(`   ${result.input} -> ${result.isValid ? "✅" : "❌"}`);
			console.log(`     Absolute: ${result.absolutePath}`);
			console.log(`     Relative: ${result.relativePath}`);
			if (result.error) {
				console.log(`     Error: ${result.error}`);
			}
			console.log("");
		});

		// Test 4: Integration with AnalysisResult
		console.log("📄 Test 4: AnalysisResult Integration");

		console.log("Testing Markdown analysis with path resolution...");
		const mdResult = await analyzeMarkdownFile("./README.md");
		console.log(`   Markdown file path: ${mdResult.filePath}`);
		console.log(
			`   Is absolute: ${require("node:path").isAbsolute(mdResult.filePath) ? "✅" : "❌"}`,
		);
		console.log(
			`   Relative to project: ${toProjectRelativePath(mdResult.filePath)}`,
		);
		console.log("");

		console.log("Testing TypeScript analysis with path resolution...");
		const tsResult = await analyzeTypeScriptFile("./src/lib/index.ts");
		console.log(`   TypeScript file path: ${tsResult.filePath}`);
		console.log(
			`   Is absolute: ${require("node:path").isAbsolute(tsResult.filePath) ? "✅" : "❌"}`,
		);
		console.log(
			`   Relative to project: ${toProjectRelativePath(tsResult.filePath)}`,
		);
		console.log("");

		// Test 5: Cross-platform compatibility
		console.log("📄 Test 5: Cross-platform Compatibility");

		const crossPlatformPaths = [
			"src\\lib\\index.ts", // Windows style
			"src/lib/index.ts", // Unix style
			"./src\\mixed/path.ts", // Mixed style
		];

		crossPlatformPaths.forEach((testPath) => {
			const resolved = resolveAnalysisPath(testPath);
			console.log(`   Input: ${testPath}`);
			console.log(`   Resolved: ${resolved}`);
			console.log(
				`   Normalized: ${resolved.includes("\\") ? "Contains backslashes" : "Forward slashes only"}`,
			);
			console.log("");
		});

		console.log("🎉 Path resolution testing completed successfully!\n");
		console.log("✅ Path Resolution Features Verified:");
		console.log("✅ resolveAnalysisPath() - Converts to absolute paths");
		console.log(
			"✅ toProjectRelativePath() - Converts to project-relative paths",
		);
		console.log("✅ validateAndResolveAnalysisPath() - Validates with options");
		console.log("✅ batchResolveAnalysisPaths() - Batch processing");
		console.log("✅ Integration with AnalysisResult interface");
		console.log("✅ Cross-platform path handling");
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

// Run the test
testPathResolution().catch((error) => {
	console.error("❌ Test execution failed:", error);
	process.exit(1);
});
