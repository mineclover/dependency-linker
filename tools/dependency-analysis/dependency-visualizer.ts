#!/usr/bin/env npx tsx

/**
 * Dependency Visualizer
 * 의존성 분석 결과를 다양한 형태로 시각화
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { AnalysisResult, DependencyInfo } from "./dependency-analyzer";

interface VisualizationOptions {
	showDepth?: boolean;
	groupByDirectory?: boolean;
	highlightCriticalPaths?: boolean;
	maxDepth?: number;
}

class DependencyVisualizer {
	private projectRoot: string;

	constructor(projectRoot: string = process.cwd()) {
		this.projectRoot = projectRoot;
	}

	/**
	 * Mermaid 그래프 생성
	 */
	generateMermaidGraph(
		result: AnalysisResult,
		options: VisualizationOptions = {},
	): string {
		const lines: string[] = ["graph TD"];
		const processed = new Set<string>();
		const nodeIds = new Map<string, string>();
		let nodeCounter = 0;

		// 노드 ID 생성
		const getNodeId = (filePath: string): string => {
			if (!nodeIds.has(filePath)) {
				const relativePath = path.relative(this.projectRoot, filePath);
				const cleanName = relativePath.replace(/[^a-zA-Z0-9]/g, "_");
				nodeIds.set(filePath, `N${nodeCounter++}_${cleanName}`);
			}
			return nodeIds.get(filePath)!;
		};

		// 노드 정의
		for (const [filePath, info] of result.dependencies) {
			const nodeId = getNodeId(filePath);
			const relativePath = path.relative(this.projectRoot, filePath);
			const displayName = relativePath.split("/").pop() || relativePath;

			let nodeStyle = "";
			if (info.dependencies.length > 5) {
				nodeStyle = ":::critical";
			} else if (info.dependents.length > 3) {
				nodeStyle = ":::important";
			}

			lines.push(`    ${nodeId}["${displayName}"${nodeStyle}]`);
		}

		// 엣지 정의
		for (const [filePath, info] of result.dependencies) {
			const fromId = getNodeId(filePath);

			for (const depPath of info.dependencies) {
				if (result.dependencies.has(depPath)) {
					const toId = getNodeId(depPath);
					lines.push(`    ${fromId} --> ${toId}`);
				}
			}
		}

		// 스타일 정의
		lines.push("");
		lines.push(
			"    classDef critical fill:#ff6b6b,stroke:#333,stroke-width:2px",
		);
		lines.push(
			"    classDef important fill:#4ecdc4,stroke:#333,stroke-width:2px",
		);

		return lines.join("\n");
	}

	/**
	 * ASCII 트리 생성 (개선된 버전)
	 */
	generateASCIITree(
		result: AnalysisResult,
		options: VisualizationOptions = {},
	): string {
		const lines: string[] = [];
		const visited = new Set<string>();
		const rootFile = path.resolve(this.projectRoot, result.rootFile);

		const buildTree = (
			filePath: string,
			depth: number,
			isLast: boolean,
			prefix: string,
		): void => {
			if (
				visited.has(filePath) ||
				(options.maxDepth && depth > options.maxDepth)
			) {
				return;
			}
			visited.add(filePath);

			const relativePath = path.relative(this.projectRoot, filePath);
			const info = result.dependencies.get(filePath);
			const depCount = info?.dependencies.length || 0;
			const depText = options.showDepth
				? ` [d:${depth}, deps:${depCount}]`
				: ` (${depCount})`;

			const connector = isLast ? "└── " : "├── ";
			lines.push(`${prefix}${connector}📄 ${relativePath}${depText}`);

			if (info && info.dependencies.length > 0) {
				const newPrefix = prefix + (isLast ? "    " : "│   ");
				info.dependencies.forEach((dep, index) => {
					const isLastDep = index === info.dependencies.length - 1;
					buildTree(dep, depth + 1, isLastDep, newPrefix);
				});
			}
		};

		lines.push(`🌳 의존성 트리: ${result.rootFile}`);
		lines.push("");
		buildTree(rootFile, 0, true, "");

		return lines.join("\n");
	}

	/**
	 * 디렉토리별 그룹화된 요약
	 */
	generateDirectorySummary(result: AnalysisResult): string {
		const dirSummary = new Map<
			string,
			{
				files: string[];
				totalDeps: number;
				totalDependents: number;
				maxDepth: number;
			}
		>();

		// 디렉토리별 집계
		for (const [filePath, info] of result.dependencies) {
			const relativePath = path.relative(this.projectRoot, filePath);
			const dir = path.dirname(relativePath);
			const dirKey = dir === "." ? "[root]" : dir;

			if (!dirSummary.has(dirKey)) {
				dirSummary.set(dirKey, {
					files: [],
					totalDeps: 0,
					totalDependents: 0,
					maxDepth: 0,
				});
			}

			const summary = dirSummary.get(dirKey)!;
			summary.files.push(path.basename(relativePath));
			summary.totalDeps += info.dependencies.length;
			summary.totalDependents += info.dependents.length;
			summary.maxDepth = Math.max(summary.maxDepth, info.depth);
		}

		const lines: string[] = [];
		lines.push("📂 디렉토리별 의존성 요약");
		lines.push("=".repeat(50));

		// 디렉토리를 파일 수 기준으로 정렬
		const sortedDirs = Array.from(dirSummary.entries()).sort(
			([, a], [, b]) => b.files.length - a.files.length,
		);

		for (const [dir, summary] of sortedDirs) {
			lines.push(`\n📁 ${dir}`);
			lines.push(`  📊 파일 수: ${summary.files.length}개`);
			lines.push(`  📤 총 의존성: ${summary.totalDeps}개`);
			lines.push(`  📥 총 피의존성: ${summary.totalDependents}개`);
			lines.push(`  📈 최대 깊이: ${summary.maxDepth}`);

			if (summary.files.length <= 5) {
				lines.push(`  📄 파일들: ${summary.files.join(", ")}`);
			} else {
				lines.push(
					`  📄 주요 파일들: ${summary.files.slice(0, 3).join(", ")} 외 ${summary.files.length - 3}개`,
				);
			}
		}

		return lines.join("\n");
	}

	/**
	 * 핵심 의존성 노드 분석
	 */
	generateCriticalPathAnalysis(result: AnalysisResult): string {
		const lines: string[] = [];
		lines.push("🎯 핵심 의존성 분석");
		lines.push("=".repeat(40));

		// 높은 의존성을 가진 파일들 (허브 노드)
		const highDependencyFiles = Array.from(result.dependencies.values())
			.filter((info) => info.dependencies.length >= 3)
			.sort((a, b) => b.dependencies.length - a.dependencies.length)
			.slice(0, 5);

		if (highDependencyFiles.length > 0) {
			lines.push("\n🔄 높은 의존성 파일 (허브 노드):");
			highDependencyFiles.forEach((info, index) => {
				lines.push(
					`  ${index + 1}. ${info.relativePath} (${info.dependencies.length}개 의존성)`,
				);
			});
		}

		// 많이 의존받는 파일들 (인기 노드)
		const highDependentFiles = Array.from(result.dependencies.values())
			.filter((info) => info.dependents.length >= 2)
			.sort((a, b) => b.dependents.length - a.dependents.length)
			.slice(0, 5);

		if (highDependentFiles.length > 0) {
			lines.push("\n⭐ 많이 의존받는 파일 (인기 노드):");
			highDependentFiles.forEach((info, index) => {
				lines.push(
					`  ${index + 1}. ${info.relativePath} (${info.dependents.length}개가 의존)`,
				);
			});
		}

		// 잠재적 병목 지점
		const bottleneckFiles = Array.from(result.dependencies.values())
			.filter(
				(info) => info.dependencies.length >= 2 && info.dependents.length >= 2,
			)
			.sort(
				(a, b) =>
					b.dependencies.length +
					b.dependents.length -
					(a.dependencies.length + a.dependents.length),
			)
			.slice(0, 3);

		if (bottleneckFiles.length > 0) {
			lines.push("\n⚠️  잠재적 병목 지점:");
			bottleneckFiles.forEach((info, index) => {
				const score = info.dependencies.length + info.dependents.length;
				lines.push(
					`  ${index + 1}. ${info.relativePath} (의존성: ${info.dependencies.length}, 피의존성: ${info.dependents.length}, 총점: ${score})`,
				);
			});
		}

		return lines.join("\n");
	}

	/**
	 * 모든 시각화를 포함한 종합 리포트 생성
	 */
	generateComprehensiveReport(
		result: AnalysisResult,
		options: VisualizationOptions = {},
	): string {
		const lines: string[] = [];

		lines.push("📊 의존성 분석 종합 리포트");
		lines.push("=".repeat(60));
		lines.push(`📁 분석 대상: ${result.rootFile}`);
		lines.push(`🕒 분석 시간: ${new Date().toLocaleString("ko-KR")}`);
		lines.push(`📈 총 파일 수: ${result.totalFiles}개`);
		lines.push(`📊 최대 깊이: ${result.maxDepth}`);
		lines.push(`🔄 순환 의존성: ${result.circularDependencies.length}개`);
		lines.push("");

		// ASCII 트리
		lines.push(this.generateASCIITree(result, options));
		lines.push("\n\n");

		// 디렉토리 요약
		lines.push(this.generateDirectorySummary(result));
		lines.push("\n\n");

		// 핵심 분석
		lines.push(this.generateCriticalPathAnalysis(result));
		lines.push("\n\n");

		// 순환 의존성이 있다면 표시
		if (result.circularDependencies.length > 0) {
			lines.push("⚠️  순환 의존성 상세:");
			lines.push("-".repeat(30));
			result.circularDependencies.forEach((cycle, i) => {
				const relativeCycle = cycle.map((f) =>
					path.relative(this.projectRoot, f),
				);
				lines.push(`${i + 1}. ${relativeCycle.join(" → ")}`);
			});
			lines.push("");
		}

		// Mermaid 그래프 코드
		lines.push("🎨 Mermaid 그래프 코드:");
		lines.push("-".repeat(30));
		lines.push("```mermaid");
		lines.push(this.generateMermaidGraph(result, options));
		lines.push("```");

		return lines.join("\n");
	}

	/**
	 * 시각화 결과를 파일로 저장
	 */
	async saveVisualization(
		result: AnalysisResult,
		outputPrefix: string = "dependency-visual",
	): Promise<void> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

		// 종합 리포트
		const report = this.generateComprehensiveReport(result, {
			showDepth: true,
			maxDepth: 10,
		});
		await fs.promises.writeFile(
			`${outputPrefix}-report-${timestamp}.md`,
			report,
		);

		// Mermaid 그래프만 별도 저장
		const mermaidGraph = this.generateMermaidGraph(result);
		await fs.promises.writeFile(
			`${outputPrefix}-mermaid-${timestamp}.md`,
			`\`\`\`mermaid\n${mermaidGraph}\n\`\`\``,
		);

		console.log(`📊 시각화 결과가 저장되었습니다:`);
		console.log(`  📄 종합 리포트: ${outputPrefix}-report-${timestamp}.md`);
		console.log(`  🎨 Mermaid 그래프: ${outputPrefix}-mermaid-${timestamp}.md`);
	}
}

export { DependencyVisualizer, type VisualizationOptions };
