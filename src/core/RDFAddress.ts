/**
 * RDF Address System
 * RDF 주소 체계 구현: <projectName>/<filePath>#<NodeType>:<SymbolName>
 */

// ===== RDF ADDRESS TYPES =====

/**
 * RDF 주소 구조
 * 형식: <projectName>/<filePath>#<NodeType>:<SymbolName>
 */
export interface RDFAddress {
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
}

/**
 * 파싱된 RDF 주소 정보
 */
export interface ParsedRDFAddress extends RDFAddress {
	rawAddress: string;
	isValid: boolean;
	errors?: string[];
}

/**
 * NodeType 표준 정의
 */
export type NodeType =
	// 기본 타입
	| "Class"
	| "Interface"
	| "Function"
	| "Method"
	| "Property"
	| "Variable"
	| "Type"
	| "Enum"
	| "Namespace"
	// 문서 타입
	| "Heading"
	| "Section"
	| "Paragraph"
	// 커스텀 타입
	| "tag"
	| "parsed-by"
	| "defined-in"
	| "extends"
	| "implements"
	| "used-by";

/**
 * RDF 주소 생성 옵션
 */
export interface RDFAddressOptions {
	projectName: string;
	filePath: string;
	nodeType: NodeType;
	symbolName: string;
	validate?: boolean;
}

// ===== RDF ADDRESS UTILITIES =====

/**
 * RDF 주소 생성
 */
export function createRDFAddress(options: RDFAddressOptions): string {
	const { projectName, filePath, nodeType, symbolName } = options;

	// 파일 경로 정규화 (슬래시로 통일)
	const normalizedPath = filePath.replace(/\\/g, "/");

	// RDF 주소 생성
	const rdfAddress = `${projectName}/${normalizedPath}#${nodeType}:${symbolName}`;

	return rdfAddress;
}

/**
 * RDF 주소 파싱
 */
export function parseRDFAddress(address: string): ParsedRDFAddress {
	const errors: string[] = [];

	try {
		// RDF 주소 패턴 검증: project/file#type:symbol
		const rdfPattern = /^([^\/]+)\/(.+)#([^:]+):(.+)$/;
		const match = address.match(rdfPattern);

		if (!match) {
			errors.push(`Invalid RDF address format: ${address}`);
			return {
				projectName: "",
				filePath: "",
				nodeType: "tag" as NodeType,
				symbolName: "",
				rawAddress: address,
				isValid: false,
				errors,
			};
		}

		const [, projectName, filePath, nodeType, symbolName] = match;

		// NodeType 검증
		if (!isValidNodeType(nodeType)) {
			errors.push(`Invalid NodeType: ${nodeType}`);
		}

		// SymbolName 검증 (빈 문자열 허용하지 않음)
		if (!symbolName || symbolName.trim() === "") {
			errors.push("SymbolName cannot be empty");
		}

		return {
			projectName,
			filePath,
			nodeType: nodeType as NodeType,
			symbolName,
			rawAddress: address,
			isValid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	} catch (error) {
		errors.push(
			`Parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return {
			projectName: "",
			filePath: "",
			nodeType: "tag" as NodeType,
			symbolName: "",
			rawAddress: address,
			isValid: false,
			errors,
		};
	}
}

/**
 * NodeType 유효성 검증
 */
export function isValidNodeType(nodeType: string): nodeType is NodeType {
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

	return validTypes.includes(nodeType as NodeType);
}

/**
 * RDF 주소에서 파일 경로 추출
 */
export function extractFilePathFromRDF(address: string): string | null {
	const parsed = parseRDFAddress(address);
	return parsed.isValid ? parsed.filePath : null;
}

/**
 * RDF 주소에서 프로젝트명 추출
 */
export function extractProjectNameFromRDF(address: string): string | null {
	const parsed = parseRDFAddress(address);
	return parsed.isValid ? parsed.projectName : null;
}

/**
 * RDF 주소에서 심볼명 추출
 */
export function extractSymbolNameFromRDF(address: string): string | null {
	const parsed = parseRDFAddress(address);
	return parsed.isValid ? parsed.symbolName : null;
}

/**
 * RDF 주소에서 NodeType 추출
 */
export function extractNodeTypeFromRDF(address: string): NodeType | null {
	const parsed = parseRDFAddress(address);
	return parsed.isValid ? parsed.nodeType : null;
}

/**
 * RDF 주소 검증
 */
export function validateRDFAddress(address: string): {
	isValid: boolean;
	errors?: string[];
} {
	const parsed = parseRDFAddress(address);
	return {
		isValid: parsed.isValid,
		errors: parsed.errors,
	};
}

/**
 * RDF 주소 비교 (같은 심볼인지 확인)
 */
export function compareRDFAddresses(
	address1: string,
	address2: string,
): boolean {
	const parsed1 = parseRDFAddress(address1);
	const parsed2 = parseRDFAddress(address2);

	if (!parsed1.isValid || !parsed2.isValid) {
		return false;
	}

	return (
		parsed1.projectName === parsed2.projectName &&
		parsed1.filePath === parsed2.filePath &&
		parsed1.nodeType === parsed2.nodeType &&
		parsed1.symbolName === parsed2.symbolName
	);
}

/**
 * RDF 주소 정규화 (경로 정규화)
 */
export function normalizeRDFAddress(address: string): string {
	const parsed = parseRDFAddress(address);

	if (!parsed.isValid) {
		return address;
	}

	// 파일 경로 정규화
	const normalizedPath = parsed.filePath.replace(/\\/g, "/");

	return createRDFAddress({
		projectName: parsed.projectName,
		filePath: normalizedPath,
		nodeType: parsed.nodeType,
		symbolName: parsed.symbolName,
	});
}

/**
 * RDF 주소에서 상대 경로로 변환
 */
export function convertRDFToRelativePath(
	address: string,
	baseProjectName: string,
): string | null {
	const parsed = parseRDFAddress(address);

	if (!parsed.isValid) {
		return null;
	}

	// 같은 프로젝트인 경우 상대 경로 반환
	if (parsed.projectName === baseProjectName) {
		return parsed.filePath;
	}

	// 다른 프로젝트인 경우 전체 경로 반환
	return `${parsed.projectName}/${parsed.filePath}`;
}

/**
 * 심볼명에서 네임스페이스 추출
 */
export function extractNamespaceFromSymbol(symbolName: string): {
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
 * RDF 주소에서 네임스페이스 정보 추출
 */
export function extractNamespaceFromRDF(
	address: string,
): { namespace: string; localName: string } | null {
	const parsed = parseRDFAddress(address);

	if (!parsed.isValid) {
		return null;
	}

	return extractNamespaceFromSymbol(parsed.symbolName);
}
