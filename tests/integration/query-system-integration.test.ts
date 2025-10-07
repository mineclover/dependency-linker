import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
// HandlerFactory는 함수형으로 전환되어 더 이상 사용하지 않음
import { QueryHandler } from "../../src/cli/handlers/query-handler";

describe("Query System Integration", () => {
	let queryHandler: QueryHandler;

	beforeEach(async () => {
		// Handler Factory를 통한 초기화
		// HandlerFactory는 함수형으로 전환되어 더 이상 사용하지 않음
		queryHandler = new QueryHandler();
	});

	afterEach(async () => {
		// HandlerFactory는 함수형으로 전환되어 더 이상 사용하지 않음
	});

	describe("Handler Factory Integration", () => {
		it("should initialize query handler through factory", async () => {
			expect(queryHandler).toBeDefined();
			expect(queryHandler).toBeInstanceOf(QueryHandler);
		});

		it("should create new instances each time", async () => {
			const handler1 = new QueryHandler();
			const handler2 = new QueryHandler();

			expect(handler1).not.toBe(handler2);
		});
	});

	describe("Query Execution", () => {
		it("should execute SQL query", async () => {
			const mockDataSource = {
				users: [
					{ id: 1, name: "John", email: "john@example.com" },
					{ id: 2, name: "Jane", email: "jane@example.com" },
				],
			};

			// Mock console.log to capture output
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				await queryHandler.executeSQLQuery(
					"SELECT * FROM users WHERE id = 1",
					mockDataSource,
				);

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("SQL 쿼리 실행"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("SQL 쿼리 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should execute GraphQL query", async () => {
			const mockDataSource = {
				users: [
					{ id: 1, name: "John", email: "john@example.com" },
					{ id: 2, name: "Jane", email: "jane@example.com" },
				],
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				await queryHandler.executeGraphQLQuery(
					"{ users { id name email } }",
					mockDataSource,
				);

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("GraphQL 쿼리 실행"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("GraphQL 쿼리 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should execute natural language query", async () => {
			const mockDataSource = {
				users: [
					{ id: 1, name: "John", email: "john@example.com" },
					{ id: 2, name: "Jane", email: "jane@example.com" },
				],
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				await queryHandler.executeNaturalLanguageQuery(
					"Show me all users",
					mockDataSource,
				);

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("자연어 쿼리 실행"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("자연어 쿼리 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should execute auto-detected query", async () => {
			const mockDataSource = {
				users: [
					{ id: 1, name: "John", email: "john@example.com" },
					{ id: 2, name: "Jane", email: "jane@example.com" },
				],
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				await queryHandler.executeQuery("SELECT * FROM users", mockDataSource);

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 실행 (자동 감지)"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});
	});

	describe("Realtime Query System", () => {
		it("should register realtime query", async () => {
			const mockDataSource = {
				users: [{ id: 1, name: "John", email: "john@example.com" }],
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				const queryId = await queryHandler.registerRealtimeQuery(
					"SELECT * FROM users",
					"SQL",
					"client-123",
					mockDataSource,
				);

				expect(queryId).toBeDefined();
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("실시간 쿼리 등록"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("실시간 쿼리 등록 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should subscribe to realtime query", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				const subscriptionId = await queryHandler.subscribeToRealtimeQuery(
					"query-123",
					"client-456",
					"data",
				);

				expect(subscriptionId).toBeDefined();
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("실시간 쿼리 구독"),
				);
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("실시간 쿼리 구독 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});
	});

	describe("Query Statistics and Cache Management", () => {
		it("should get query statistics", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				await queryHandler.getQueryStatistics();

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 성능 통계"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should manage cache", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			try {
				// Cache stats
				await queryHandler.manageCache("stats");

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 캐시 통계"),
				);

				// Clear cache
				await queryHandler.manageCache("clear");

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 캐시 초기화 완료"),
				);

				// Optimize cache
				await queryHandler.manageCache("optimize");

				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("쿼리 캐시 최적화 완료"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle query execution errors gracefully", async () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();

			try {
				await queryHandler.executeSQLQuery("INVALID SQL QUERY", {});

				// Should not throw, but log error
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("SQL 쿼리 실행 실패"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		it("should handle realtime query errors gracefully", async () => {
			const consoleSpy = jest.spyOn(console, "error").mockImplementation();

			try {
				await queryHandler.subscribeToRealtimeQuery(
					"non-existent-query",
					"client-123",
					"data",
				);

				// Should not throw, but log error
				expect(consoleSpy).toHaveBeenCalledWith(
					expect.stringContaining("실시간 쿼리 구독 실패"),
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});
	});

	describe("Performance and Scalability", () => {
		it("should handle multiple queries efficiently", async () => {
			const startTime = Date.now();
			const mockDataSource = {
				users: Array.from({ length: 100 }, (_, i) => ({
					id: i + 1,
					name: `User${i + 1}`,
					email: `user${i + 1}@example.com`,
				})),
			};

			// Execute multiple queries
			const queries = [
				"SELECT * FROM users WHERE id > 50",
				"SELECT COUNT(*) FROM users",
				"SELECT name FROM users ORDER BY name",
			];

			for (const query of queries) {
				await queryHandler.executeSQLQuery(query, mockDataSource);
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Multiple queries should complete within reasonable time
			expect(duration).toBeLessThan(5000);
		});

		it("should handle concurrent realtime queries", async () => {
			const mockDataSource = { users: [] };

			// Register multiple realtime queries concurrently
			const promises = Array.from({ length: 10 }, (_, i) =>
				queryHandler.registerRealtimeQuery(
					`SELECT * FROM users WHERE id = ${i}`,
					"SQL",
					`client-${i}`,
					mockDataSource,
				),
			);

			const queryIds = await Promise.all(promises);

			expect(queryIds.length).toBe(10);
			expect(queryIds.every((id) => id && typeof id === "string")).toBe(true);
		});
	});
});
