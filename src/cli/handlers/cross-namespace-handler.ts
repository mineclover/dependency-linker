import { NamespaceDependencyAnalyzer } from "../../namespace/NamespaceDependencyAnalyzer";
import { NamespaceGraphDB } from "../../namespace/NamespaceGraphDB";
import { configManager } from "../../namespace/ConfigManager";

export interface CrossNamespaceHandlerOptions {
	configPath?: string;
	projectRoot?: string;
	cwd?: string;
	maxConcurrency?: number;
	enableCaching?: boolean;
}

export class CrossNamespaceHandler {
	private analyzer: NamespaceDependencyAnalyzer;
	private graphDB?: NamespaceGraphDB;
	private options: Required<CrossNamespaceHandlerOptions>;

	constructor(options: CrossNamespaceHandlerOptions = {}) {
		this.analyzer = new NamespaceDependencyAnalyzer();
		this.options = {
			configPath: options.configPath || "dependency-linker.config.json",
			projectRoot: options.projectRoot || process.cwd(),
			cwd: options.cwd || process.cwd(),
			maxConcurrency: options.maxConcurrency || 5,
			enableCaching: options.enableCaching ?? true,
		};
	}

	/**
	 * 단일 네임스페이스 분석
	 */
	async analyzeNamespace(
		namespace: string,
		options?: {
			includeCrossDependencies?: boolean;
			includeCircularDependencies?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`🔍 네임스페이스 분석: ${namespace}`);

			const result = await this.analyzer.analyzeNamespace(
				namespace,
				this.options.configPath,
				{
					cwd: this.options.cwd,
					projectRoot: this.options.projectRoot,
				},
			);

			console.log(`✅ 네임스페이스 분석 완료: ${namespace}`);
			console.log(`  - 총 파일 수: ${result.totalFiles}개`);
			console.log(`  - 분석된 파일 수: ${result.analyzedFiles}개`);
			console.log(`  - 실패한 파일 수: ${result.failedFiles.length}개`);
			console.log(`  - 그래프 노드 수: ${result.graphStats.nodes}개`);
			console.log(`  - 그래프 엣지 수: ${result.graphStats.edges}개`);
			console.log(
				`  - 순환 의존성: ${result.graphStats.circularDependencies}개`,
			);

			if (options?.includeCrossDependencies) {
				await this.showCrossNamespaceDependencies(namespace);
			}

			if (options?.includeCircularDependencies) {
				await this.showCircularDependencies(namespace);
			}
		} catch (error) {
			console.error(`❌ 네임스페이스 분석 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 다중 네임스페이스 분석
	 */
	async analyzeNamespaces(
		namespaces: string[],
		options?: {
			includeCrossDependencies?: boolean;
			includeStatistics?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`🔍 다중 네임스페이스 분석: ${namespaces.join(", ")}`);

			const results = await this.analyzer.analyzeNamespaces(
				namespaces,
				this.options.configPath,
				{
					cwd: this.options.cwd,
					projectRoot: this.options.projectRoot,
				},
			);

			console.log(`✅ 다중 네임스페이스 분석 완료`);

			for (const [namespace, result] of Object.entries(results)) {
				console.log(`\n📋 ${namespace}:`);
				console.log(`  - 총 파일 수: ${result.totalFiles}개`);
				console.log(`  - 분석된 파일 수: ${result.analyzedFiles}개`);
				console.log(`  - 실패한 파일 수: ${result.failedFiles.length}개`);
				console.log(`  - 그래프 노드 수: ${result.graphStats.nodes}개`);
				console.log(`  - 그래프 엣지 수: ${result.graphStats.edges}개`);
				console.log(
					`  - 순환 의존성: ${result.graphStats.circularDependencies}개`,
				);
			}

			if (options?.includeCrossDependencies) {
				await this.showAllCrossNamespaceDependencies();
			}

			if (options?.includeStatistics) {
				await this.showCrossNamespaceStatistics(results);
			}
		} catch (error) {
			console.error(
				`❌ 다중 네임스페이스 분석 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 전체 네임스페이스 분석 (Cross-Namespace Dependencies 포함)
	 */
	async analyzeAll(options?: {
		includeGraph?: boolean;
		includeCrossDependencies?: boolean;
		includeStatistics?: boolean;
	}): Promise<void> {
		try {
			console.log(`🔍 전체 네임스페이스 분석 시작`);

			const result = await this.analyzer.analyzeAll(this.options.configPath, {
				cwd: this.options.cwd,
				projectRoot: this.options.projectRoot,
			});

			console.log(`✅ 전체 네임스페이스 분석 완료`);
			console.log(
				`  - 분석된 네임스페이스: ${Object.keys(result.results).length}개`,
			);
			console.log(
				`  - Cross-Namespace 의존성: ${result.crossNamespaceDependencies.length}개`,
			);

			if (options?.includeCrossDependencies) {
				await this.showCrossNamespaceDependenciesList(
					result.crossNamespaceDependencies,
				);
			}

			if (options?.includeStatistics) {
				await this.showAllNamespaceStatistics(result.results);
			}

			if (options?.includeGraph) {
				await this.showGraphStatistics(result.graph);
			}
		} catch (error) {
			console.error(
				`❌ 전체 네임스페이스 분석 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * Cross-Namespace 의존성 조회
	 */
	async getCrossNamespaceDependencies(options?: {
		sourceNamespace?: string;
		targetNamespace?: string;
		includeStatistics?: boolean;
	}): Promise<void> {
		try {
			await this.initializeGraphDB();

			console.log(`🔍 Cross-Namespace 의존성 조회`);

			const crossDeps = await this.graphDB!.getCrossNamespaceDependencies();

			// 필터링 적용
			let filteredDeps = crossDeps;
			if (options?.sourceNamespace) {
				filteredDeps = filteredDeps.filter(
					(dep) => dep.sourceNamespace === options.sourceNamespace,
				);
			}
			if (options?.targetNamespace) {
				filteredDeps = filteredDeps.filter(
					(dep) => dep.targetNamespace === options.targetNamespace,
				);
			}

			console.log(
				`✅ Cross-Namespace 의존성 조회 완료: ${filteredDeps.length}개`,
			);

			if (filteredDeps.length > 0) {
				console.log(`\n📋 Cross-Namespace 의존성 목록:`);
				filteredDeps.forEach((dep, index) => {
					console.log(
						`  ${index + 1}. ${dep.sourceNamespace} → ${dep.targetNamespace}`,
					);
					console.log(`     - 소스: ${dep.source}`);
					console.log(`     - 타겟: ${dep.target}`);
					console.log(`     - 타입: ${dep.type}`);
					console.log("");
				});
			}

			if (options?.includeStatistics) {
				await this.showCrossNamespaceDependencyStatistics(filteredDeps);
			}
		} catch (error) {
			console.error(
				`❌ Cross-Namespace 의존성 조회 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 순환 의존성 조회
	 */
	async getCircularDependencies(
		namespace?: string,
		options?: {
			includeStatistics?: boolean;
		},
	): Promise<void> {
		try {
			await this.initializeGraphDB();

			console.log(`🔍 순환 의존성 조회${namespace ? ` (${namespace})` : ""}`);

			let circularDeps: string[][];
			if (namespace) {
				circularDeps =
					await this.graphDB!.findNamespaceCircularDependencies(namespace);
			} else {
				// 모든 네임스페이스의 순환 의존성 조회
				const config = await configManager.loadConfig(this.options.configPath);
				const namespaceNames = Object.keys(config.namespaces || {});
				circularDeps = [];

				for (const ns of namespaceNames) {
					const nsCircularDeps =
						await this.graphDB!.findNamespaceCircularDependencies(ns);
					circularDeps.push(...nsCircularDeps);
				}
			}

			console.log(`✅ 순환 의존성 조회 완료: ${circularDeps.length}개`);

			if (circularDeps.length > 0) {
				console.log(`\n📋 순환 의존성 목록:`);
				circularDeps.forEach((cycle, index) => {
					console.log(`  ${index + 1}. ${cycle.join(" → ")}`);
				});
			}

			if (options?.includeStatistics) {
				await this.showCircularDependencyStatistics(circularDeps);
			}
		} catch (error) {
			console.error(`❌ 순환 의존성 조회 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 네임스페이스 통계 생성
	 */
	async generateStatistics(options?: {
		includeCrossDependencies?: boolean;
		includeCircularDependencies?: boolean;
		includeGraphStatistics?: boolean;
	}): Promise<void> {
		try {
			console.log(`📊 네임스페이스 통계 생성`);

			// 전체 분석 실행
			const result = await this.analyzer.analyzeAll(this.options.configPath, {
				cwd: this.options.cwd,
				projectRoot: this.options.projectRoot,
			});

			console.log(`✅ 네임스페이스 통계 생성 완료`);

			// 기본 통계
			await this.showAllNamespaceStatistics(result.results);

			// Cross-Namespace 의존성 통계
			if (options?.includeCrossDependencies) {
				await this.showCrossNamespaceDependencyStatistics(
					result.crossNamespaceDependencies,
				);
			}

			// 순환 의존성 통계
			if (options?.includeCircularDependencies) {
				await this.getCircularDependencies(undefined, {
					includeStatistics: true,
				});
			}

			// 그래프 통계
			if (options?.includeGraphStatistics) {
				await this.showGraphStatistics(result.graph);
			}
		} catch (error) {
			console.error(`❌ 통계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * GraphDB 초기화
	 */
	private async initializeGraphDB(): Promise<void> {
		if (!this.graphDB) {
			this.graphDB = new NamespaceGraphDB("dependency-linker.db");
			await this.graphDB.initialize();
		}
	}

	/**
	 * Cross-Namespace 의존성 표시
	 */
	private async showCrossNamespaceDependencies(
		namespace: string,
	): Promise<void> {
		await this.initializeGraphDB();
		const crossDeps = await this.graphDB!.getCrossNamespaceDependencies();
		const namespaceDeps = crossDeps.filter(
			(dep) =>
				dep.sourceNamespace === namespace || dep.targetNamespace === namespace,
		);

		if (namespaceDeps.length > 0) {
			console.log(`\n📋 ${namespace} Cross-Namespace 의존성:`);
			namespaceDeps.forEach((dep, index) => {
				console.log(
					`  ${index + 1}. ${dep.sourceNamespace} → ${dep.targetNamespace}`,
				);
				console.log(`     - 소스: ${dep.source}`);
				console.log(`     - 타겟: ${dep.target}`);
				console.log(`     - 타입: ${dep.type}`);
			});
		}
	}

	/**
	 * 모든 Cross-Namespace 의존성 표시
	 */
	private async showAllCrossNamespaceDependencies(): Promise<void> {
		await this.initializeGraphDB();
		const crossDeps = await this.graphDB!.getCrossNamespaceDependencies();

		if (crossDeps.length > 0) {
			console.log(`\n📋 모든 Cross-Namespace 의존성:`);
			crossDeps.forEach((dep, index) => {
				console.log(
					`  ${index + 1}. ${dep.sourceNamespace} → ${dep.targetNamespace}`,
				);
				console.log(`     - 소스: ${dep.source}`);
				console.log(`     - 타겟: ${dep.target}`);
				console.log(`     - 타입: ${dep.type}`);
			});
		}
	}

	/**
	 * Cross-Namespace 의존성 목록 표시
	 */
	private async showCrossNamespaceDependenciesList(
		crossDeps: Array<{
			sourceNamespace: string;
			targetNamespace: string;
			source: string;
			target: string;
			type: string;
		}>,
	): Promise<void> {
		if (crossDeps.length > 0) {
			console.log(`\n📋 Cross-Namespace 의존성 목록:`);
			crossDeps.forEach((dep, index) => {
				console.log(
					`  ${index + 1}. ${dep.sourceNamespace} → ${dep.targetNamespace}`,
				);
				console.log(`     - 소스: ${dep.source}`);
				console.log(`     - 타겟: ${dep.target}`);
				console.log(`     - 타입: ${dep.type}`);
			});
		}
	}

	/**
	 * 순환 의존성 표시
	 */
	private async showCircularDependencies(namespace: string): Promise<void> {
		await this.initializeGraphDB();
		const circularDeps =
			await this.graphDB!.findNamespaceCircularDependencies(namespace);

		if (circularDeps.length > 0) {
			console.log(`\n📋 ${namespace} 순환 의존성:`);
			circularDeps.forEach((cycle, index) => {
				console.log(`  ${index + 1}. ${cycle.join(" → ")}`);
			});
		}
	}

	/**
	 * Cross-Namespace 통계 표시
	 */
	private async showCrossNamespaceStatistics(
		results: Record<string, any>,
	): Promise<void> {
		console.log(`\n📊 Cross-Namespace 통계:`);
		console.log(`  - 분석된 네임스페이스: ${Object.keys(results).length}개`);

		let totalFiles = 0;
		let totalAnalyzedFiles = 0;
		let totalFailedFiles = 0;
		let totalNodes = 0;
		let totalEdges = 0;
		let totalCircularDependencies = 0;

		for (const [namespace, result] of Object.entries(results)) {
			totalFiles += result.totalFiles;
			totalAnalyzedFiles += result.analyzedFiles;
			totalFailedFiles += result.failedFiles.length;
			totalNodes += result.graphStats.nodes;
			totalEdges += result.graphStats.edges;
			totalCircularDependencies += result.graphStats.circularDependencies;
		}

		console.log(`  - 총 파일 수: ${totalFiles}개`);
		console.log(`  - 분석된 파일 수: ${totalAnalyzedFiles}개`);
		console.log(`  - 실패한 파일 수: ${totalFailedFiles}개`);
		console.log(`  - 총 그래프 노드 수: ${totalNodes}개`);
		console.log(`  - 총 그래프 엣지 수: ${totalEdges}개`);
		console.log(`  - 총 순환 의존성: ${totalCircularDependencies}개`);
	}

	/**
	 * 모든 네임스페이스 통계 표시
	 */
	private async showAllNamespaceStatistics(
		results: Record<string, any>,
	): Promise<void> {
		console.log(`\n📊 네임스페이스 통계:`);
		console.log(`  - 분석된 네임스페이스: ${Object.keys(results).length}개`);

		for (const [namespace, result] of Object.entries(results)) {
			console.log(`\n  📋 ${namespace}:`);
			console.log(`    - 총 파일 수: ${result.totalFiles}개`);
			console.log(`    - 분석된 파일 수: ${result.analyzedFiles}개`);
			console.log(`    - 실패한 파일 수: ${result.failedFiles.length}개`);
			console.log(`    - 그래프 노드 수: ${result.graphStats.nodes}개`);
			console.log(`    - 그래프 엣지 수: ${result.graphStats.edges}개`);
			console.log(
				`    - 순환 의존성: ${result.graphStats.circularDependencies}개`,
			);
		}
	}

	/**
	 * Cross-Namespace 의존성 통계 표시
	 */
	private async showCrossNamespaceDependencyStatistics(
		crossDeps: Array<{
			sourceNamespace: string;
			targetNamespace: string;
			source: string;
			target: string;
			type: string;
		}>,
	): Promise<void> {
		console.log(`\n📊 Cross-Namespace 의존성 통계:`);
		console.log(`  - 총 Cross-Namespace 의존성: ${crossDeps.length}개`);

		// 네임스페이스별 통계
		const namespaceStats = new Map<
			string,
			{ outgoing: number; incoming: number }
		>();
		for (const dep of crossDeps) {
			// Outgoing dependencies
			const outgoing = namespaceStats.get(dep.sourceNamespace) || {
				outgoing: 0,
				incoming: 0,
			};
			outgoing.outgoing++;
			namespaceStats.set(dep.sourceNamespace, outgoing);

			// Incoming dependencies
			const incoming = namespaceStats.get(dep.targetNamespace) || {
				outgoing: 0,
				incoming: 0,
			};
			incoming.incoming++;
			namespaceStats.set(dep.targetNamespace, incoming);
		}

		console.log(`  - 네임스페이스별 통계:`);
		for (const [namespace, stats] of namespaceStats.entries()) {
			console.log(
				`    ${namespace}: outgoing ${stats.outgoing}개, incoming ${stats.incoming}개`,
			);
		}
	}

	/**
	 * 순환 의존성 통계 표시
	 */
	private async showCircularDependencyStatistics(
		cycles: string[][],
	): Promise<void> {
		console.log(`\n📊 순환 의존성 통계:`);
		console.log(`  - 총 순환 의존성: ${cycles.length}개`);

		if (cycles.length > 0) {
			const cycleLengths = cycles.map((cycle) => cycle.length);
			const avgLength =
				cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
			const maxLength = Math.max(...cycleLengths);
			const minLength = Math.min(...cycleLengths);

			console.log(`  - 평균 순환 길이: ${Math.round(avgLength * 100) / 100}개`);
			console.log(`  - 최대 순환 길이: ${maxLength}개`);
			console.log(`  - 최소 순환 길이: ${minLength}개`);
		}
	}

	/**
	 * 그래프 통계 표시
	 */
	private async showGraphStatistics(graph: any): Promise<void> {
		console.log(`\n📊 그래프 통계:`);
		console.log(`  - 총 노드 수: ${graph.nodes.length}개`);
		console.log(`  - 총 엣지 수: ${graph.edges.length}개`);
		console.log(
			`  - 평균 연결도: ${Math.round((graph.edges.length / graph.nodes.length) * 100) / 100}`,
		);
	}

	/**
	 * 핸들러 초기화
	 */
	async initialize(): Promise<void> {
		try {
			console.log("✅ Cross-Namespace Handler 초기화 완료");
		} catch (error) {
			console.error(
				`❌ Cross-Namespace Handler 초기화 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 핸들러 종료
	 */
	async close(): Promise<void> {
		try {
			if (this.graphDB) {
				await this.graphDB.close();
			}
			console.log("✅ Cross-Namespace Handler 종료 완료");
		} catch (error) {
			console.error(
				`❌ Cross-Namespace Handler 종료 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}
}
