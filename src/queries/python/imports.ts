/**
 * Python Import Queries
 * Python 언어의 import 관련 쿼리들
 */

import type {
	QueryExecutionContext,
	QueryFunction,
	QueryMatch,
} from "../../core/types";
import type {
	PythonFromImportResult,
	PythonImportAsResult,
	PythonImportSourceResult,
	PythonImportStatementResult,
} from "../../results";
import { extractLocation } from "../../utils/ast-helpers";

// ===== PYTHON IMPORT SOURCE EXTRACTION =====

/**
 * Python import 문에서 모듈 경로 추출
 */
export const pythonImportSources: QueryFunction<PythonImportSourceResult> = {
	name: "python-import-sources",
	description: "Extract import source paths from Python import statements",
	query: "(import_statement) @import",
	resultType: "python-import-sources",
	languages: ["python"],
	priority: 90,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): PythonImportSourceResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node) return null;
				return {
					queryName: "python-import-sources",
					source: extractPythonModulePath(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is PythonImportSourceResult => result !== null);
	},
};

// ===== PYTHON IMPORT STATEMENT EXTRACTION =====

/**
 * Python import 문 전체 정보 추출
 */
export const pythonImportStatements: QueryFunction<PythonImportStatementResult> =
	{
		name: "python-import-statements",
		description: "Extract complete Python import statement information",
		query: "(import_statement) @import",
		resultType: "python-import-statements",
		languages: ["python"],
		priority: 85,
		processor: (
			matches: QueryMatch[],
			_context: QueryExecutionContext,
		): PythonImportStatementResult[] => {
			return matches
				.map((match) => {
					const node = match.captures[0]?.node;
					if (!node) return null;
					const alias = extractImportAlias(node);
					const result: PythonImportStatementResult = {
						queryName: "python-import-statements",
						modulePath: extractPythonModulePath(node),
						isFromImport: isFromImport(node),
						isRelativeImport: isRelativeImport(node),
						location: extractLocation(node),
						nodeText: node.text,
					};
					if (alias) result.alias = alias;
					return result;
				})
				.filter(
					(result): result is PythonImportStatementResult => result !== null,
				);
		},
	};

// ===== PYTHON FROM IMPORT EXTRACTION =====

/**
 * Python from import 추출 (from module import name)
 */
export const pythonFromImports: QueryFunction<PythonFromImportResult> = {
	name: "python-from-imports",
	description: "Extract Python from-import statements",
	query: "(import_from_statement) @import",
	resultType: "python-from-imports",
	languages: ["python"],
	priority: 80,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): PythonFromImportResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node || !isFromImport(node)) return null;
				return {
					queryName: "python-from-imports",
					modulePath: extractFromModulePath(node),
					importedNames: extractFromImportNames(node),
					isRelative: isRelativeImport(node),
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is PythonFromImportResult => result !== null);
	},
};

// ===== PYTHON IMPORT AS EXTRACTION =====

/**
 * Python import as 추출 (별칭을 사용하는 import)
 */
export const pythonImportAs: QueryFunction<PythonImportAsResult> = {
	name: "python-import-as",
	description: "Extract Python import statements with aliases",
	query: "(import_statement) @import",
	resultType: "python-import-as",
	languages: ["python"],
	priority: 80,
	processor: (
		matches: QueryMatch[],
		_context: QueryExecutionContext,
	): PythonImportAsResult[] => {
		return matches
			.map((match) => {
				const node = match.captures[0]?.node;
				if (!node || !hasImportAlias(node)) return null;
				return {
					queryName: "python-import-as",
					modulePath: extractPythonModulePath(node),
					originalName: extractOriginalName(node),
					alias: extractImportAlias(node) || "",
					location: extractLocation(node),
					nodeText: node.text,
				};
			})
			.filter((result): result is PythonImportAsResult => result !== null);
	},
};

// ===== HELPER FUNCTIONS =====

/**
 * Python import 문에서 모듈 경로 추출
 */
function extractPythonModulePath(node: any): string {
	const text = node.text;

	// import os.path -> os.path
	// from os import path -> os (from import의 경우)
	// import numpy as np -> numpy

	if (text.startsWith("from ")) {
		return extractFromModulePath(node);
	}

	const importMatch = text.match(/import\s+([a-zA-Z0-9_.]+)/);
	return importMatch ? importMatch[1] : text;
}

/**
 * from import에서 모듈 경로 추출
 */
function extractFromModulePath(node: any): string {
	const text = node.text;
	// from os.path import dirname -> os.path
	const fromMatch = text.match(/from\s+([a-zA-Z0-9_.]+)\s+import/);
	return fromMatch ? fromMatch[1] : "";
}

/**
 * from import에서 가져온 이름들 추출
 */
function extractFromImportNames(node: any): string[] {
	const text = node.text;
	// from os import path, dirname -> ["path", "dirname"]
	// from typing import Dict, List, Optional -> ["Dict", "List", "Optional"]

	const importMatch = text.match(/import\s+(.+)$/);
	if (!importMatch) return [];

	return importMatch[1]
		.split(",")
		.map((name: string) => name.trim())
		.filter((name: string) => name.length > 0)
		.map((name: string) => {
			// "name as alias" -> "name"
			const asMatch = name.match(/^([a-zA-Z0-9_]+)\s+as\s+[a-zA-Z0-9_]+$/);
			return asMatch ? asMatch[1] : name;
		});
}

/**
 * from import 여부 확인
 */
function isFromImport(node: any): boolean {
	return node.text.startsWith("from ");
}

/**
 * 상대 import 여부 확인 (. 또는 .. 로 시작)
 */
function isRelativeImport(node: any): boolean {
	const text = node.text;
	return /from\s+\./.test(text) || /import\s+\./.test(text);
}

/**
 * import 별칭 추출
 */
function extractImportAlias(node: any): string | undefined {
	const text = node.text;
	const asMatch = text.match(/\s+as\s+([a-zA-Z0-9_]+)/);
	return asMatch ? asMatch[1] : undefined;
}

/**
 * import에 별칭이 있는지 확인
 */
function hasImportAlias(node: any): boolean {
	return node.text.includes(" as ");
}

/**
 * 별칭 사용 전 원래 이름 추출
 */
function extractOriginalName(node: any): string {
	const text = node.text;

	if (text.startsWith("from ")) {
		// from os import path as p -> path
		const importMatch = text.match(/import\s+([a-zA-Z0-9_]+)\s+as/);
		return importMatch ? importMatch[1] : "";
	} else {
		// import numpy as np -> numpy
		const importMatch = text.match(/import\s+([a-zA-Z0-9_.]+)\s+as/);
		return importMatch ? importMatch[1] : "";
	}
}

// ===== EXPORTS =====
const pythonImportQueries = {
	"python-import-sources": pythonImportSources,
	"python-import-statements": pythonImportStatements,
	"python-from-imports": pythonFromImports,
	"python-import-as": pythonImportAs,
} as const;

export default pythonImportQueries;
