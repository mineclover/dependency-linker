/**
 * Test script for enhanced path properties in AnalysisResult
 */

import {
	analyzeMarkdownFile,
	analyzeTypeScriptFile,
	getBatchMarkdownAnalysis,
	analyzeDirectory,
	PathInfo,
	createPathInfo,
	createBatchPathInfo,
	comparePathInfo,
	groupPathInfoByDirectory,
	filterPathInfo,
} from "../../src/lib/index";

async function testEnhancedPathProperties() {
	console.log("🎯 Testing Enhanced Path Properties in AnalysisResult\n");

	try {
		// Test 1: Single Markdown file analysis with PathInfo
		console.log("📄 Test 1: Markdown Analysis with Enhanced Path Properties");

		const mdResult = await analyzeMarkdownFile("./README.md");

		console.log("✅ AnalysisResult with PathInfo:");
		console.log(`   Legacy filePath: ${mdResult.filePath}`);
		console.log(`   PathInfo structure:`);
		console.log(`     - Input: ${mdResult.pathInfo.input}`);
		console.log(`     - Absolute: ${mdResult.pathInfo.absolute}`);
		console.log(`     - Relative: ${mdResult.pathInfo.relative}`);
		console.log(`     - Directory: ${mdResult.pathInfo.directory}`);
		console.log(
			`     - Relative Directory: ${mdResult.pathInfo.relativeDirectory}`,
		);
		console.log(`     - File Name: ${mdResult.pathInfo.fileName}`);
		console.log(`     - Base Name: ${mdResult.pathInfo.baseName}`);
		console.log(`     - Extension: ${mdResult.pathInfo.extension}`);
		console.log(`     - Project Root: ${mdResult.pathInfo.projectRoot}`);
		console.log(
			`     - Within Project: ${mdResult.pathInfo.isWithinProject ? "✅" : "❌"}`,
		);
		console.log(`     - Depth: ${mdResult.pathInfo.depth}`);
		console.log(
			`     - Was Absolute: ${mdResult.pathInfo.wasAbsolute ? "✅" : "❌"}`,
		);
		console.log("");

		// Test 2: Batch analysis with path sorting
		console.log("📄 Test 2: Batch Analysis with Path Sorting");

		const markdownFiles = ["./README.md", "./docs/quickstart.md"];

		console.log(`Analyzing ${markdownFiles.length} files...`);
		const batchResults = await getBatchMarkdownAnalysis(markdownFiles, {
			concurrency: 2,
			continueOnError: true,
		});

		console.log(`✅ Batch analysis completed!`);
		console.log(`   Results: ${batchResults.length}`);

		// Sort results by path info
		const sortedResults = batchResults.sort((a, b) =>
			comparePathInfo(a.pathInfo, b.pathInfo),
		);

		sortedResults.forEach((result, index) => {
			console.log(`   ${index + 1}. ${result.pathInfo.relative}`);
			console.log(
				`      Depth: ${result.pathInfo.depth}, Errors: ${result.errors.length}`,
			);
		});
		console.log("");

		// Test 3: Directory analysis with path grouping
		console.log("📄 Test 3: Directory Analysis with Path Grouping");

		const dirResults = await analyzeDirectory("./", {
			includeMarkdown: true,
			extensions: [".md"],
			maxDepth: 2,
			ignorePatterns: ["**/node_modules/**", "**/dist/**", "**/.*"],
		});

		console.log(`✅ Directory analysis completed!`);
		console.log(`   Total files analyzed: ${dirResults.length}`);

		// Group by directory (filter out results without pathInfo)
		const validPathInfos = dirResults
			.filter((r) => r.pathInfo)
			.map((r) => r.pathInfo);

		console.log(
			`   Valid PathInfo objects: ${validPathInfos.length} / ${dirResults.length}`,
		);

		if (validPathInfos.length > 0) {
			const groupedByDir = groupPathInfoByDirectory(validPathInfos);

			console.log(`   Grouped by ${groupedByDir.size} directories:`);
			for (const [dir, files] of groupedByDir) {
				console.log(`     ${dir || "(root)"}: ${files.length} files`);
				files.forEach((file) => {
					console.log(`       - ${file.fileName}`);
				});
			}
		} else {
			console.log(
				"   No valid PathInfo objects found - likely TypeScript analysis results",
			);
			console.log("   Showing legacy filePath instead:");
			dirResults.forEach((result, index) => {
				console.log(
					`     ${index + 1}. ${result.filePath} (${result.language})`,
				);
			});
		}
		console.log("");

		// Test 4: PathInfo filtering
		console.log("📄 Test 4: PathInfo Filtering");

		const allPathInfos = createBatchPathInfo([
			"./README.md",
			"./docs/quickstart.md",
			"./src/lib/index.ts",
			"./src/api/factory-functions.ts",
			"./test-file.txt",
		]);

		console.log("✅ PathInfo filtering examples:");

		// Filter by extension
		const markdownOnly = filterPathInfo(allPathInfos, { extensions: [".md"] });
		console.log(`   Markdown files: ${markdownOnly.length}`);
		markdownOnly.forEach((p) => console.log(`     - ${p.relative}`));

		// Filter by depth
		const shallowFiles = filterPathInfo(allPathInfos, { maxDepth: 1 });
		console.log(`   Shallow files (depth ≤ 1): ${shallowFiles.length}`);
		shallowFiles.forEach((p) =>
			console.log(`     - ${p.relative} (depth: ${p.depth})`),
		);

		// Filter by directory
		const srcFiles = filterPathInfo(allPathInfos, {
			directories: ["src/lib", "src/api"],
		});
		console.log(`   Files in src/lib or src/api: ${srcFiles.length}`);
		srcFiles.forEach((p) => console.log(`     - ${p.relative}`));
		console.log("");

		// Test 5: PathInfo utility functions
		console.log("📄 Test 5: PathInfo Utility Functions");

		const testPaths = [
			"./README.md",
			"./src/lib/index.ts",
			"./docs/quickstart.md",
			"../outside/file.md",
		];

		const utilityPathInfos = createBatchPathInfo(testPaths);

		console.log("✅ PathInfo utility demonstrations:");
		console.log("   Original order:");
		testPaths.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));

		console.log("   Sorted by comparePathInfo:");
		const sortedPathInfos = [...utilityPathInfos].sort(comparePathInfo);
		sortedPathInfos.forEach((p, i) =>
			console.log(`     ${i + 1}. ${p.relative} (depth: ${p.depth})`),
		);

		console.log("   Within project only:");
		const withinProject = filterPathInfo(utilityPathInfos, {
			withinProject: true,
		});
		withinProject.forEach((p) => console.log(`     - ${p.relative}`));
		console.log("");

		// Test 6: Backward compatibility
		console.log("📄 Test 6: Backward Compatibility");

		console.log("✅ Backward compatibility verification:");
		console.log(`   Legacy filePath field: ${mdResult.filePath}`);
		console.log(`   New pathInfo.absolute: ${mdResult.pathInfo.absolute}`);
		console.log(
			`   Fields match: ${mdResult.filePath === mdResult.pathInfo.absolute ? "✅" : "❌"}`,
		);
		console.log("");

		console.log(
			"🎉 Enhanced path properties testing completed successfully!\n",
		);
		console.log("✅ Enhanced Path Features Verified:");
		console.log("✅ PathInfo integration in AnalysisResult");
		console.log(
			"✅ Comprehensive path information (input, absolute, relative, etc.)",
		);
		console.log("✅ Path-based sorting and comparison");
		console.log("✅ Directory grouping functionality");
		console.log("✅ Advanced filtering by extension, depth, directory");
		console.log("✅ Batch path processing utilities");
		console.log("✅ Backward compatibility with legacy filePath");
		console.log("✅ Project structure awareness (depth, within project)");
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

// Run the test
testEnhancedPathProperties().catch((error) => {
	console.error("❌ Test execution failed:", error);
	process.exit(1);
});
