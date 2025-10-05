/**
 * Advanced Inference System
 * 고급 추론 시스템 - Custom Rules, Real-Time Inference 통합
 */

import type { GraphDatabase } from "../GraphDatabase";
import type { InferredRelationship } from "./InferenceTypes";
import {
	CustomInferenceRuleEngine,
	type CustomRule,
	type RuleExecutionContext,
} from "./CustomInferenceRules";
import {
	RealTimeInferenceSystem,
	type ChangeEvent,
	type RealTimeInferenceConfig,
} from "./RealTimeInference";
import { InferenceEngine } from "./InferenceEngine";
import { OptimizedInferenceEngine } from "./OptimizedInferenceEngine";

export interface AdvancedInferenceConfig {
	enableCustomRules: boolean;
	enableRealTimeInference: boolean;
	enableOptimizedInference: boolean;
	enableLegacyInference: boolean;
	realTimeConfig?: Partial<RealTimeInferenceConfig>;
	optimizedConfig?: any;
}

export interface InferenceRequest {
	nodeId: number;
	ruleIds?: string[];
	useCustomRules?: boolean;
	useRealTime?: boolean;
	useOptimized?: boolean;
	useLegacy?: boolean;
	priority?: number;
	metadata?: Record<string, any>;
}

export interface InferenceResponse {
	requestId: string;
	nodeId: number;
	results: InferredRelationship[];
	executionTime: number;
	methodsUsed: string[];
	ruleResults?: any[];
	error?: string;
}

export interface AdvancedInferenceStats {
	customRules: {
		total: number;
		active: number;
		executed: number;
	};
	realTime: {
		activeTasks: number;
		completedTasks: number;
		failedTasks: number;
		throughput: number;
	};
	optimized: {
		cacheHits: number;
		cacheMisses: number;
		averageExecutionTime: number;
	};
	legacy: {
		executions: number;
		averageExecutionTime: number;
	};
}

/**
 * 고급 추론 시스템
 */
export class AdvancedInferenceSystem {
	private config: Required<AdvancedInferenceConfig>;
	private customRuleEngine: CustomInferenceRuleEngine;
	private realTimeSystem: RealTimeInferenceSystem;
	private optimizedEngine: OptimizedInferenceEngine;
	private legacyEngine: InferenceEngine;
	private requestCounter = 0;

	constructor(
		database: GraphDatabase,
		config?: Partial<AdvancedInferenceConfig>,
	) {
		this.config = {
			enableCustomRules: config?.enableCustomRules ?? true,
			enableRealTimeInference: config?.enableRealTimeInference ?? true,
			enableOptimizedInference: config?.enableOptimizedInference ?? true,
			enableLegacyInference: config?.enableLegacyInference ?? true,
			realTimeConfig: config?.realTimeConfig ?? {},
			optimizedConfig: config?.optimizedConfig ?? {},
		};

		// 엔진 초기화
		this.customRuleEngine = new CustomInferenceRuleEngine(database);
		this.realTimeSystem = new RealTimeInferenceSystem(
			database,
			this.config.realTimeConfig,
		);
		this.optimizedEngine = new OptimizedInferenceEngine(
			database,
			this.config.optimizedConfig,
		);
		this.legacyEngine = new InferenceEngine(database);
	}

	/**
	 * 통합 추론 실행
	 */
	async executeInference(
		request: InferenceRequest,
	): Promise<InferenceResponse> {
		const requestId = this.generateRequestId();
		const startTime = performance.now();
		const methodsUsed: string[] = [];
		let allResults: InferredRelationship[] = [];
		const ruleResults: any[] = [];

		try {
			// 사용자 정의 규칙 실행
			if (this.config.enableCustomRules && request.useCustomRules !== false) {
				const customResults = await this.executeCustomRules(request);
				allResults.push(...customResults.results);
				ruleResults.push(...customResults.ruleResults);
				methodsUsed.push("custom_rules");
			}

			// 실시간 추론 실행
			if (
				this.config.enableRealTimeInference &&
				request.useRealTime !== false
			) {
				const realTimeResults = await this.realTimeSystem.executeInference(
					request.nodeId,
					request.ruleIds,
				);
				allResults.push(...realTimeResults);
				methodsUsed.push("real_time");
			}

			// 최적화된 추론 실행
			if (
				this.config.enableOptimizedInference &&
				request.useOptimized !== false
			) {
				const optimizedResults = await this.executeOptimizedInference(request);
				allResults.push(...optimizedResults);
				methodsUsed.push("optimized");
			}

			// 레거시 추론 실행
			if (this.config.enableLegacyInference && request.useLegacy !== false) {
				const legacyResults = await this.executeLegacyInference(request);
				allResults.push(...legacyResults);
				methodsUsed.push("legacy");
			}

			// 중복 제거
			allResults = this.deduplicateResults(allResults);

			const executionTime = performance.now() - startTime;

			return {
				requestId,
				nodeId: request.nodeId,
				results: allResults,
				executionTime,
				methodsUsed,
				ruleResults,
			};
		} catch (error) {
			const executionTime = performance.now() - startTime;
			return {
				requestId,
				nodeId: request.nodeId,
				results: [],
				executionTime,
				methodsUsed,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * 사용자 정의 규칙 실행
	 */
	private async executeCustomRules(request: InferenceRequest): Promise<{
		results: InferredRelationship[];
		ruleResults: any[];
	}> {
		const context: RuleExecutionContext = {
			fromNodeId: request.nodeId,
			metadata: request.metadata,
		};

		const ruleResults = await this.customRuleEngine.executeRules(context);
		const results: InferredRelationship[] = [];

		// 규칙 결과를 추론 관계로 변환
		for (const result of ruleResults) {
			if (result.executed && result.createdRelationships > 0) {
				// 실제 구현에서는 생성된 관계를 조회하여 InferredRelationship으로 변환
				results.push({
					fromNodeId: request.nodeId,
					toNodeId: 0, // 실제 대상 노드 ID
					type: "custom_rule",
					inferredAt: new Date(),
					path: {
						edgeIds: [],
						inferenceType: "hierarchical",
						description: "Custom rule inference",
						depth: 1,
					},
				});
			}
		}

		return { results, ruleResults };
	}

	/**
	 * 최적화된 추론 실행
	 */
	private async executeOptimizedInference(
		request: InferenceRequest,
	): Promise<InferredRelationship[]> {
		// 최적화된 엔진을 사용한 추론
		const hierarchical = await this.optimizedEngine.queryHierarchical(
			"depends_on",
			{
				includeChildren: true,
			},
		);

		const transitive = await this.optimizedEngine.queryTransitive(
			request.nodeId,
			"depends_on",
			{ maxPathLength: 5 },
		);

		const inheritable = await this.optimizedEngine.queryInheritable(
			"contains",
			{ maxDepth: 3 },
		);

		return [...hierarchical, ...transitive, ...inheritable];
	}

	/**
	 * 레거시 추론 실행
	 */
	private async executeLegacyInference(
		request: InferenceRequest,
	): Promise<InferredRelationship[]> {
		const result = await this.legacyEngine.inferAll(request.nodeId);
		return result.inferences;
	}

	/**
	 * 사용자 정의 규칙 등록
	 */
	async registerCustomRule(rule: CustomRule): Promise<void> {
		if (!this.config.enableCustomRules) {
			throw new Error("Custom rules are not enabled");
		}

		await this.customRuleEngine.registerRule(rule);
	}

	/**
	 * 사용자 정의 규칙 제거
	 */
	async unregisterCustomRule(ruleId: string): Promise<void> {
		await this.customRuleEngine.unregisterRule(ruleId);
	}

	/**
	 * 사용자 정의 규칙 조회
	 */
	getCustomRule(ruleId: string): CustomRule | undefined {
		return this.customRuleEngine.getRule(ruleId);
	}

	/**
	 * 모든 사용자 정의 규칙 조회
	 */
	getAllCustomRules(): CustomRule[] {
		return this.customRuleEngine.getAllRules();
	}

	/**
	 * 변경 이벤트 처리
	 */
	async processChangeEvent(event: ChangeEvent): Promise<void> {
		if (this.config.enableRealTimeInference) {
			await this.realTimeSystem.processChangeEvent(event);
		}
	}

	/**
	 * 실시간 추론 시작
	 */
	startRealTimeInference(): void {
		if (this.config.enableRealTimeInference) {
			// 실시간 시스템이 이미 초기화되어 있음
		}
	}

	/**
	 * 실시간 추론 중지
	 */
	stopRealTimeInference(): void {
		if (this.config.enableRealTimeInference) {
			this.realTimeSystem.stop();
		}
	}

	/**
	 * 배치 추론 실행
	 */
	async executeBatchInference(
		requests: InferenceRequest[],
	): Promise<InferenceResponse[]> {
		const results: InferenceResponse[] = [];

		// 병렬 처리
		const promises = requests.map((request) => this.executeInference(request));
		const responses = await Promise.allSettled(promises);

		for (const response of responses) {
			if (response.status === "fulfilled") {
				results.push(response.value);
			} else {
				// 실패한 요청에 대한 에러 응답 생성
				results.push({
					requestId: this.generateRequestId(),
					nodeId: 0,
					results: [],
					executionTime: 0,
					methodsUsed: [],
					error: response.reason?.message || "Unknown error",
				});
			}
		}

		return results;
	}

	/**
	 * 추론 통계 조회
	 */
	getInferenceStats(): AdvancedInferenceStats {
		const realTimeStats = this.realTimeSystem.getStats();
		const customRules = this.customRuleEngine.getAllRules();

		return {
			customRules: {
				total: customRules.length,
				active: customRules.filter((rule) => rule.enabled).length,
				executed: 0, // 실제 구현에서는 실행 횟수 추적
			},
			realTime: {
				activeTasks: realTimeStats.activeTasks,
				completedTasks: realTimeStats.completedTasks,
				failedTasks: realTimeStats.failedTasks,
				throughput: realTimeStats.throughput,
			},
			optimized: {
				cacheHits: 0, // 실제 구현에서는 캐시 히트 수 추적
				cacheMisses: 0,
				averageExecutionTime: 0,
			},
			legacy: {
				executions: 0,
				averageExecutionTime: 0,
			},
		};
	}

	/**
	 * 시스템 상태 조회
	 */
	getSystemStatus(): {
		customRules: boolean;
		realTime: boolean;
		optimized: boolean;
		legacy: boolean;
		activeTasks: number;
		queueSize: number;
	} {
		const realTimeStats = this.realTimeSystem.getStats();
		const queueStatus = this.realTimeSystem.getQueueStatus();

		return {
			customRules: this.config.enableCustomRules,
			realTime: this.config.enableRealTimeInference,
			optimized: this.config.enableOptimizedInference,
			legacy: this.config.enableLegacyInference,
			activeTasks: realTimeStats.activeTasks,
			queueSize: queueStatus.totalTasks,
		};
	}

	/**
	 * 결과 중복 제거
	 */
	private deduplicateResults(
		results: InferredRelationship[],
	): InferredRelationship[] {
		const seen = new Set<string>();
		const unique: InferredRelationship[] = [];

		for (const result of results) {
			const key = `${result.fromNodeId}-${result.toNodeId}-${result.inferredAt}`;
			if (!seen.has(key)) {
				seen.add(key);
				unique.push(result);
			}
		}

		return unique;
	}

	/**
	 * 요청 ID 생성
	 */
	private generateRequestId(): string {
		return `req_${++this.requestCounter}_${Date.now()}`;
	}

	/**
	 * 시스템 정리
	 */
	destroy(): void {
		if (this.config.enableRealTimeInference) {
			this.realTimeSystem.destroy();
		}
	}
}
