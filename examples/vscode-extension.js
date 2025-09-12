#!/usr/bin/env node

/**
 * VS Code Extension Integration Example
 * Demonstrates how to integrate the TypeScript Analyzer with VS Code extension development
 */

const { TypeScriptAnalyzer } = require("../dist/index.js");
const { CacheManager } = require("../dist/api/cache/CacheManager.js");
const path = require("path");

/**
 * Simulated VS Code Extension API
 * In real VS Code extension, these would be imported from 'vscode' package
 */
class MockVSCodeAPI {
	constructor() {
		this.window = {
			showInformationMessage: (message) => console.log(`[INFO] ${message}`),
			showWarningMessage: (message) => console.log(`[WARN] ${message}`),
			showErrorMessage: (message) => console.log(`[ERROR] ${message}`),
			createOutputChannel: (name) => ({
				appendLine: (line) => console.log(`[${name}] ${line}`),
				show: () => {},
			}),
		};

		this.workspace = {
			getWorkspaceFolder: () => ({ uri: { fsPath: process.cwd() } }),
			onDidSaveTextDocument: (callback) => {
				// Simulate document save events
				setTimeout(
					() => callback({ fileName: "./demo/examples/simple-component.tsx" }),
					1000,
				);
			},
			onDidChangeTextDocument: (callback) => {
				// Simulate document change events
				setTimeout(
					() =>
						callback({
							document: { fileName: "./demo/examples/simple-component.tsx" },
						}),
					500,
				);
			},
		};

		this.languages = {
			createDiagnosticCollection: (name) => ({
				set: (uri, diagnostics) =>
					console.log(
						`[DIAGNOSTICS] ${uri}: ${diagnostics?.length || 0} issues`,
					),
				clear: () => console.log("[DIAGNOSTICS] Cleared"),
			}),
		};

		this.Uri = {
			file: (path) => ({ fsPath: path }),
		};

		this.DiagnosticSeverity = {
			Error: 0,
			Warning: 1,
			Information: 2,
			Hint: 3,
		};

		this.Range = class {
			constructor(start, end) {
				this.start = start;
				this.end = end;
			}
		};

		this.Position = class {
			constructor(line, character) {
				this.line = line;
				this.character = character;
			}
		};

		this.Diagnostic = class {
			constructor(range, message, severity) {
				this.range = range;
				this.message = message;
				this.severity = severity;
			}
		};
	}
}

/**
 * TypeScript Dependency Analyzer VS Code Extension
 */
class TypeScriptDependencyExtension {
	constructor(context, vscode) {
		this.context = context;
		this.vscode = vscode;
		this.outputChannel = vscode.window.createOutputChannel(
			"TypeScript Dependencies",
		);
		this.diagnosticCollection =
			vscode.languages.createDiagnosticCollection("typescript-deps");

		// Initialize analyzer with caching
		this.cacheManager = new CacheManager({
			enableMemoryCache: true,
			enableFileCache: true,
			maxSize: 1000,
			ttl: 5 * 60 * 1000, // 5 minutes for real-time editing
		});

		this.analyzer = new TypeScriptAnalyzer({
			enableCache: false, // We use our own cache manager
			defaultTimeout: 5000, // Faster timeout for real-time analysis
		});

		this.isAnalyzing = false;
		this.pendingAnalysis = new Map();

		this.outputChannel.appendLine("TypeScript Dependency Analyzer initialized");
	}

	activate() {
		// Register commands
		this.registerCommands();

		// Set up file watchers
		this.setupFileWatchers();

		// Initialize workspace analysis
		this.analyzeWorkspace();

		this.outputChannel.appendLine("Extension activated");
	}

	registerCommands() {
		// Command: Analyze current file
		const analyzeCurrentFile = this.vscode.commands.registerCommand(
			"typescript-deps.analyzeCurrentFile",
			async () => {
				const editor = this.vscode.window.activeTextEditor;
				if (!editor) {
					this.vscode.window.showErrorMessage("No active TypeScript file");
					return;
				}

				await this.analyzeFile(editor.document.fileName, true);
			},
		);

		// Command: Analyze workspace
		const analyzeWorkspace = this.vscode.commands.registerCommand(
			"typescript-deps.analyzeWorkspace",
			() => this.analyzeWorkspace(),
		);

		// Command: Show dependency graph
		const showDependencyGraph = this.vscode.commands.registerCommand(
			"typescript-deps.showDependencyGraph",
			() => this.showDependencyGraph(),
		);

		// Command: Clear cache
		const clearCache = this.vscode.commands.registerCommand(
			"typescript-deps.clearCache",
			async () => {
				await this.cacheManager.clear();
				this.vscode.window.showInformationMessage(
					"Dependency analysis cache cleared",
				);
			},
		);

		// Store commands for cleanup
		this.context.subscriptions.push(
			analyzeCurrentFile,
			analyzeWorkspace,
			showDependencyGraph,
			clearCache,
		);
	}

	setupFileWatchers() {
		// Watch for file saves
		this.vscode.workspace.onDidSaveTextDocument(async (document) => {
			if (this.isTypeScriptFile(document.fileName)) {
				this.outputChannel.appendLine(`File saved: ${document.fileName}`);
				await this.analyzeFile(document.fileName, false);
			}
		});

		// Watch for file changes (debounced)
		this.vscode.workspace.onDidChangeTextDocument(async (event) => {
			const fileName = event.document.fileName;
			if (this.isTypeScriptFile(fileName)) {
				// Debounce analysis to avoid excessive processing
				this.debounceAnalysis(fileName);
			}
		});
	}

	debounceAnalysis(fileName) {
		// Clear existing timeout
		if (this.pendingAnalysis.has(fileName)) {
			clearTimeout(this.pendingAnalysis.get(fileName));
		}

		// Set new timeout
		const timeoutId = setTimeout(async () => {
			this.outputChannel.appendLine(`Analyzing changes: ${fileName}`);
			await this.analyzeFile(fileName, false);
			this.pendingAnalysis.delete(fileName);
		}, 1000); // 1 second debounce

		this.pendingAnalysis.set(fileName, timeoutId);
	}

	async analyzeFile(fileName, showResults = false) {
		if (this.isAnalyzing) {
			return; // Prevent concurrent analysis
		}

		try {
			this.isAnalyzing = true;

			// Check cache first
			const cacheKey = `analysis:${fileName}`;
			let result = await this.cacheManager.get(cacheKey);

			if (!result) {
				this.outputChannel.appendLine(`Analyzing: ${path.basename(fileName)}`);
				result = await this.analyzer.analyzeFile(fileName, {
					format: "json",
					parseTimeout: 5000,
				});

				// Cache successful results
				if (result.success) {
					await this.cacheManager.set(cacheKey, result);
				}
			} else {
				this.outputChannel.appendLine(
					`Using cached result: ${path.basename(fileName)}`,
				);
			}

			// Update diagnostics
			await this.updateDiagnostics(fileName, result);

			// Show results if requested
			if (showResults) {
				this.showAnalysisResults(result);
			}
		} catch (error) {
			this.outputChannel.appendLine(`Analysis error: ${error.message}`);
			this.vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
		} finally {
			this.isAnalyzing = false;
		}
	}

	async updateDiagnostics(fileName, result) {
		const diagnostics = [];
		const uri = this.vscode.Uri.file(fileName);

		if (result.success) {
			// Check for potential issues
			result.dependencies.forEach((dep, index) => {
				// Example: Flag external dependencies without version constraints
				if (
					this.isExternalDependency(dep.source) &&
					!this.hasVersionConstraint(dep.source)
				) {
					const range = new this.vscode.Range(
						new this.vscode.Position(dep.line || 0, 0),
						new this.vscode.Position(dep.line || 0, 100),
					);

					diagnostics.push(
						new this.vscode.Diagnostic(
							range,
							`External dependency '${dep.source}' might benefit from explicit version constraint`,
							this.vscode.DiagnosticSeverity.Information,
						),
					);
				}

				// Example: Flag unused imports (simplified check)
				if (
					dep.type === "import" &&
					dep.imported &&
					dep.imported.length === 0
				) {
					const range = new this.vscode.Range(
						new this.vscode.Position(dep.line || 0, 0),
						new this.vscode.Position(dep.line || 0, 100),
					);

					diagnostics.push(
						new this.vscode.Diagnostic(
							range,
							`Import from '${dep.source}' appears to be unused`,
							this.vscode.DiagnosticSeverity.Warning,
						),
					);
				}
			});

			// Check for circular dependencies (simplified)
			const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
			result.dependencies.forEach((dep) => {
				if (
					dep.source.includes(fileName) &&
					!this.isExternalDependency(dep.source)
				) {
					const range = new this.vscode.Range(
						new this.vscode.Position(dep.line || 0, 0),
						new this.vscode.Position(dep.line || 0, 100),
					);

					diagnostics.push(
						new this.vscode.Diagnostic(
							range,
							`Potential circular dependency: ${dep.source}`,
							this.vscode.DiagnosticSeverity.Warning,
						),
					);
				}
			});
		} else {
			// Analysis failed - show error
			const range = new this.vscode.Range(
				new this.vscode.Position(0, 0),
				new this.vscode.Position(0, 100),
			);

			diagnostics.push(
				new this.vscode.Diagnostic(
					range,
					`Dependency analysis failed: ${result.error?.message || "Unknown error"}`,
					this.vscode.DiagnosticSeverity.Error,
				),
			);
		}

		this.diagnosticCollection.set(uri, diagnostics);
	}

	showAnalysisResults(result) {
		if (result.success) {
			const summary =
				`Dependencies: ${result.dependencies.length}, ` +
				`Imports: ${result.imports.length}, ` +
				`Exports: ${result.exports.length}`;

			this.vscode.window.showInformationMessage(
				`Analysis complete: ${summary}`,
			);

			// Show details in output channel
			this.outputChannel.appendLine(`\n=== Analysis Results ===`);
			this.outputChannel.appendLine(`File: ${result.filePath}`);
			this.outputChannel.appendLine(`Parse time: ${result.parseTime}ms`);
			this.outputChannel.appendLine(`Dependencies:`);

			result.dependencies.forEach((dep) => {
				this.outputChannel.appendLine(`  - ${dep.source} (${dep.type})`);
			});

			this.outputChannel.show();
		} else {
			this.vscode.window.showErrorMessage(
				`Analysis failed: ${result.error?.message || "Unknown error"}`,
			);
		}
	}

	async analyzeWorkspace() {
		try {
			this.outputChannel.appendLine("Starting workspace analysis...");
			this.vscode.window.showInformationMessage(
				"Analyzing TypeScript dependencies in workspace...",
			);

			const workspaceFolder = this.vscode.workspace.getWorkspaceFolder();
			if (!workspaceFolder) {
				this.vscode.window.showErrorMessage("No workspace folder open");
				return;
			}

			// Find TypeScript files (simplified - in real extension, use vscode.workspace.findFiles)
			const tsFiles = this.findTypeScriptFiles(workspaceFolder.uri.fsPath);

			let analyzed = 0;
			let errors = 0;
			const allDependencies = new Set();

			for (const file of tsFiles.slice(0, 10)) {
				// Limit for demo
				try {
					await this.analyzeFile(file, false);
					analyzed++;

					// Collect dependencies
					const result = await this.analyzer.analyzeFile(file);
					if (result.success) {
						result.dependencies.forEach((dep) =>
							allDependencies.add(dep.source),
						);
					}
				} catch (error) {
					errors++;
					this.outputChannel.appendLine(
						`Failed to analyze ${file}: ${error.message}`,
					);
				}
			}

			const message =
				`Workspace analysis complete: ${analyzed} files analyzed, ` +
				`${errors} errors, ${allDependencies.size} unique dependencies`;

			this.vscode.window.showInformationMessage(message);
			this.outputChannel.appendLine(message);
		} catch (error) {
			this.vscode.window.showErrorMessage(
				`Workspace analysis failed: ${error.message}`,
			);
		}
	}

	showDependencyGraph() {
		// In a real extension, this would create a webview with a dependency graph
		this.vscode.window.showInformationMessage(
			"Dependency graph visualization would be shown in a webview panel",
		);

		this.outputChannel.appendLine("=== Dependency Graph (Text Format) ===");
		this.outputChannel.appendLine(
			"In a full VS Code extension, this would show an interactive dependency graph",
		);
		this.outputChannel.show();
	}

	isTypeScriptFile(fileName) {
		const ext = path.extname(fileName);
		return [".ts", ".tsx", ".d.ts"].includes(ext);
	}

	isExternalDependency(source) {
		return /^[a-zA-Z@]/.test(source);
	}

	hasVersionConstraint(source) {
		// Simplified check - in real extension, check package.json
		return true; // Assume all external deps have versions for demo
	}

	findTypeScriptFiles(rootPath) {
		// Simplified file discovery - in real extension, use vscode.workspace.findFiles
		return [
			"./demo/examples/simple-component.tsx",
			"./demo/examples/complex-app.tsx",
			"./demo/examples/node-backend.ts",
		];
	}

	async deactivate() {
		// Clean up resources
		if (this.diagnosticCollection) {
			this.diagnosticCollection.clear();
		}

		if (this.cacheManager) {
			await this.cacheManager.clear();
		}

		// Clear pending analysis
		for (const timeoutId of this.pendingAnalysis.values()) {
			clearTimeout(timeoutId);
		}
		this.pendingAnalysis.clear();

		this.outputChannel.appendLine("Extension deactivated");
	}
}

// Example usage and testing
async function simulateVSCodeExtension() {
	console.log("=== VS Code Extension Simulation ===\n");

	const vscode = new MockVSCodeAPI();
	const context = {
		subscriptions: [],
	};

	// Create and activate extension
	const extension = new TypeScriptDependencyExtension(context, vscode);
	extension.activate();

	// Simulate some operations
	console.log("\n1. Analyzing current file...");
	await extension.analyzeFile("./demo/examples/simple-component.tsx", true);

	console.log("\n2. Simulating file save event...");
	await new Promise((resolve) => {
		vscode.workspace.onDidSaveTextDocument(async (document) => {
			console.log(`File saved: ${document.fileName}`);
			resolve();
		});
	});

	console.log("\n3. Analyzing workspace...");
	await extension.analyzeWorkspace();

	console.log("\n4. Showing dependency graph...");
	extension.showDependencyGraph();

	// Clean up
	await extension.deactivate();
	console.log("\n✅ VS Code extension simulation completed!");
}

// Package.json configuration for VS Code extension
function generateVSCodeExtensionConfig() {
	return {
		name: "typescript-dependency-analyzer",
		displayName: "TypeScript Dependency Analyzer",
		description:
			"Analyze and visualize TypeScript dependencies in your workspace",
		version: "1.0.0",
		engines: {
			vscode: "^1.60.0",
		},
		categories: ["Other", "Linters"],
		activationEvents: ["onLanguage:typescript", "onLanguage:typescriptreact"],
		main: "./out/extension.js",
		contributes: {
			commands: [
				{
					command: "typescript-deps.analyzeCurrentFile",
					title: "Analyze Dependencies",
					category: "TypeScript Deps",
				},
				{
					command: "typescript-deps.analyzeWorkspace",
					title: "Analyze Workspace Dependencies",
					category: "TypeScript Deps",
				},
				{
					command: "typescript-deps.showDependencyGraph",
					title: "Show Dependency Graph",
					category: "TypeScript Deps",
				},
				{
					command: "typescript-deps.clearCache",
					title: "Clear Analysis Cache",
					category: "TypeScript Deps",
				},
			],
			menus: {
				"explorer/context": [
					{
						command: "typescript-deps.analyzeCurrentFile",
						when: "resourceExtname == .ts || resourceExtname == .tsx",
						group: "typescript-deps",
					},
				],
				"editor/context": [
					{
						command: "typescript-deps.analyzeCurrentFile",
						when: "resourceExtname == .ts || resourceExtname == .tsx",
						group: "typescript-deps",
					},
				],
			},
			configuration: {
				title: "TypeScript Dependency Analyzer",
				properties: {
					"typescriptDeps.enableRealTimeAnalysis": {
						type: "boolean",
						default: true,
						description: "Enable real-time dependency analysis as you type",
					},
					"typescriptDeps.cacheEnabled": {
						type: "boolean",
						default: true,
						description: "Enable caching for better performance",
					},
					"typescriptDeps.analysisTimeout": {
						type: "number",
						default: 5000,
						description: "Timeout for dependency analysis in milliseconds",
					},
				},
			},
		},
	};
}

// Export extension class and run simulation
module.exports = TypeScriptDependencyExtension;

if (require.main === module) {
	simulateVSCodeExtension().catch((error) => {
		console.error("Simulation failed:", error.message);
		process.exit(1);
	});
}
