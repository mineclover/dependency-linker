/**
 * Database Services Index
 *
 * 이 파일은 데이터베이스 서비스들의 통합 진입점을 제공합니다.
 * 아키텍처 원칙에 따라 모듈성을 유지하고 의존성을 명확히 관리합니다.
 */

import type { FileDependencyAnalyzer } from "./FileDependencyAnalyzer";
import { UnknownSymbolManager } from "./UnknownSymbolManager";

// File Dependency Analysis
export { FileDependencyAnalyzer } from "./FileDependencyAnalyzer";
export type {
	EquivalenceCandidate,
	EquivalenceRelation,
	UnknownSymbol,
} from "./UnknownSymbolManager";
// Unknown Symbol System
export { UnknownSymbolManager } from "./UnknownSymbolManager";

// Service Factory for dependency injection
export class ServiceFactory {
	private static unknownSymbolManager: UnknownSymbolManager | null = null;
	private static fileDependencyAnalyzer: FileDependencyAnalyzer | null = null;

	/**
	 * Unknown Symbol Manager 싱글톤 인스턴스 반환
	 */
	static getUnknownSymbolManager(): UnknownSymbolManager {
		if (!ServiceFactory.unknownSymbolManager) {
			ServiceFactory.unknownSymbolManager = new UnknownSymbolManager();
		}
		return ServiceFactory.unknownSymbolManager;
	}

	/**
	 * File Dependency Analyzer 싱글톤 인스턴스 반환
	 */
	static getFileDependencyAnalyzer(): FileDependencyAnalyzer {
		if (!ServiceFactory.fileDependencyAnalyzer) {
			// FileDependencyAnalyzer는 생성자에 인자가 필요하므로 임시로 null 반환
			throw new Error("FileDependencyAnalyzer requires database parameter");
		}
		return ServiceFactory.fileDependencyAnalyzer;
	}

	/**
	 * 모든 서비스 초기화
	 */
	static async initializeAll(): Promise<void> {
		const unknownManager = ServiceFactory.getUnknownSymbolManager();
		await unknownManager.initialize();

		console.log("✅ 모든 데이터베이스 서비스 초기화 완료");
	}

	/**
	 * 모든 서비스 종료
	 */
	static async closeAll(): Promise<void> {
		if (ServiceFactory.unknownSymbolManager) {
			await ServiceFactory.unknownSymbolManager.close();
			ServiceFactory.unknownSymbolManager = null;
		}

		console.log("✅ 모든 데이터베이스 서비스 종료 완료");
	}
}
