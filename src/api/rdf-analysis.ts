/**
 * RDF-based Analysis API
 * RDF 주소 체계를 사용한 분석 API
 */

import { analyzeFile } from "./analysis";
import {
	createRDFNodeIdentifier,
	convertToRDFSymbolExtractionResult,
	mapLanguageToNodeType,
	type RDFNodeIdentifier,
	type RDFSymbolExtractionResult,
} from "../core/RDFNodeIdentifier";
import type { RDFAnalysisResult, SupportedLanguage } from "../core/types";
import type { NamespaceConfig } from "../namespace/types";

// ===== RDF ANALYSIS FUNCTIONS =====

/**
 * RDF 기반 파일 분석
 */
export async function analyzeFileWithRDF(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string,
	projectName: string,
): Promise<RDFAnalysisResult> {
	// 기본 분석 실행
	const analysisResult = await analyzeFile(sourceCode, language, filePath);

	// RDF 기반 심볼 추출 결과 생성
	const rdfSymbols: RDFSymbolExtractionResult[] = [];

	// 쿼리 결과에서 심볼 추출
	for (const [queryName, results] of Object.entries(
		analysisResult.queryResults,
	)) {
		for (const result of results) {
			// 쿼리별 NodeType 매핑
			const nodeType = mapQueryToNodeType(queryName, language);

			// RDF 기반 심볼 추출 결과 생성
			const rdfSymbol = convertToRDFSymbolExtractionResult(
				result,
				projectName,
				filePath,
				nodeType,
			);

			rdfSymbols.push(rdfSymbol);
		}
	}

	return {
		language: analysisResult.language,
		filePath: analysisResult.filePath,
		sourceCode: analysisResult.sourceCode,
		projectName,
		symbols: rdfSymbols,
		queryResults: analysisResult.queryResults,
		errors: [],
		warnings: [],
	};
}

/**
 * 네임스페이스 기반 RDF 분석
 */
export async function analyzeNamespaceWithRDF(
	namespaceConfig: NamespaceConfig,
	projectName: string,
): Promise<{
	namespace: string;
	projectName: string;
	files: RDFAnalysisResult[];
	totalSymbols: number;
	totalErrors: number;
}> {
	const files: RDFAnalysisResult[] = [];
	const totalSymbols = 0;
	const totalErrors = 0;

	// TODO: 실제 파일 패턴 매칭 및 분석 구현
	// 현재는 예시 구조만 제공

	return {
		namespace: namespaceConfig.description || "unknown",
		projectName,
		files,
		totalSymbols,
		totalErrors,
	};
}

/**
 * RDF 주소로 심볼 검색
 */
export function searchSymbolByRDF(
	rdfAddress: string,
	analysisResults: RDFAnalysisResult[],
): RDFSymbolExtractionResult | null {
	for (const result of analysisResults) {
		const symbol = result.symbols.find((s) => s.rdfAddress === rdfAddress);
		if (symbol) {
			return symbol;
		}
	}
	return null;
}

/**
 * 프로젝트 내 모든 RDF 주소 수집
 */
export function collectAllRDFAddresses(
	analysisResults: RDFAnalysisResult[],
): RDFNodeIdentifier[] {
	const identifiers: RDFNodeIdentifier[] = [];

	for (const result of analysisResults) {
		for (const symbol of result.symbols) {
			const identifier = createRDFNodeIdentifier({
				projectName: result.projectName,
				filePath: result.filePath,
				nodeType: symbol.nodeType,
				symbolName: symbol.symbolName,
			});

			identifiers.push(identifier);
		}
	}

	return identifiers;
}

/**
 * RDF 주소로 파일 위치 검색
 */
export function findFileLocationByRDF(
	rdfAddress: string,
	analysisResults: RDFAnalysisResult[],
): { filePath: string; lineNumber?: number; columnNumber?: number } | null {
	const symbol = searchSymbolByRDF(rdfAddress, analysisResults);

	if (!symbol) {
		return null;
	}

	return {
		filePath: symbol.metadata.lineNumber
			? analysisResults.find((r) => r.symbols.includes(symbol))?.filePath || ""
			: "",
		lineNumber: symbol.metadata.lineNumber,
		columnNumber: symbol.metadata.columnNumber,
	};
}

/**
 * RDF 주소 유효성 검증
 */
export function validateRDFAddresses(analysisResults: RDFAnalysisResult[]): {
	valid: RDFNodeIdentifier[];
	invalid: string[];
} {
	const valid: RDFNodeIdentifier[] = [];
	const invalid: string[] = [];

	for (const result of analysisResults) {
		for (const symbol of result.symbols) {
			const identifier = createRDFNodeIdentifier({
				projectName: result.projectName,
				filePath: result.filePath,
				nodeType: symbol.nodeType,
				symbolName: symbol.symbolName,
			});

			// TODO: 실제 유효성 검증 로직 구현
			valid.push(identifier);
		}
	}

	return { valid, invalid };
}

// ===== HELPER FUNCTIONS =====

/**
 * 쿼리명을 NodeType으로 매핑
 */
function mapQueryToNodeType(
	queryName: string,
	language: SupportedLanguage,
): import("../core/RDFAddress").NodeType {
	// 쿼리명 기반 NodeType 매핑
	const queryTypeMapping: Record<string, string> = {
		"ts-class-definitions": "class",
		"ts-interface-definitions": "interface",
		"ts-function-definitions": "function",
		"ts-method-definitions": "method",
		"ts-property-definitions": "property",
		"ts-variable-definitions": "variable",
		"ts-type-definitions": "type",
		"ts-enum-definitions": "enum",
		"ts-arrow-function-definitions": "function",
	};

	const symbolType = queryTypeMapping[queryName] || "tag";
	return mapLanguageToNodeType(language, symbolType);
}

/**
 * RDF 주소 생성 헬퍼
 */
export function createRDFAddressForSymbol(
	projectName: string,
	filePath: string,
	symbolName: string,
	nodeType: import("../core/RDFAddress").NodeType,
): string {
	return createRDFNodeIdentifier({
		projectName,
		filePath,
		nodeType,
		symbolName,
	}).rdfAddress;
}

/**
 * RDF 주소 파싱 헬퍼
 */
export function parseRDFAddressForSymbol(_rdfAddress: string): {
	projectName: string;
	filePath: string;
	nodeType: import("../core/RDFAddress").NodeType;
	symbolName: string;
} | null {
	const _identifier = createRDFNodeIdentifier({
		projectName: "",
		filePath: "",
		nodeType: "tag",
		symbolName: "",
	});

	// TODO: 실제 RDF 주소 파싱 구현
	return null;
}
