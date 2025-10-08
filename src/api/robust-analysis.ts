/**
 * Robust Analysis API
 * Tree-sitter 오류에 강건한 분석 API
 */

import fs from "node:fs";
import type { SupportedLanguage } from "../core/types";

// ===== ROBUST ANALYSIS TYPES =====

export interface RobustAnalysisResult {
	language: SupportedLanguage;
	filePath: string;
	sourceCode: string;
	parseMetadata: {
		nodeCount: number;
		parseTime: number;
		parseMethod: "tree-sitter" | "regex-fallback";
	};
	symbols: Array<{
		name: string;
		type:
			| "class"
			| "interface"
			| "function"
			| "method"
			| "property"
			| "enum"
			| "arrow_function";
		startLine: number;
		endLine: number;
		isExported: boolean;
		metadata: any;
	}>;
	errors: string[];
}

// ===== REGEX-BASED SYMBOL EXTRACTION =====

/**
 * 정규식 기반 심볼 추출
 */
export function extractSymbolsWithRegex(
	sourceCode: string,
	_filePath: string,
): {
	symbols: any[];
	parseTime: number;
} {
	const startTime = performance.now();
	const lines = sourceCode.split("\n");
	const symbols: any[] = [];

	// 클래스 정의 패턴
	const classPattern =
		/^\s*(export\s+)?(abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*{/;

	// 인터페이스 정의 패턴
	const interfacePattern =
		/^\s*(export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?\s*{/;

	// 열거형 정의 패턴
	const enumPattern = /^\s*(export\s+)?enum\s+(\w+)\s*{/;

	// 함수 선언 패턴
	const functionPattern =
		/^\s*(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>[\]|&\s]+)?\s*{/;

	// 화살표 함수 패턴
	const arrowFunctionPattern =
		/^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/;

	// 메서드 패턴 (클래스 내부)
	const methodPattern =
		/^\s*(public|private|protected)?\s*(static\s+)?(async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>[\]|&\s]+)?\s*{/;

	// 속성 패턴 (클래스 내부)
	const propertyPattern =
		/^\s*(public|private|protected)?\s*(static\s+)?(readonly\s+)?(\w+)\s*:\s*[\w<>[\]|&\s]+/;

	let currentClass: string | null = null;
	let braceCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// 클래스 정의
		const classMatch = line.match(classPattern);
		if (classMatch) {
			currentClass = classMatch[3];
			braceCount = 0;
			symbols.push({
				name: classMatch[3] || "unknown",
				type: "class",
				startLine: i + 1,
				endLine: i + 1,
				isExported: !!classMatch[1],
				metadata: {
					isAbstract: !!classMatch[2],
					superClass: classMatch[4],
					implements: classMatch[5]
						? classMatch[5].split(",").map((s) => s.trim())
						: undefined,
					accessModifier: "public",
				},
			});
		}

		// 인터페이스 정의
		const interfaceMatch = line.match(interfacePattern);
		if (interfaceMatch) {
			symbols.push({
				name: interfaceMatch[2] || "unknown",
				type: "interface",
				startLine: i + 1,
				endLine: i + 1,
				isExported: !!interfaceMatch[1],
				metadata: {
					extends: interfaceMatch[3]
						? interfaceMatch[3].split(",").map((s) => s.trim())
						: undefined,
					accessModifier: "public",
				},
			});
		}

		// 열거형 정의
		const enumMatch = line.match(enumPattern);
		if (enumMatch) {
			symbols.push({
				name: enumMatch[2] || "unknown",
				type: "enum",
				startLine: i + 1,
				endLine: i + 1,
				isExported: !!enumMatch[1],
				metadata: {
					accessModifier: "public",
				},
			});
		}

		// 함수 선언
		const functionMatch = line.match(functionPattern);
		if (functionMatch) {
			symbols.push({
				name: functionMatch[3] || "unknown",
				type: "function",
				startLine: i + 1,
				endLine: i + 1,
				isExported: !!functionMatch[1],
				metadata: {
					isAsync: !!functionMatch[2],
					accessModifier: "public",
				},
			});
		}

		// 화살표 함수
		const arrowFunctionMatch = line.match(arrowFunctionPattern);
		if (arrowFunctionMatch) {
			symbols.push({
				name: arrowFunctionMatch[3] || "unknown",
				type: "arrow_function",
				startLine: i + 1,
				endLine: i + 1,
				isExported: !!arrowFunctionMatch[1],
				metadata: {
					isAsync: !!arrowFunctionMatch[4],
					accessModifier: "public",
				},
			});
		}

		// 클래스 내부 메서드/속성
		if (currentClass) {
			// 중괄호 카운팅으로 클래스 범위 추적
			braceCount += (line.match(/\{/g) || []).length;
			braceCount -= (line.match(/\}/g) || []).length;

			if (braceCount <= 0) {
				currentClass = null;
			} else {
				// 메서드
				const methodMatch = line.match(methodPattern);
				if (methodMatch) {
					symbols.push({
						name: methodMatch[4] || "unknown",
						type: "method",
						startLine: i + 1,
						endLine: i + 1,
						isExported: false,
						metadata: {
							className: currentClass,
							accessModifier: methodMatch[1] || "public",
							isStatic: !!methodMatch[2],
							isAsync: !!methodMatch[3],
						},
					});
				}

				// 속성
				const propertyMatch = line.match(propertyPattern);
				if (propertyMatch) {
					symbols.push({
						name: propertyMatch[4] || "unknown",
						type: "property",
						startLine: i + 1,
						endLine: i + 1,
						isExported: false,
						metadata: {
							className: currentClass,
							accessModifier: propertyMatch[1] || "public",
							isStatic: !!propertyMatch[2],
							isReadonly: !!propertyMatch[3],
						},
					});
				}
			}
		}
	}

	const parseTime = performance.now() - startTime;
	return { symbols, parseTime };
}

// ===== ROBUST ANALYSIS FUNCTIONS =====

/**
 * 강건한 파일 분석
 */
export async function analyzeFileRobust(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string,
): Promise<RobustAnalysisResult> {
	const startTime = performance.now();
	const errors: string[] = [];
	let symbols: any[] = [];
	let parseMethod: "tree-sitter" | "regex-fallback" = "regex-fallback";
	let nodeCount = 0;
	let parseTime = 0;

	try {
		// Tree-sitter 시도 (선택적)
		// 현재는 정규식 기반으로만 처리
		const result = extractSymbolsWithRegex(sourceCode, filePath);
		symbols = result.symbols;
		parseTime = result.parseTime;
		nodeCount = symbols.length;
		parseMethod = "regex-fallback";
	} catch (error) {
		errors.push(
			`Analysis failed for ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		parseTime = performance.now() - startTime;
	}

	return {
		language,
		filePath,
		sourceCode,
		parseMetadata: {
			nodeCount,
			parseTime,
			parseMethod,
		},
		symbols,
		errors,
	};
}

/**
 * 다중 파일 강건 분석
 */
export async function analyzeFilesRobust(
	files: string[],
	language: SupportedLanguage = "typescript",
): Promise<{
	results: RobustAnalysisResult[];
	totalFiles: number;
	totalSymbols: number;
	totalErrors: number;
	parseMethodStats: { treeSitter: number; regexFallback: number };
}> {
	const results: RobustAnalysisResult[] = [];
	let totalSymbols = 0;
	let totalErrors = 0;
	let treeSitterCount = 0;
	let regexFallbackCount = 0;

	for (const file of files) {
		try {
			if (!fs.existsSync(file)) {
				console.warn(`⚠️  File not found: ${file}`);
				continue;
			}

			const sourceCode = fs.readFileSync(file, "utf-8");
			const result = await analyzeFileRobust(sourceCode, language, file);

			results.push(result);
			totalSymbols += result.symbols.length;
			totalErrors += result.errors.length;

			if (result.parseMetadata.parseMethod === "tree-sitter") {
				treeSitterCount++;
			} else {
				regexFallbackCount++;
			}
		} catch (error) {
			console.warn(`⚠️  Failed to analyze ${file}:`, error);
		}
	}

	return {
		results,
		totalFiles: files.length,
		totalSymbols,
		totalErrors,
		parseMethodStats: {
			treeSitter: treeSitterCount,
			regexFallback: regexFallbackCount,
		},
	};
}

/**
 * 강건한 분석 리포트 생성
 */
export function generateRobustAnalysisReport(
	results: RobustAnalysisResult[],
	_config: any = {},
): {
	timestamp: Date;
	summary: {
		totalFiles: number;
		totalSymbols: number;
		totalErrors: number;
		parseMethodStats: { treeSitter: number; regexFallback: number };
		successRate: number;
	};
	symbols: any[];
	errors: string[];
	statistics: {
		byType: Record<string, number>;
		byFile: Record<string, number>;
		byExport: { exported: number; internal: number };
	};
} {
	const totalFiles = results.length;
	const totalSymbols = results.reduce(
		(sum, result) => sum + result.symbols.length,
		0,
	);
	const totalErrors = results.reduce(
		(sum, result) => sum + result.errors.length,
		0,
	);

	const treeSitterCount = results.filter(
		(r) => r.parseMetadata.parseMethod === "tree-sitter",
	).length;
	const regexFallbackCount = results.filter(
		(r) => r.parseMetadata.parseMethod === "regex-fallback",
	).length;

	const successRate =
		totalFiles > 0
			? ((totalFiles - results.filter((r) => r.errors.length > 0).length) /
					totalFiles) *
				100
			: 100;

	// 모든 심볼 수집
	const allSymbols = results.flatMap((result) => result.symbols);
	const allErrors = results.flatMap((result) => result.errors);

	// 통계 계산
	const byType: Record<string, number> = {};
	const byFile: Record<string, number> = {};

	for (const result of results) {
		byFile[result.filePath] = result.symbols.length;

		for (const symbol of result.symbols) {
			byType[symbol.type] = (byType[symbol.type] || 0) + 1;
		}
	}

	const exportedCount = allSymbols.filter((s) => s.isExported).length;

	return {
		timestamp: new Date(),
		summary: {
			totalFiles,
			totalSymbols,
			totalErrors,
			parseMethodStats: {
				treeSitter: treeSitterCount,
				regexFallback: regexFallbackCount,
			},
			successRate,
		},
		symbols: allSymbols,
		errors: allErrors,
		statistics: {
			byType,
			byFile,
			byExport: {
				exported: exportedCount,
				internal: allSymbols.length - exportedCount,
			},
		},
	};
}
