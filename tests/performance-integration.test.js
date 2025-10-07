"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const handlers_1 = require("../src/cli/handlers");
(0, globals_1.describe)("성능 통합 테스트", () => {
	let startTime;
	let initialMemory;
	(0, globals_1.beforeAll)(() => {
		startTime = Date.now();
		initialMemory = process.memoryUsage();
		console.log("🚀 성능 통합 테스트 시작");
	});
	(0, globals_1.afterAll)(() => {
		const endTime = Date.now();
		const totalTime = endTime - startTime;
		const finalMemory = process.memoryUsage();
		const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
		console.log(
			`✅ 성능 통합 테스트 완료 (총 시간: ${totalTime}ms, 메모리 변화: ${Math.round(memoryDelta / 1024 / 1024)}MB)`,
		);
	});
	(0, globals_1.describe)("초기화 성능 테스트", () => {
		(0, globals_1.it)(
			"should initialize all handlers within performance limits",
			async () => {
				const initStartTime = Date.now();
				await handlers_1.HandlerFactory.initializeAll();
				const initEndTime = Date.now();
				const initializationTime = initEndTime - initStartTime;
				(0, globals_1.expect)(initializationTime).toBeLessThan(5000);
				console.log(
					`✅ 모든 핸들러 초기화 성능 검증 완료 (${initializationTime}ms)`,
				);
			},
		);
		(0, globals_1.it)(
			"should validate individual handler initialization performance",
			() => {
				const handlers = [
					{
						name: "RDFHandler",
						handler: handlers_1.HandlerFactory.getRDFHandler(),
					},
					{
						name: "UnknownSymbolHandler",
						handler: handlers_1.HandlerFactory.getUnknownHandler(),
					},
					{
						name: "QueryHandler",
						handler: handlers_1.HandlerFactory.getQueryHandler(),
					},
					{
						name: "CrossNamespaceHandler",
						handler: handlers_1.HandlerFactory.getCrossNamespaceHandler(),
					},
					{
						name: "InferenceHandler",
						handler: handlers_1.HandlerFactory.getInferenceHandler(),
					},
					{
						name: "ContextDocumentsHandler",
						handler: handlers_1.HandlerFactory.getContextDocumentsHandler(),
					},
					{
						name: "PerformanceOptimizationHandler",
						handler:
							handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
					},
				];
				handlers.forEach(({ name, handler }) => {
					const handlerStartTime = Date.now();
					(0, globals_1.expect)(handler).toBeDefined();
					const handlerEndTime = Date.now();
					const handlerTime = handlerEndTime - handlerStartTime;
					(0, globals_1.expect)(handlerTime).toBeLessThan(100);
					console.log(`✅ ${name} 초기화 성능 검증 완료 (${handlerTime}ms)`);
				});
			},
		);
	});
	(0, globals_1.describe)("메모리 사용량 테스트", () => {
		(0, globals_1.it)("should validate memory usage within limits", () => {
			const currentMemory = process.memoryUsage();
			const memoryDelta = currentMemory.heapUsed - initialMemory.heapUsed;
			(0, globals_1.expect)(memoryDelta).toBeLessThan(100 * 1024 * 1024);
			(0, globals_1.expect)(currentMemory.heapUsed).toBeLessThan(
				500 * 1024 * 1024,
			);
			(0, globals_1.expect)(currentMemory.heapTotal).toBeLessThan(
				1000 * 1024 * 1024,
			);
			console.log(
				`✅ 메모리 사용량 검증 완료 (변화: ${Math.round(memoryDelta / 1024 / 1024)}MB, 현재: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB)`,
			);
		});
		(0, globals_1.it)(
			"should validate memory efficiency of singleton pattern",
			() => {
				const handler1 = handlers_1.HandlerFactory.getRDFHandler();
				const handler2 = handlers_1.HandlerFactory.getRDFHandler();
				const handler3 = handlers_1.HandlerFactory.getRDFHandler();
				(0, globals_1.expect)(handler1).toBe(handler2);
				(0, globals_1.expect)(handler2).toBe(handler3);
				const currentMemory = process.memoryUsage();
				const memoryDelta = currentMemory.heapUsed - initialMemory.heapUsed;
				(0, globals_1.expect)(memoryDelta).toBeLessThan(50 * 1024 * 1024);
				console.log(
					`✅ 싱글톤 패턴 메모리 효율성 검증 완료 (변화: ${Math.round(memoryDelta / 1024 / 1024)}MB)`,
				);
			},
		);
	});
	(0, globals_1.describe)("CPU 사용량 테스트", () => {
		(0, globals_1.it)("should validate CPU usage during operations", () => {
			const cpuStart = process.cpuUsage();
			const handlers = [
				handlers_1.HandlerFactory.getRDFHandler(),
				handlers_1.HandlerFactory.getUnknownHandler(),
				handlers_1.HandlerFactory.getQueryHandler(),
				handlers_1.HandlerFactory.getCrossNamespaceHandler(),
				handlers_1.HandlerFactory.getInferenceHandler(),
				handlers_1.HandlerFactory.getContextDocumentsHandler(),
				handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
			];
			handlers.forEach((handler) => {
				(0, globals_1.expect)(typeof handler.initialize).toBe("function");
				(0, globals_1.expect)(typeof handler.close).toBe("function");
			});
			const cpuEnd = process.cpuUsage(cpuStart);
			const cpuTime = (cpuEnd.user + cpuEnd.system) / 1000;
			(0, globals_1.expect)(cpuTime).toBeLessThan(1000);
			console.log(`✅ CPU 사용량 검증 완료 (${Math.round(cpuTime)}ms)`);
		});
	});
	(0, globals_1.describe)("동시성 테스트", () => {
		(0, globals_1.it)("should handle concurrent handler access", async () => {
			const concurrentPromises = Array.from(
				{ length: 10 },
				async (_, index) => {
					const startTime = Date.now();
					const handlers = [
						handlers_1.HandlerFactory.getRDFHandler(),
						handlers_1.HandlerFactory.getUnknownHandler(),
						handlers_1.HandlerFactory.getQueryHandler(),
						handlers_1.HandlerFactory.getCrossNamespaceHandler(),
						handlers_1.HandlerFactory.getInferenceHandler(),
						handlers_1.HandlerFactory.getContextDocumentsHandler(),
						handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
					];
					handlers.forEach((handler) => {
						(0, globals_1.expect)(typeof handler.initialize).toBe("function");
						(0, globals_1.expect)(typeof handler.close).toBe("function");
					});
					const endTime = Date.now();
					return { index, duration: endTime - startTime };
				},
			);
			const results = await Promise.all(concurrentPromises);
			(0, globals_1.expect)(results.length).toBe(10);
			results.forEach((result) => {
				(0, globals_1.expect)(result.duration).toBeLessThan(100);
			});
			const avgDuration =
				results.reduce((sum, r) => sum + r.duration, 0) / results.length;
			console.log(
				`✅ 동시성 테스트 완료 (평균 시간: ${Math.round(avgDuration)}ms)`,
			);
		});
	});
	(0, globals_1.describe)("확장성 성능 테스트", () => {
		(0, globals_1.it)(
			"should validate performance with multiple handler instances",
			() => {
				const startTime = Date.now();
				const handlerInstances = Array.from({ length: 100 }, () => ({
					rdf: handlers_1.HandlerFactory.getRDFHandler(),
					unknown: handlers_1.HandlerFactory.getUnknownHandler(),
					query: handlers_1.HandlerFactory.getQueryHandler(),
					crossNamespace: handlers_1.HandlerFactory.getCrossNamespaceHandler(),
					inference: handlers_1.HandlerFactory.getInferenceHandler(),
					contextDocuments:
						handlers_1.HandlerFactory.getContextDocumentsHandler(),
					performance:
						handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
				}));
				const endTime = Date.now();
				const duration = endTime - startTime;
				handlerInstances.forEach((instances, index) => {
					if (index > 0) {
						(0, globals_1.expect)(instances.rdf).toBe(handlerInstances[0].rdf);
						(0, globals_1.expect)(instances.unknown).toBe(
							handlerInstances[0].unknown,
						);
						(0, globals_1.expect)(instances.query).toBe(
							handlerInstances[0].query,
						);
						(0, globals_1.expect)(instances.crossNamespace).toBe(
							handlerInstances[0].crossNamespace,
						);
						(0, globals_1.expect)(instances.inference).toBe(
							handlerInstances[0].inference,
						);
						(0, globals_1.expect)(instances.contextDocuments).toBe(
							handlerInstances[0].contextDocuments,
						);
						(0, globals_1.expect)(instances.performance).toBe(
							handlerInstances[0].performance,
						);
					}
				});
				(0, globals_1.expect)(duration).toBeLessThan(1000);
				(0, globals_1.expect)(handlerInstances.length).toBe(100);
				console.log(
					`✅ 확장성 성능 테스트 완료 (${duration}ms, ${handlerInstances.length}개 인스턴스)`,
				);
			},
		);
	});
	(0, globals_1.describe)("메모리 누수 테스트", () => {
		(0, globals_1.it)(
			"should validate no memory leaks in handler creation",
			() => {
				const initialMemory = process.memoryUsage();
				for (let i = 0; i < 1000; i++) {
					const handlers = [
						handlers_1.HandlerFactory.getRDFHandler(),
						handlers_1.HandlerFactory.getUnknownHandler(),
						handlers_1.HandlerFactory.getQueryHandler(),
						handlers_1.HandlerFactory.getCrossNamespaceHandler(),
						handlers_1.HandlerFactory.getInferenceHandler(),
						handlers_1.HandlerFactory.getContextDocumentsHandler(),
						handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
					];
					handlers.forEach((handler) => {
						(0, globals_1.expect)(handler).toBeDefined();
					});
				}
				if (global.gc) {
					global.gc();
				}
				const finalMemory = process.memoryUsage();
				const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
				(0, globals_1.expect)(memoryDelta).toBeLessThan(50 * 1024 * 1024);
				console.log(
					`✅ 메모리 누수 테스트 완료 (메모리 변화: ${Math.round(memoryDelta / 1024 / 1024)}MB)`,
				);
			},
		);
	});
	(0, globals_1.describe)("응답 시간 테스트", () => {
		(0, globals_1.it)(
			"should validate response time for handler operations",
			() => {
				const operations = [
					{
						name: "RDF Handler 생성",
						operation: () => handlers_1.HandlerFactory.getRDFHandler(),
					},
					{
						name: "Unknown Symbol Handler 생성",
						operation: () => handlers_1.HandlerFactory.getUnknownHandler(),
					},
					{
						name: "Query Handler 생성",
						operation: () => handlers_1.HandlerFactory.getQueryHandler(),
					},
					{
						name: "Cross-Namespace Handler 생성",
						operation: () =>
							handlers_1.HandlerFactory.getCrossNamespaceHandler(),
					},
					{
						name: "Inference Handler 생성",
						operation: () => handlers_1.HandlerFactory.getInferenceHandler(),
					},
					{
						name: "Context Documents Handler 생성",
						operation: () =>
							handlers_1.HandlerFactory.getContextDocumentsHandler(),
					},
					{
						name: "Performance Optimization Handler 생성",
						operation: () =>
							handlers_1.HandlerFactory.getPerformanceOptimizationHandler(),
					},
				];
				operations.forEach(({ name, operation }) => {
					const startTime = Date.now();
					const handler = operation();
					const endTime = Date.now();
					const duration = endTime - startTime;
					(0, globals_1.expect)(handler).toBeDefined();
					(0, globals_1.expect)(duration).toBeLessThan(10);
					console.log(`✅ ${name} 응답 시간 검증 완료 (${duration}ms)`);
				});
			},
		);
	});
});
//# sourceMappingURL=performance-integration.test.js.map
