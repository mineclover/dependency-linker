import { DependencyAnalysisHandler } from "../handlers/dependency-analysis-handler.js";

export interface DependenciesActionOptions {
	symbol?: string;
	file?: string;
	type?: string;
	depth?: string;
	output?: string;
	includeExternal?: boolean;
	includeInternal?: boolean;
	database?: string;
}

export async function executeDependenciesAction(
	options: DependenciesActionOptions,
): Promise<void> {
	const handler = new DependencyAnalysisHandler(options.database);

	try {
		await handler.initialize();

		// 심볼 또는 파일 중 하나는 반드시 필요
		if (!options.symbol && !options.file) {
			console.log("❌ Please specify either --symbol or --file");
			process.exit(1);
		}

		console.log(`🔍 Symbol-centric dependency analysis`);
		if (options.symbol) {
			console.log(`🎯 Target Symbol: ${options.symbol}`);
		}
		if (options.file) {
			console.log(`📄 Target File: ${options.file}`);
		}
		console.log(
			`📊 Type: ${options.type}, Depth: ${options.depth}, Output: ${options.output}`,
		);

		// 파일 존재 확인 (파일이 지정된 경우) - 심볼 리스트 조회 시에는 스킵
		if (
			options.file &&
			!(options.output === "list" || options.output === "json")
		) {
			const fs = await import("node:fs");
			if (!fs.existsSync(options.file)) {
				console.log(`❌ File not found: ${options.file}`);
				process.exit(1);
			}
		}

		// 실제 Graph DB를 통한 의존성 분석
		let symbolAnalysis: any;

		if (options.symbol) {
			// 심볼 중심 분석
			symbolAnalysis = await handler.analyzeSymbolDependencies(
				options.symbol,
				options.file,
				parseInt(options.depth || "2", 10),
				options.includeExternal ?? true,
				options.includeInternal ?? true,
			);
		} else if (options.file) {
			// 파일에서 심볼 리스트 조회
			if (options.output === "list" || options.output === "json") {
				// 심볼 리스트만 조회
				let fileSymbols = await handler.getFileSymbols(options.file);

				// 심볼이 없으면 파일을 먼저 분석
				if (fileSymbols.totalCount === 0) {
					console.log(
						"📝 No symbols found in database, analyzing file first...",
					);

					// 실제 파일 분석 수행
					const fs = await import("node:fs");
					if (fs.existsSync(options.file)) {
						const sourceCode = fs.readFileSync(options.file, "utf-8");
						console.log(`📝 Analyzing file: ${options.file}`);
						console.log(`📝 File size: ${sourceCode.length} characters`);

						// 파일 분석 수행
						await handler.analyzeFileSymbols(options.file);
						fileSymbols = await handler.getFileSymbols(options.file);

						console.log(
							`📝 After analysis: ${fileSymbols.totalCount} symbols found`,
						);
					}

					if (fileSymbols.totalCount === 0) {
						// 파일 경로를 상대 경로로도 시도
						const relativePath = options.file.replace(process.cwd() + "/", "");
						console.log(`📝 Trying relative path: ${relativePath}`);
						fileSymbols = await handler.getFileSymbols(relativePath);

						if (fileSymbols.totalCount === 0) {
							console.log("❌ No symbols found in the specified file");
							process.exit(1);
						}
					}
				}

				if (options.output === "json") {
					console.log(JSON.stringify(fileSymbols, null, 2));
				} else {
					console.log(`\n📄 File: ${fileSymbols.filePath}`);
					console.log(`📊 Total Symbols: ${fileSymbols.totalCount}`);
					console.log("\n🔍 Symbols:");
					console.log(
						"Name".padEnd(20) +
							"Type".padEnd(15) +
							"Line".padEnd(8) +
							"Description",
					);
					console.log("-".repeat(60));
					fileSymbols.symbols.forEach((symbol) => {
						console.log(
							symbol.name.padEnd(20) +
								symbol.type.padEnd(15) +
								symbol.line.toString().padEnd(8) +
								symbol.description,
						);
					});
				}

				console.log("\n✅ File symbols listing completed");
				return;
			} else {
				// 첫 번째 심볼 분석
				const fileAnalyses = await handler.analyzeFileSymbols(options.file);
				if (fileAnalyses.length === 0) {
					console.log("❌ No symbols found in the specified file");
					process.exit(1);
				}
				symbolAnalysis = fileAnalyses[0]; // 첫 번째 심볼 사용
			}
		}

		// symbolAnalysis가 undefined인 경우 처리
		if (!symbolAnalysis) {
			console.log("❌ No analysis results available");
			process.exit(1);
		}

		// 출력 형식에 따른 결과 표시
		if (options.output === "json") {
			console.log(JSON.stringify(symbolAnalysis, null, 2));
		} else if (options.output === "list") {
			console.log(`\n🎯 Symbol: ${symbolAnalysis.targetSymbol}`);
			console.log(`📄 File: ${symbolAnalysis.metadata.file}`);
			console.log(
				`📍 Location: Line ${symbolAnalysis.metadata.line}, Column ${symbolAnalysis.metadata.column}`,
			);
			console.log(`📝 Description: ${symbolAnalysis.metadata.description}`);
			console.log(`🏷️  Tags: ${symbolAnalysis.metadata.tags.join(", ")}`);

			console.log("\n🔗 Nearest Nodes:");
			symbolAnalysis.nearestNodes.forEach((node: any, index: number) => {
				const icon =
					node.relationship === "uses"
						? "🔗"
						: node.relationship === "depends-on"
							? "⬇️"
							: node.relationship === "defines"
								? "📝"
								: "📞";
				console.log(`  ${index + 1}. ${icon} ${node.name} (${node.type})`);
				console.log(`     📄 ${node.file}:${node.metadata.line}`);
				console.log(`     📝 ${node.metadata.description}`);
				console.log(`     🏷️  ${node.metadata.tags.join(", ")}`);
				console.log(`     📏 Distance: ${node.distance}`);
				console.log("");
			});
		} else {
			// table 형식 (기본)
			console.log("\n🎯 Symbol Analysis Results:");
			console.log("=".repeat(60));

			console.log(`\n📊 Target Symbol: ${symbolAnalysis.targetSymbol}`);
			console.log(`📄 File: ${symbolAnalysis.metadata.file}`);
			console.log(
				`📍 Location: Line ${symbolAnalysis.metadata.line}, Column ${symbolAnalysis.metadata.column}`,
			);
			console.log(`📝 Description: ${symbolAnalysis.metadata.description}`);
			console.log(`🏷️  Tags: ${symbolAnalysis.metadata.tags.join(", ")}`);
			console.log(`⚡ Complexity: ${symbolAnalysis.metadata.complexity}`);
			console.log(`👤 Author: ${symbolAnalysis.metadata.author}`);
			console.log(`📅 Last Modified: ${symbolAnalysis.metadata.lastModified}`);

			console.log("\n🔗 Nearest Nodes:");
			console.log(
				"Name".padEnd(20) +
					"Type".padEnd(12) +
					"Relationship".padEnd(15) +
					"Distance".padEnd(10) +
					"File",
			);
			console.log("-".repeat(80));
			symbolAnalysis.nearestNodes.forEach((node: any) => {
				console.log(
					node.name.padEnd(20) +
						node.type.padEnd(12) +
						node.relationship.padEnd(15) +
						node.distance.toString().padEnd(10) +
						node.file,
				);
			});
		}

		// 그래프 통계 정보
		console.log("\n📈 Graph Statistics:");
		console.log(
			`  Total Connected Nodes: ${symbolAnalysis.graphStats.totalNodes}`,
		);
		console.log(
			`  Direct Connections: ${symbolAnalysis.graphStats.directConnections}`,
		);
		console.log(
			`  Indirect Connections: ${symbolAnalysis.graphStats.indirectConnections}`,
		);
		console.log(`  Average Distance: ${symbolAnalysis.graphStats.avgDistance}`);
		console.log(
			`  Complexity Score: ${symbolAnalysis.graphStats.complexityScore}/10`,
		);
		console.log(
			`  Centrality Score: ${symbolAnalysis.graphStats.centralityScore}`,
		);

		console.log("\n✅ Symbol-centric analysis completed");
	} catch (error) {
		console.error("❌ Symbol analysis failed:", error);
		process.exit(1);
	} finally {
		await handler.close();
	}
}
