/**
 * Dependency analysis script for inference testing
 * Analyzes a specific file and provides:
 * 1. Nearest nodes with GraphDB IDs
 * 2. Actual file locations
 */

import path from "node:path";
import { NamespaceGraphDB } from "./src/namespace/NamespaceGraphDB";

async function analyzeFileDependencies(targetFile: string) {
	const projectRoot = process.cwd();
	const dbPath = path.join(projectRoot, ".dependency-linker/graph.db");
	const relativeTargetFile = path.relative(projectRoot, targetFile);

	console.log("🔍 Dependency Analysis for Inference Testing");
	console.log("━".repeat(60));
	console.log(`📁 Target File: ${relativeTargetFile}`);
	console.log(`💾 Database: ${dbPath}`);
	console.log("");

	const db = new NamespaceGraphDB(dbPath);
	await db.initialize();

	// 1. Find the target node
	console.log("📊 Step 1: Finding Target Node");
	console.log("━".repeat(60));

	const targetNodes = await (db as any).db.findNodes({
		sourceFiles: [relativeTargetFile],
	});

	if (targetNodes.length === 0) {
		console.log("❌ Target file not found in database");
		console.log(
			"💡 Run 'npm run build && node dist/cli/namespace-analyzer.js analyze-all' first",
		);
		await db.close();
		return;
	}

	const targetNode = targetNodes[0];
	console.log(`✅ Target Node Found:`);
	console.log(`   ID: ${targetNode.id}`);
	console.log(`   Type: ${targetNode.type}`);
	console.log(`   Name: ${targetNode.name}`);
	console.log(
		`   Namespace: ${(targetNode.metadata as any)?.namespace || "unknown"}`,
	);
	console.log("");

	// 2. Get dependencies (outgoing edges)
	console.log("📊 Step 2: Finding Dependencies (Nearest Nodes)");
	console.log("━".repeat(60));

	if (targetNode.id === undefined) {
		console.log("❌ Target node has no ID");
		await db.close();
		return;
	}

	const dependencies = await (db as any).db.findNodeDependencies(targetNode.id);

	console.log(`Found ${dependencies.length} dependency nodes:\n`);

	// Track unique files
	const uniqueFiles = new Set<string>();
	const nodeDetails: Array<{
		id: number;
		type: string;
		name: string;
		file: string;
		namespace: string;
		edgeType: string;
	}> = [];

	for (const dep of dependencies) {
		const namespace = (dep.metadata as any)?.namespace || "unknown";
		const file = dep.sourceFile || "";

		uniqueFiles.add(file);

		nodeDetails.push({
			id: dep.id!,
			type: dep.type,
			name: dep.name,
			file,
			namespace,
			edgeType: dep.type, // This is relationship type from GraphNode
		});

		console.log(`Node #${dep.id}:`);
		console.log(`  Type: ${dep.type}`);
		console.log(`  Name: ${dep.name}`);
		console.log(`  File: ${file}`);
		console.log(`  Namespace: ${namespace}`);
		console.log("");
	}

	// 3. List unique files
	console.log("📊 Step 3: Unique File Locations");
	console.log("━".repeat(60));
	console.log(`Total Nodes: ${dependencies.length}`);
	console.log(`Unique Files: ${uniqueFiles.size}`);
	console.log("");

	const sortedFiles = Array.from(uniqueFiles).sort();
	for (let i = 0; i < sortedFiles.length; i++) {
		const file = sortedFiles[i];
		const nodeCount = nodeDetails.filter((n) => n.file === file).length;
		console.log(`${i + 1}. ${file} (${nodeCount} nodes)`);
	}

	// 4. Summary statistics
	console.log("");
	console.log("📊 Step 4: Summary Statistics");
	console.log("━".repeat(60));

	const nodesByType = new Map<string, number>();
	const nodesByNamespace = new Map<string, number>();

	for (const node of nodeDetails) {
		nodesByType.set(node.type, (nodesByType.get(node.type) || 0) + 1);
		nodesByNamespace.set(
			node.namespace,
			(nodesByNamespace.get(node.namespace) || 0) + 1,
		);
	}

	console.log("\nNodes by Type:");
	for (const [type, count] of Array.from(nodesByType.entries()).sort(
		(a, b) => b[1] - a[1],
	)) {
		console.log(`  ${type}: ${count}`);
	}

	console.log("\nNodes by Namespace:");
	for (const [namespace, count] of Array.from(nodesByNamespace.entries()).sort(
		(a, b) => b[1] - a[1],
	)) {
		console.log(`  ${namespace}: ${count}`);
	}

	// 5. JSON output for further processing
	console.log("");
	console.log("📊 Step 5: JSON Output for Inference Testing");
	console.log("━".repeat(60));

	const output = {
		targetFile: relativeTargetFile,
		targetNode: {
			id: targetNode.id,
			type: targetNode.type,
			name: targetNode.name,
			namespace: (targetNode.metadata as any)?.namespace || "unknown",
		},
		dependencies: {
			totalNodes: dependencies.length,
			uniqueFiles: uniqueFiles.size,
			nodes: nodeDetails,
			files: sortedFiles,
		},
		statistics: {
			nodesByType: Object.fromEntries(nodesByType),
			nodesByNamespace: Object.fromEntries(nodesByNamespace),
		},
	};

	console.log(JSON.stringify(output, null, 2));

	await db.close();
}

// Run analysis
const targetFile = path.resolve(
	process.cwd(),
	process.argv[2] || "src/namespace/NamespaceGraphDB.ts",
);

analyzeFileDependencies(targetFile).catch((error) => {
	console.error("❌ Error:", error);
	process.exit(1);
});
