/**
 * Java Import Queries
 * Java 언어의 import 관련 쿼리들
 */

import type {
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
} from "../../core/types";
import type {
	JavaImportSourceResult,
	JavaImportStatementResult,
	JavaStaticImportResult,
	JavaWildcardImportResult,
} from "../../results";
import { extractLocation } from "../../utils/ast-helpers";

// ===== JAVA IMPORT SOURCE EXTRACTION =====

/**
 * Java import 문에서 소스 경로 추출
 */
export const javaImportSources: QueryFunction<JavaImportSourceResult> = {
	name: "java-import-sources",
	description: "Extract import source paths from Java import statements",
	query: "(import_declaration) @import",
	resultType: "java-import-sources",
	languages: ["java"],
	priority: 90,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): JavaImportSourceResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node) return null;
				return {
					queryName: "java-import-sources",
					source: extractJavaImportPath(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is JavaImportSourceResult => result !== null);
	},
};

// ===== JAVA IMPORT STATEMENT EXTRACTION =====

/**
 * Java import 문 전체 정보 추출
 */
export const javaImportStatements: QueryFunction<JavaImportStatementResult> = {
	name: "java-import-statements",
	description: "Extract complete Java import statement information",
	query: "(import_declaration) @import",
	resultType: "java-import-statements",
	languages: ["java"],
	priority: 85,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): JavaImportStatementResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node) return null;
				return {
					queryName: "java-import-statements",
					packagePath: extractJavaImportPath(node),
					isStatic: isStaticImport(node),
					isWildcard: isWildcardImport(node),
					importedName: extractImportedName(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is JavaImportStatementResult => result !== null);
	},
};

// ===== JAVA WILDCARD IMPORT EXTRACTION =====

/**
 * Java wildcard import 추출 (import package.*)
 */
export const javaWildcardImports: QueryFunction<JavaWildcardImportResult> = {
	name: "java-wildcard-imports",
	description: "Extract Java wildcard import statements",
	query: "(import_declaration) @import",
	resultType: "java-wildcard-imports",
	languages: ["java"],
	priority: 80,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): JavaWildcardImportResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node || !isWildcardImport(node)) return null;
				return {
					queryName: "java-wildcard-imports",
					packagePath: extractJavaImportPath(node).replace(/\.\*$/, ""),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is JavaWildcardImportResult => result !== null);
	},
};

// ===== JAVA STATIC IMPORT EXTRACTION =====

/**
 * Java static import 추출
 */
export const javaStaticImports: QueryFunction<JavaStaticImportResult> = {
	name: "java-static-imports",
	description: "Extract Java static import statements",
	query: "(import_declaration) @import",
	resultType: "java-static-imports",
	languages: ["java"],
	priority: 80,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): JavaStaticImportResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node || !isStaticImport(node)) return null;
				return {
					queryName: "java-static-imports",
					className: extractStaticImportClass(node),
					memberName: extractStaticImportMember(node),
					isWildcard: isWildcardImport(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is JavaStaticImportResult => result !== null);
	},
};

// ===== HELPER FUNCTIONS =====

/**
 * Java import 문에서 패키지 경로 추출
 */
function extractJavaImportPath(node: any): string {
	const text = node.text;

	// import static com.example.Class.method; -> com.example.Class.method
	// import com.example.Class; -> com.example.Class
	// import com.example.*; -> com.example.*

	const importMatch = text.match(
		/import\s+(?:static\s+)?([a-zA-Z0-9_.]+(?:\.\*)?)/,
	);
	return importMatch ? importMatch[1] : text;
}

/**
 * static import 여부 확인
 */
function isStaticImport(node: any): boolean {
	return node.text.includes("import static");
}

/**
 * wildcard import 여부 확인 (.*로 끝나는지)
 */
function isWildcardImport(node: any): boolean {
	return node.text.includes(".*");
}

/**
 * import된 이름 추출 (클래스명 또는 멤버명)
 */
function extractImportedName(node: any): string {
	const path = extractJavaImportPath(node);

	if (path.endsWith(".*")) {
		return "*";
	}

	const parts = path.split(".");
	return parts[parts.length - 1];
}

/**
 * static import에서 클래스명 추출
 */
function extractStaticImportClass(node: any): string {
	const path = extractJavaImportPath(node);
	const parts = path.split(".");

	// com.example.Class.method -> com.example.Class
	// com.example.Class.* -> com.example.Class
	if (parts.length >= 2) {
		return parts.slice(0, -1).join(".");
	}

	return path;
}

/**
 * static import에서 멤버명 추출
 */
function extractStaticImportMember(node: any): string {
	const path = extractJavaImportPath(node);
	const parts = path.split(".");

	if (parts.length >= 2) {
		const lastPart = parts[parts.length - 1];
		return lastPart === "*" ? "*" : lastPart;
	}

	return "";
}

// ===== EXPORTS =====
const javaImportQueries = {
	"java-import-sources": javaImportSources,
	"java-import-statements": javaImportStatements,
	"java-wildcard-imports": javaWildcardImports,
	"java-static-imports": javaStaticImports,
} as const;

export default javaImportQueries;
