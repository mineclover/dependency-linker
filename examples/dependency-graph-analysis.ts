/**
 * Dependency Graph Analysis Example
 * 의존성 그래프 분석 사용 예제
 */

import { resolve } from "node:path";
import {
	analyzeDependencyGraph,
	analyzeProjectDependencies,
	analyzeFileImpact,
	createDependencyAnalyzer,
} from "../src/graph";

async function main() {
	const projectRoot = resolve(__dirname, "..");
	console.log("🚀 의존성 그래프 분석 예제");
	console.log("📁 프로젝트 루트:", projectRoot);

	// ===== 1. 기본 의존성 그래프 분석 =====
	console.log("\n📊 1. 기본 의존성 그래프 분석");
	try {
		const { buildResult, analysisResult } = await analyzeDependencyGraph(
			projectRoot,
			["src/index.ts"],
			{
				maxDepth: 8,
				includeExternalDependencies: false,
			},
		);

		console.log("✅ 그래프 빌드 완료:");
		console.log(`  - 처리된 파일: ${buildResult.processedFiles}개`);
		console.log(`  - 처리 시간: ${buildResult.processingTime.toFixed(2)}ms`);
		console.log(`  - 에러: ${buildResult.errors.length}개`);

		console.log("\n📈 분석 결과:");
		console.log(
			`  - 순환 의존성: ${analysisResult.circularDependencies.totalCycles}개`,
		);
		console.log(
			`  - 최대 의존성 깊이: ${analysisResult.dependencyDepth.maxDepth}`,
		);
		console.log(
			`  - 평균 의존성 깊이: ${analysisResult.dependencyDepth.averageDepth.toFixed(2)}`,
		);
		console.log(`  - 허브 파일: ${analysisResult.hubFiles.length}개`);
		console.log(`  - 고립된 파일: ${analysisResult.isolatedFiles.length}개`);
		console.log(
			`  - 미해결 의존성: ${analysisResult.unresolvedDependencies.length}개`,
		);

		// 상위 허브 파일들 출력
		if (analysisResult.hubFiles.length > 0) {
			console.log("\n🌟 상위 허브 파일들:");
			analysisResult.hubFiles.slice(0, 3).forEach((hub, index) => {
				console.log(
					`  ${index + 1}. ${hub.filePath.replace(projectRoot, ".")}`,
				);
				console.log(`     - 들어오는 의존성: ${hub.incomingDependencies}개`);
				console.log(`     - 나가는 의존성: ${hub.outgoingDependencies}개`);
				console.log(`     - 허브 점수: ${hub.hubScore}`);
			});
		}

		// 순환 의존성 출력
		if (analysisResult.circularDependencies.cycles.length > 0) {
			console.log("\n🔄 순환 의존성:");
			analysisResult.circularDependencies.cycles
				.slice(0, 2)
				.forEach((cycle, index) => {
					console.log(
						`  ${index + 1}. ${cycle.map((path) => path.replace(projectRoot, ".")).join(" → ")}`,
					);
				});
		}
	} catch (error) {
		console.error("❌ 기본 분석 실패:", error);
	}

	// ===== 2. 프로젝트 전체 분석 =====
	console.log("\n\n📊 2. 프로젝트 전체 의존성 분석");
	try {
		const { buildResult, analysisResult, statistics } =
			await analyzeProjectDependencies(
				projectRoot,
				["src/index.ts", "src/api/analysis.ts"],
				{
					includeExternalDependencies: true,
				},
			);

		console.log("✅ 전체 분석 완료:");
		console.log(`  - 총 파일: ${statistics.totalFiles}개`);
		console.log(`  - 내부 파일: ${statistics.internalFiles}개`);
		console.log(`  - 외부 패키지: ${statistics.externalPackages}개`);
		console.log(`  - 총 의존성: ${statistics.totalDependencies}개`);
		console.log(`  - 분석 시간: ${statistics.analysisTime.toFixed(2)}ms`);

		console.log("\n📂 언어별 분포:");
		Object.entries(statistics.languageDistribution).forEach(([lang, count]) => {
			console.log(`  - ${lang}: ${count}개 파일`);
		});
	} catch (error) {
		console.error("❌ 전체 분석 실패:", error);
	}

	// ===== 3. 특정 파일 영향도 분석 =====
	console.log("\n\n📊 3. 특정 파일 영향도 분석");
	const targetFile = resolve(projectRoot, "src/api/analysis.ts");
	try {
		const impactAnalysis = await analyzeFileImpact(projectRoot, targetFile, {
			maxDepth: 5,
		});

		console.log(`✅ ${targetFile.replace(projectRoot, ".")} 파일 영향도:`);
		console.log(`  - 영향도 수준: ${impactAnalysis.impactLevel}`);
		console.log(
			`  - 이 파일을 의존하는 파일: ${impactAnalysis.dependents.length}개`,
		);
		console.log(
			`  - 이 파일이 의존하는 파일: ${impactAnalysis.dependencies.length}개`,
		);

		if (impactAnalysis.dependents.length > 0) {
			console.log("  📥 의존하는 파일들:");
			impactAnalysis.dependents.slice(0, 3).forEach((dep, index) => {
				console.log(`    ${index + 1}. ${dep.replace(projectRoot, ".")}`);
			});
		}

		if (impactAnalysis.dependencies.length > 0) {
			console.log("  📤 의존되는 파일들:");
			impactAnalysis.dependencies.slice(0, 3).forEach((dep, index) => {
				console.log(`    ${index + 1}. ${dep.replace(projectRoot, ".")}`);
			});
		}
	} catch (error) {
		console.error("❌ 영향도 분석 실패:", error);
	}

	// ===== 4. 고급 분석 API 사용 =====
	console.log("\n\n📊 4. 고급 분석 API 사용");
	try {
		const analyzer = createDependencyAnalyzer({
			projectRoot,
			entryPoints: ["src/index.ts"],
			maxDepth: 6,
			includeExternalDependencies: false,
			onProgress: (current, total, file) => {
				if (current % 10 === 0) {
					console.log(
						`  📈 진행: ${current}번째 파일 처리 중... (${file.replace(projectRoot, ".")})`,
					);
				}
			},
		});

		console.log("🔨 그래프 빌드 중...");
		const buildResult = await analyzer.buildGraph();

		console.log("🔍 의존성 경로 찾기:");
		const fromFile = resolve(projectRoot, "src/index.ts");
		const toFile = resolve(projectRoot, "src/api/analysis.ts");

		const path = analyzer.findDependencyPath(fromFile, toFile);
		if (path) {
			console.log(
				`  📍 ${fromFile.replace(projectRoot, ".")} → ${toFile.replace(projectRoot, ".")} 경로:`,
			);
			path.forEach((file, index) => {
				console.log(`    ${index + 1}. ${file.replace(projectRoot, ".")}`);
			});
		} else {
			console.log("  ❌ 의존성 경로를 찾을 수 없습니다.");
		}

		// 의존성 트리 출력
		console.log("\n🌳 의존성 트리 (깊이 2):");
		const tree = analyzer.getDependencyTree(fromFile, 2);
		printDependencyTree(tree, projectRoot, 0);
	} catch (error) {
		console.error("❌ 고급 분석 실패:", error);
	}

	console.log("\n🎉 의존성 그래프 분석 완료!");
}

/**
 * 의존성 트리를 재귀적으로 출력하는 헬퍼 함수
 */
function printDependencyTree(
	tree: any,
	projectRoot: string,
	depth: number,
): void {
	const indent = "  ".repeat(depth);
	const fileName = tree.filePath?.replace(projectRoot, ".") || tree.filePath;

	if (tree.truncated) {
		console.log(`${indent}📁 ${fileName} (더 보기...)`);
		return;
	}

	if (!tree.exists) {
		console.log(`${indent}❌ ${fileName} (존재하지 않음)`);
		return;
	}

	const typeIcon =
		tree.type === "external" ? "📦" : tree.type === "builtin" ? "⚙️" : "📄";
	console.log(`${indent}${typeIcon} ${fileName}`);

	if (tree.dependencies && tree.dependencies.length > 0) {
		tree.dependencies.forEach((dep: any) => {
			printDependencyTree(dep, projectRoot, depth + 1);
		});
	}
}

// 예제 실행
if (require.main === module) {
	main().catch(console.error);
}

export { main as runDependencyGraphExample };
