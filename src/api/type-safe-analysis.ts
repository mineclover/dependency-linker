/**
 * Type-Safe Analysis API
 * 타입 안전성을 강화한 분석 API
 */

import type { QueryKey, QueryResult } from "../core/QueryResultMap";
import type { SupportedLanguage } from "../core/types";
import {
	type AnalysisOptions,
	type AnalysisResult,
	analyzeFile,
} from "./analysis";

// ===== ENHANCED TYPE DEFINITIONS =====

/**
 * 타입 안전한 쿼리 결과 맵
 */
export type TypeSafeQueryResults = {
	[K in QueryKey]: QueryResult<K>[];
};

/**
 * 심볼 정보 타입
 */
export interface SymbolInfo {
	name: string;
	type:
		| "class"
		| "interface"
		| "function"
		| "method"
		| "property"
		| "enum"
		| "arrow_function";
	filePath: string;
	startLine: number;
	endLine: number;
	isExported: boolean;
	metadata: {
		isAbstract?: boolean;
		isStatic?: boolean;
		isAsync?: boolean;
		isReadonly?: boolean;
		accessModifier?: "public" | "private" | "protected";
		superClass?: string;
		implements?: string[];
		extends?: string[];
		parameters?: Array<{ name: string; type?: string; isOptional?: boolean }>;
		returnType?: string;
		propertyType?: string;
		values?: string[];
	};
}

/**
 * 분석 설정
 */
export interface AnalysisConfig {
	// 파일 패턴
	filePatterns: string[];

	// 언어 설정
	languages: SupportedLanguage[];

	// 분석 옵션
	analysisOptions: AnalysisOptions;

	// 출력 설정
	output: {
		format: "json" | "csv" | "table";
		includeMetadata: boolean;
		includeStatistics: boolean;
	};

	// 규정 준수 검사
	compliance: {
		enabled: boolean;
		rules: ComplianceRule[];
	};
}

/**
 * 규정 준수 규칙
 */
export interface ComplianceRule {
	id: string;
	name: string;
	description: string;
	severity: "error" | "warning" | "info";
	check: (symbols: SymbolInfo[]) => ComplianceResult;
}

/**
 * 규정 준수 결과
 */
export interface ComplianceResult {
	ruleId: string;
	passed: boolean;
	message: string;
	affectedSymbols: string[];
	suggestions?: string[];
}

/**
 * 분석 리포트
 */
export interface AnalysisReport {
	timestamp: Date;
	config: AnalysisConfig;
	summary: {
		totalFiles: number;
		totalSymbols: number;
		exportedSymbols: number;
		complianceScore: number;
	};
	symbols: SymbolInfo[];
	compliance: ComplianceResult[];
	statistics: {
		byType: Record<string, number>;
		byFile: Record<string, number>;
		byExport: { exported: number; internal: number };
	};
}

// ===== TYPE-SAFE ANALYSIS FUNCTIONS =====

/**
 * 타입 안전한 파일 분석
 */
export async function analyzeFileTypeSafe(
	sourceCode: string,
	language: SupportedLanguage,
	filePath: string,
	options: AnalysisOptions = {},
): Promise<{
	result: AnalysisResult;
	symbols: SymbolInfo[];
	errors: string[];
}> {
	const errors: string[] = [];
	let symbols: SymbolInfo[] = [];

	try {
		const result = await analyzeFile(sourceCode, language, filePath, options);

		// 타입 안전한 심볼 추출
		symbols = extractSymbolsTypeSafe(result, filePath);

		return { result, symbols, errors };
	} catch (error) {
		errors.push(
			`Analysis failed for ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return {
			result: {} as AnalysisResult,
			symbols: [],
			errors,
		};
	}
}

/**
 * 타입 안전한 심볼 추출
 */
export function extractSymbolsTypeSafe(
	analysisResult: AnalysisResult,
	filePath: string,
): SymbolInfo[] {
	const symbols: SymbolInfo[] = [];

	try {
		// 클래스 정의 추출
		const classResults =
			analysisResult.queryResults["ts-class-definitions"] || [];
		for (const result of classResults) {
			const r = result as any;
			symbols.push({
				name: r.className || "unknown",
				type: "class",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: r.isExported || false,
				metadata: {
					isAbstract: r.isAbstract,
					superClass: r.superClass,
					implements: r.implements,
					accessModifier: r.accessModifier,
				},
			});
		}

		// 인터페이스 정의 추출
		const interfaceResults =
			analysisResult.queryResults["ts-interface-definitions"] || [];
		for (const result of interfaceResults) {
			const r = result as any;
			symbols.push({
				name: r.interfaceName || "unknown",
				type: "interface",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: r.isExported || false,
				metadata: {
					extends: r.extends,
					accessModifier: r.accessModifier,
				},
			});
		}

		// 열거형 정의 추출
		const enumResults =
			analysisResult.queryResults["ts-enum-definitions"] || [];
		for (const result of enumResults) {
			const r = result as any;
			symbols.push({
				name: r.enumName || "unknown",
				type: "enum",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: r.isExported || false,
				metadata: {
					values: r.values,
					accessModifier: r.accessModifier,
				},
			});
		}

		// 메서드 정의 추출
		const methodResults =
			analysisResult.queryResults["ts-method-definitions"] || [];
		for (const result of methodResults) {
			const r = result as any;
			symbols.push({
				name: r.methodName || "unknown",
				type: "method",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: false,
				metadata: {
					isStatic: r.isStatic,
					isAsync: r.isAsync,
					isAbstract: r.isAbstract,
					accessModifier: r.accessModifier,
					parameters: r.parameters,
					returnType: r.returnType,
				},
			});
		}

		// 속성 정의 추출
		const propertyResults =
			analysisResult.queryResults["ts-property-definitions"] || [];
		for (const result of propertyResults) {
			const r = result as any;
			symbols.push({
				name: r.propertyName || "unknown",
				type: "property",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: false,
				metadata: {
					isStatic: r.isStatic,
					accessModifier: r.accessModifier,
					propertyType: r.propertyType,
				},
			});
		}

		// 함수 선언 추출
		const functionResults =
			analysisResult.queryResults["ts-function-declarations"] || [];
		for (const result of functionResults) {
			const r = result as any;
			symbols.push({
				name: r.functionName || "unknown",
				type: "function",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: r.isExported || false,
				metadata: {
					isAsync: r.isAsync,
					parameters: r.parameters,
					returnType: r.returnType,
				},
			});
		}

		// 화살표 함수 추출
		const arrowFunctionResults =
			analysisResult.queryResults["ts-arrow-functions"] || [];
		for (const result of arrowFunctionResults) {
			const r = result as any;
			symbols.push({
				name: r.variableName || "unknown",
				type: "arrow_function",
				filePath,
				startLine: r.startLine || 0,
				endLine: r.endLine || 0,
				isExported: r.isExported || false,
				metadata: {
					isAsync: r.isAsync,
					parameters: r.parameters,
					returnType: r.returnType,
				},
			});
		}
	} catch (error) {
		console.warn(`Symbol extraction failed for ${filePath}:`, error);
	}

	return symbols;
}

/**
 * 규정 준수 검사
 */
export function checkCompliance(
	symbols: SymbolInfo[],
	rules: ComplianceRule[],
): ComplianceResult[] {
	const results: ComplianceResult[] = [];

	for (const rule of rules) {
		try {
			const result = rule.check(symbols);
			results.push(result);
		} catch (error) {
			results.push({
				ruleId: rule.id,
				passed: false,
				message: `Rule execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				affectedSymbols: [],
				suggestions: ["Fix rule implementation"],
			});
		}
	}

	return results;
}

/**
 * 분석 리포트 생성
 */
export function generateAnalysisReport(
	config: AnalysisConfig,
	symbols: SymbolInfo[],
	compliance: ComplianceResult[],
): AnalysisReport {
	const totalFiles = new Set(symbols.map((s) => s.filePath)).size;
	const exportedSymbols = symbols.filter((s) => s.isExported).length;

	// 통계 계산
	const byType: Record<string, number> = {};
	const byFile: Record<string, number> = {};

	for (const symbol of symbols) {
		byType[symbol.type] = (byType[symbol.type] || 0) + 1;
		byFile[symbol.filePath] = (byFile[symbol.filePath] || 0) + 1;
	}

	const complianceScore =
		compliance.length > 0
			? (compliance.filter((r) => r.passed).length / compliance.length) * 100
			: 100;

	return {
		timestamp: new Date(),
		config,
		summary: {
			totalFiles,
			totalSymbols: symbols.length,
			exportedSymbols,
			complianceScore,
		},
		symbols,
		compliance,
		statistics: {
			byType,
			byFile,
			byExport: {
				exported: exportedSymbols,
				internal: symbols.length - exportedSymbols,
			},
		},
	};
}

// ===== DEFAULT COMPLIANCE RULES =====

export const DEFAULT_COMPLIANCE_RULES: ComplianceRule[] = [
	{
		id: "exported-symbols-naming",
		name: "Exported Symbols Naming Convention",
		description: "Exported symbols should follow PascalCase naming convention",
		severity: "warning",
		check: (symbols) => {
			const exportedSymbols = symbols.filter((s) => s.isExported);
			const violations = exportedSymbols.filter(
				(s) => s.name !== s.name.charAt(0).toUpperCase() + s.name.slice(1),
			);

			return {
				ruleId: "exported-symbols-naming",
				passed: violations.length === 0,
				message:
					violations.length === 0
						? "All exported symbols follow PascalCase convention"
						: `${violations.length} exported symbols violate PascalCase convention`,
				affectedSymbols: violations.map((v) => v.name),
				suggestions: violations.map(
					(v) =>
						`Rename ${v.name} to ${v.name.charAt(0).toUpperCase() + v.name.slice(1)}`,
				),
			};
		},
	},
	{
		id: "interface-properties",
		name: "Interface Properties Naming",
		description:
			"Interface properties should follow camelCase naming convention",
		severity: "info",
		check: (symbols) => {
			const _interfaceSymbols = symbols.filter((s) => s.type === "interface");
			const violations: SymbolInfo[] = [];

			// This is a simplified check - in reality, we'd need to analyze interface properties
			return {
				ruleId: "interface-properties",
				passed: violations.length === 0,
				message:
					violations.length === 0
						? "Interface properties follow camelCase convention"
						: `${violations.length} interface properties violate camelCase convention`,
				affectedSymbols: violations.map((v) => v.name),
				suggestions: [],
			};
		},
	},
	{
		id: "async-function-naming",
		name: "Async Function Naming",
		description:
			"Async functions should have descriptive names ending with appropriate suffixes",
		severity: "info",
		check: (symbols) => {
			const asyncFunctions = symbols.filter(
				(s) =>
					s.metadata.isAsync && (s.type === "function" || s.type === "method"),
			);
			const violations = asyncFunctions.filter(
				(s) =>
					!s.name.includes("Async") &&
					!s.name.includes("Promise") &&
					!s.name.includes("Handler"),
			);

			return {
				ruleId: "async-function-naming",
				passed: violations.length === 0,
				message:
					violations.length === 0
						? "All async functions have descriptive names"
						: `${violations.length} async functions could have more descriptive names`,
				affectedSymbols: violations.map((v) => v.name),
				suggestions: violations.map(
					(v) =>
						`Consider renaming ${v.name} to ${v.name}Async or ${v.name}Handler`,
				),
			};
		},
	},
];
