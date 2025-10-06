"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const handlers_1 = require("../../src/cli/handlers");
const query_handler_1 = require("../../src/cli/handlers/query-handler");
(0, globals_1.describe)("Query System Integration", () => {
    let queryHandler;
    (0, globals_1.beforeEach)(async () => {
        await handlers_1.HandlerFactory.initializeAll();
        queryHandler = handlers_1.HandlerFactory.getQueryHandler();
    });
    (0, globals_1.afterEach)(async () => {
        await handlers_1.HandlerFactory.closeAll();
    });
    (0, globals_1.describe)("Handler Factory Integration", () => {
        (0, globals_1.it)("should initialize query handler through factory", async () => {
            (0, globals_1.expect)(queryHandler).toBeDefined();
            (0, globals_1.expect)(queryHandler).toBeInstanceOf(query_handler_1.QueryHandler);
        });
        (0, globals_1.it)("should provide singleton query handler instances", async () => {
            const handler1 = handlers_1.HandlerFactory.getQueryHandler();
            const handler2 = handlers_1.HandlerFactory.getQueryHandler();
            (0, globals_1.expect)(handler1).toBe(handler2);
        });
    });
    (0, globals_1.describe)("Query Execution", () => {
        (0, globals_1.it)("should execute SQL query", async () => {
            const mockDataSource = {
                users: [
                    { id: 1, name: "John", email: "john@example.com" },
                    { id: 2, name: "Jane", email: "jane@example.com" },
                ],
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.executeSQLQuery("SELECT * FROM users WHERE id = 1", mockDataSource);
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("SQL 쿼리 실행"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("SQL 쿼리 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should execute GraphQL query", async () => {
            const mockDataSource = {
                users: [
                    { id: 1, name: "John", email: "john@example.com" },
                    { id: 2, name: "Jane", email: "jane@example.com" },
                ],
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.executeGraphQLQuery("{ users { id name email } }", mockDataSource);
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("GraphQL 쿼리 실행"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("GraphQL 쿼리 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should execute natural language query", async () => {
            const mockDataSource = {
                users: [
                    { id: 1, name: "John", email: "john@example.com" },
                    { id: 2, name: "Jane", email: "jane@example.com" },
                ],
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.executeNaturalLanguageQuery("Show me all users", mockDataSource);
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("자연어 쿼리 실행"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("자연어 쿼리 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should execute auto-detected query", async () => {
            const mockDataSource = {
                users: [
                    { id: 1, name: "John", email: "john@example.com" },
                    { id: 2, name: "Jane", email: "jane@example.com" },
                ],
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.executeQuery("SELECT * FROM users", mockDataSource);
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 실행 (자동 감지)"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
    });
    (0, globals_1.describe)("Realtime Query System", () => {
        (0, globals_1.it)("should register realtime query", async () => {
            const mockDataSource = {
                users: [{ id: 1, name: "John", email: "john@example.com" }],
            };
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                const queryId = await queryHandler.registerRealtimeQuery("SELECT * FROM users", "SQL", "client-123", mockDataSource);
                (0, globals_1.expect)(queryId).toBeDefined();
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("실시간 쿼리 등록"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("실시간 쿼리 등록 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should subscribe to realtime query", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                const subscriptionId = await queryHandler.subscribeToRealtimeQuery("query-123", "client-456", "data");
                (0, globals_1.expect)(subscriptionId).toBeDefined();
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("실시간 쿼리 구독"));
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("실시간 쿼리 구독 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
    });
    (0, globals_1.describe)("Query Statistics and Cache Management", () => {
        (0, globals_1.it)("should get query statistics", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.getQueryStatistics();
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 성능 통계"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should manage cache", async () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            try {
                await queryHandler.manageCache("stats");
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 캐시 통계"));
                await queryHandler.manageCache("clear");
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 캐시 초기화 완료"));
                await queryHandler.manageCache("optimize");
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("쿼리 캐시 최적화 완료"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
    });
    (0, globals_1.describe)("Error Handling", () => {
        (0, globals_1.it)("should handle query execution errors gracefully", async () => {
            const consoleSpy = jest.spyOn(console, "error").mockImplementation();
            try {
                await queryHandler.executeSQLQuery("INVALID SQL QUERY", {});
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("SQL 쿼리 실행 실패"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
        (0, globals_1.it)("should handle realtime query errors gracefully", async () => {
            const consoleSpy = jest.spyOn(console, "error").mockImplementation();
            try {
                await queryHandler.subscribeToRealtimeQuery("non-existent-query", "client-123", "data");
                (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining("실시간 쿼리 구독 실패"));
            }
            finally {
                consoleSpy.mockRestore();
            }
        });
    });
    (0, globals_1.describe)("Performance and Scalability", () => {
        (0, globals_1.it)("should handle multiple queries efficiently", async () => {
            const startTime = Date.now();
            const mockDataSource = {
                users: Array.from({ length: 100 }, (_, i) => ({
                    id: i + 1,
                    name: `User${i + 1}`,
                    email: `user${i + 1}@example.com`,
                })),
            };
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
            (0, globals_1.expect)(duration).toBeLessThan(5000);
        });
        (0, globals_1.it)("should handle concurrent realtime queries", async () => {
            const mockDataSource = { users: [] };
            const promises = Array.from({ length: 10 }, (_, i) => queryHandler.registerRealtimeQuery(`SELECT * FROM users WHERE id = ${i}`, "SQL", `client-${i}`, mockDataSource));
            const queryIds = await Promise.all(promises);
            (0, globals_1.expect)(queryIds.length).toBe(10);
            (0, globals_1.expect)(queryIds.every((id) => id && typeof id === "string")).toBe(true);
        });
    });
});
//# sourceMappingURL=query-system-integration.test.js.map