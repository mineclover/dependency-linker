/**
 * CLI Handlers Index
 *
 * 이 파일은 CLI 핸들러들의 통합 진입점을 제공합니다.
 * 아키텍처 원칙에 따라 모듈성을 유지하고 의존성을 명확히 관리합니다.
 */

import { RDFHandler } from "./rdf-handler";
import { UnknownSymbolHandler } from "./unknown-handler";
import { QueryHandler } from "./query-handler";
import { CrossNamespaceHandler } from "./cross-namespace-handler";
import { InferenceHandler } from "./inference-handler";

// RDF Handler
export { RDFHandler } from "./rdf-handler";

// Unknown Symbol Handler
export { UnknownSymbolHandler } from "./unknown-handler";

// Query Handler
export { QueryHandler } from "./query-handler";

// Cross-Namespace Handler
export { CrossNamespaceHandler } from "./cross-namespace-handler";

// Inference Handler
export { InferenceHandler } from "./inference-handler";

// TypeScript Handler
export {
	runTypeScriptAnalysis,
	runTypeScriptProjectAnalysis,
	runTypeScriptPerformanceBenchmark,
} from "./typescript-handler";

// Markdown Handler
export { runMarkdownAnalysis } from "./markdown-handler";

// Handler Factory for dependency injection
export class HandlerFactory {
	private static rdfHandler: RDFHandler | null = null;
	private static unknownHandler: UnknownSymbolHandler | null = null;
	private static queryHandler: QueryHandler | null = null;
	private static crossNamespaceHandler: CrossNamespaceHandler | null = null;
	private static inferenceHandler: InferenceHandler | null = null;

	/**
	 * RDF Handler 싱글톤 인스턴스 반환
	 */
	static getRDFHandler(): RDFHandler {
		if (!this.rdfHandler) {
			this.rdfHandler = new RDFHandler();
		}
		return this.rdfHandler;
	}

	/**
	 * Unknown Symbol Handler 싱글톤 인스턴스 반환
	 */
	static getUnknownHandler(): UnknownSymbolHandler {
		if (!this.unknownHandler) {
			this.unknownHandler = new UnknownSymbolHandler();
		}
		return this.unknownHandler;
	}

	/**
	 * Query Handler 싱글톤 인스턴스 반환
	 */
	static getQueryHandler(): QueryHandler {
		if (!this.queryHandler) {
			this.queryHandler = new QueryHandler();
		}
		return this.queryHandler;
	}

	/**
	 * Cross-Namespace Handler 싱글톤 인스턴스 반환
	 */
	static getCrossNamespaceHandler(): CrossNamespaceHandler {
		if (!this.crossNamespaceHandler) {
			this.crossNamespaceHandler = new CrossNamespaceHandler();
		}
		return this.crossNamespaceHandler;
	}

	/**
	 * Inference Handler 싱글톤 인스턴스 반환
	 */
	static getInferenceHandler(): InferenceHandler {
		if (!this.inferenceHandler) {
			this.inferenceHandler = new InferenceHandler();
		}
		return this.inferenceHandler;
	}

	/**
	 * 모든 핸들러 초기화
	 */
	static async initializeAll(): Promise<void> {
		const unknownHandler = this.getUnknownHandler();
		const queryHandler = this.getQueryHandler();
		const crossNamespaceHandler = this.getCrossNamespaceHandler();
		const inferenceHandler = this.getInferenceHandler();

		await unknownHandler.initialize();
		await queryHandler.initialize();
		await crossNamespaceHandler.initialize();
		await inferenceHandler.initialize();

		console.log("✅ 모든 CLI 핸들러 초기화 완료");
	}

	/**
	 * 모든 핸들러 종료
	 */
	static async closeAll(): Promise<void> {
		if (this.unknownHandler) {
			await this.unknownHandler.close();
			this.unknownHandler = null;
		}

		if (this.queryHandler) {
			await this.queryHandler.close();
			this.queryHandler = null;
		}

		if (this.crossNamespaceHandler) {
			await this.crossNamespaceHandler.close();
			this.crossNamespaceHandler = null;
		}

		if (this.inferenceHandler) {
			await this.inferenceHandler.close();
			this.inferenceHandler = null;
		}

		console.log("✅ 모든 CLI 핸들러 종료 완료");
	}
}
