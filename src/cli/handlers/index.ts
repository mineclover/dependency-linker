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
let rdfHandler: RDFHandler | null = null;
let unknownHandler: UnknownSymbolHandler | null = null;
let queryHandler: QueryHandler | null = null;
let crossNamespaceHandler: CrossNamespaceHandler | null = null;
let inferenceHandler: InferenceHandler | null = null;
let contextDocumentsHandler: ContextDocumentsHandler | null = null;
let performanceOptimizationHandler: PerformanceOptimizationHandler | null =
	null;

/**
 * RDF Handler 싱글톤 인스턴스 반환
 */
export function getRDFHandler(): RDFHandler {
	if (!rdfHandler) {
		rdfHandler = new RDFHandler();
	}
	return rdfHandler;
}

/**
 * Unknown Symbol Handler 싱글톤 인스턴스 반환
 */
export function getUnknownHandler(): UnknownSymbolHandler {
	if (!unknownHandler) {
		unknownHandler = new UnknownSymbolHandler();
	}
	return unknownHandler;
}

/**
 * Query Handler 싱글톤 인스턴스 반환
 */
export function getQueryHandler(): QueryHandler {
	if (!queryHandler) {
		queryHandler = new QueryHandler();
	}
	return queryHandler;
}

/**
 * Cross-Namespace Handler 싱글톤 인스턴스 반환
 */
export function getCrossNamespaceHandler(): CrossNamespaceHandler {
	if (!crossNamespaceHandler) {
		crossNamespaceHandler = new CrossNamespaceHandler();
	}
	return crossNamespaceHandler;
}

/**
 * Inference Handler 싱글톤 인스턴스 반환
 */
export function getInferenceHandler(): InferenceHandler {
	if (!inferenceHandler) {
		inferenceHandler = new InferenceHandler();
	}
	return inferenceHandler;
}

/**
 * Context Documents Handler 싱글톤 인스턴스 반환
 */
export function getContextDocumentsHandler(): ContextDocumentsHandler {
	if (!contextDocumentsHandler) {
		contextDocumentsHandler = new ContextDocumentsHandler();
	}
	return contextDocumentsHandler;
}

/**
 * Performance Optimization Handler 싱글톤 인스턴스 반환
 */
export function getPerformanceOptimizationHandler(): PerformanceOptimizationHandler {
	if (!performanceOptimizationHandler) {
		performanceOptimizationHandler = new PerformanceOptimizationHandler();
	}
	return performanceOptimizationHandler;
}

/**
 * 모든 핸들러 초기화
 */
export async function initializeAllHandlers(): Promise<void> {
	const unknownHandler = getUnknownHandler();
	const queryHandler = getQueryHandler();
	const crossNamespaceHandler = getCrossNamespaceHandler();
	const inferenceHandler = getInferenceHandler();
	const contextDocumentsHandler = getContextDocumentsHandler();
	const performanceOptimizationHandler = getPerformanceOptimizationHandler();

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
export async function closeAllHandlers(): Promise<void> {
	if (unknownHandler) {
		await unknownHandler.close();
		unknownHandler = null;
	}

	if (queryHandler) {
		await queryHandler.close();
		queryHandler = null;
	}

	if (crossNamespaceHandler) {
		await crossNamespaceHandler.close();
		crossNamespaceHandler = null;
	}

	if (inferenceHandler) {
		await inferenceHandler.close();
		inferenceHandler = null;
	}

	if (contextDocumentsHandler) {
		await contextDocumentsHandler.close();
		contextDocumentsHandler = null;
	}

	if (performanceOptimizationHandler) {
		await performanceOptimizationHandler.close();
		performanceOptimizationHandler = null;
	}

	console.log("✅ 모든 CLI 핸들러 종료 완료");
}
