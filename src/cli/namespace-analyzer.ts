#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import { initializeAnalysisSystem } from "../api/analysis";
import { configManager } from "../namespace/ConfigManager";
import { namespaceDependencyAnalyzer } from "../namespace/NamespaceDependencyAnalyzer";
import { NamespaceGraphDB } from "../namespace/NamespaceGraphDB";
import type { NamespaceConfig } from "../namespace/types";
import { createContextDocumentGenerator } from "../context/ContextDocumentGenerator";
import { listScenarios, getScenario } from "../scenarios";

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
	.option(
		"--scenarios <scenarios>",
		"Comma-separated scenario IDs (defaults to basic-structure,file-dependency)",
	)
	.option(
		"--scenario-config <json>",
		"JSON string with scenario-specific configuration",
	)
	.action(async (name, options) => {
		try {
			const configPath = path.resolve(options.config);

			const namespaceConfig: NamespaceConfig = {
				filePatterns: options.patterns || ["**/*"],
				excludePatterns: options.exclude || [],
				description: options.description,
			};

			// Add scenarios if provided
			if (options.scenarios) {
				namespaceConfig.scenarios = options.scenarios
					.split(",")
					.map((s: string) => s.trim());
			}

			// Add scenario config if provided
			if (options.scenarioConfig) {
				try {
					namespaceConfig.scenarioConfig = JSON.parse(options.scenarioConfig);
				} catch (error) {
					console.error("❌ Invalid JSON in --scenario-config");
					process.exit(1);
				}
			}

			await configManager.setNamespaceConfig(name, namespaceConfig, configPath);

			console.log(`✅ Namespace '${name}' created successfully`);
			if (namespaceConfig.scenarios) {
				console.log(`   Scenarios: ${namespaceConfig.scenarios.join(", ")}`);
			}
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

// List scenarios command
program
	.command("scenarios [namespace]")
	.description("List available scenarios or scenarios for a specific namespace")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("--json", "Output as JSON")
	.action(async (namespace, options) => {
		try {
			if (namespace) {
				// Show scenarios for specific namespace
				const configPath = path.resolve(options.config);
				const namespaceConfig = await configManager.loadNamespacedConfig(
					configPath,
					namespace,
				);

				const scenarios =
					namespaceConfig.scenarios || ["basic-structure", "file-dependency"];

				if (options.json) {
					console.log(
						JSON.stringify(
							{
								namespace,
								scenarios,
								scenarioConfig: namespaceConfig.scenarioConfig || {},
							},
							null,
							2,
						),
					);
				} else {
					console.log(`📋 Scenarios for namespace '${namespace}'`);
					console.log("━".repeat(40));

					for (const [index, scenarioId] of scenarios.entries()) {
						const spec = getScenario(scenarioId);
						const configuredMarker = namespaceConfig.scenarios
							? ""
							: " (default)";
						console.log(`  ${index + 1}. ${scenarioId}${configuredMarker}`);
						if (spec) {
							console.log(`     ${spec.description}`);
						}
					}

					if (namespaceConfig.scenarioConfig) {
						console.log("");
						console.log("⚙️  Scenario Configuration:");
						console.log(
							JSON.stringify(namespaceConfig.scenarioConfig, null, 2),
						);
					}
				}
			} else {
				// List all available scenarios
				const allScenarios = listScenarios();

				if (options.json) {
					console.log(
						JSON.stringify(
							allScenarios.map((spec) => ({
								id: spec.id,
								name: spec.name,
								description: spec.description,
								version: spec.version,
								extends: spec.extends,
								requires: spec.requires,
							})),
							null,
							2,
						),
					);
				} else {
					console.log("📋 Available Scenarios");
					console.log("━".repeat(40));
					console.log(`Found ${allScenarios.length} scenario(s):\n`);

					for (const [index, spec] of allScenarios.entries()) {
						console.log(`  ${index + 1}. ${spec.id} (v${spec.version})`);
						console.log(`     ${spec.description}`);
						if (spec.extends && spec.extends.length > 0) {
							console.log(`     Extends: ${spec.extends.join(", ")}`);
						}
						if (spec.requires && spec.requires.length > 0) {
							console.log(`     Requires: ${spec.requires.join(", ")}`);
						}
						console.log("");
					}
				}
			}
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
	.option(
		"--scenarios <scenarios>",
		"Comma-separated scenario IDs to override namespace config",
	)
	.option(
		"--scenario-config <json>",
		"JSON string with scenario-specific configuration",
	)
	.option("--json", "Output as JSON")
	.action(async (namespace, options) => {
		try {
			const configPath = path.resolve(options.config);
			const baseDir = path.resolve(options.cwd);

			// Handle scenario overrides
			if (options.scenarios || options.scenarioConfig) {
				const currentConfig = await configManager.loadNamespacedConfig(
					configPath,
					namespace,
				);

				// Override scenarios if provided
				if (options.scenarios) {
					const scenarioIds = options.scenarios.split(",").map((s: string) => s.trim());
					currentConfig.scenarios = scenarioIds;
				}

				// Override scenario config if provided
				if (options.scenarioConfig) {
					try {
						currentConfig.scenarioConfig = JSON.parse(options.scenarioConfig);
					} catch (error) {
						console.error("❌ Invalid JSON in --scenario-config");
						process.exit(1);
					}
				}

				// Save temporary config
				await configManager.setNamespaceConfig(
					namespace,
					currentConfig,
					configPath,
				);
			}

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
			// Get namespace config for semantic tags
			const namespaceData = await configManager.getNamespaceWithFiles(
				namespace,
				configPath,
				baseDir,
			);

			await db.storeNamespaceDependencies(namespace, graph, baseDir, {
				semanticTags: namespaceData.metadata.semanticTags,
			});

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

				if (result.scenariosExecuted && result.scenariosExecuted.length > 0) {
					console.log("Scenarios Executed:");
					for (const scenarioId of result.scenariosExecuted) {
						console.log(`  - ${scenarioId}`);
					}
					console.log("");
				}

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
	.description("Analyze all configured namespaces with cross-namespace dependencies")
	.option("-c, --config <path>", "Config file path", "deps.config.json")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--json", "Output as JSON")
	.option("--show-cross", "Show cross-namespace dependencies summary")
	.action(async (options) => {
		try {
			const configPath = path.resolve(options.config);
			const baseDir = path.resolve(options.cwd);

			const { namespaces } = await configManager.listNamespaces(configPath);

			if (namespaces.length === 0) {
				console.log("No namespaces configured");
				return;
			}

			console.log(`🔍 Analyzing ${namespaces.length} namespace(s) with cross-namespace dependency tracking`);
			console.log(`📂 Base directory: ${baseDir}`);
			console.log("");

			// Use analyzeAll to detect cross-namespace dependencies
			const { results, graph, crossNamespaceDependencies } =
				await namespaceDependencyAnalyzer.analyzeAll(
					configPath,
					{ cwd: baseDir, projectRoot: baseDir }
				);

			// Build filesByNamespace map and collect configs for database storage
			const filesByNamespace: Record<string, string[]> = {};
			const namespaceConfigs: Record<string, { semanticTags?: string[] }> = {};
			for (const namespace of namespaces) {
				const namespaceData = await configManager.getNamespaceWithFiles(
					namespace,
					configPath,
					baseDir
				);
				filesByNamespace[namespace] = namespaceData.files.map(file =>
					path.resolve(baseDir, file)
				);
				namespaceConfigs[namespace] = {
					semanticTags: namespaceData.metadata.semanticTags
				};
			}

			// Store unified graph in database with namespace information and semantic tags
			const dbPath = path.resolve(baseDir, options.db);
			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();
			await db.storeUnifiedGraph(graph, filesByNamespace, baseDir, {
				namespaceConfigs
			});
			await db.close();

			if (options.json) {
				console.log(JSON.stringify({
					namespaces: results,
					crossNamespaceDependencies
				}, null, 2));
			} else {
				// Show per-namespace results
				for (const [namespace, result] of Object.entries(results)) {
					console.log(`📦 ${namespace}: ${result.analyzedFiles}/${result.totalFiles} files, ${result.graphStats.edges} edges`);
				}

				console.log("");
				console.log("✅ All namespaces analyzed!");
				console.log(`📊 Database: ${dbPath}`);
				console.log(`🔗 Cross-namespace dependencies: ${crossNamespaceDependencies.length}`);

				// Show cross-namespace summary if requested
				if (options.showCross && crossNamespaceDependencies.length > 0) {
					console.log("");
					console.log("🔗 Cross-Namespace Dependencies Summary:");
					console.log("━".repeat(40));

					const grouped = new Map<string, typeof crossNamespaceDependencies>();
					for (const dep of crossNamespaceDependencies) {
						const key = `${dep.sourceNamespace} → ${dep.targetNamespace}`;
						if (!grouped.has(key)) {
							grouped.set(key, []);
						}
						grouped.get(key)?.push(dep);
					}

					for (const [key, deps] of grouped) {
						console.log(`  ${key}: ${deps.length} dependencies`);
					}

					console.log("");
					console.log("💡 Use 'cross-namespace' command for detailed view");
				}
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
	.option("--detailed", "Show detailed dependency information")
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

				if (crossDeps.length === 0) {
					console.log("No cross-namespace dependencies found.");
					console.log("This means all dependencies are within their respective namespaces.");
					return;
				}

				const grouped = new Map<string, typeof crossDeps>();
				for (const dep of crossDeps) {
					const key = `${dep.sourceNamespace} → ${dep.targetNamespace}`;
					if (!grouped.has(key)) {
						grouped.set(key, []);
					}
					grouped.get(key)?.push(dep);
				}

				// Show summary
				console.log("📊 Summary by Namespace Pair:");
				for (const [key, deps] of grouped) {
					console.log(`  ${key}: ${deps.length} dependencies`);
				}
				console.log("");

				// Show detailed view if requested
				if (options.detailed) {
					console.log("📋 Detailed Dependencies:");
					console.log("━".repeat(40));
					for (const [key, deps] of grouped) {
						console.log(`\n${key} (${deps.length} dependencies):`);
						for (const dep of deps) {
							console.log(`  📄 ${dep.source}`);
							console.log(`  └─→ ${dep.target} (${dep.type})`);
						}
					}
				} else {
					console.log("💡 Use --detailed flag to see individual file dependencies");
				}
			}
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Generate context document for a specific file
program
	.command("generate-context <file>")
	.description("Generate context markdown document for a specific file")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.action(async (file, options) => {
		try {
			const baseDir = path.resolve(options.cwd);
			const dbPath = path.resolve(baseDir, options.db);
			const targetFile = path.resolve(baseDir, file);
			const relativeFile = path.relative(baseDir, targetFile);

			console.log("📝 Generating Context Document");
			console.log("━".repeat(40));
			console.log(`File: ${relativeFile}`);
			console.log("");

			// Open database
			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();

			// Find the node
			const nodes = await (db as any).db.findNodes({
				sourceFiles: [relativeFile],
			});

			if (nodes.length === 0) {
				console.log("❌ File not found in database");
				console.log("💡 Run 'analyze-all' first to build the dependency graph");
				await db.close();
				process.exit(1);
			}

			const node = nodes[0];

			// Get dependencies and dependents
			const dependencies = await (db as any).db.findNodeDependencies(node.id);
			const dependents = await (db as any).db.findNodeDependents(node.id);

			const depFiles = dependencies.map((d: any) => d.sourceFile || d.name);
			const depentFiles = dependents.map((d: any) => d.sourceFile || d.name);

			await db.close();

			// Generate context document
			const generator = createContextDocumentGenerator(baseDir);
			const docPath = await generator.generateFileContext(
				node,
				depFiles,
				depentFiles,
			);

			console.log("✅ Context document generated");
			console.log(`📄 Path: ${path.relative(baseDir, docPath)}`);
			console.log("");
			console.log("💡 Edit the document to add:");
			console.log("  - File purpose and responsibilities");
			console.log("  - Key concepts and patterns");
			console.log("  - Implementation notes and decisions");
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// Generate context documents for all files in database
program
	.command("generate-context-all")
	.description("Generate context documents for all files in the dependency graph")
	.option("--cwd <path>", "Working directory", process.cwd())
	.option("-d, --db <path>", "Database path", ".dependency-linker/graph.db")
	.option("--force", "Overwrite existing documents")
	.action(async (options) => {
		try {
			const baseDir = path.resolve(options.cwd);
			const dbPath = path.resolve(baseDir, options.db);

			console.log("📝 Generating Context Documents for All Files");
			console.log("━".repeat(40));
			console.log("");

			// Open database
			const db = new NamespaceGraphDB(dbPath);
			await db.initialize();

			// Get all nodes
			const allNodes = await (db as any).db.findNodes({});
			console.log(`Found ${allNodes.length} nodes in database`);
			console.log("");

			const generator = createContextDocumentGenerator(baseDir);

			let created = 0;
			let skipped = 0;

			for (const node of allNodes) {
				// Get dependencies and dependents
				const dependencies = await (db as any).db.findNodeDependencies(node.id);
				const dependents = await (db as any).db.findNodeDependents(node.id);

				const depFiles = dependencies.map((d: any) => d.sourceFile || d.name);
				const depentFiles = dependents.map((d: any) => d.sourceFile || d.name);

				// Check if document already exists
				const exists = await generator.documentExists(
					node.sourceFile || node.name,
				);

				if (exists && !options.force) {
					skipped++;
					continue;
				}

				// Generate context document
				await generator.generateFileContext(node, depFiles, depentFiles);
				created++;

				if (created % 10 === 0) {
					console.log(`  Generated ${created} documents...`);
				}
			}

			await db.close();

			console.log("");
			console.log("✅ Context document generation complete");
			console.log(`  Created: ${created} documents`);
			console.log(`  Skipped: ${skipped} existing documents`);
			console.log("");
			console.log("💡 Use --force to overwrite existing documents");
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

// List all context documents
program
	.command("list-context")
	.description("List all generated context documents")
	.option("--cwd <path>", "Working directory", process.cwd())
	.action(async (options) => {
		try {
			const baseDir = path.resolve(options.cwd);
			const generator = createContextDocumentGenerator(baseDir);

			console.log("📚 Context Documents");
			console.log("━".repeat(40));

			const { files, symbols } = await generator.listDocuments();

			console.log("");
			console.log(`📁 File-level documents: ${files.length}`);
			if (files.length > 0) {
				for (const file of files.slice(0, 10)) {
					console.log(`  - ${file}`);
				}
				if (files.length > 10) {
					console.log(`  ... and ${files.length - 10} more`);
				}
			}

			console.log("");
			console.log(`🔧 Symbol-level documents: ${symbols.length}`);
			if (symbols.length > 0) {
				for (const symbol of symbols.slice(0, 10)) {
					console.log(`  - ${symbol}`);
				}
				if (symbols.length > 10) {
					console.log(`  ... and ${symbols.length - 10} more`);
				}
			}

			console.log("");
			console.log(`📊 Total: ${files.length + symbols.length} documents`);
		} catch (error) {
			console.error("❌ Error:", error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

program.parse();
