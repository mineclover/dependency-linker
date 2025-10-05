/**
 * RDF Address Parser
 * RDF 주소 파싱 및 변환 유틸리티
 */

import {
	parseRDFAddress,
	extractFilePathFromRDF,
	extractProjectNameFromRDF,
	extractSymbolNameFromRDF,
	extractNodeTypeFromRDF,
	normalizeRDFAddress,
	type RDFAddress,
	type NodeType,
} from "./RDFAddress";
import type { RDFNodeIdentifier } from "./types";

// ===== RDF ADDRESS PARSER TYPES =====

/**
 * 파싱된 RDF 주소 정보
 */
export interface ParsedRDFInfo {
	rawAddress: string;
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	namespace?: string;
	localName?: string;
	isValid: boolean;
	errors?: string[];
}

/**
 * RDF 주소 변환 옵션
 */
export interface RDFAddressTransformOptions {
	normalizePath?: boolean; // 경로 정규화
	extractNamespace?: boolean; // 네임스페이스 추출
	validateNodeType?: boolean; // NodeType 검증
	strictMode?: boolean; // 엄격 모드
}

/**
 * RDF 주소 검색 결과
 */
export interface RDFSearchResult {
	rdfAddress: string;
	filePath: string;
	projectName: string;
	symbolName: string;
	nodeType: NodeType;
	confidence: number; // 검색 신뢰도 (0-1)
}

// ===== RDF ADDRESS PARSER FUNCTIONS =====

/**
 * RDF 주소 상세 파싱
 */
export function parseRDFAddressDetailed(
	rdfAddress: string,
	options: RDFAddressTransformOptions = {},
): ParsedRDFInfo {
	const {
		normalizePath = true,
		extractNamespace = true,
		validateNodeType = true,
		strictMode = false,
	} = options;

	// 기본 RDF 주소 파싱
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return {
			rawAddress: rdfAddress,
			projectName: "",
			filePath: "",
			nodeType: "tag",
			symbolName: "",
			isValid: false,
			errors: parsed.errors,
		};
	}

	// 경로 정규화
	const normalizedPath = normalizePath
		? parsed.filePath.replace(/\\/g, "/")
		: parsed.filePath;

	// 네임스페이스 추출
	let namespace: string | undefined;
	let localName: string | undefined;

	if (extractNamespace) {
		const { namespace: ns, localName: local } = extractNamespaceFromSymbol(
			parsed.symbolName,
		);
		namespace = ns || undefined;
		localName = local || parsed.symbolName;
	}

	// NodeType 검증
	const errors: string[] = [];
	if (validateNodeType && !isValidNodeType(parsed.nodeType)) {
		errors.push(`Invalid NodeType: ${parsed.nodeType}`);
	}

	// 엄격 모드 검증
	if (strictMode) {
		if (!parsed.projectName || parsed.projectName.trim() === "") {
			errors.push("Project name cannot be empty");
		}
		if (!parsed.filePath || parsed.filePath.trim() === "") {
			errors.push("File path cannot be empty");
		}
		if (!parsed.symbolName || parsed.symbolName.trim() === "") {
			errors.push("Symbol name cannot be empty");
		}
	}

	return {
		rawAddress: rdfAddress,
		projectName: parsed.projectName,
		filePath: normalizedPath,
		nodeType: parsed.nodeType,
		symbolName: parsed.symbolName,
		namespace,
		localName,
		isValid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * RDF 주소에서 파일 위치 추출 (에디터 열기용)
 */
export function extractFileLocationFromRDF(
	rdfAddress: string,
): { filePath: string; projectName: string; symbolName: string } | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	return {
		filePath: parsed.filePath,
		projectName: parsed.projectName,
		symbolName: parsed.symbolName,
	};
}

/**
 * RDF 주소에서 검색 키 생성
 */
export function createSearchKeyFromRDF(
	rdfAddress: string,
	includeProject: boolean = true,
): string | null {
	const parsed = parseRDFAddress(rdfAddress);

	if (!parsed.isValid) {
		return null;
	}

	if (includeProject) {
		return `${parsed.projectName}/${parsed.filePath}#${parsed.symbolName}`;
	} else {
		return `${parsed.filePath}#${parsed.symbolName}`;
	}
}

/**
 * RDF 주소 검색 (부분 일치)
 */
export function searchRDFAddresses(
	query: string,
	addresses: string[],
	options: {
		caseSensitive?: boolean;
		exactMatch?: boolean;
		includeProject?: boolean;
	} = {},
): RDFSearchResult[] {
	const {
		caseSensitive = false,
		exactMatch = false,
		includeProject = true,
	} = options;

	const results: RDFSearchResult[] = [];
	const searchQuery = caseSensitive ? query : query.toLowerCase();

	for (const address of addresses) {
		const parsed = parseRDFAddress(address);

		if (!parsed.isValid) {
			continue;
		}

		// 검색 대상 문자열 생성
		const searchTarget = includeProject
			? `${parsed.projectName}/${parsed.filePath}#${parsed.symbolName}`
			: `${parsed.filePath}#${parsed.symbolName}`;

		const targetString = caseSensitive
			? searchTarget
			: searchTarget.toLowerCase();

		// 검색 조건 확인
		let matches = false;
		let confidence = 0;

		if (exactMatch) {
			matches = targetString === searchQuery;
			confidence = matches ? 1.0 : 0;
		} else {
			// 부분 일치 검색
			if (targetString.includes(searchQuery)) {
				matches = true;
				confidence = searchQuery.length / targetString.length;
			}
		}

		if (matches) {
			results.push({
				rdfAddress: address,
				filePath: parsed.filePath,
				projectName: parsed.projectName,
				symbolName: parsed.symbolName,
				nodeType: parsed.nodeType,
				confidence,
			});
		}
	}

	// 신뢰도 순으로 정렬
	return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * RDF 주소 필터링
 */
export function filterRDFAddresses(
	addresses: string[],
	filters: {
		projectName?: string;
		filePath?: string;
		nodeType?: NodeType;
		symbolName?: string;
		namespace?: string;
	},
): string[] {
	return addresses.filter((address) => {
		const parsed = parseRDFAddress(address);

		if (!parsed.isValid) {
			return false;
		}

		// 프로젝트명 필터
		if (filters.projectName && parsed.projectName !== filters.projectName) {
			return false;
		}

		// 파일 경로 필터
		if (filters.filePath && !parsed.filePath.includes(filters.filePath)) {
			return false;
		}

		// NodeType 필터
		if (filters.nodeType && parsed.nodeType !== filters.nodeType) {
			return false;
		}

		// 심볼명 필터
		if (filters.symbolName && !parsed.symbolName.includes(filters.symbolName)) {
			return false;
		}

		// 네임스페이스 필터
		if (filters.namespace) {
			const { namespace } = extractNamespaceFromSymbol(parsed.symbolName);
			if (!namespace || !namespace.includes(filters.namespace)) {
				return false;
			}
		}

		return true;
	});
}

/**
 * RDF 주소 그룹화
 */
export function groupRDFAddressesBy(
	addresses: string[],
	groupBy: "project" | "file" | "nodeType" | "namespace",
): Map<string, string[]> {
	const groups = new Map<string, string[]>();

	for (const address of addresses) {
		const parsed = parseRDFAddress(address);

		if (!parsed.isValid) {
			continue;
		}

		let groupKey: string;

		switch (groupBy) {
			case "project":
				groupKey = parsed.projectName;
				break;
			case "file":
				groupKey = parsed.filePath;
				break;
			case "nodeType":
				groupKey = parsed.nodeType;
				break;
			case "namespace":
				const { namespace } = extractNamespaceFromSymbol(parsed.symbolName);
				groupKey = namespace || "global";
				break;
			default:
				groupKey = "unknown";
		}

		if (!groups.has(groupKey)) {
			groups.set(groupKey, []);
		}

		groups.get(groupKey)!.push(address);
	}

	return groups;
}

/**
 * RDF 주소 통계 생성
 */
export function generateRDFAddressStatistics(addresses: string[]): {
	totalAddresses: number;
	projectCount: number;
	fileCount: number;
	nodeTypeCount: Record<NodeType, number>;
	namespaceCount: Record<string, number>;
	invalidAddresses: number;
} {
	const stats = {
		totalAddresses: addresses.length,
		projectCount: 0,
		fileCount: 0,
		nodeTypeCount: {} as Record<NodeType, number>,
		namespaceCount: {} as Record<string, number>,
		invalidAddresses: 0,
	};

	const projects = new Set<string>();
	const files = new Set<string>();

	for (const address of addresses) {
		const parsed = parseRDFAddress(address);

		if (!parsed.isValid) {
			stats.invalidAddresses++;
			continue;
		}

		// 프로젝트 수집
		projects.add(parsed.projectName);

		// 파일 수집
		files.add(parsed.filePath);

		// NodeType 카운트
		stats.nodeTypeCount[parsed.nodeType] =
			(stats.nodeTypeCount[parsed.nodeType] || 0) + 1;

		// 네임스페이스 카운트
		const { namespace } = extractNamespaceFromSymbol(parsed.symbolName);
		const ns = namespace || "global";
		stats.namespaceCount[ns] = (stats.namespaceCount[ns] || 0) + 1;
	}

	stats.projectCount = projects.size;
	stats.fileCount = files.size;

	return stats;
}

// ===== HELPER FUNCTIONS =====

/**
 * 심볼명에서 네임스페이스 추출
 */
function extractNamespaceFromSymbol(symbolName: string): {
	namespace: string;
	localName: string;
} {
	const lastDotIndex = symbolName.lastIndexOf(".");

	if (lastDotIndex === -1) {
		return { namespace: "", localName: symbolName };
	}

	return {
		namespace: symbolName.substring(0, lastDotIndex),
		localName: symbolName.substring(lastDotIndex + 1),
	};
}

/**
 * NodeType 유효성 검증
 */
function isValidNodeType(nodeType: NodeType): boolean {
	const validTypes: NodeType[] = [
		"Class",
		"Interface",
		"Function",
		"Method",
		"Property",
		"Variable",
		"Type",
		"Enum",
		"Namespace",
		"Heading",
		"Section",
		"Paragraph",
		"tag",
		"parsed-by",
		"defined-in",
		"extends",
		"implements",
		"used-by",
	];

	return validTypes.includes(nodeType);
}
