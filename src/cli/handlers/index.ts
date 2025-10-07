/**
 * CLI Handlers Index
 *
 * 이 파일은 CLI 핸들러들의 통합 진입점을 제공합니다.
 * 아키텍처 원칙에 따라 모듈성을 유지하고 의존성을 명확히 관리합니다.
 */

import { ContextDocumentsHandler } from "./context-documents-handler";
import { CrossNamespaceHandler } from "./cross-namespace-handler";
import { InferenceHandler } from "./inference-handler";
import { PerformanceOptimizationHandler } from "./performance-optimization-handler";
import { QueryHandler } from "./query-handler";
import { RDFHandler } from "./rdf-handler";
import { UnknownSymbolHandler } from "./unknown-handler";

// Context Documents Handler
export { ContextDocumentsHandler } from "./context-documents-handler";
// Cross-Namespace Handler
export { CrossNamespaceHandler } from "./cross-namespace-handler";
// Inference Handler
export { InferenceHandler } from "./inference-handler";
// Markdown Handler
export { runMarkdownAnalysis } from "./markdown-handler";
// Performance Optimization Handler
export { PerformanceOptimizationHandler } from "./performance-optimization-handler";
// Query Handler
export { QueryHandler } from "./query-handler";
// RDF Handler
export { RDFHandler } from "./rdf-handler";

// TypeScript Handler
export {
	runTypeScriptAnalysis,
	runTypeScriptPerformanceBenchmark,
	runTypeScriptProjectAnalysis,
} from "./typescript-handler";
// Unknown Symbol Handler
export { UnknownSymbolHandler } from "./unknown-handler";

// Handler Factory for dependency injection
export class HandlerFactory {
	private static rdfHandler: RDFHandler | null = null;
	private static unknownHandler: UnknownSymbolHandler | null = null;
	private static queryHandler: QueryHandler | null = null;
	private static crossNamespaceHandler: CrossNamespaceHandler | null = null;
	private static inferenceHandler: InferenceHandler | null = null;
	private static contextDocumentsHandler: ContextDocumentsHandler | null = null;
	private static performanceOptimizationHandler: PerformanceOptimizationHandler | null =
		null;

	/**
	 * RDF Handler 싱글톤 인스턴스 반환
	 */
	static getRDFHandler(): RDFHandler {
		if (!HandlerFactory.rdfHandler) {
			HandlerFactory.rdfHandler = new RDFHandler();
		}
		return HandlerFactory.rdfHandler;
	}

	/**
	 * Unknown Symbol Handler 싱글톤 인스턴스 반환
	 */
	static getUnknownHandler(): UnknownSymbolHandler {
		if (!HandlerFactory.unknownHandler) {
			HandlerFactory.unknownHandler = new UnknownSymbolHandler();
		}
		return HandlerFactory.unknownHandler;
	}

	/**
	 * Query Handler 싱글톤 인스턴스 반환
	 */
	static getQueryHandler(): QueryHandler {
		if (!HandlerFactory.queryHandler) {
			HandlerFactory.queryHandler = new QueryHandler();
		}
		return HandlerFactory.queryHandler;
	}

	/**
	 * Cross-Namespace Handler 싱글톤 인스턴스 반환
	 */
	static getCrossNamespaceHandler(): CrossNamespaceHandler {
		if (!HandlerFactory.crossNamespaceHandler) {
			HandlerFactory.crossNamespaceHandler = new CrossNamespaceHandler();
		}
		return HandlerFactory.crossNamespaceHandler;
	}

	/**
	 * Inference Handler 싱글톤 인스턴스 반환
	 */
	static getInferenceHandler(): InferenceHandler {
		if (!HandlerFactory.inferenceHandler) {
			HandlerFactory.inferenceHandler = new InferenceHandler();
		}
		return HandlerFactory.inferenceHandler;
	}

	/**
	 * Context Documents Handler 싱글톤 인스턴스 반환
	 */
	static getContextDocumentsHandler(): ContextDocumentsHandler {
		if (!HandlerFactory.contextDocumentsHandler) {
			HandlerFactory.contextDocumentsHandler = new ContextDocumentsHandler();
		}
		return HandlerFactory.contextDocumentsHandler;
	}

	/**
	 * Performance Optimization Handler 싱글톤 인스턴스 반환
	 */
	static getPerformanceOptimizationHandler(): PerformanceOptimizationHandler {
		if (!HandlerFactory.performanceOptimizationHandler) {
			HandlerFactory.performanceOptimizationHandler =
				new PerformanceOptimizationHandler();
		}
		return HandlerFactory.performanceOptimizationHandler;
	}

	/**
	 * 모든 핸들러 초기화
	 */
	static async initializeAll(): Promise<void> {
		const unknownHandler = HandlerFactory.getUnknownHandler();
		const queryHandler = HandlerFactory.getQueryHandler();
		const crossNamespaceHandler = HandlerFactory.getCrossNamespaceHandler();
		const inferenceHandler = HandlerFactory.getInferenceHandler();
		const contextDocumentsHandler = HandlerFactory.getContextDocumentsHandler();
		const performanceOptimizationHandler =
			HandlerFactory.getPerformanceOptimizationHandler();

		await unknownHandler.initialize();
		await queryHandler.initialize();
		await crossNamespaceHandler.initialize();
		await inferenceHandler.initialize();
		await contextDocumentsHandler.initialize();
		await performanceOptimizationHandler.initialize();

		console.log("✅ 모든 CLI 핸들러 초기화 완료");
	}

	/**
	 * 모든 핸들러 종료
	 */
	static async closeAll(): Promise<void> {
		if (HandlerFactory.unknownHandler) {
			await HandlerFactory.unknownHandler.close();
			HandlerFactory.unknownHandler = null;
		}

		if (HandlerFactory.queryHandler) {
			await HandlerFactory.queryHandler.close();
			HandlerFactory.queryHandler = null;
		}

		if (HandlerFactory.crossNamespaceHandler) {
			await HandlerFactory.crossNamespaceHandler.close();
			HandlerFactory.crossNamespaceHandler = null;
		}

		if (HandlerFactory.inferenceHandler) {
			await HandlerFactory.inferenceHandler.close();
			HandlerFactory.inferenceHandler = null;
		}

		if (HandlerFactory.contextDocumentsHandler) {
			await HandlerFactory.contextDocumentsHandler.close();
			HandlerFactory.contextDocumentsHandler = null;
		}

		if (HandlerFactory.performanceOptimizationHandler) {
			await HandlerFactory.performanceOptimizationHandler.close();
			HandlerFactory.performanceOptimizationHandler = null;
		}

		console.log("✅ 모든 CLI 핸들러 종료 완료");
	}
}
