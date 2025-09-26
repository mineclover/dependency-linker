/**
 * Performance Benchmark Suite for Directory Analysis
 * Tests performance of directory analysis, file traversal, and path utilities
 */

import * as fs from "fs";
import * as path from "path";
import { TypeScriptAnalyzer } from "../src/api/TypeScriptAnalyzer";
import { BatchAnalyzer } from "../src/api/BatchAnalyzer";
import { DirectoryAnalyzer } from "../src/services/DirectoryAnalyzer";
import { PathUtils } from "../src/utils/PathUtils";

interface DirectoryBenchmarkResult {
	name: string;
	averageTime: number;
	minTime: number;
	maxTime: number;
	filesPerSecond: number;
	directoriesPerSecond: number;
	memoryUsage: {
		heapUsed: number;
		heapTotal: number;
		peakUsage: number;
	};
	analysisMetrics: {
		totalFiles: number;
		totalDirectories: number;
		totalDependencies: number;
		duplicateCount: number;
		errorCount: number;
	};
}

interface DirectoryTestContext {
	testDirectories: {
		small: string;
		medium: string;
		large: string;
		nested: string;
		mixed: string;
	};
	fileCount: {
		small: number;
		medium: number;
		large: number;
		nested: number;
		mixed: number;
	};
}

class DirectoryAnalysisBenchmark {
	private context: DirectoryTestContext | null = null;

	async setup(): Promise<DirectoryTestContext> {
		const baseDir = path.join(__dirname, "benchmark-directories");

		const context: DirectoryTestContext = {
			testDirectories: {
				small: path.join(baseDir, "small-project"),
				medium: path.join(baseDir, "medium-project"),
				large: path.join(baseDir, "large-project"),
				nested: path.join(baseDir, "nested-project"),
				mixed: path.join(baseDir, "mixed-project"),
			},
			fileCount: {
				small: 0,
				medium: 0,
				large: 0,
				nested: 0,
				mixed: 0,
			},
		};

		// Create test directory structures
		context.fileCount.small = await this.createProjectStructure(
			context.testDirectories.small,
			"small",
		);
		context.fileCount.medium = await this.createProjectStructure(
			context.testDirectories.medium,
			"medium",
		);
		context.fileCount.large = await this.createProjectStructure(
			context.testDirectories.large,
			"large",
		);
		context.fileCount.nested = await this.createNestedStructure(
			context.testDirectories.nested,
		);
		context.fileCount.mixed = await this.createMixedStructure(
			context.testDirectories.mixed,
		);

		this.context = context;
		return context;
	}

	async cleanup(): Promise<void> {
		if (!this.context) return;

		// Clean up all test directories
		Object.values(this.context.testDirectories).forEach((dir) => {
			if (fs.existsSync(dir)) {
				this.removeDirectoryRecursive(dir);
			}
		});

		this.context = null;
	}

	private removeDirectoryRecursive(dirPath: string): void {
		if (fs.existsSync(dirPath)) {
			const files = fs.readdirSync(dirPath);
			files.forEach((file) => {
				const filePath = path.join(dirPath, file);
				if (fs.lstatSync(filePath).isDirectory()) {
					this.removeDirectoryRecursive(filePath);
				} else {
					fs.unlinkSync(filePath);
				}
			});
			fs.rmdirSync(dirPath);
		}
	}

	private async createProjectStructure(
		projectDir: string,
		size: "small" | "medium" | "large",
	): Promise<number> {
		const config = {
			small: {
				directories: ["src", "src/components", "src/utils"],
				filesPerDir: 3,
				complexity: "low",
			},
			medium: {
				directories: [
					"src",
					"src/components",
					"src/utils",
					"src/services",
					"src/types",
					"tests",
				],
				filesPerDir: 5,
				complexity: "medium",
			},
			large: {
				directories: [
					"src",
					"src/components",
					"src/utils",
					"src/services",
					"src/types",
					"src/api",
					"src/hooks",
					"src/contexts",
					"tests",
					"tests/unit",
					"tests/integration",
				],
				filesPerDir: 8,
				complexity: "high",
			},
		}[size];

		let fileCount = 0;

		// Create directory structure
		config.directories.forEach((dir) => {
			fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
		});

		// Create files in each directory
		for (const dir of config.directories) {
			const dirPath = path.join(projectDir, dir);

			for (let i = 0; i < config.filesPerDir; i++) {
				const fileName = `file${i}.ts`;
				const filePath = path.join(dirPath, fileName);
				const content = this.generateFileContent(config.complexity, dir, i);

				fs.writeFileSync(filePath, content);
				fileCount++;
			}
		}

		// Add package.json
		const packageJson = {
			name: `${size}-test-project`,
			version: "1.0.0",
			dependencies: {
				react: "^18.0.0",
				typescript: "^5.0.0",
				lodash: "^4.17.21",
			},
		};
		fs.writeFileSync(
			path.join(projectDir, "package.json"),
			JSON.stringify(packageJson, null, 2),
		);
		fileCount++;

		// Add tsconfig.json
		const tsconfigJson = {
			compilerOptions: {
				target: "ES2020",
				lib: ["ES2020", "DOM"],
				allowJs: true,
				skipLibCheck: true,
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
				strict: true,
				forceConsistentCasingInFileNames: true,
				module: "esnext",
				moduleResolution: "node",
				resolveJsonModule: true,
				isolatedModules: true,
				noEmit: true,
				jsx: "react-jsx",
			},
			include: ["src"],
			exclude: ["node_modules"],
		};
		fs.writeFileSync(
			path.join(projectDir, "tsconfig.json"),
			JSON.stringify(tsconfigJson, null, 2),
		);
		fileCount++;

		return fileCount;
	}

	private async createNestedStructure(projectDir: string): Promise<number> {
		let fileCount = 0;
		const maxDepth = 6;

		// Create deeply nested structure
		for (let depth = 0; depth < maxDepth; depth++) {
			const nestedPath = path.join(
				projectDir,
				...Array(depth + 1)
					.fill("level")
					.map((l, i) => `${l}${i}`),
			);
			fs.mkdirSync(nestedPath, { recursive: true });

			// Add 2-3 files at each level
			const filesAtLevel = 2 + (depth % 2);
			for (let i = 0; i < filesAtLevel; i++) {
				const fileName = `nested-${depth}-${i}.ts`;
				const filePath = path.join(nestedPath, fileName);
				const content = this.generateFileContent("medium", `level${depth}`, i);

				fs.writeFileSync(filePath, content);
				fileCount++;
			}
		}

		return fileCount;
	}

	private async createMixedStructure(projectDir: string): Promise<number> {
		let fileCount = 0;

		// Mix of TypeScript, JavaScript, and other files
		const structure = {
			src: {
				files: ["index.ts", "main.js", "types.d.ts", "config.json"],
				dirs: {
					components: {
						files: ["Button.tsx", "Modal.jsx", "utils.ts"],
					},
					services: {
						files: ["api.ts", "auth.js", "storage.ts"],
					},
				},
			},
			tests: {
				files: ["setup.js", "helpers.ts"],
				dirs: {
					unit: {
						files: ["component.test.tsx", "service.test.ts"],
					},
				},
			},
		};

		fileCount += await this.createStructureRecursive(projectDir, structure);
		return fileCount;
	}

	private async createStructureRecursive(
		basePath: string,
		structure: any,
	): Promise<number> {
		let fileCount = 0;

		for (const [name, config] of Object.entries(structure)) {
			const fullPath = path.join(basePath, name);
			fs.mkdirSync(fullPath, { recursive: true });

			// Create files
			if ((config as any).files) {
				for (const fileName of (config as any).files) {
					const filePath = path.join(fullPath, fileName);
					const content = this.generateFileContentByExtension(fileName, name);
					fs.writeFileSync(filePath, content);
					fileCount++;
				}
			}

			// Recursively create subdirectories
			if ((config as any).dirs) {
				fileCount += await this.createStructureRecursive(
					fullPath,
					(config as any).dirs,
				);
			}
		}

		return fileCount;
	}

	private generateFileContent(
		complexity: string,
		dirName: string,
		index: number,
	): string {
		const baseContent = `// Generated file for ${dirName} - ${complexity} complexity\n\n`;

		const complexityLevels = {
			low: { imports: 2, exports: 3, functions: 2 },
			medium: { imports: 5, exports: 6, functions: 4 },
			high: { imports: 8, exports: 10, functions: 6 },
		};

		const config =
			complexityLevels[complexity as keyof typeof complexityLevels] ||
			complexityLevels.medium;
		let content = baseContent;

		// Add imports
		for (let i = 0; i < config.imports; i++) {
			content += `import { Item${i} } from './${dirName}-dep-${i}';\n`;
		}
		content += "\n";

		// Add interfaces
		content += `export interface ${dirName.charAt(0).toUpperCase() + dirName.slice(1)}Item${index} {\n`;
		content += `  id: number;\n`;
		content += `  name: string;\n`;
		content += `  data: any;\n`;
		content += `}\n\n`;

		// Add functions
		for (let i = 0; i < config.functions; i++) {
			content += `export function ${dirName}Func${index}_${i}(): ${dirName.charAt(0).toUpperCase() + dirName.slice(1)}Item${index} {\n`;
			content += `  return { id: ${index}, name: '${dirName}_${i}', data: {} };\n`;
			content += `}\n\n`;
		}

		return content;
	}

	private generateFileContentByExtension(
		fileName: string,
		dirName: string,
	): string {
		const ext = path.extname(fileName);

		switch (ext) {
			case ".ts":
			case ".tsx":
				return `// TypeScript file: ${fileName}\nexport const ${fileName.replace(/[.-]/g, "_")} = 'value';`;

			case ".js":
			case ".jsx":
				return `// JavaScript file: ${fileName}\nmodule.exports = { ${fileName.replace(/[.-]/g, "_")}: 'value' };`;

			case ".json":
				return JSON.stringify({ fileName, dirName, type: "config" }, null, 2);

			case ".d.ts":
				return `// Type definitions for ${fileName}\ndeclare module '${dirName}' {\n  export const value: string;\n}`;

			default:
				return `// File: ${fileName}\nexport default '${fileName}';`;
		}
	}

	async runBenchmark(
		name: string,
		testFn: (
			context: DirectoryTestContext,
		) => Promise<{ result: any; metrics?: any }>,
		iterations: number = 3,
	): Promise<DirectoryBenchmarkResult> {
		const times: number[] = [];
		let peakMemoryUsage = 0;
		let lastMetrics: any = {};

		for (let i = 0; i < iterations; i++) {
			const memoryBefore = process.memoryUsage();
			const startTime = process.hrtime.bigint();

			const { result, metrics } = await testFn(this.context!);

			const endTime = process.hrtime.bigint();
			const memoryAfter = process.memoryUsage();

			peakMemoryUsage = Math.max(peakMemoryUsage, memoryAfter.heapUsed);

			const executionTime = Number(endTime - startTime) / 1_000_000;
			times.push(executionTime);

			if (metrics) {
				lastMetrics = metrics;
			}

			// Small delay between iterations
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		const averageTime =
			times.reduce((sum, time) => sum + time, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);

		const currentMemory = process.memoryUsage();

		return {
			name,
			averageTime,
			minTime,
			maxTime,
			filesPerSecond: (lastMetrics.totalFiles || 0) / (averageTime / 1000),
			directoriesPerSecond:
				(lastMetrics.totalDirectories || 0) / (averageTime / 1000),
			memoryUsage: {
				heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
				heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
				peakUsage: Math.round(peakMemoryUsage / 1024 / 1024),
			},
			analysisMetrics: {
				totalFiles: lastMetrics.totalFiles || 0,
				totalDirectories: lastMetrics.totalDirectories || 0,
				totalDependencies: lastMetrics.totalDependencies || 0,
				duplicateCount: lastMetrics.duplicateCount || 0,
				errorCount: lastMetrics.errorCount || 0,
			},
		};
	}

	async runAllBenchmarks(): Promise<DirectoryBenchmarkResult[]> {
		console.log("🗂️  Running Directory Analysis Performance Benchmarks");
		console.log("═".repeat(70));

		await this.setup();
		const results: DirectoryBenchmarkResult[] = [];

		try {
			// Benchmark 1: Small project analysis
			console.log("\n📁 Testing small project directory analysis...");
			const smallProjectResult = await this.runBenchmark(
				"DirectoryAnalyzer.smallProject",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const directoryAnalyzer = new DirectoryAnalyzer(analyzer);

					const result = await directoryAnalyzer.analyzeDirectory(
						ctx.testDirectories.small,
						{
							recursive: true,
							includeNodeModules: false,
							includeTests: true,
						},
					);

					return {
						result,
						metrics: {
							totalFiles: ctx.fileCount.small,
							totalDirectories: 3,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: result.summary.duplicateCount || 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(smallProjectResult);

			// Benchmark 2: Medium project analysis
			console.log("\n📂 Testing medium project directory analysis...");
			const mediumProjectResult = await this.runBenchmark(
				"DirectoryAnalyzer.mediumProject",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const directoryAnalyzer = new DirectoryAnalyzer(analyzer);

					const result = await directoryAnalyzer.analyzeDirectory(
						ctx.testDirectories.medium,
						{
							recursive: true,
							includeNodeModules: false,
							includeTests: true,
						},
					);

					return {
						result,
						metrics: {
							totalFiles: ctx.fileCount.medium,
							totalDirectories: 6,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: result.summary.duplicateCount || 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(mediumProjectResult);

			// Benchmark 3: Large project analysis
			console.log("\n📋 Testing large project directory analysis...");
			const largeProjectResult = await this.runBenchmark(
				"DirectoryAnalyzer.largeProject",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const directoryAnalyzer = new DirectoryAnalyzer(analyzer);

					const result = await directoryAnalyzer.analyzeDirectory(
						ctx.testDirectories.large,
						{
							recursive: true,
							includeNodeModules: false,
							includeTests: true,
						},
					);

					return {
						result,
						metrics: {
							totalFiles: ctx.fileCount.large,
							totalDirectories: 11,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: result.summary.duplicateCount || 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(largeProjectResult);

			// Benchmark 4: Nested directory structure
			console.log("\n🔄 Testing deeply nested directory analysis...");
			const nestedResult = await this.runBenchmark(
				"DirectoryAnalyzer.nestedStructure",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const directoryAnalyzer = new DirectoryAnalyzer(analyzer);

					const result = await directoryAnalyzer.analyzeDirectory(
						ctx.testDirectories.nested,
						{
							recursive: true,
							maxDepth: 10,
						},
					);

					return {
						result,
						metrics: {
							totalFiles: ctx.fileCount.nested,
							totalDirectories: 6,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: result.summary.duplicateCount || 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(nestedResult);

			// Benchmark 5: Mixed file types
			console.log("\n🎭 Testing mixed file types analysis...");
			const mixedResult = await this.runBenchmark(
				"DirectoryAnalyzer.mixedTypes",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const directoryAnalyzer = new DirectoryAnalyzer(analyzer);

					const result = await directoryAnalyzer.analyzeDirectory(
						ctx.testDirectories.mixed,
						{
							recursive: true,
							includeJavaScript: true,
							includeTypeDefinitions: true,
						},
					);

					return {
						result,
						metrics: {
							totalFiles: ctx.fileCount.mixed,
							totalDirectories: 4,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: result.summary.duplicateCount || 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(mixedResult);

			// Benchmark 6: Path utilities performance
			console.log("\n🛤️  Testing PathUtils performance...");
			const pathUtilsResult = await this.runBenchmark(
				"PathUtils.operations",
				async (ctx) => {
					const allPaths: string[] = [];

					// Collect all file paths from all test directories
					Object.values(ctx.testDirectories).forEach((dir) => {
						const paths = this.collectAllPaths(dir);
						allPaths.push(...paths);
					});

					// Test various PathUtils operations
					const startTime = Date.now();
					let operations = 0;

					allPaths.forEach((filePath) => {
						PathUtils.normalize(filePath);
						PathUtils.getRelativePath(process.cwd(), filePath);
						PathUtils.isTypeScriptFile(filePath);
						PathUtils.getFileExtension(filePath);
						operations += 4;
					});

					const totalTime = Date.now() - startTime;

					return {
						result: { operations, totalTime },
						metrics: {
							totalFiles: allPaths.length,
							totalDirectories: Object.keys(ctx.testDirectories).length,
							totalDependencies: 0,
							duplicateCount: 0,
							errorCount: 0,
						},
					};
				},
			);
			results.push(pathUtilsResult);

			// Benchmark 7: Batch directory analysis
			console.log("\n🚀 Testing batch directory analysis...");
			const batchResult = await this.runBenchmark(
				"BatchAnalyzer.directories",
				async (ctx) => {
					const analyzer = new TypeScriptAnalyzer({ enableCache: true });
					const batchAnalyzer = new BatchAnalyzer(analyzer, {
						maxConcurrency: 3,
						enableResourceMonitoring: true,
					});

					// Collect all files from all directories
					const allFiles: string[] = [];
					Object.values(ctx.testDirectories).forEach((dir) => {
						const files = this.collectTypeScriptFiles(dir);
						allFiles.push(...files);
					});

					const result = await batchAnalyzer.processBatch(allFiles, {
						continueOnError: true,
					});

					batchAnalyzer.dispose();

					return {
						result,
						metrics: {
							totalFiles: allFiles.length,
							totalDirectories: Object.keys(ctx.testDirectories).length,
							totalDependencies: result.summary.totalDependencies,
							duplicateCount: 0,
							errorCount: result.summary.errorCount || 0,
						},
					};
				},
			);
			results.push(batchResult);
		} finally {
			await this.cleanup();
		}

		return results;
	}

	private collectAllPaths(dir: string): string[] {
		const paths: string[] = [];

		if (!fs.existsSync(dir)) return paths;

		const items = fs.readdirSync(dir);

		items.forEach((item) => {
			const fullPath = path.join(dir, item);
			paths.push(fullPath);

			if (fs.lstatSync(fullPath).isDirectory()) {
				paths.push(...this.collectAllPaths(fullPath));
			}
		});

		return paths;
	}

	private collectTypeScriptFiles(dir: string): string[] {
		const files: string[] = [];

		if (!fs.existsSync(dir)) return files;

		const items = fs.readdirSync(dir);

		items.forEach((item) => {
			const fullPath = path.join(dir, item);

			if (fs.lstatSync(fullPath).isDirectory()) {
				files.push(...this.collectTypeScriptFiles(fullPath));
			} else if (fullPath.match(/\.(ts|tsx)$/)) {
				files.push(fullPath);
			}
		});

		return files;
	}
}

// Utility function to format directory benchmark results
function formatDirectoryResults(results: DirectoryBenchmarkResult[]): void {
	console.log("\n📊 Directory Analysis Benchmark Results");
	console.log("═".repeat(80));

	results.forEach((result, index) => {
		console.log(`\n${index + 1}. ${result.name}`);
		console.log(`   Average Time: ${result.averageTime.toFixed(2)}ms`);
		console.log(`   Files/sec: ${result.filesPerSecond.toFixed(2)}`);
		console.log(
			`   Directories/sec: ${result.directoriesPerSecond.toFixed(2)}`,
		);
		console.log(
			`   Memory Usage: ${result.memoryUsage.heapUsed}MB (peak: ${result.memoryUsage.peakUsage}MB)`,
		);
		console.log(`   Files Analyzed: ${result.analysisMetrics.totalFiles}`);
		console.log(`   Directories: ${result.analysisMetrics.totalDirectories}`);
		console.log(
			`   Dependencies Found: ${result.analysisMetrics.totalDependencies}`,
		);
		if (result.analysisMetrics.errorCount > 0) {
			console.log(`   Errors: ${result.analysisMetrics.errorCount}`);
		}
	});

	// Performance insights
	const fastestAnalysis = results.reduce((fastest, r) =>
		r.filesPerSecond > fastest.filesPerSecond ? r : fastest,
	);

	const mostEfficient = results.reduce((efficient, r) =>
		r.analysisMetrics.totalFiles / result.memoryUsage.heapUsed >
		efficient.analysisMetrics.totalFiles / efficient.memoryUsage.heapUsed
			? r
			: efficient,
	);

	console.log("\n🏆 Performance Insights");
	console.log(
		`   Fastest Analysis: ${fastestAnalysis.name} (${fastestAnalysis.filesPerSecond.toFixed(2)} files/sec)`,
	);
	console.log(`   Most Memory Efficient: ${mostEfficient.name}`);
	console.log(
		`   Average Memory per File: ${(results.reduce((sum, r) => sum + r.memoryUsage.heapUsed / r.analysisMetrics.totalFiles, 0) / results.length).toFixed(2)}MB`,
	);
}

// Export for use in other scripts
export {
	DirectoryAnalysisBenchmark,
	DirectoryBenchmarkResult,
	formatDirectoryResults,
};

// Run benchmark if executed directly
if (require.main === module) {
	const benchmark = new DirectoryAnalysisBenchmark();
	benchmark
		.runAllBenchmarks()
		.then(formatDirectoryResults)
		.catch((error) => {
			console.error("❌ Directory analysis benchmark failed:", error);
			process.exit(1);
		});
}
