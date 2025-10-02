#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import { initializeAnalysisSystem } from "../api/analysis";
import { configManager } from "../namespace/ConfigManager";
import { namespaceDependencyAnalyzer } from "../namespace/NamespaceDependencyAnalyzer";
import { NamespaceGraphDB } from "../namespace/NamespaceGraphDB";
import type { NamespaceConfig } from "../namespace/types";

// Initialize the analysis system
initializeAnalysisSystem();

const program = new Command();

program
	.name("namespace-analyzer")
	.description("Namespace-based dependency analysis tool")
	.version("3.0.0");

// List namespaces command
program
	.command("list-namespaces")
	.description("List all configured namespaces")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.action(async (options) => {
		try {
			const configPath = path.resolve(options.config);
			const result = await configManager.listNamespaces(configPath);

			console.log("📋 Available Namespaces");
			console.log("━".repeat(40));

			if (result.namespaces.length === 0) {
				console.log("No namespaces configured");
				return;
			}

			for (const [index, namespace] of result.namespaces.entries()) {
				const defaultMarker = namespace === result.default ? " (default)" : "";
				console.log(`  ${index + 1}. ${namespace}${defaultMarker}`);
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Create namespace command
program
	.command("create-namespace <name>")
	.description("Create a new namespace")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("-p, --patterns <patterns...>", "File patterns to include")
	.option("-e, --exclude <patterns...>", "File patterns to exclude")
	.option("-d, --description <text>", "Namespace description")
	.action(async (name, options) => {
		try {
			const configPath = path.resolve(options.config);

			const namespaceConfig: NamespaceConfig = {
				filePatterns: options.patterns || ["**/*"],
				excludePatterns: options.exclude || [],
				description: options.description,
			};

			await configManager.setNamespaceConfig(name, namespaceConfig, configPath);

			console.log(`✅ Namespace '${name}' created successfully`);
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Delete namespace command
program
	.command("delete-namespace <name>")
	.description("Delete a namespace")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.action(async (name, options) => {
		try {
			const configPath = path.resolve(options.config);
			await configManager.deleteNamespace(name, configPath);

			console.log(`✅ Namespace '${name}' deleted`);
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// List files command
program
	.command("list-files <namespace>")
	.description("List files in a namespace")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("--cwd <path>", "Working directory", process.cwd())
	.action(async (namespace, options) => {
		try {
			const configPath = path.resolve(options.config);
			const files = await configManager.listFiles(
				namespace,
				configPath,
				options.cwd,
			);

			console.log(`📁 Files in namespace '${namespace}'`);
			console.log("━".repeat(40));
			console.log(`Found ${files.length} file(s):\n`);

			for (const file of files) {
				console.log(`  ${file}`);
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Analyze namespace command
program
	.command("analyze <namespace>")
	.description("Analyze dependencies for all files in a namespace")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--json", "Output as JSON")
	.action(async (namespace, options) => {
		try {
			const configPath = path.resolve(options.config);
			const baseDir = path.resolve(options.cwd);

			console.log(`🔍 Analyzing namespace: ${namespace}`);
			console.log(`📂 Base directory: ${baseDir}`);
			console.log("");

			// Analyze namespace
			const { result, graph } =
				await namespaceDependencyAnalyzer.analyzeNamespaceWithGraph(
					namespace,
					configPath,
					{ cwd: baseDir, projectRoot: baseDir },
				);

			// Store in database
			const dbPath = path.resolve(baseDir, options.db);
			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();
			await db.storeNamespaceDependencies(namespace, graph, baseDir);

			// Get updated stats from database
			const dbStats = await db.getNamespaceStats(namespace);
			await db.close();

			if (options.json) {
				console.log(
					JSON.stringify(
						{
							...result,
							database: {
								path: dbPath,
								stats: dbStats,
							},
						},
						null,
						2,
					),
				);
			} else {
				console.log("✅ Analysis complete!");
				console.log("━".repeat(40));
				console.log(`Namespace: ${result.namespace}`);
				console.log(`Total files: ${result.totalFiles}`);
				console.log(`Analyzed files: ${result.analyzedFiles}`);
				console.log(`Failed files: ${result.failedFiles.length}`);
				console.log("");
				console.log("Graph Statistics:");
				console.log(`  Nodes: ${result.graphStats.nodes}`);
				console.log(`  Edges: ${result.graphStats.edges}`);
				console.log(
					`  Circular dependencies: ${result.graphStats.circularDependencies}`,
				);
				console.log("");
				console.log("Database:");
				console.log(`  Path: ${dbPath}`);
				console.log(`  Stored nodes: ${dbStats.nodes}`);
				console.log(`  Stored edges: ${dbStats.edges}`);
				console.log(`  Stored files: ${dbStats.files.length}`);

				if (result.errors.length > 0) {
					console.log("");
					console.log("⚠️  Errors:");
					for (const error of result.errors) {
						console.log(`  ${error.file}: ${error.error}`);
					}
				}
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Analyze all namespaces command
program
	.command("analyze-all")
	.description("Analyze all configured namespaces")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const configPath = path.resolve(options.config);
			const baseDir = path.resolve(options.cwd);

			const { namespaces } = await configManager.listNamespaces(configPath);

			if (namespaces.length === 0) {
				console.log("No namespaces configured");
				return;
			}

			console.log(`🔍 Analyzing ${namespaces.length} namespace(s)`);
			console.log(`📂 Base directory: ${baseDir}`);
			console.log("");

			const results: Record<string, unknown> = {};

			for (const namespace of namespaces) {
				console.log(`Analyzing: ${namespace}...`);

				const { result, graph } =
					await namespaceDependencyAnalyzer.analyzeNamespaceWithGraph(
						namespace,
						configPath,
						{ cwd: baseDir, projectRoot: baseDir },
					);

				// Store in database
				const dbPath = path.resolve(baseDir, options.db);
				const db = new NamespaceGraphDB(dbPath);
				await db.initialize();
				await db.storeNamespaceDependencies(namespace, graph, baseDir);

				const dbStats = await db.getNamespaceStats(namespace);
				await db.close();

				results[namespace] = {
					...result,
					database: {
						stats: dbStats,
					},
				};

				console.log(
					`  ✓ ${result.analyzedFiles}/${result.totalFiles} files analyzed`,
				);
			}

			if (options.json) {
				console.log(JSON.stringify(results, null, 2));
			} else {
				console.log("");
				console.log("✅ All namespaces analyzed!");
				console.log(`📊 Database: ${path.resolve(baseDir, options.db)}`);
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Query namespace dependencies
program
	.command("query <namespace>")
	.description("Query namespace dependencies from database")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--stats", "Show statistics")
	.option("--files", "Show files")
	.option("--deps", "Show dependencies")
	.option("--circular", "Show circular dependencies")
	.option("--json", "Output as JSON")
	.action(async (namespace, options) => {
		try {
			const baseDir = path.resolve(options.cwd);
			const dbPath = path.resolve(baseDir, options.db);

			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();

			const showAll =
				!options.stats &&
				!options.files &&
				!options.deps &&
				!options.circular;

			const result: Record<string, unknown> = { namespace };

			if (showAll || options.stats) {
				result.stats = await db.getNamespaceStats(namespace);
			}

			if (showAll || options.files) {
				result.files = await db.getNamespaceFiles(namespace);
			}

			if (showAll || options.deps) {
				result.dependencies = await db.getNamespaceDependencies(namespace);
			}

			if (showAll || options.circular) {
				result.circularDependencies =
					await db.findNamespaceCircularDependencies(namespace);
			}

			await db.close();

			if (options.json) {
				console.log(JSON.stringify(result, null, 2));
			} else {
				console.log(`📊 Namespace: ${namespace}`);
				console.log("━".repeat(40));

				if (result.stats) {
					const stats = result.stats as {
						nodes: number;
						edges: number;
						files: string[];
					};
					console.log(`Nodes: ${stats.nodes}`);
					console.log(`Edges: ${stats.edges}`);
					console.log(`Files: ${stats.files.length}`);
				}

				if (result.files) {
					console.log("\nFiles:");
					for (const file of result.files as string[]) {
						console.log(`  ${file}`);
					}
				}

				if (result.dependencies) {
					console.log("\nDependencies:");
					for (const dep of result.dependencies as Array<{
						source: string;
						target: string;
						type: string;
					}>) {
						console.log(`  ${dep.source} → ${dep.target} (${dep.type})`);
					}
				}

				if (result.circularDependencies) {
					const circular = result.circularDependencies as string[][];
					console.log(`\nCircular Dependencies: ${circular.length}`);
					for (const cycle of circular) {
						console.log(`  ${cycle.join(" → ")}`);
					}
				}
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Cross-namespace dependencies
program
	.command("cross-namespace")
	.description("Show dependencies between namespaces")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const baseDir = path.resolve(options.cwd);
			const dbPath = path.resolve(baseDir, options.db);

			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();

			const crossDeps = await db.getCrossNamespaceDependencies();
			await db.close();

			if (options.json) {
				console.log(JSON.stringify(crossDeps, null, 2));
			} else {
				console.log("🔗 Cross-Namespace Dependencies");
				console.log("━".repeat(40));
				console.log(`Found ${crossDeps.length} cross-namespace dependencies\n`);

				const grouped = new Map<string, typeof crossDeps>();
				for (const dep of crossDeps) {
					const key = `${dep.sourceNamespace} → ${dep.targetNamespace}`;
					if (!grouped.has(key)) {
						grouped.set(key, []);
					}
					grouped.get(key)?.push(dep);
				}

				for (const [key, deps] of grouped) {
					console.log(`${key} (${deps.length}):`);
					for (const dep of deps) {
						console.log(`  ${dep.source} → ${dep.target} (${dep.type})`);
					}
					console.log("");
				}
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

program.parse();
