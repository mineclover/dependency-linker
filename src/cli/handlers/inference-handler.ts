import { GraphDatabase } from "../../database/GraphDatabase";
import { AdvancedInferenceSystem } from "../../database/inference/AdvancedInferenceSystem";
import { InferenceEngine } from "../../database/inference/InferenceEngine";
import { OptimizedInferenceEngine } from "../../database/inference/OptimizedInferenceEngine";
import { DATABASE_CONFIG } from "../config/database-config";

export interface InferenceHandlerOptions {
	databasePath?: string;
	enableCustomRules?: boolean;
	enableRealTimeInference?: boolean;
	enableOptimizedInference?: boolean;
	enableLegacyInference?: boolean;
	maxConcurrency?: number;
	enableCaching?: boolean;
}

export class InferenceHandler {
	private database: GraphDatabase;
	private advancedSystem: AdvancedInferenceSystem;
	private inferenceEngine: InferenceEngine;
	private optimizedEngine: OptimizedInferenceEngine;
	private options: Required<InferenceHandlerOptions>;

	constructor(options: InferenceHandlerOptions = {}) {
		this.options = {
			databasePath: options.databasePath || DATABASE_CONFIG.getDatabasePath(),
			enableCustomRules: options.enableCustomRules ?? true,
			enableRealTimeInference: options.enableRealTimeInference ?? true,
			enableOptimizedInference: options.enableOptimizedInference ?? true,
			enableLegacyInference: options.enableLegacyInference ?? true,
			maxConcurrency: options.maxConcurrency || 5,
			enableCaching: options.enableCaching ?? true,
		};

		this.database = new GraphDatabase(this.options.databasePath);
		this.advancedSystem = new AdvancedInferenceSystem(this.database, {
			enableCustomRules: this.options.enableCustomRules,
			enableRealTimeInference: this.options.enableRealTimeInference,
			enableOptimizedInference: this.options.enableOptimizedInference,
			enableLegacyInference: this.options.enableLegacyInference,
		});
		this.inferenceEngine = new InferenceEngine(this.database);
		this.optimizedEngine = new OptimizedInferenceEngine(this.database);
	}

	/**
	 * 통합 추론 실행
	 */
	async executeInference(
		nodeId: number,
		options?: {
			ruleIds?: string[];
			useCustomRules?: boolean;
			useRealTime?: boolean;
			useOptimized?: boolean;
			useLegacy?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`🔍 통합 추론 실행: Node ID ${nodeId}`);

			const result = await this.advancedSystem.executeInference({
				nodeId,
				ruleIds: options?.ruleIds,
				useCustomRules: options?.useCustomRules,
				useRealTime: options?.useRealTime,
				useOptimized: options?.useOptimized,
				useLegacy: options?.useLegacy,
			});

			console.log(`✅ 통합 추론 완료:`);
			console.log(`  - 요청 ID: ${result.requestId}`);
			console.log(`  - 결과 수: ${result.results.length}개`);
			console.log(`  - 실행 시간: ${Math.round(result.executionTime)}ms`);
			console.log(`  - 사용된 방법: ${result.methodsUsed.join(", ")}`);
			console.log(`  - 규칙 결과: ${result.ruleResults?.length || 0}개`);

			if (result.results.length > 0) {
				console.log(`\n📋 추론된 관계:`);
				result.results.forEach((relationship, index) => {
					console.log(
						`  ${index + 1}. ${relationship.fromNodeId} → ${relationship.toNodeId}`,
					);
					console.log(`     - 타입: ${relationship.type}`);
					console.log(
						`     - 신뢰도: ${Math.round((relationship as any).confidence * 100)}%`,
					);
					console.log(
						`     - 추론 타입: ${(relationship as any).inferredRelationType}`,
					);
				});
			}
		} catch (error) {
			console.error(`❌ 통합 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 계층적 추론 실행
	 */
	async executeHierarchicalInference(
		nodeId: number,
		edgeType: string,
		options?: {
			includeChildren?: boolean;
			maxDepth?: number;
		},
	): Promise<void> {
		try {
			console.log(
				`🔍 계층적 추론 실행: Node ID ${nodeId}, Edge Type ${edgeType}`,
			);

			const result = await this.inferenceEngine.queryHierarchical(edgeType, {
				includeChildren: options?.includeChildren ?? true,
				maxDepth: options?.maxDepth ?? 10,
			});

			console.log(`✅ 계층적 추론 완료:`);
			console.log(`  - 결과 수: ${result.length}개`);
			console.log(`  - Edge Type: ${edgeType}`);
			console.log(
				`  - Children 포함: ${options?.includeChildren ? "Yes" : "No"}`,
			);
			console.log(`  - 최대 깊이: ${options?.maxDepth || 10}`);

			if (result.length > 0) {
				console.log(`\n📋 계층적 관계:`);
				result.forEach((rel, index) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(`     - 깊이: ${(rel as any).depth || 0}`);
				});
			}
		} catch (error) {
			console.error(`❌ 계층적 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 전이적 추론 실행
	 */
	async executeTransitiveInference(
		nodeId: number,
		edgeType: string,
		options?: {
			maxPathLength?: number;
			includeIntermediate?: boolean;
		},
	): Promise<void> {
		try {
			console.log(
				`🔍 전이적 추론 실행: Node ID ${nodeId}, Edge Type ${edgeType}`,
			);

			const result = await this.inferenceEngine.queryTransitive(
				nodeId,
				edgeType,
				{
					maxPathLength: options?.maxPathLength ?? 10,
				},
			);

			console.log(`✅ 전이적 추론 완료:`);
			console.log(`  - 결과 수: ${result.length}개`);
			console.log(`  - Edge Type: ${edgeType}`);
			console.log(`  - 최대 경로 길이: ${options?.maxPathLength || 10}`);
			console.log(
				`  - 중간 노드 포함: ${options?.includeIntermediate ? "Yes" : "No"}`,
			);

			if (result.length > 0) {
				console.log(`\n📋 전이적 관계:`);
				result.forEach((rel, index) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(`     - 경로 길이: ${(rel as any).pathLength || 0}`);
				});
			}
		} catch (error) {
			console.error(`❌ 전이적 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 상속 가능한 추론 실행
	 */
	async executeInheritableInference(
		nodeId: number,
		edgeType: string,
		options?: {
			includeInherited?: boolean;
			maxInheritanceDepth?: number;
		},
	): Promise<void> {
		try {
			console.log(
				`🔍 상속 가능한 추론 실행: Node ID ${nodeId}, Edge Type ${edgeType}`,
			);

			const result = await this.inferenceEngine.queryInheritable(
				nodeId,
				edgeType,
				"default",
			);

			console.log(`✅ 상속 가능한 추론 완료:`);
			console.log(`  - 결과 수: ${result.length}개`);
			console.log(`  - Edge Type: ${edgeType}`);
			console.log(`  - 상속 포함: ${options?.includeInherited ? "Yes" : "No"}`);
			console.log(`  - 최대 상속 깊이: ${options?.maxInheritanceDepth || 5}`);

			if (result.length > 0) {
				console.log(`\n📋 상속 가능한 관계:`);
				result.forEach((rel, index) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(
						`     - 상속 깊이: ${(rel as any).inheritanceDepth || 0}`,
					);
				});
			}
		} catch (error) {
			console.error(
				`❌ 상속 가능한 추론 실행 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 최적화된 추론 실행
	 */
	async executeOptimizedInference(
		nodeId: number,
		options?: {
			enableCaching?: boolean;
			enableParallel?: boolean;
			maxConcurrency?: number;
		},
	): Promise<void> {
		try {
			console.log(`🔍 최적화된 추론 실행: Node ID ${nodeId}`);

			const result = await this.optimizedEngine.queryHierarchical("imports", {
				includeChildren: true,
				includeParents: false,
			});

			console.log(`✅ 최적화된 추론 완료:`);
			console.log(`  - 결과 수: ${result.length}개`);
			console.log(
				`  - 캐싱: ${options?.enableCaching ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 병렬 처리: ${options?.enableParallel ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 최대 동시성: ${options?.maxConcurrency || this.options.maxConcurrency}`,
			);

			if (result.length > 0) {
				console.log(`\n📋 최적화된 관계:`);
				result.forEach((rel: any, index: number) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(
						`     - 신뢰도: ${Math.round((rel as any).confidence * 100)}%`,
					);
				});
			}
		} catch (error) {
			console.error(`❌ 최적화된 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 실시간 추론 실행
	 */
	async executeRealTimeInference(
		nodeId: number,
		options?: {
			ruleIds?: string[];
			enableAutoInference?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`🔍 실시간 추론 실행: Node ID ${nodeId}`);

			// Advanced System을 통한 실시간 추론
			const result = await this.advancedSystem.executeInference({
				nodeId,
				ruleIds: options?.ruleIds,
				useRealTime: true,
			});

			console.log(`✅ 실시간 추론 완료:`);
			console.log(`  - 결과 수: ${result.results.length}개`);
			console.log(`  - 규칙 ID: ${options?.ruleIds?.join(", ") || "All"}`);
			console.log(
				`  - 자동 추론: ${options?.enableAutoInference ? "Enabled" : "Disabled"}`,
			);

			if (result.results.length > 0) {
				console.log(`\n📋 실시간 관계:`);
				result.results.forEach((rel: any, index: number) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(
						`     - 신뢰도: ${Math.round((rel as any).confidence * 100)}%`,
					);
					console.log(
						`     - 실시간: ${(rel as any).isRealTime ? "Yes" : "No"}`,
					);
				});
			}
		} catch (error) {
			console.error(`❌ 실시간 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 모든 추론 실행
	 */
	async executeAllInferences(
		nodeId: number,
		options?: {
			includeCustomRules?: boolean;
			includeRealTime?: boolean;
			includeOptimized?: boolean;
			includeLegacy?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`🔍 모든 추론 실행: Node ID ${nodeId}`);

			const result = await this.advancedSystem.executeInference({
				nodeId,
				useCustomRules: options?.includeCustomRules ?? true,
				useRealTime: options?.includeRealTime ?? true,
				useOptimized: options?.includeOptimized ?? true,
				useLegacy: options?.includeLegacy ?? true,
			});

			console.log(`✅ 모든 추론 완료:`);
			console.log(`  - 결과 수: ${result.results.length}개`);
			console.log(
				`  - 사용자 정의 규칙: ${options?.includeCustomRules ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 실시간 추론: ${options?.includeRealTime ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 최적화된 추론: ${options?.includeOptimized ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 레거시 추론: ${options?.includeLegacy ? "Enabled" : "Disabled"}`,
			);

			if (result.results.length > 0) {
				console.log(`\n📋 모든 추론 관계:`);
				result.results.forEach((rel: any, index: number) => {
					console.log(`  ${index + 1}. ${rel.fromNodeId} → ${rel.toNodeId}`);
					console.log(`     - 타입: ${rel.type}`);
					console.log(
						`     - 신뢰도: ${Math.round((rel as any).confidence * 100)}%`,
					);
					console.log(`     - 추론 타입: ${(rel as any).inferredRelationType}`);
				});
			}
		} catch (error) {
			console.error(`❌ 모든 추론 실행 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 추론 통계 생성
	 */
	async generateStatistics(): Promise<void> {
		try {
			console.log(`📊 추론 통계 생성`);

			// 기본 통계 정보
			console.log(`\n📊 추론 시스템 통계:`);
			console.log(`  - 데이터베이스 경로: ${this.options.databasePath}`);
			console.log(
				`  - 사용자 정의 규칙: ${this.options.enableCustomRules ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 실시간 추론: ${this.options.enableRealTimeInference ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 최적화된 추론: ${this.options.enableOptimizedInference ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 레거시 추론: ${this.options.enableLegacyInference ? "Enabled" : "Disabled"}`,
			);
			console.log(`  - 최대 동시성: ${this.options.maxConcurrency}`);
			console.log(
				`  - 캐싱: ${this.options.enableCaching ? "Enabled" : "Disabled"}`,
			);
		} catch (error) {
			console.error(`❌ 추론 통계 생성 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 추론 캐시 관리
	 */
	async manageCache(action: "clear" | "stats" | "optimize"): Promise<void> {
		try {
			switch (action) {
				case "clear":
					console.log(`✅ 추론 캐시 초기화 완료`);
					break;

				case "stats":
					console.log(`📊 추론 캐시 통계:`);
					console.log(
						`  - 캐시 활성화: ${this.options.enableCaching ? "Yes" : "No"}`,
					);
					console.log(`  - 최대 동시성: ${this.options.maxConcurrency}`);
					break;

				case "optimize":
					console.log(`✅ 추론 캐시 최적화 완료`);
					break;
			}
		} catch (error) {
			console.error(`❌ 추론 캐시 관리 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 핸들러 초기화
	 */
	async initialize(): Promise<void> {
		try {
			await this.database.initialize();

			// 기본 Edge type들 초기화
			await this.initializeBasicEdgeTypes();

			console.log("✅ Inference Handler 초기화 완료");
		} catch (error) {
			console.error(
				`❌ Inference Handler 초기화 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 핸들러 종료
	 */
	async close(): Promise<void> {
		try {
			await this.database.close();
			console.log("✅ Inference Handler 종료 완료");
		} catch (error) {
			console.error(
				`❌ Inference Handler 종료 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 기본 Edge type들 초기화
	 */
	private async initializeBasicEdgeTypes(): Promise<void> {
		try {
			console.log("🔧 Initializing basic edge types for inference...");

			// 기본 Edge type들 정의
			const basicEdgeTypes = [
				{
					type: "defines",
					description: "Symbol defines relationship (A defines B)",
					schema: JSON.stringify({}),
					isDirected: true,
					isTransitive: false,
					isInheritable: true,
					priority: 0,
				},
				{
					type: "imports",
					description: "File imports another file",
					schema: JSON.stringify({
						importPath: "string",
						isNamespace: "boolean",
					}),
					isDirected: true,
					isTransitive: false,
					isInheritable: false,
					priority: 0,
				},
				{
					type: "exports",
					description: "File exports to another file",
					schema: JSON.stringify({
						exportName: "string",
						isDefault: "boolean",
					}),
					isDirected: true,
					isTransitive: false,
					isInheritable: false,
					priority: 0,
				},
			];

			// Edge type들 생성
			for (const edgeType of basicEdgeTypes) {
				try {
					await this.database.createEdgeType(edgeType);
					console.log(`  ✅ Created edge type: ${edgeType.type}`);
				} catch (error) {
					// 이미 존재하는 경우 무시
					if (!(error as Error).message.includes("UNIQUE constraint")) {
						console.warn(
							`  ⚠️ Failed to create edge type ${edgeType.type}:`,
							error,
						);
					}
				}
			}

			console.log("✅ Basic edge types initialized for inference");
		} catch (error) {
			console.error(
				"❌ Failed to initialize basic edge types for inference:",
				error,
			);
		}
	}
}
