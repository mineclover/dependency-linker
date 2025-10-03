/**
 * Parser Manager - 실제 사용 시나리오를 위한 파서 관리
 * 하나의 인스턴스로 여러 파일을 효율적으로 처리
 */

import type { SupportedLanguage } from "../core/types";
import type { BaseParser, ParseResult, ParserOptions } from "./base";
import { GoParser } from "./go";
import { JavaParser } from "./java";
import { PythonParser } from "./python";
import { TypeScriptParser } from "./typescript";

/**
 * 파서 매니저 - 언어별 파서 인스턴스를 재사용하여 효율적인 다중 파일 처리
 */
export class ParserManager {
	private parsers = new Map<SupportedLanguage, BaseParser>();
	private stats = new Map<
		SupportedLanguage,
		{
			filesProcessed: number;
			totalParseTime: number;
			lastUsed: Date;
		}
	>();

	constructor() {
		this.initializeStats();
	}

	/**
	 * 언어별 파서 가져오기 (지연 초기화)
	 */
	private getParser(language: SupportedLanguage): BaseParser {
		if (!this.parsers.has(language)) {
			const parser = this.createParserInstance(language);
			this.parsers.set(language, parser);
			console.log(`🔧 Created new ${language} parser instance`);
		}

		// 통계 업데이트
		const stats = this.stats.get(language);
		if (stats) {
			stats.lastUsed = new Date();
		}

		const parser = this.parsers.get(language);
		if (!parser) {
			throw new Error(`Parser not found for language: ${language}`);
		}
		return parser;
	}

	/**
	 * 파서 인스턴스 생성
	 */
	private createParserInstance(language: SupportedLanguage): BaseParser {
		switch (language) {
			case "typescript":
			case "tsx":
			case "javascript":
			case "jsx":
				return new TypeScriptParser();
			case "java":
				return new JavaParser();
			case "python":
				return new PythonParser();
			case "go":
				return new GoParser();
			default:
				throw new Error(`Unsupported language: ${language}`);
		}
	}

	/**
	 * 다중 파일 분석 (배치 처리)
	 */
	async analyzeFiles(
		files: Array<{
			content: string;
			language: SupportedLanguage;
			filePath?: string;
			options?: ParserOptions;
		}>,
	): Promise<
		Array<{
			file: string;
			language: SupportedLanguage;
			result: ParseResult;
			parseTime: number;
		}>
	> {
		const results = [];

		for (const file of files) {
			const startTime = performance.now();
			const parser = this.getParser(file.language);

			try {
				const result = await parser.parse(file.content, {
					filePath:
						file.filePath ||
						`unknown.${this.getDefaultExtension(file.language)}`,
					...file.options,
				});

				const parseTime = performance.now() - startTime;

				// 통계 업데이트
				const stats = this.stats.get(file.language);
				if (stats) {
					stats.filesProcessed++;
					stats.totalParseTime += parseTime;
				}

				results.push({
					file: file.filePath || `file-${results.length + 1}`,
					language: file.language,
					result,
					parseTime,
				});
			} catch (error) {
				console.error(
					`❌ Failed to parse ${file.filePath} (${file.language}):`,
					error,
				);
				throw error;
			}
		}

		return results;
	}

	/**
	 * 단일 파일 분석
	 */
	async analyzeFile(
		content: string,
		language: SupportedLanguage,
		filePath?: string,
		options?: ParserOptions,
	): Promise<ParseResult> {
		const parser = this.getParser(language);
		const startTime = performance.now();

		const result = await parser.parse(content, {
			filePath: filePath || `unknown.${this.getDefaultExtension(language)}`,
			...options,
		});

		const parseTime = performance.now() - startTime;

		// 통계 업데이트
		const stats = this.stats.get(language);
		if (stats) {
			stats.filesProcessed++;
			stats.totalParseTime += parseTime;
		}

		return result;
	}

	/**
	 * 프로젝트 전체 분석 (디렉토리 기반)
	 */
	async analyzeProject(
		projectFiles: Array<{
			path: string;
			content: string;
			language: SupportedLanguage;
		}>,
	): Promise<{
		results: Array<{ file: string; result: ParseResult; parseTime: number }>;
		summary: {
			totalFiles: number;
			totalParseTime: number;
			languageBreakdown: Record<
				SupportedLanguage,
				{ count: number; avgTime: number }
			>;
		};
	}> {
		const allResults = await this.analyzeFiles(
			projectFiles.map((file) => ({
				content: file.content,
				language: file.language,
				filePath: file.path,
			})),
		);

		// 요약 통계 생성
		const languageBreakdown: Record<
			string,
			{ count: number; totalTime: number }
		> = {};
		let totalParseTime = 0;

		allResults.forEach((result) => {
			const lang = result.language;
			if (!languageBreakdown[lang]) {
				languageBreakdown[lang] = { count: 0, totalTime: 0 };
			}
			languageBreakdown[lang].count++;
			languageBreakdown[lang].totalTime += result.parseTime;
			totalParseTime += result.parseTime;
		});

		const summary = {
			totalFiles: allResults.length,
			totalParseTime,
			languageBreakdown: Object.entries(languageBreakdown).reduce(
				(acc, [lang, data]) => {
					acc[lang as SupportedLanguage] = {
						count: data.count,
						avgTime: data.totalTime / data.count,
					};
					return acc;
				},
				{} as Record<SupportedLanguage, { count: number; avgTime: number }>,
			),
		};

		return {
			results: allResults.map((r) => ({
				file: r.file,
				result: r.result,
				parseTime: r.parseTime,
			})),
			summary,
		};
	}

	/**
	 * 파서 통계 정보
	 */
	getStats(): Record<
		SupportedLanguage,
		{
			filesProcessed: number;
			totalParseTime: number;
			avgParseTime: number;
			lastUsed: Date;
			isActive: boolean;
		}
	> {
		const result: any = {};

		for (const [language, stats] of this.stats.entries()) {
			result[language] = {
				filesProcessed: stats.filesProcessed,
				totalParseTime: stats.totalParseTime,
				avgParseTime:
					stats.filesProcessed > 0
						? stats.totalParseTime / stats.filesProcessed
						: 0,
				lastUsed: stats.lastUsed,
				isActive: this.parsers.has(language),
			};
		}

		return result;
	}

	/**
	 * 메모리 정리 (사용하지 않는 파서 제거)
	 */
	cleanup(maxIdleTime: number = 300000): void {
		// 5분 기본값
		const now = new Date();
		const toRemove: SupportedLanguage[] = [];

		for (const [language, stats] of this.stats.entries()) {
			const idleTime = now.getTime() - stats.lastUsed.getTime();
			if (idleTime > maxIdleTime && this.parsers.has(language)) {
				toRemove.push(language);
			}
		}

		toRemove.forEach((language) => {
			this.parsers.delete(language);
			console.log(`🧹 Cleaned up idle ${language} parser`);
		});
	}

	/**
	 * 파서 캐시 클리어 (테스트 격리용)
	 */
	clearCache(): void {
		// 모든 파서의 내부 캐시 클리어
		for (const parser of this.parsers.values()) {
			parser.clearCache();
		}
		console.log("🧹 Parser cache cleared");
	}

	/**
	 * 특정 언어 파서 리셋
	 */
	resetParser(language: SupportedLanguage): void {
		const parser = this.parsers.get(language);
		if (parser) {
			parser.clearCache();
		}
		this.parsers.delete(language);
		console.log(`🧹 Reset ${language} parser`);
	}

	/**
	 * 리소스 정리
	 */
	dispose(): void {
		this.parsers.clear();
		this.stats.clear();
		console.log("🧹 ParserManager disposed");
	}

	private initializeStats(): void {
		const languages: SupportedLanguage[] = [
			"typescript",
			"tsx",
			"javascript",
			"jsx",
			"java",
			"python",
			"go",
		];
		languages.forEach((lang) => {
			this.stats.set(lang, {
				filesProcessed: 0,
				totalParseTime: 0,
				lastUsed: new Date(),
			});
		});
	}

	private getDefaultExtension(language: SupportedLanguage): string {
		switch (language) {
			case "typescript":
				return "ts";
			case "tsx":
				return "tsx";
			case "javascript":
				return "js";
			case "jsx":
				return "jsx";
			case "java":
				return "java";
			case "python":
				return "py";
			case "go":
				return "go";
			default:
				return "txt";
		}
	}
}

/**
 * 전역 파서 매니저 인스턴스 (실제 사용용)
 */
export const globalParserManager = new ParserManager();
