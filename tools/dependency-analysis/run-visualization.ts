#!/usr/bin/env npx tsx

import { DependencyVisualizer } from "./dependency-visualizer";
import { AnalysisResult } from "./dependency-analyzer";
import * as fs from "node:fs";

async function main() {
	console.log("📊 의존성 시각화 시작...\n");

	try {
		// 이전 분석 결과 로드
		const resultData = await fs.promises.readFile(
			"dependency-analysis-result.json",
			"utf-8",
		);
		const result: AnalysisResult = JSON.parse(resultData);

		// 상대 경로를 절대 경로로 복원
		const absoluteResult: AnalysisResult = {
			...result,
			dependencies: new Map(
				Object.entries(result.dependencies).map(([key, value]) => [
					key.startsWith("src/")
						? `/Users/junwoobang/project/dependency-linker/${key}`
						: key,
					{
						...value,
						filePath: value.filePath.startsWith("src/")
							? `/Users/junwoobang/project/dependency-linker/${value.filePath}`
							: value.filePath,
						dependencies: value.dependencies.map((dep) =>
							dep.startsWith("src/")
								? `/Users/junwoobang/project/dependency-linker/${dep}`
								: dep,
						),
						dependents: value.dependents.map((dep) =>
							dep.startsWith("src/")
								? `/Users/junwoobang/project/dependency-linker/${dep}`
								: dep,
						),
					},
				]),
			),
		};

		// 시각화 생성
		const visualizer = new DependencyVisualizer();

		console.log("🎨 종합 리포트 생성 중...");
		await visualizer.saveVisualization(absoluteResult, "dependency-visual");

		console.log("\n📋 간단한 요약:");
		console.log(visualizer.generateDirectorySummary(absoluteResult));

		console.log("\n🎯 핵심 분석:");
		console.log(visualizer.generateCriticalPathAnalysis(absoluteResult));

		console.log("\n✅ 시각화 완료!");
	} catch (error) {
		console.error("❌ 시각화 실패:", error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
