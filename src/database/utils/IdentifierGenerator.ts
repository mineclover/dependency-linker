/**
 * Identifier 생성 유틸리티
 * 파일 경로를 포함한 고유 identifier 생성 전략
 */

export type NodeType =
	| "file"
	| "export"
	| "import"
	| "class"
	| "method"
	| "function"
	| "variable"
	| "interface"
	| "type"
	| "library";

export interface IdentifierContext {
	filePath: string;
	nodeType: NodeType;
	name: string;
	parentScope?: string;
}

/**
 * 파일 경로 정규화
 * - 절대 경로를 프로젝트 루트 기준 상대 경로로 변환
 * - 윈도우/유닉스 경로 구분자 통일
 */
export function normalizePath(filePath: string, projectRoot?: string): string {
	let normalized = filePath;

	// 프로젝트 루트가 제공된 경우 상대 경로로 변환
	if (projectRoot && filePath.startsWith(projectRoot)) {
		normalized = filePath.substring(projectRoot.length);
	}

	// 경로 구분자 통일 (윈도우 \ -> /)
	normalized = normalized.replace(/\\/g, "/");

	// 시작 슬래시 확인
	if (!normalized.startsWith("/")) {
		normalized = "/" + normalized;
	}

	return normalized;
}

/**
 * 기본 identifier 생성
 * Format: /file/path::type::name
 */
export function generateIdentifier(context: IdentifierContext): string {
	const { filePath, nodeType, name, parentScope } = context;

	const normalizedPath = normalizePath(filePath);

	if (parentScope) {
		// 계층적 스코프가 있는 경우: /file::parent::type::name
		return `${normalizedPath}::${parentScope}::${nodeType}::${name}`;
	} else {
		// 단순 구조: /file::type::name
		return `${normalizedPath}::${nodeType}::${name}`;
	}
}

/**
 * File 노드 identifier 생성
 */
export function generateFileIdentifier(
	filePath: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	const fileName = normalizedPath.split("/").pop() || "";
	return `${normalizedPath}::file::${fileName}`;
}

/**
 * Export 노드 identifier 생성
 */
export function generateExportIdentifier(
	filePath: string,
	exportName: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	return `${normalizedPath}::export::${exportName}`;
}

/**
 * Import 노드 identifier 생성
 */
export function generateImportIdentifier(
	filePath: string,
	importedName: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	return `${normalizedPath}::import::${importedName}`;
}

/**
 * Library 노드 identifier 생성 (외부 라이브러리)
 */
export function generateLibraryIdentifier(libraryName: string): string {
	// 라이브러리는 파일 경로 없이 library:: 접두사 사용
	return `library::${libraryName}`;
}

/**
 * Class 노드 identifier 생성
 */
export function generateClassIdentifier(
	filePath: string,
	className: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	return `${normalizedPath}::class::${className}`;
}

/**
 * Method 노드 identifier 생성
 */
export function generateMethodIdentifier(
	filePath: string,
	className: string,
	methodName: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	return `${normalizedPath}::${className}::method::${methodName}`;
}

/**
 * Function 노드 identifier 생성
 */
export function generateFunctionIdentifier(
	filePath: string,
	functionName: string,
	projectRoot?: string,
): string {
	const normalizedPath = normalizePath(filePath, projectRoot);
	return `${normalizedPath}::function::${functionName}`;
}

/**
 * Identifier에서 정보 추출
 */
export interface ParsedIdentifier {
	filePath?: string;
	nodeType: string;
	name: string;
	parentScope?: string;
	isLibrary: boolean;
}

/**
 * Identifier 파싱
 */
export function parseIdentifier(identifier: string): ParsedIdentifier {
	// library 타입 체크
	if (identifier.startsWith("library::")) {
		const name = identifier.substring("library::".length);
		return {
			nodeType: "library",
			name,
			isLibrary: true,
		};
	}

	// 일반 identifier 파싱
	const parts = identifier.split("::");

	if (parts.length < 3) {
		throw new Error(`Invalid identifier format: ${identifier}`);
	}

	const filePath = parts[0];

	// 계층적 구조인지 확인
	if (parts.length === 4) {
		// /file::parent::type::name
		return {
			filePath,
			parentScope: parts[1],
			nodeType: parts[2],
			name: parts[3],
			isLibrary: false,
		};
	} else {
		// /file::type::name
		return {
			filePath,
			nodeType: parts[1],
			name: parts[2],
			isLibrary: false,
		};
	}
}

/**
 * Identifier가 특정 파일에 속하는지 확인
 */
export function isIdentifierFromFile(
	identifier: string,
	filePath: string,
): boolean {
	const parsed = parseIdentifier(identifier);
	if (parsed.isLibrary) return false;

	const normalizedPath = normalizePath(filePath);
	return parsed.filePath === normalizedPath;
}

/**
 * 같은 이름의 export가 다른 파일에서 발생했는지 확인
 */
export function compareExportIdentifiers(
	id1: string,
	id2: string,
): {
	sameName: boolean;
	sameFile: boolean;
	name1: string;
	name2: string;
	file1?: string;
	file2?: string;
} {
	const parsed1 = parseIdentifier(id1);
	const parsed2 = parseIdentifier(id2);

	return {
		sameName: parsed1.name === parsed2.name,
		sameFile: parsed1.filePath === parsed2.filePath,
		name1: parsed1.name,
		name2: parsed2.name,
		file1: parsed1.filePath,
		file2: parsed2.filePath,
	};
}
