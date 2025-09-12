#!/usr/bin/env node
/**
 * Performance Benchmark Suite
 * Comprehensive performance testing for TypeScript File Analyzer
 */

const {
	TypeScriptAnalyzer,
	analyzeTypeScriptFile,
	extractDependencies,
	getBatchAnalysis,
} = require("../dist/index");
const { BatchAnalyzer } = require("../dist/api/BatchAnalyzer");
const fs = require("fs");
const path = require("path");

// Test file generation utilities
function generateComplexTypeScriptFile(size = "medium") {
	const sizes = {
		small: { imports: 5, functions: 10, interfaces: 5 },
		medium: { imports: 20, functions: 50, interfaces: 15 },
		large: { imports: 50, functions: 200, interfaces: 40 },
		xlarge: { imports: 100, functions: 500, interfaces: 100 },
	};

	const config = sizes[size] || sizes.medium;

	let content = "// Generated TypeScript file for benchmarking\n\n";

	// Add imports
	const libraryNames = [
		"react",
		"lodash",
		"axios",
		"express",
		"@types/node",
		"moment",
		"uuid",
		"chalk",
		"commander",
		"inquirer",
	];
	for (let i = 0; i < config.imports; i++) {
		const lib = libraryNames[i % libraryNames.length];
		const importName = `import${i}`;
		content += `import ${importName} from '${lib}${i > libraryNames.length ? i : ""}';\n`;
		if (i % 3 === 0) {
			content += `import { ${importName}Type } from '${lib}${i > libraryNames.length ? i : ""}/types';\n`;
		}
	}

	content += "\n";

	// Add interfaces
	for (let i = 0; i < config.interfaces; i++) {
		content += `interface Interface${i} {\n`;
		for (let j = 0; j < 5; j++) {
			content += `  prop${j}: string;\n`;
		}
		content += `}\n\n`;
	}

	// Add functions
	for (let i = 0; i < config.functions; i++) {
		content += `export function func${i}(param: string): Interface${i % config.interfaces} {\n`;
		content += `  return { ${Array.from({ length: 5 }, (_, j) => `prop${j}: param + '${j}'`).join(", ")} };\n`;
		content += `}\n\n`;
	}

	// Add class
	content += `export class TestClass {\n`;
	for (let i = 0; i < 10; i++) {
		content += `  method${i}(): void { func${i % config.functions}('test'); }\n`;
	}
	content += `}\n\n`;

	content += `export default TestClass;\n`;

	return content;
}

// Benchmark test scenarios
const benchmarks = {
	"Single File Analysis (Small)": {
		setup: async () => {
			const content = generateComplexTypeScriptFile("small");
			const filePath = "./benchmark-small.tsx";
			fs.writeFileSync(filePath, content);
			return { filePath };
		},
		test: async ({ filePath }) => {
			return await analyzeTypeScriptFile(filePath);
		},
		cleanup: ({ filePath }) => {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		},
	},

	"Single File Analysis (Medium)": {
		setup: async () => {
			const content = generateComplexTypeScriptFile("medium");
			const filePath = "./benchmark-medium.tsx";
			fs.writeFileSync(filePath, content);
			return { filePath };
		},
		test: async ({ filePath }) => {
			return await analyzeTypeScriptFile(filePath);
		},
		cleanup: ({ filePath }) => {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		},
	},

	"Single File Analysis (Large)": {
		setup: async () => {
			const content = generateComplexTypeScriptFile("large");
			const filePath = "./benchmark-large.tsx";
			fs.writeFileSync(filePath, content);
			return { filePath };
		},
		test: async ({ filePath }) => {
			return await analyzeTypeScriptFile(filePath);
		},
		cleanup: ({ filePath }) => {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		},
	},

	"Class-based API vs Factory Functions": {
		setup: async () => {
			const content = generateComplexTypeScriptFile("medium");
			const filePath = "./benchmark-api-comparison.tsx";
			fs.writeFileSync(filePath, content);

			const analyzer = new TypeScriptAnalyzer({ enableCache: false });
			return { filePath, analyzer };
		},
		test: async ({ filePath, analyzer }) => {
			const start1 = process.hrtime.bigint();
			await analyzer.analyzeFile(filePath);
			const time1 = Number(process.hrtime.bigint() - start1) / 1_000_000;

			const start2 = process.hrtime.bigint();
			await analyzeTypeScriptFile(filePath);
			const time2 = Number(process.hrtime.bigint() - start2) / 1_000_000;

			return { classAPI: time1, factoryAPI: time2, ratio: time1 / time2 };
		},
		cleanup: ({ filePath }) => {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		},
	},

	"Batch Processing Performance": {
		setup: async () => {
			const files = [];
			for (let i = 0; i < 10; i++) {
				const content = generateComplexTypeScriptFile(
					i % 2 === 0 ? "small" : "medium",
				);
				const filePath = `./benchmark-batch-${i}.tsx`;
				fs.writeFileSync(filePath, content);
				files.push(filePath);
			}
			return { files };
		},
		test: async ({ files }) => {
			const start1 = process.hrtime.bigint();

			// Sequential processing
			const sequentialResults = [];
			for (const file of files) {
				sequentialResults.push(await analyzeTypeScriptFile(file));
			}
			const sequentialTime =
				Number(process.hrtime.bigint() - start1) / 1_000_000;

			const start2 = process.hrtime.bigint();

			// Batch processing
			const batchResults = await getBatchAnalysis(files, { concurrency: 3 });
			const batchTime = Number(process.hrtime.bigint() - start2) / 1_000_000;

			return {
				sequential: sequentialTime,
				batch: batchTime,
				speedup: sequentialTime / batchTime,
				filesCount: files.length,
			};
		},
		cleanup: ({ files }) => {
			files.forEach((file) => {
				if (fs.existsSync(file)) fs.unlinkSync(file);
			});
		},
	},

	"Advanced BatchAnalyzer Performance": {
		setup: async () => {
			const files = [];
			for (let i = 0; i < 15; i++) {
				const size = ["small", "medium", "large"][i % 3];
				const content = generateComplexTypeScriptFile(size);
				const filePath = `./benchmark-advanced-${i}.tsx`;
				fs.writeFileSync(filePath, content);
				files.push(filePath);
			}
			const analyzer = new TypeScriptAnalyzer();
			const batchAnalyzer = new BatchAnalyzer(analyzer, {
				maxConcurrency: 5,
				enableResourceMonitoring: true,
			});
			return { files, batchAnalyzer };
		},
		test: async ({ files, batchAnalyzer }) => {
			const start = process.hrtime.bigint();

			const result = await batchAnalyzer.processBatch(files, {
				continueOnError: true,
			});

			const time = Number(process.hrtime.bigint() - start) / 1_000_000;
			const metrics = batchAnalyzer.getResourceMetrics();

			return {
				totalTime: time,
				averageTime: time / files.length,
				successfulFiles: result.summary.successfulFiles,
				totalDependencies: result.summary.totalDependencies,
				memoryUsage: metrics.memoryUsage,
				resourceMetrics: metrics,
			};
		},
		cleanup: ({ files, batchAnalyzer }) => {
			batchAnalyzer.dispose();
			files.forEach((file) => {
				if (fs.existsSync(file)) fs.unlinkSync(file);
			});
		},
	},

	"Memory Usage Analysis": {
		setup: async () => {
			const files = [];
			for (let i = 0; i < 20; i++) {
				const content = generateComplexTypeScriptFile("large");
				const filePath = `./benchmark-memory-${i}.tsx`;
				fs.writeFileSync(filePath, content);
				files.push(filePath);
			}
			return { files };
		},
		test: async ({ files }) => {
			const initialMemory = process.memoryUsage();

			const results = await getBatchAnalysis(files, { concurrency: 5 });

			const finalMemory = process.memoryUsage();

			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}

			const afterGcMemory = process.memoryUsage();

			return {
				initialHeapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024),
				peakHeapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024),
				afterGcHeapUsed: Math.round(afterGcMemory.heapUsed / 1024 / 1024),
				heapIncrease: Math.round(
					(finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
				),
				filesProcessed: files.length,
				avgMemoryPerFile: Math.round(
					(finalMemory.heapUsed - initialMemory.heapUsed) / files.length / 1024,
				),
			};
		},
		cleanup: ({ files }) => {
			files.forEach((file) => {
				if (fs.existsSync(file)) fs.unlinkSync(file);
			});
		},
	},
};

// Benchmark execution function
async function runBenchmark(name, benchmark, iterations = 3) {
	console.log(`\n🎯 Running: ${name}`);
	console.log("─".repeat(50));

	const results = [];

	for (let i = 0; i < iterations; i++) {
		try {
			const context = await benchmark.setup();

			const startTime = process.hrtime.bigint();
			const result = await benchmark.test(context);
			const endTime = process.hrtime.bigint();

			const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

			results.push({
				iteration: i + 1,
				executionTime,
				result,
			});

			await benchmark.cleanup(context);

			// Small delay between iterations
			await new Promise((resolve) => setTimeout(resolve, 100));
		} catch (error) {
			console.error(`  ❌ Iteration ${i + 1} failed:`, error.message);
		}
	}

	if (results.length === 0) {
		console.log("  ❌ All iterations failed");
		return;
	}

	// Calculate statistics
	const times = results.map((r) => r.executionTime);
	const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
	const minTime = Math.min(...times);
	const maxTime = Math.max(...times);

	console.log(`  📊 Execution Time:`);
	console.log(`     Average: ${avgTime.toFixed(2)}ms`);
	console.log(`     Min: ${minTime.toFixed(2)}ms`);
	console.log(`     Max: ${maxTime.toFixed(2)}ms`);

	// Display specific results
	const lastResult = results[results.length - 1].result;
	if (typeof lastResult === "object" && lastResult !== null) {
		console.log(`  📈 Results:`);
		for (const [key, value] of Object.entries(lastResult)) {
			if (typeof value === "number") {
				console.log(`     ${key}: ${value.toFixed(2)}`);
			} else if (typeof value === "object" && value !== null) {
				console.log(
					`     ${key}: ${JSON.stringify(value, null, 2).substring(0, 100)}...`,
				);
			} else {
				console.log(`     ${key}: ${value}`);
			}
		}
	}
}

// Main benchmark runner
async function runAllBenchmarks() {
	console.log("🚀 TypeScript File Analyzer - Performance Benchmark Suite");
	console.log("═".repeat(80));

	const startTime = Date.now();

	// System information
	console.log("\n💻 System Information:");
	console.log(`   Node.js: ${process.version}`);
	console.log(`   Platform: ${process.platform} ${process.arch}`);
	console.log(
		`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`,
	);

	const benchmarkNames = Object.keys(benchmarks);
	let completed = 0;

	for (const name of benchmarkNames) {
		await runBenchmark(name, benchmarks[name]);
		completed++;
		console.log(
			`\n📈 Progress: ${completed}/${benchmarkNames.length} benchmarks completed`,
		);
	}

	const totalTime = Date.now() - startTime;

	console.log("\n🎉 Benchmark Suite Completed!");
	console.log(`   Total Time: ${(totalTime / 1000).toFixed(2)}s`);
	console.log(`   Benchmarks: ${benchmarkNames.length}`);
	console.log("═".repeat(80));
}

// Run benchmarks if script is executed directly
if (require.main === module) {
	runAllBenchmarks().catch((error) => {
		console.error("💥 Benchmark suite failed:", error);
		process.exit(1);
	});
}

module.exports = { runAllBenchmarks, runBenchmark, benchmarks };
