/**
 * Realtime Query System
 * 실시간 쿼리 시스템 - WebSocket, Server-Sent Events, Polling 지원
 */

import { EventEmitter } from "node:events";
import { AdvancedQueryExecutor } from "./AdvancedQueryLanguage";

export interface RealtimeQueryConfig {
	enableWebSocket: boolean;
	enableSSE: boolean;
	enablePolling: boolean;
	pollingInterval: number;
	maxConnections: number;
	queryTimeout: number;
}

export interface RealtimeQuery {
	id: string;
	query: string;
	queryType: "SQL" | "GraphQL" | "NaturalLanguage";
	clientId: string;
	createdAt: Date;
	lastExecuted: Date;
	isActive: boolean;
	results: any[];
	error?: string;
}

export interface RealtimeQuerySubscription {
	id: string;
	queryId: string;
	clientId: string;
	eventType: "data" | "error" | "complete";
	callback: (data: any) => void;
}

export interface QueryChangeEvent {
	type: "INSERT" | "UPDATE" | "DELETE";
	table: string;
	record: any;
	timestamp: Date;
}

/**
 * 실시간 쿼리 시스템
 */
export class RealtimeQuerySystem extends EventEmitter {
	private queries = new Map<string, RealtimeQuery>();
	private subscriptions = new Map<string, RealtimeQuerySubscription>();
	private queryExecutor = new AdvancedQueryExecutor();
	private config: Required<RealtimeQueryConfig>;
	private pollingTimer?: NodeJS.Timeout;
	private activeConnections = new Set<string>();

	constructor(config?: Partial<RealtimeQueryConfig>) {
		super();
		this.config = {
			enableWebSocket: config?.enableWebSocket ?? true,
			enableSSE: config?.enableSSE ?? true,
			enablePolling: config?.enablePolling ?? true,
			pollingInterval: config?.pollingInterval ?? 1000,
			maxConnections: config?.maxConnections ?? 100,
			queryTimeout: config?.queryTimeout ?? 30000,
		};

		if (this.config.enablePolling) {
			this.startPolling();
		}
	}

	/**
	 * 실시간 쿼리 등록
	 */
	async registerQuery(
		query: string,
		queryType: "SQL" | "GraphQL" | "NaturalLanguage",
		clientId: string,
		dataSource: any,
	): Promise<string> {
		const queryId = this.generateQueryId();

		const realtimeQuery: RealtimeQuery = {
			id: queryId,
			query,
			queryType,
			clientId,
			createdAt: new Date(),
			lastExecuted: new Date(),
			isActive: true,
			results: [],
		};

		try {
			// 초기 쿼리 실행
			const results = await this.executeQuery(query, queryType, dataSource);
			realtimeQuery.results = results;

			this.queries.set(queryId, realtimeQuery);
			this.emit("queryRegistered", { queryId, clientId });

			return queryId;
		} catch (error) {
			realtimeQuery.error =
				error instanceof Error ? error.message : "Unknown error";
			realtimeQuery.isActive = false;
			this.queries.set(queryId, realtimeQuery);
			this.emit("queryError", { queryId, error: realtimeQuery.error });
			throw error;
		}
	}

	/**
	 * 쿼리 구독
	 */
	subscribeToQuery(
		queryId: string,
		clientId: string,
		eventType: "data" | "error" | "complete",
		callback: (data: any) => void,
	): string {
		const subscriptionId = this.generateSubscriptionId();

		const subscription: RealtimeQuerySubscription = {
			id: subscriptionId,
			queryId,
			clientId,
			eventType,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);
		this.emit("subscriptionCreated", { subscriptionId, queryId, clientId });

		return subscriptionId;
	}

	/**
	 * 구독 취소
	 */
	unsubscribeFromQuery(subscriptionId: string): void {
		const subscription = this.subscriptions.get(subscriptionId);
		if (subscription) {
			this.subscriptions.delete(subscriptionId);
			this.emit("subscriptionCancelled", { subscriptionId });
		}
	}

	/**
	 * 쿼리 비활성화
	 */
	deactivateQuery(queryId: string): void {
		const query = this.queries.get(queryId);
		if (query) {
			query.isActive = false;
			this.emit("queryDeactivated", { queryId });
		}
	}

	/**
	 * 데이터 변경 알림
	 */
	notifyDataChange(changeEvent: QueryChangeEvent): void {
		this.emit("dataChange", changeEvent);

		// 활성 쿼리들 재실행
		this.refreshActiveQueries(changeEvent);
	}

	/**
	 * WebSocket 연결 처리
	 */
	handleWebSocketConnection(ws: any, clientId: string): void {
		if (this.activeConnections.size >= this.config.maxConnections) {
			ws.close(1013, "Too many connections");
			return;
		}

		this.activeConnections.add(clientId);
		this.emit("clientConnected", { clientId });

		ws.on("message", async (message: string) => {
			try {
				const data = JSON.parse(message);
				await this.handleWebSocketMessage(ws, clientId, data);
			} catch (_error) {
				ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
			}
		});

		ws.on("close", () => {
			this.activeConnections.delete(clientId);
			this.cleanupClientQueries(clientId);
			this.emit("clientDisconnected", { clientId });
		});
	}

	/**
	 * Server-Sent Events 연결 처리
	 */
	handleSSEConnection(res: any, clientId: string): void {
		if (this.activeConnections.size >= this.config.maxConnections) {
			res.status(429).send("Too many connections");
			return;
		}

		this.activeConnections.add(clientId);
		this.emit("clientConnected", { clientId });

		// SSE 헤더 설정
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
		});

		// 클라이언트별 이벤트 리스너
		const eventListener = (data: any) => {
			res.write(`data: ${JSON.stringify(data)}\n\n`);
		};

		this.on(`client:${clientId}`, eventListener);

		// 연결 종료 처리
		res.on("close", () => {
			this.activeConnections.delete(clientId);
			this.cleanupClientQueries(clientId);
			this.removeListener(`client:${clientId}`, eventListener);
			this.emit("clientDisconnected", { clientId });
		});
	}

	/**
	 * 폴링 시작
	 */
	private startPolling(): void {
		// 테스트 환경에서는 폴링을 시작하지 않음
		if (process.env.NODE_ENV === "test") {
			return;
		}

		this.pollingTimer = setInterval(() => {
			this.executeActiveQueries();
		}, this.config.pollingInterval);
	}

	/**
	 * 활성 쿼리 실행
	 */
	private async executeActiveQueries(): Promise<void> {
		const activeQueries = Array.from(this.queries.values()).filter(
			(q) => q.isActive,
		);

		for (const query of activeQueries) {
			try {
				// 쿼리 타임아웃 체크
				const now = new Date();
				if (
					now.getTime() - query.lastExecuted.getTime() >
					this.config.queryTimeout
				) {
					query.isActive = false;
					this.emit("queryTimeout", { queryId: query.id });
				}

				// 쿼리 재실행 (실제 구현에서는 데이터 소스가 필요)
				// const results = await this.executeQuery(query.query, query.queryType, dataSource);
				// const hasChanged = this.compareResults(query.results, results);

				// if (hasChanged) {
				//   query.results = results;
				//   query.lastExecuted = now;
				//   this.notifySubscribers(query.id, 'data', results);
				// }
			} catch (error) {
				query.error = error instanceof Error ? error.message : "Unknown error";
				query.isActive = false;
				this.notifySubscribers(query.id, "error", { error: query.error });
			}
		}
	}

	/**
	 * 쿼리 실행
	 */
	private async executeQuery(
		query: string,
		queryType: "SQL" | "GraphQL" | "NaturalLanguage",
		dataSource: any,
	): Promise<any[]> {
		switch (queryType) {
			case "SQL":
				return await this.queryExecutor.executeSQLQuery(query, dataSource);
			case "GraphQL":
				return await this.queryExecutor.executeGraphQLQuery(query, dataSource);
			case "NaturalLanguage":
				return await this.queryExecutor.executeNaturalLanguageQuery(
					query,
					dataSource,
				);
			default:
				throw new Error(`Unsupported query type: ${queryType}`);
		}
	}

	/**
	 * 활성 쿼리 새로고침
	 */
	private async refreshActiveQueries(
		changeEvent: QueryChangeEvent,
	): Promise<void> {
		const affectedQueries = Array.from(this.queries.values()).filter(
			(q) => q.isActive && this.isQueryAffectedByChange(q, changeEvent),
		);

		for (const query of affectedQueries) {
			try {
				// 쿼리 재실행
				// const results = await this.executeQuery(query.query, query.queryType, dataSource);
				// query.results = results;
				// query.lastExecuted = new Date();

				this.notifySubscribers(query.id, "data", query.results);
			} catch (error) {
				query.error = error instanceof Error ? error.message : "Unknown error";
				this.notifySubscribers(query.id, "error", { error: query.error });
			}
		}
	}

	/**
	 * 쿼리가 변경에 영향을 받는지 확인
	 */
	private isQueryAffectedByChange(
		_query: RealtimeQuery,
		_changeEvent: QueryChangeEvent,
	): boolean {
		// 간단한 구현: 모든 쿼리가 모든 변경에 반응
		// 실제로는 쿼리 AST를 분석하여 영향받는 테이블/필드 확인
		return true;
	}

	/**
	 * 구독자들에게 알림
	 */
	private notifySubscribers(
		queryId: string,
		eventType: "data" | "error" | "complete",
		data: any,
	): void {
		const subscribers = Array.from(this.subscriptions.values()).filter(
			(s) => s.queryId === queryId && s.eventType === eventType,
		);

		for (const subscriber of subscribers) {
			try {
				subscriber.callback(data);
				this.emit(`client:${subscriber.clientId}`, {
					type: eventType,
					queryId,
					data,
				});
			} catch (error) {
				console.error("Error notifying subscriber:", error);
			}
		}
	}

	/**
	 * WebSocket 메시지 처리
	 */
	private async handleWebSocketMessage(
		ws: any,
		clientId: string,
		data: any,
	): Promise<void> {
		switch (data.type) {
			case "registerQuery":
				try {
					const queryId = await this.registerQuery(
						data.query,
						data.queryType,
						clientId,
						data.dataSource,
					);
					ws.send(JSON.stringify({ type: "queryRegistered", queryId }));
				} catch (error) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
					);
				}
				break;

			case "subscribe": {
				const subscriptionId = this.subscribeToQuery(
					data.queryId,
					clientId,
					data.eventType,
					(result: any) => {
						ws.send(
							JSON.stringify({
								type: "queryUpdate",
								queryId: data.queryId,
								eventType: data.eventType,
								data: result,
							}),
						);
					},
				);
				ws.send(JSON.stringify({ type: "subscribed", subscriptionId }));
				break;
			}

			case "unsubscribe":
				this.unsubscribeFromQuery(data.subscriptionId);
				ws.send(JSON.stringify({ type: "unsubscribed" }));
				break;

			case "deactivateQuery":
				this.deactivateQuery(data.queryId);
				ws.send(JSON.stringify({ type: "queryDeactivated" }));
				break;

			default:
				ws.send(
					JSON.stringify({ type: "error", message: "Unknown message type" }),
				);
		}
	}

	/**
	 * 클라이언트 쿼리 정리
	 */
	private cleanupClientQueries(clientId: string): void {
		// 클라이언트의 모든 쿼리 비활성화
		for (const [_queryId, query] of this.queries.entries()) {
			if (query.clientId === clientId) {
				query.isActive = false;
			}
		}

		// 클라이언트의 모든 구독 취소
		for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
			if (subscription.clientId === clientId) {
				this.subscriptions.delete(subscriptionId);
			}
		}
	}

	/**
	 * 쿼리 ID 생성
	 */
	private generateQueryId(): string {
		return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * 구독 ID 생성
	 */
	private generateSubscriptionId(): string {
		return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * 통계 정보
	 */
	getStats(): {
		activeQueries: number;
		activeSubscriptions: number;
		activeConnections: number;
		queriesByType: Record<string, number>;
	} {
		const activeQueries = Array.from(this.queries.values()).filter(
			(q) => q.isActive,
		).length;
		const queriesByType: Record<string, number> = {};

		for (const query of this.queries.values()) {
			queriesByType[query.queryType] =
				(queriesByType[query.queryType] || 0) + 1;
		}

		return {
			activeQueries,
			activeSubscriptions: this.subscriptions.size,
			activeConnections: this.activeConnections.size,
			queriesByType,
		};
	}

	/**
	 * 리소스 정리
	 */
	destroy(): void {
		if (this.pollingTimer) {
			clearInterval(this.pollingTimer);
		}

		this.queries.clear();
		this.subscriptions.clear();
		this.activeConnections.clear();
		this.removeAllListeners();
	}
}
