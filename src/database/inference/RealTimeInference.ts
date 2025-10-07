/**
 * Real-Time Inference System
 * 실시간 추론 시스템 - 변경 감지 및 자동 추론
 */

import { EventEmitter } from "events";
import type { GraphDatabase } from "../GraphDatabase";
import {
	CustomInferenceRuleEngine,
	type CustomRule,
	type RuleExecutionContext,
} from "./CustomInferenceRules";
import type { InferredRelationship } from "./InferenceTypes";

export interface RealTimeInferenceConfig {
	enableChangeDetection: boolean;
	enableAutoInference: boolean;
	enableCustomRules: boolean;
	changeDetectionInterval: number;
	inferenceBatchSize: number;
	maxConcurrentInferences: number;
	debounceMs: number;
}

export interface ChangeEvent {
	type:
		| "node_created"
		| "node_updated"
		| "node_deleted"
		| "relationship_created"
		| "relationship_deleted";
	nodeId?: number;
	relationshipId?: number;
	oldData?: any;
	newData?: any;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface InferenceTask {
	id: string;
	nodeId: number;
	ruleIds: string[];
	priority: number;
	createdAt: Date;
	status: "pending" | "running" | "completed" | "failed";
	error?: string;
	results?: InferredRelationship[];
}

export interface RealTimeInferenceStats {
	activeTasks: number;
	completedTasks: number;
	failedTasks: number;
	averageExecutionTime: number;
	throughput: number; // tasks per second
	customRulesCount: number;
	changeEventsProcessed: number;
}

/**
 * 실시간 추론 시스템
 */
export class RealTimeInferenceSystem extends EventEmitter {
	private database: GraphDatabase;
	private customRuleEngine: CustomInferenceRuleEngine;
	private config: Required<RealTimeInferenceConfig>;
	private changeDetectionTimer?: NodeJS.Timeout;
	private inferenceQueue: InferenceTask[] = [];
	private activeInferences = new Set<string>();
	private changeBuffer: ChangeEvent[] = [];
	private stats: RealTimeInferenceStats;
	private isProcessing = false;

	constructor(
		database: GraphDatabase,
		config?: Partial<RealTimeInferenceConfig>,
	) {
		super();
		this.database = database;
		this.customRuleEngine = new CustomInferenceRuleEngine(database);

		this.config = {
			enableChangeDetection: config?.enableChangeDetection ?? true,
			enableAutoInference: config?.enableAutoInference ?? true,
			enableCustomRules: config?.enableCustomRules ?? true,
			changeDetectionInterval: config?.changeDetectionInterval ?? 1000,
			inferenceBatchSize: config?.inferenceBatchSize ?? 10,
			maxConcurrentInferences: config?.maxConcurrentInferences ?? 5,
			debounceMs: config?.debounceMs ?? 500,
		};

		this.stats = {
			activeTasks: 0,
			completedTasks: 0,
			failedTasks: 0,
			averageExecutionTime: 0,
			throughput: 0,
			customRulesCount: 0,
			changeEventsProcessed: 0,
		};

		if (this.config.enableChangeDetection) {
			this.startChangeDetection();
		}
	}

	/**
	 * 변경 이벤트 처리
	 */
	async processChangeEvent(event: ChangeEvent): Promise<void> {
		this.changeBuffer.push(event);
		this.stats.changeEventsProcessed++;

		// 디바운싱
		if (this.config.debounceMs > 0) {
			await this.debounceChanges();
		} else {
			await this.processBufferedChanges();
		}
	}

	/**
	 * 사용자 정의 규칙 등록
	 */
	async registerCustomRule(rule: CustomRule): Promise<void> {
		if (!this.config.enableCustomRules) {
			throw new Error("Custom rules are not enabled");
		}

		await this.customRuleEngine.registerRule(rule);
		this.stats.customRulesCount++;
		this.emit("ruleRegistered", { ruleId: rule.id, ruleName: rule.name });
	}

	/**
	 * 사용자 정의 규칙 제거
	 */
	async unregisterCustomRule(ruleId: string): Promise<void> {
		await this.customRuleEngine.unregisterRule(ruleId);
		this.stats.customRulesCount--;
		this.emit("ruleUnregistered", { ruleId });
	}

	/**
	 * 수동 추론 실행
	 */
	async executeInference(
		nodeId: number,
		ruleIds?: string[],
	): Promise<InferredRelationship[]> {
		const taskId = this.generateTaskId();
		const task: InferenceTask = {
			id: taskId,
			nodeId,
			ruleIds: ruleIds || [],
			priority: 1,
			createdAt: new Date(),
			status: "pending",
		};

		this.inferenceQueue.push(task);
		this.emit("inferenceQueued", { taskId, nodeId });

		// 큐 처리 시작
		this.processInferenceQueue();

		// 작업 완료 대기
		return this.waitForTaskCompletion(taskId);
	}

	/**
	 * 변경 감지 시작
	 */
	private startChangeDetection(): void {
		this.changeDetectionTimer = setInterval(() => {
			this.processBufferedChanges();
		}, this.config.changeDetectionInterval);
	}

	/**
	 * 변경 감지 중지
	 */
	private stopChangeDetection(): void {
		if (this.changeDetectionTimer) {
			clearInterval(this.changeDetectionTimer);
			this.changeDetectionTimer = undefined;
		}
	}

	/**
	 * 디바운싱 처리
	 */
	private async debounceChanges(): Promise<void> {
		// 간단한 디바운싱 구현
		await new Promise((resolve) => setTimeout(resolve, this.config.debounceMs));
		await this.processBufferedChanges();
	}

	/**
	 * 버퍼된 변경사항 처리
	 */
	private async processBufferedChanges(): Promise<void> {
		if (this.changeBuffer.length === 0) {
			return;
		}

		const changes = [...this.changeBuffer];
		this.changeBuffer = [];

		// 변경사항별로 추론 작업 생성
		for (const change of changes) {
			if (change.nodeId) {
				await this.createInferenceTask(change.nodeId, change);
			}
		}

		this.emit("changesProcessed", { count: changes.length });
	}

	/**
	 * 추론 작업 생성
	 */
	private async createInferenceTask(
		nodeId: number,
		change: ChangeEvent,
	): Promise<void> {
		if (!this.config.enableAutoInference) {
			return;
		}

		const taskId = this.generateTaskId();
		const task: InferenceTask = {
			id: taskId,
			nodeId,
			ruleIds: [],
			priority: this.calculatePriority(change),
			createdAt: new Date(),
			status: "pending",
		};

		this.inferenceQueue.push(task);
		this.emit("inferenceTaskCreated", {
			taskId,
			nodeId,
			changeType: change.type,
		});

		// 큐 처리 시작
		this.processInferenceQueue();
	}

	/**
	 * 우선순위 계산
	 */
	private calculatePriority(change: ChangeEvent): number {
		// 변경 타입에 따른 우선순위
		const priorityMap = {
			node_created: 3,
			node_updated: 2,
			node_deleted: 1,
			relationship_created: 2,
			relationship_deleted: 1,
		};

		return priorityMap[change.type] || 1;
	}

	/**
	 * 추론 큐 처리
	 */
	private async processInferenceQueue(): Promise<void> {
		if (
			this.isProcessing ||
			this.activeInferences.size >= this.config.maxConcurrentInferences
		) {
			return;
		}

		this.isProcessing = true;

		try {
			// 우선순위별로 정렬
			this.inferenceQueue.sort((a, b) => b.priority - a.priority);

			// 배치 크기만큼 처리
			const batch = this.inferenceQueue.splice(
				0,
				this.config.inferenceBatchSize,
			);

			for (const task of batch) {
				if (this.activeInferences.size >= this.config.maxConcurrentInferences) {
					// 큐에 다시 추가
					this.inferenceQueue.unshift(task);
					break;
				}

				this.executeInferenceTask(task);
			}
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * 추론 작업 실행
	 */
	private async executeInferenceTask(task: InferenceTask): Promise<void> {
		this.activeInferences.add(task.id);
		this.stats.activeTasks++;

		task.status = "running";
		this.emit("inferenceStarted", { taskId: task.id, nodeId: task.nodeId });

		const startTime = performance.now();

		try {
			// 사용자 정의 규칙 실행
			if (this.config.enableCustomRules) {
				const context: RuleExecutionContext = {
					fromNodeId: task.nodeId,
					metadata: { taskId: task.id },
				};

				const ruleResults = await this.customRuleEngine.executeRules(context);
				task.results =
					this.convertRuleResultsToInferredRelationships(ruleResults);
			}

			task.status = "completed";
			this.stats.completedTasks++;
			this.emit("inferenceCompleted", {
				taskId: task.id,
				nodeId: task.nodeId,
				resultsCount: task.results?.length || 0,
			});
		} catch (error) {
			task.status = "failed";
			task.error = error instanceof Error ? error.message : "Unknown error";
			this.stats.failedTasks++;
			this.emit("inferenceFailed", {
				taskId: task.id,
				nodeId: task.nodeId,
				error: task.error,
			});
		} finally {
			this.activeInferences.delete(task.id);
			this.stats.activeTasks--;

			const executionTime = performance.now() - startTime;
			this.updateExecutionTimeStats(executionTime);
		}
	}

	/**
	 * 작업 완료 대기
	 */
	private async waitForTaskCompletion(
		taskId: string,
	): Promise<InferredRelationship[]> {
		return new Promise((resolve, reject) => {
			const checkTask = () => {
				const task = this.inferenceQueue.find((t) => t.id === taskId);
				if (!task) {
					// 작업이 큐에서 제거되었지만 결과를 찾을 수 없음
					reject(new Error("Task not found"));
					return;
				}

				if (task.status === "completed") {
					resolve(task.results || []);
				} else if (task.status === "failed") {
					reject(new Error(task.error || "Inference failed"));
				} else {
					// 아직 실행 중, 다시 확인
					setTimeout(checkTask, 100);
				}
			};

			checkTask();
		});
	}

	/**
	 * 규칙 결과를 추론 관계로 변환
	 */
	private convertRuleResultsToInferredRelationships(
		ruleResults: any[],
	): InferredRelationship[] {
		const relationships: InferredRelationship[] = [];

		for (const result of ruleResults) {
			if (result.executed && result.createdRelationships > 0) {
				// 실제 구현에서는 생성된 관계를 조회하여 InferredRelationship으로 변환
				// 여기서는 간단한 예시
				relationships.push({
					fromNodeId: 0, // 실제 노드 ID
					toNodeId: 0, // 실제 노드 ID
					type: "hierarchical",
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

		return relationships;
	}

	/**
	 * 실행 시간 통계 업데이트
	 */
	private updateExecutionTimeStats(executionTime: number): void {
		const totalTasks = this.stats.completedTasks + this.stats.failedTasks;
		if (totalTasks > 0) {
			this.stats.averageExecutionTime =
				(this.stats.averageExecutionTime * (totalTasks - 1) + executionTime) /
				totalTasks;
		}

		// 처리량 계산 (초당 작업 수)
		const now = Date.now();
		const timeWindow = 60000; // 1분
		// 실제 구현에서는 시간 윈도우 내의 작업 수를 추적
		this.stats.throughput = totalTasks / (timeWindow / 1000);
	}

	/**
	 * 통계 조회
	 */
	getStats(): RealTimeInferenceStats {
		return { ...this.stats };
	}

	/**
	 * 활성 작업 조회
	 */
	getActiveTasks(): InferenceTask[] {
		return this.inferenceQueue.filter(
			(task) => task.status === "pending" || task.status === "running",
		);
	}

	/**
	 * 큐 상태 조회
	 */
	getQueueStatus(): {
		totalTasks: number;
		pendingTasks: number;
		runningTasks: number;
		completedTasks: number;
		failedTasks: number;
	} {
		const tasks = this.inferenceQueue;
		return {
			totalTasks: tasks.length,
			pendingTasks: tasks.filter((t) => t.status === "pending").length,
			runningTasks: tasks.filter((t) => t.status === "running").length,
			completedTasks: tasks.filter((t) => t.status === "completed").length,
			failedTasks: tasks.filter((t) => t.status === "failed").length,
		};
	}

	/**
	 * 큐 정리
	 */
	clearQueue(): void {
		this.inferenceQueue = [];
		this.activeInferences.clear();
		this.emit("queueCleared");
	}

	/**
	 * 작업 ID 생성
	 */
	private generateTaskId(): string {
		return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * 시스템 중지
	 */
	stop(): void {
		this.stopChangeDetection();
		this.clearQueue();
		this.removeAllListeners();
	}

	/**
	 * 리소스 정리
	 */
	destroy(): void {
		this.stop();
	}
}
