#!/usr/bin/env node

/**
 * Webpack Plugin Integration Example
 * Custom Webpack plugin using the TypeScript Analyzer API for build-time dependency analysis
 */

const { TypeScriptAnalyzer } = require("../dist/index.js");
const path = require("path");

/**
 * TypeScript Dependency Analyzer Webpack Plugin
 * Analyzes TypeScript files during webpack build process
 */
class TypeScriptDependencyPlugin {
	constructor(options = {}) {
		this.options = {
			outputFile: options.outputFile || "dependency-report.json",
			includeNodeModules: options.includeNodeModules || false,
			failOnCircularDeps: options.failOnCircularDeps || false,
			maxFileSize: options.maxFileSize || 1024 * 1024, // 1MB default
			...options,
		};

		this.analyzer = new TypeScriptAnalyzer({
			enableCache: true,
			defaultTimeout: 30000,
		});

		this.dependencies = new Map();
		this.circularDependencies = [];
	}

	apply(compiler) {
		const pluginName = "TypeScriptDependencyPlugin";

		compiler.hooks.compilation.tap(pluginName, (compilation) => {
			// Hook into the module processing
			compilation.hooks.buildModule.tap(pluginName, (module) => {
				this.analyzeModule(module, compilation);
			});

			// Generate report after all modules are processed
			compilation.hooks.afterOptimizeModules.tapAsync(
				pluginName,
				(modules, callback) => {
					this.generateReport(compilation, modules)
						.then(() => {
							callback();
						})
						.catch(callback);
				},
			);
		});
	}

	async analyzeModule(module, compilation) {
		// Only analyze TypeScript files
		if (!this.isTypeScriptModule(module)) {
			return;
		}

		try {
			const filePath = module.resource;
			if (!filePath || !this.shouldAnalyzeFile(filePath)) {
				return;
			}

			console.log(
				`[TypeScriptDependencyPlugin] Analyzing: ${path.relative(process.cwd(), filePath)}`,
			);

			const result = await this.analyzer.analyzeFile(filePath, {
				format: "json",
				parseTimeout: this.options.parseTimeout || 10000,
			});

			if (result.success) {
				this.dependencies.set(filePath, {
					module: path.relative(process.cwd(), filePath),
					dependencies: result.dependencies.map((dep) => ({
						source: dep.source,
						type: dep.type,
						isExternal: this.isExternalDependency(dep.source),
					})),
					imports: result.imports,
					exports: result.exports,
					parseTime: result.parseTime,
					fileSize: this.getFileSize(filePath),
				});

				// Check for circular dependencies
				this.detectCircularDependencies(filePath, result.dependencies);
			} else {
				compilation.warnings.push(
					new Error(
						`[TypeScriptDependencyPlugin] Failed to analyze ${filePath}: ${result.error?.message}`,
					),
				);
			}
		} catch (error) {
			compilation.warnings.push(
				new Error(
					`[TypeScriptDependencyPlugin] Error analyzing module: ${error.message}`,
				),
			);
		}
	}

	async generateReport(compilation, modules) {
		try {
			const report = {
				timestamp: new Date().toISOString(),
				webpack: {
					version: compilation.compiler.webpack.version,
					mode: compilation.compiler.options.mode,
				},
				summary: this.generateSummary(),
				modules: Array.from(this.dependencies.values()),
				circularDependencies: this.circularDependencies,
				analysis: this.generateAnalysis(),
			};

			// Write report to output file
			const reportJson = JSON.stringify(report, null, 2);
			compilation.assets[this.options.outputFile] = {
				source: () => reportJson,
				size: () => reportJson.length,
			};

			// Check for circular dependencies
			if (
				this.options.failOnCircularDeps &&
				this.circularDependencies.length > 0
			) {
				compilation.errors.push(
					new Error(
						`[TypeScriptDependencyPlugin] Circular dependencies detected: ${this.circularDependencies.length} cycles`,
					),
				);
			}

			console.log(
				`[TypeScriptDependencyPlugin] Report generated: ${this.options.outputFile}`,
			);
			console.log(
				`[TypeScriptDependencyPlugin] Analyzed ${this.dependencies.size} TypeScript modules`,
			);
		} catch (error) {
			compilation.errors.push(
				new Error(
					`[TypeScriptDependencyPlugin] Failed to generate report: ${error.message}`,
				),
			);
		}
	}

	generateSummary() {
		const modules = Array.from(this.dependencies.values());
		const totalDependencies = modules.reduce(
			(sum, mod) => sum + mod.dependencies.length,
			0,
		);
		const totalImports = modules.reduce(
			(sum, mod) => sum + mod.imports.length,
			0,
		);
		const totalExports = modules.reduce(
			(sum, mod) => sum + mod.exports.length,
			0,
		);
		const externalDeps = new Set();
		const internalDeps = new Set();

		modules.forEach((mod) => {
			mod.dependencies.forEach((dep) => {
				if (dep.isExternal) {
					externalDeps.add(dep.source);
				} else {
					internalDeps.add(dep.source);
				}
			});
		});

		return {
			totalModules: modules.length,
			totalDependencies,
			totalImports,
			totalExports,
			uniqueExternalDependencies: externalDeps.size,
			uniqueInternalDependencies: internalDeps.size,
			circularDependencies: this.circularDependencies.length,
			averageParseTime:
				modules.length > 0
					? modules.reduce((sum, mod) => sum + (mod.parseTime || 0), 0) /
						modules.length
					: 0,
		};
	}

	generateAnalysis() {
		const modules = Array.from(this.dependencies.values());

		// Find modules with most dependencies
		const topDependencies = modules
			.sort((a, b) => b.dependencies.length - a.dependencies.length)
			.slice(0, 10)
			.map((mod) => ({
				module: mod.module,
				dependencyCount: mod.dependencies.length,
			}));

		// Find most imported external libraries
		const externalLibs = {};
		modules.forEach((mod) => {
			mod.dependencies
				.filter((dep) => dep.isExternal)
				.forEach((dep) => {
					const lib = this.getLibraryName(dep.source);
					externalLibs[lib] = (externalLibs[lib] || 0) + 1;
				});
		});

		const topExternalLibs = Object.entries(externalLibs)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([lib, count]) => ({ library: lib, usageCount: count }));

		return {
			topDependentModules: topDependencies,
			topExternalLibraries: topExternalLibs,
			potentialOptimizations: this.suggestOptimizations(modules),
		};
	}

	suggestOptimizations(modules) {
		const suggestions = [];

		// Large files
		const largeFiles = modules
			.filter((mod) => mod.fileSize > 50000) // 50KB
			.map((mod) => ({ module: mod.module, size: mod.fileSize }));

		if (largeFiles.length > 0) {
			suggestions.push({
				type: "large-files",
				message: `${largeFiles.length} files are larger than 50KB`,
				files: largeFiles,
			});
		}

		// Heavy dependency modules
		const heavyModules = modules
			.filter((mod) => mod.dependencies.length > 10)
			.map((mod) => ({
				module: mod.module,
				dependencies: mod.dependencies.length,
			}));

		if (heavyModules.length > 0) {
			suggestions.push({
				type: "heavy-dependencies",
				message: `${heavyModules.length} modules have more than 10 dependencies`,
				modules: heavyModules,
			});
		}

		return suggestions;
	}

	isTypeScriptModule(module) {
		if (!module.resource) return false;
		const ext = path.extname(module.resource);
		return [".ts", ".tsx", ".d.ts"].includes(ext);
	}

	shouldAnalyzeFile(filePath) {
		// Skip node_modules unless explicitly enabled
		if (!this.options.includeNodeModules && filePath.includes("node_modules")) {
			return false;
		}

		// Skip files that are too large
		const fileSize = this.getFileSize(filePath);
		if (fileSize > this.options.maxFileSize) {
			return false;
		}

		return true;
	}

	isExternalDependency(source) {
		// Simple heuristic: starts with a letter (not ./ or ../)
		return /^[a-zA-Z@]/.test(source);
	}

	getLibraryName(source) {
		// Extract library name from import path
		if (source.startsWith("@")) {
			// Scoped package like @types/node
			const parts = source.split("/");
			return parts.slice(0, 2).join("/");
		} else {
			// Regular package
			return source.split("/")[0];
		}
	}

	getFileSize(filePath) {
		try {
			const fs = require("fs");
			const stats = fs.statSync(filePath);
			return stats.size;
		} catch {
			return 0;
		}
	}

	detectCircularDependencies(filePath, dependencies) {
		// Simplified circular dependency detection
		// In a real implementation, you'd want a more sophisticated graph analysis
		const baseName = path.basename(filePath, path.extname(filePath));

		dependencies.forEach((dep) => {
			if (
				dep.source.includes(baseName) &&
				!this.isExternalDependency(dep.source)
			) {
				this.circularDependencies.push({
					file: path.relative(process.cwd(), filePath),
					dependency: dep.source,
					type: "potential-circular",
				});
			}
		});
	}
}

// Example webpack configuration
function createExampleWebpackConfig() {
	return {
		mode: "development",
		entry: "./src/index.ts",
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "bundle.js",
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"],
		},
		plugins: [
			new TypeScriptDependencyPlugin({
				outputFile: "ts-dependency-report.json",
				failOnCircularDeps: true,
				includeNodeModules: false,
				maxFileSize: 1024 * 1024, // 1MB
			}),
		],
	};
}

// Standalone usage example
async function standaloneExample() {
	console.log("=== Webpack Plugin Standalone Example ===\n");

	const plugin = new TypeScriptDependencyPlugin({
		outputFile: "example-report.json",
	});

	// Simulate webpack compilation object
	const mockCompilation = {
		assets: {},
		warnings: [],
		errors: [],
		compiler: {
			webpack: { version: "5.0.0" },
			options: { mode: "development" },
		},
	};

	// Analyze some files
	await plugin.analyzeModule(
		{
			resource: "./demo/examples/simple-component.tsx",
		},
		mockCompilation,
	);

	await plugin.analyzeModule(
		{
			resource: "./demo/examples/complex-app.tsx",
		},
		mockCompilation,
	);

	// Generate report
	await plugin.generateReport(mockCompilation, []);

	console.log("Report generated:", plugin.options.outputFile);
	console.log(
		"Report content:",
		JSON.stringify(
			mockCompilation.assets[plugin.options.outputFile].source(),
			null,
			2,
		),
	);
}

// Export for use in webpack config
module.exports = TypeScriptDependencyPlugin;

// Example usage
if (require.main === module) {
	standaloneExample().catch((error) => {
		console.error("Example failed:", error.message);
		process.exit(1);
	});
}
