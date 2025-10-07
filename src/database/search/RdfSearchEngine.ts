/**
 * RDF 기반 검색 시스템
 *
 * RDF 주소를 입력받아 실제 파일 위치와 심볼의 정의 위치를 찾는 검색 엔진
 *
 * @module RdfSearchEngine
 * @see features/type-management/RDF_SEARCH_DESIGN.md
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getLanguageTreeSitterQueries } from "../../core/QueryBridge";
import { globalTreeSitterQueryEngine } from "../../core/TreeSitterQueryEngine";
import type { QueryMatch, SupportedLanguage } from "../../core/types";
import { parseCode } from "../../parsers";
import type { QueryKey } from "../../results";
import type { ScenarioRegistry } from "../../scenarios/ScenarioRegistry";
import type { NodeIdentifier, RdfAddress } from "../core/NodeIdentifier";

/**
 * 심볼 위치 정보
 */
export interface SymbolLocation {
	/** 절대 파일 경로 */
	absolutePath: string;

	/** 프로젝트 상대 경로 */
	relativePath: string;

	/** 심볼 위치 */
	location: {
		line: number;
		column: number;
		endLine?: number;
		endColumn?: number;
	};

	/** 노드 타입 */
	nodeType: string;

	/** 심볼 이름 */
	symbolName: string;

	/** 심볼이 속한 컨텍스트 (클래스 이름 등) */
	context?: string;
}

/**
 * RDF 검색 옵션
 */
export interface RdfSearchOptions {
	/** 프로젝트 루트 경로 */
	projectRoot: string;

	/** 타입 검증 활성화 (기본: true) */
	validateTypes?: boolean;

	/** 사용할 시나리오 ID 목록 (기본: 모든 시나리오) */
	scenarioIds?: string[];

	/** 성능 로깅 활성화 (기본: false) */
	logPerformance?: boolean;
}

/**
 * 언어별 쿼리 키 매핑
 */
interface QueryKeyMap {
	[nodeType: string]: string;
}

/**
 * RDF 기반 검색 엔진
 *
 * RDF 주소 → 파일 위치 + 심볼 정의 위치 검색
 *
 * @example
 * ```typescript
 * const searchEngine = new RdfSearchEngine(
 *   globalNodeIdentifier,
 *   globalScenarioRegistry,
 *   globalParserManager
 * );
 *
 * const result = await searchEngine.findSymbolLocation(
 *   "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse",
 *   { projectRoot: "/Users/user/project" }
 * );
 * ```
 */
export class RdfSearchEngine {
	/**
	 * TypeScript/JavaScript 쿼리 키 매핑
	 */
	private static readonly TYPESCRIPT_QUERY_KEY_MAP: QueryKeyMap = {
		class: "ts-class-definitions",
		method: "ts-method-definitions",
		function: "ts-function-definitions",
		interface: "ts-interface-definitions",
		type: "ts-type-definitions",
		variable: "ts-variable-definitions",
		constant: "ts-variable-definitions",
		enum: "ts-enum-definitions",
		import: "ts-import-sources",
		export: "ts-export-declarations",
	};

	/**
	 * Java 쿼리 키 매핑
	 */
	private static readonly JAVA_QUERY_KEY_MAP: QueryKeyMap = {
		class: "java-class-declarations",
		method: "java-method-declarations",
		interface: "java-interface-declarations",
		field: "java-field-declarations",
	};

	/**
	 * Python 쿼리 키 매핑
	 */
	private static readonly PYTHON_QUERY_KEY_MAP: QueryKeyMap = {
		class: "python-class-definitions",
		function: "python-function-definitions",
		method: "python-function-definitions", // Python 메서드는 함수와 동일
	};

	constructor(
		private nodeIdentifier: NodeIdentifier,
		private scenarioRegistry: ScenarioRegistry,
	) {}

	/**
	 * RDF 주소로 심볼 위치 검색
	 *
	 * @param rdfAddress RDF 주소 (예: "project/path/file.ts#Method:symbolName")
	 * @param options 검색 옵션
	 * @returns 심볼 위치 정보 또는 null (찾지 못한 경우)
	 * @throws {Error} 잘못된 RDF 주소 또는 유효하지 않은 노드 타입
	 *
	 * @example
	 * ```typescript
	 * const location = await engine.findSymbolLocation(
	 *   "dependency-linker/src/parsers/TypeScriptParser.ts#Method:parse",
	 *   { projectRoot: "/path/to/project" }
	 * );
	 * ```
	 */
	async findSymbolLocation(
		rdfAddress: string,
		options: RdfSearchOptions,
	): Promise<SymbolLocation | null> {
		const startTime = performance.now();

		try {
			// 1. RDF 주소 파싱
			const parsed = this.nodeIdentifier.parseRdfAddress(rdfAddress);
			if (!parsed) {
				throw new Error(`Invalid RDF address: ${rdfAddress}`);
			}

			// 2. 타입 검증 (옵션)
			if (options.validateTypes !== false) {
				this.validateNodeType(parsed.nodeType, options.scenarioIds);
			}

			// 3. 파일 경로 구성
			const absolutePath = path.join(options.projectRoot, parsed.filePath);

			// 4. 파일 존재 확인
			try {
				await fs.access(absolutePath);
			} catch {
				return null; // 파일이 존재하지 않음
			}

			// 5. 파일 파싱
			const fileContent = await fs.readFile(absolutePath, "utf-8");
			const language = this.detectLanguage(parsed.filePath);
			const parseResult = await parseCode(fileContent, language);

			if (!parseResult.tree) {
				return null; // 파싱 실패
			}

			// 6. 언어별 쿼리 키 매핑 선택
			const queryKeyMap = this.getQueryKeyMapForLanguage(language);
			const nodeType = parsed.nodeType.toLowerCase();
			const queryKey = queryKeyMap[nodeType] as QueryKey | undefined;

			if (!queryKey) {
				return null; // 지원하지 않는 노드 타입
			}

			// 7. Tree-sitter 쿼리 문자열 가져오기
			const languageQueries = getLanguageTreeSitterQueries(language);
			const queryString = languageQueries[queryKey];

			if (!queryString) {
				return null; // 쿼리가 정의되지 않음
			}

			// 8. Tree-sitter 쿼리 직접 실행
			const matches = globalTreeSitterQueryEngine.executeQuery(
				queryKey,
				queryString,
				parseResult.tree,
				language,
			);

			if (!matches || matches.length === 0) {
				return null;
			}

			// 9. 심볼 위치 찾기 (raw matches에서)
			const result = this.findSymbolInMatches(
				matches,
				parsed,
				absolutePath,
				fileContent,
			);

			return result;
		} finally {
			// 성능 측정
			const duration = performance.now() - startTime;
			if (options.logPerformance) {
				console.log(
					`🔍 RDF search completed in ${duration.toFixed(2)}ms (${rdfAddress})`,
				);
			}

			// 성능 목표 경고 (100ms)
			if (duration > 100 && options.logPerformance) {
				console.warn(
					`⚠️  Search exceeded 100ms target: ${duration.toFixed(2)}ms`,
				);
			}
		}
	}

	/**
	 * 노드 타입 검증
	 *
	 * @param nodeType 검증할 노드 타입
	 * @param scenarioIds 시나리오 ID 목록 (선택)
	 * @throws {Error} 유효하지 않은 노드 타입
	 */
	private validateNodeType(nodeType: string, scenarioIds?: string[]): void {
		const validTypes = this.getAllValidNodeTypes(scenarioIds);
		const normalizedType = nodeType.toLowerCase();

		if (!validTypes.has(normalizedType)) {
			const validTypesList = Array.from(validTypes).sort().join(", ");
			throw new Error(
				`Invalid node type '${nodeType}'. Valid types: ${validTypesList}`,
			);
		}
	}

	/**
	 * 모든 유효한 노드 타입 수집
	 *
	 * ScenarioRegistry.collectTypes()를 사용하여 시나리오 체인에서
	 * 정의된 모든 nodeTypes를 수집
	 *
	 * @param scenarioIds 시나리오 ID 목록 (기본: 모든 시나리오)
	 * @returns 유효한 노드 타입 Set
	 */
	private getAllValidNodeTypes(scenarioIds?: string[]): Set<string> {
		const allTypes = new Set<string>();
		const scenarios =
			scenarioIds || this.scenarioRegistry.list().map((spec) => spec.id);

		for (const scenarioId of scenarios) {
			try {
				const types = this.scenarioRegistry.collectTypes(scenarioId);
				for (const nodeType of types.nodeTypes) {
					allTypes.add(nodeType.toLowerCase());
				}
			} catch {}
		}

		return allTypes;
	}

	/**
	 * 쿼리 매치에서 심볼 찾기
	 *
	 * @param matches Tree-sitter 쿼리 매치 결과
	 * @param parsed 파싱된 RDF 주소
	 * @param absolutePath 파일 절대 경로
	 * @param sourceCode 소스 코드
	 * @returns 심볼 위치 정보 또는 null
	 */
	private findSymbolInMatches(
		matches: QueryMatch[],
		parsed: RdfAddress,
		absolutePath: string,
		sourceCode: string,
	): SymbolLocation | null {
		const symbolName = parsed.symbolName;

		// 이름 캡처 패턴 (쿼리에서 정의된 캡처 이름들)
		const nameCaptures = [
			"class_name",
			"function_name",
			"method_name",
			"interface_name",
			"type_name",
			"enum_name",
			"var_name",
		];

		// 각 매치 검사
		for (const match of matches) {
			// 각 매치의 캡처 중에서 이름 캡처 찾기
			for (const capture of match.captures) {
				// 이름 캡처인지 확인
				if (nameCaptures.includes(capture.name)) {
					const capturedText = sourceCode.slice(
						capture.node.startIndex,
						capture.node.endIndex,
					);

					if (capturedText === symbolName) {
						return {
							absolutePath,
							relativePath: parsed.filePath,
							location: {
								line: capture.node.startPosition.row + 1,
								column: capture.node.startPosition.column,
								endLine: capture.node.endPosition.row + 1,
								endColumn: capture.node.endPosition.column,
							},
							nodeType: parsed.nodeType,
							symbolName: parsed.symbolName,
							context: undefined,
						};
					}
				}
			}
		}

		return null; // 심볼을 찾지 못함
	}

	/**
	 * 언어별 쿼리 키 매핑 반환
	 *
	 * @param language 언어 이름
	 * @returns 쿼리 키 매핑
	 */
	private getQueryKeyMapForLanguage(language: string): QueryKeyMap {
		switch (language) {
			case "typescript":
			case "tsx":
			case "javascript":
			case "jsx":
				return RdfSearchEngine.TYPESCRIPT_QUERY_KEY_MAP;
			case "java":
				return RdfSearchEngine.JAVA_QUERY_KEY_MAP;
			case "python":
				return RdfSearchEngine.PYTHON_QUERY_KEY_MAP;
			default:
				return RdfSearchEngine.TYPESCRIPT_QUERY_KEY_MAP;
		}
	}

	/**
	 * 파일 확장자로 언어 감지
	 *
	 * @param filePath 파일 경로
	 * @returns 언어 이름
	 */
	private detectLanguage(filePath: string): SupportedLanguage {
		const ext = path.extname(filePath).toLowerCase();
		const langMap: Record<string, SupportedLanguage> = {
			".ts": "typescript",
			".tsx": "tsx",
			".js": "javascript",
			".jsx": "jsx",
			".java": "java",
			".py": "python",
			".go": "go",
			".md": "markdown",
		};
		return langMap[ext] || "typescript";
	}
}
