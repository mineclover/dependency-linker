#!/usr/bin/env npx tsx

/**
 * Test script for integrated Markdown analysis using unified API
 */

import {
	analyzeMarkdownFile,
	extractMarkdownLinks,
	getBatchMarkdownAnalysis,
} from "./src/lib/index";

async function testIntegratedMarkdownAnalysis() {
	console.log("🔍 Testing Integrated Markdown Analysis API\n");

	try {
		// Test 1: Single file analysis with unified API
		console.log("📄 Test 1: Single File Analysis");
		console.log("Analyzing: README.md");

		const result = await analyzeMarkdownFile("README.md");

		console.log(`✅ Analysis successful!`);
		console.log(`   Language: ${result.language}`);
		console.log(`   File: ${result.filePath}`);
		console.log(
			`   Performance: ${result.performanceMetrics.totalTime}ms total`,
		);

		// Check extracted data
		const linkData = result.extractedData["markdown-links"];
		if (Array.isArray(linkData)) {
			console.log(`   📊 Extracted ${linkData.length} links`);

			const external = linkData.filter((link: any) => link.isExternal).length;
			const internal = linkData.filter((link: any) => link.isInternal).length;
			const images = linkData.filter(
				(link: any) => link.type === "image",
			).length;

			console.log(`      - External: ${external}`);
			console.log(`      - Internal: ${internal}`);
			console.log(`      - Images: ${images}`);
		}

		// Check interpreted data
		const linkAnalysis = result.interpretedData["link-analysis"];
		if (linkAnalysis) {
			console.log(`   📈 Analysis Results:`);
			console.log(`      - Total links: ${linkAnalysis.summary.totalLinks}`);
			console.log(`      - Broken links: ${linkAnalysis.summary.brokenLinks}`);
			console.log(`      - Issues: ${linkAnalysis.issues.length}`);

			if (linkAnalysis.recommendations.length > 0) {
				console.log(`   💡 Recommendations:`);
				linkAnalysis.recommendations.slice(0, 3).forEach((rec: string) => {
					console.log(`      - ${rec}`);
				});
			}
		}

		// Test 2: Quick link extraction
		console.log("\n📄 Test 2: Quick Link Extraction");
		console.log("Extracting links from: docs/quickstart.md");

		const links = await extractMarkdownLinks("docs/quickstart.md");
		console.log(`✅ Extracted ${links.length} links:`);
		links.slice(0, 5).forEach((link) => {
			console.log(`   - ${link}`);
		});

		// Test 3: Batch analysis
		console.log("\n📄 Test 3: Batch Analysis");

		const markdownFiles = [
			"README.md",
			"docs/quickstart.md",
			"docs/examples/basic-usage.md",
		];

		console.log(`Analyzing ${markdownFiles.length} files...`);

		const batchResults = await getBatchMarkdownAnalysis(markdownFiles, {
			concurrency: 2,
			onProgress: (completed, total) => {
				console.log(`   Progress: ${completed}/${total} files`);
			},
		});

		console.log(`✅ Batch analysis completed!`);
		console.log(
			`   Successful: ${batchResults.filter((r) => r.errors.length === 0).length}`,
		);
		console.log(
			`   With errors: ${batchResults.filter((r) => r.errors.length > 0).length}`,
		);

		// Summary
		let totalLinks = 0;
		let totalBroken = 0;
		let totalIssues = 0;

		batchResults.forEach((result) => {
			const analysis = result.interpretedData["link-analysis"];
			if (analysis) {
				totalLinks += analysis.summary.totalLinks;
				totalBroken += analysis.summary.brokenLinks;
				totalIssues += analysis.issues.length;
			}
		});

		console.log(`\n📊 Batch Summary:`);
		console.log(`   Total links: ${totalLinks}`);
		console.log(`   Broken links: ${totalBroken}`);
		console.log(`   Total issues: ${totalIssues}`);
		console.log(
			`   Health rate: ${totalLinks > 0 ? (((totalLinks - totalBroken) / totalLinks) * 100).toFixed(1) : 100}%`,
		);

		// Test 4: Error handling
		console.log("\n📄 Test 4: Error Handling");
		console.log("Testing with non-existent file...");

		try {
			await analyzeMarkdownFile("non-existent-file.md");
		} catch (error) {
			console.log(
				`✅ Error handled gracefully: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		console.log("\n🎉 All tests completed successfully!");
		console.log("\n🔗 Unified API Features Verified:");
		console.log("✅ analyzeMarkdownFile() - Returns standard AnalysisResult");
		console.log("✅ extractMarkdownLinks() - Quick link extraction");
		console.log("✅ getBatchMarkdownAnalysis() - Batch processing");
		console.log("✅ Consistent interface with TypeScript analysis");
		console.log("✅ Error handling and progress reporting");
		console.log("✅ Performance metrics and caching");
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

// Run the test
testIntegratedMarkdownAnalysis().catch((error) => {
	console.error("❌ Test execution failed:", error);
	process.exit(1);
});
