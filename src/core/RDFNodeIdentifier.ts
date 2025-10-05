/**
 * RDF Node Identifier
 * RDF 기반 노드 식별자 생성 및 관리
 */

import {
	createRDFAddress,
	parseRDFAddress,
	extractNamespaceFromSymbol,
	type RDFAddress,
	type NodeType,
} from "./RDFAddress";
import type {
	RDFNodeIdentifier,
	RDFNodeIdentifierOptions,
	RDFSymbolExtractionResult,
	SupportedLanguage,
} from "./types";

// Export types for external use
export type {
	RDFNodeIdentifier,
	RDFNodeIdentifierOptions,
	RDFSymbolExtractionResult,
};

// ===== RDF NODE IDENTIFIER UTILITIES =====

/**
 * RDF 기반 노드 식별자 생성
 */
export function createRDFNodeIdentifier(
	options: RDFNodeIdentifierOptions,
): RDFNodeIdentifier {
	const { projectName, filePath, nodeType, symbolName } = options;

	// RDF 주소 생성
	const rdfAddress = createRDFAddress({
		projectName,
		filePath,
		nodeType,
		symbolName,
	});

	// 네임스페이스 정보 추출
	const { namespace, localName } = extractNamespaceFromSymbol(symbolName);

	return {
		rdfAddress,
		projectName,
		filePath,
		nodeType,
		symbolName,
		namespace: namespace || undefined,
		localName: localName || symbolName,
	};
}

/**
 * RDF 주소에서 노드 식별자 생성
 */
export function createRDFNodeIdentifierFromAddress(
	rdfAddress: string,
): RDFNodeIdentifier | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	// 네임스페이스 정보 추출
	const { namespace, localName } = extractNamespaceFromSymbol(
		parsed.symbolName,
	);

	return {
		rdfAddress: parsed.rawAddress,
		projectName: parsed.projectName,
		filePath: parsed.filePath,
		nodeType: parsed.nodeType,
		symbolName: parsed.symbolName,
		namespace: namespace || undefined,
		localName: localName || parsed.symbolName,
	};
}

/**
 * 심볼 추출 결과를 RDF 기반으로 변환
 */
export function convertToRDFSymbolExtractionResult(
	symbol: any,
	projectName: string,
	filePath: string,
	nodeType: NodeType,
): RDFSymbolExtractionResult {
	// 심볼명 생성 (네임스페이스 포함)
	const symbolName =
		symbol.name || symbol.symbolName || symbol.identifier || "unknown";

	// RDF 주소 생성
	const rdfAddress = createRDFAddress({
		projectName,
		filePath,
		nodeType,
		symbolName,
	});

	// 네임스페이스 정보 추출
	const { namespace, localName } = extractNamespaceFromSymbol(symbolName);

	// 메타데이터 추출
	const metadata = {
		accessModifier: symbol.accessModifier || symbol.access || undefined,
		isStatic: symbol.isStatic || symbol.static || false,
		isAsync: symbol.isAsync || symbol.async || false,
		isAbstract: symbol.isAbstract || symbol.abstract || false,
		lineNumber: symbol.lineNumber || symbol.line || symbol.start?.row,
		columnNumber: symbol.columnNumber || symbol.column || symbol.start?.column,
	};

	return {
		rdfAddress,
		nodeType,
		symbolName,
		namespace: namespace || undefined,
		localName: localName || symbolName,
		metadata,
	};
}

/**
 * 언어별 NodeType 매핑
 */
export function mapLanguageToNodeType(
	language: SupportedLanguage,
	symbolType: string,
): NodeType {
	const typeMapping: Record<SupportedLanguage, Record<string, NodeType>> = {
		typescript: {
			class: "Class",
			interface: "Interface",
			function: "Function",
			method: "Method",
			property: "Property",
			variable: "Variable",
			type: "Type",
			enum: "Enum",
			namespace: "Namespace",
		},
		tsx: {
			class: "Class",
			interface: "Interface",
			function: "Function",
			method: "Method",
			property: "Property",
			variable: "Variable",
			type: "Type",
			enum: "Enum",
			namespace: "Namespace",
		},
		javascript: {
			class: "Class",
			function: "Function",
			method: "Method",
			property: "Property",
			variable: "Variable",
		},
		jsx: {
			class: "Class",
			function: "Function",
			method: "Method",
			property: "Property",
			variable: "Variable",
		},
		java: {
			class: "Class",
			interface: "Interface",
			method: "Method",
			field: "Property",
			variable: "Variable",
			enum: "Enum",
		},
		python: {
			class: "Class",
			function: "Function",
			method: "Method",
			variable: "Variable",
		},
		go: {
			type: "Type",
			function: "Function",
			method: "Method",
			variable: "Variable",
		},
		markdown: {
			heading: "Heading",
			section: "Section",
			paragraph: "Paragraph",
		},
		external: {
			tag: "tag",
		},
		unknown: {
			tag: "tag",
		},
	};

	const languageMapping = typeMapping[language] || typeMapping.unknown;
	return languageMapping[symbolType.toLowerCase()] || "tag";
}

/**
 * RDF 주소 유효성 검증
 */
export function validateRDFNodeIdentifier(identifier: RDFNodeIdentifier): {
	isValid: boolean;
	errors?: string[];
} {
	const errors: string[] = [];

	// RDF 주소 형식 검증
	const parsed = parseRDFAddress(identifier.rdfAddress);
	if (!parsed.isValid) {
		errors.push(`Invalid RDF address: ${identifier.rdfAddress}`);
	}

	// 프로젝트명 검증
	if (!identifier.projectName || identifier.projectName.trim() === "") {
		errors.push("Project name cannot be empty");
	}

	// 파일 경로 검증
	if (!identifier.filePath || identifier.filePath.trim() === "") {
		errors.push("File path cannot be empty");
	}

	// 심볼명 검증
	if (!identifier.symbolName || identifier.symbolName.trim() === "") {
		errors.push("Symbol name cannot be empty");
	}

	return {
		isValid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * RDF 노드 식별자 비교
 */
export function compareRDFNodeIdentifiers(
	identifier1: RDFNodeIdentifier,
	identifier2: RDFNodeIdentifier,
): boolean {
	return (
		identifier1.projectName === identifier2.projectName &&
		identifier1.filePath === identifier2.filePath &&
		identifier1.nodeType === identifier2.nodeType &&
		identifier1.symbolName === identifier2.symbolName
	);
}

/**
 * RDF 주소에서 파일 위치 추출 (에디터 열기용)
 */
export function extractFileLocationFromRDF(
	rdfAddress: string,
): { filePath: string; lineNumber?: number; columnNumber?: number } | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	return {
		filePath: parsed.filePath,
		// TODO: 라인/컬럼 정보는 별도 메타데이터에서 추출 필요
		lineNumber: undefined,
		columnNumber: undefined,
	};
}

/**
 * RDF 주소 정규화
 */
export function normalizeRDFNodeIdentifier(
	identifier: RDFNodeIdentifier,
): RDFNodeIdentifier {
	// 파일 경로 정규화
	const normalizedPath = identifier.filePath.replace(/\\/g, "/");

	// 새로운 RDF 주소 생성
	const normalizedRdfAddress = createRDFAddress({
		projectName: identifier.projectName,
		filePath: normalizedPath,
		nodeType: identifier.nodeType,
		symbolName: identifier.symbolName,
	});

	return {
		...identifier,
		rdfAddress: normalizedRdfAddress,
		filePath: normalizedPath,
	};
}

/**
 * RDF 주소에서 검색 키 생성 (파서 검색용)
 */
export function createSearchKeyFromRDF(rdfAddress: string): string | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	// 검색 키: projectName/filePath#symbolName
	return `${parsed.projectName}/${parsed.filePath}#${parsed.symbolName}`;
}

/**
 * RDF 주소에서 프로젝트별 상대 경로 생성
 */
export function createRelativePathFromRDF(
	rdfAddress: string,
	baseProjectName: string,
): string | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	// 같은 프로젝트인 경우 상대 경로
	if (parsed.projectName === baseProjectName) {
		return parsed.filePath;
	}

	// 다른 프로젝트인 경우 전체 경로
	return `${parsed.projectName}/${parsed.filePath}`;
}
