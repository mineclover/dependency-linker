/**
 * 현재 프로젝트 코드 분석 스크립트
 */

import { join } from "node:path";
import { DependencyToGraph } from "../src/integration/DependencyToGraph";

async function analyzeCurrentProject() {
	console.log("🔍 Analyzing current project...\n");

	const projectRoot = join(__dirname, "..");

	const integration = new DependencyToGraph({
		projectRoot,
		projectName: "Dependency Linker",
		enableInference: true,
	});

	try {
		// 분석할 파일들 (샘플)
		const filesToAnalyze = [
			"src/database/GraphDatabase.ts",
			"src/database/GraphStorage.ts",
			"src/database/GraphQueryEngine.ts",
			"src/integration/DependencyToGraph.ts",
			"src/api/analysis.ts",
		];

		console.log("📝 Analyzing files...");
		for (const file of filesToAnalyze) {
			const filePath = join(projectRoot, file);
			try {
				const result = await integration.analyzeSingleFile(filePath);
				console.log(`  ✓ ${file}`);
				console.log(
					`    Dependencies: internal=${result.result.internal.length}, external=${result.result.external.length}, builtin=${result.result.builtin.length}`,
				);
			} catch (error) {
				console.log(`  ✗ ${file}: ${error}`);
			}
		}

		console.log("\n📊 Retrieving all nodes...\n");

		// 모든 노드 리스트업
		const nodeList = await integration.listAllNodes();

		console.log("=== NODE STATISTICS ===");
		console.log(`Total nodes: ${nodeList.stats.totalNodes}`);
		console.log(`Node types: ${nodeList.stats.nodeTypes.join(", ")}`);
		console.log(`Count by type:`, nodeList.stats.countByType);

		console.log("\n=== NODES BY TYPE ===\n");

		// 유형별 노드 출력
		for (const [type, nodes] of Object.entries(nodeList.nodesByType)) {
			console.log(`[${type.toUpperCase()}] (${nodes.length} nodes)`);
			console.log("─".repeat(60));

			for (const node of nodes.slice(0, 10)) {
				console.log(`  ${node.id}: ${node.name}`);
				console.log(`     identifier: ${node.identifier}`);
				console.log(`     sourceFile: ${node.sourceFile}`);
				console.log(`     language: ${node.language}`);

				if (node.metadata) {
					const metadata = Object.entries(node.metadata)
						.filter(([_, v]) => v !== undefined)
						.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
						.join(", ");

					if (metadata) {
						console.log(`     metadata: ${metadata}`);
					}
				}
				console.log("");
			}

			if (nodes.length > 10) {
				console.log(`  ... and ${nodes.length - 10} more nodes\n`);
			}
		}

		// 통계 분석
		console.log("\n=== DETAILED ANALYSIS ===\n");

		const sourceFiles = nodeList.nodes.filter((n) => n.metadata?.extension);
		const internalImports = nodeList.nodes.filter(
			(n) => n.metadata?.isExternal === false,
		);
		const externalPackages = nodeList.nodes.filter(
			(n) => n.metadata?.isExternal === true,
		);

		console.log(`📄 Source files: ${sourceFiles.length}`);
		for (const node of sourceFiles) {
			console.log(`  - ${node.name} (${node.metadata?.extension})`);
		}

		console.log(`\n🏠 Internal imports: ${internalImports.length}`);
		for (const node of internalImports.slice(0, 10)) {
			console.log(`  - ${node.name} (from: ${node.metadata?.originalImport})`);
		}
		if (internalImports.length > 10) {
			console.log(`  ... and ${internalImports.length - 10} more`);
		}

		console.log(`\n🌍 External packages: ${externalPackages.length}`);
		const externalNames = new Set(externalPackages.map((n) => n.name));
		for (const name of Array.from(externalNames).sort()) {
			console.log(`  - ${name}`);
		}

		// 프로젝트 통계
		console.log("\n=== PROJECT STATISTICS ===\n");
		const stats = await integration.getProjectStats();
		console.log("Total nodes:", stats.totalNodes);
		console.log("Total relationships:", stats.totalRelationships);
		console.log("Nodes by type:", stats.nodesByType);
		console.log("Relationships by type:", stats.relationshipsByType);
		console.log("Files by language:", stats.filesByLanguage);
	} catch (error) {
		console.error("Error:", error);
	} finally {
		await integration.close();
	}
}

analyzeCurrentProject().catch(console.error);
