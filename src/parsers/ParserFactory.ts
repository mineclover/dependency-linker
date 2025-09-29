/**
 * Parser Factory
 * 언어별 파서를 생성하고 관리하는 팩토리 클래스
 */

import type { SupportedLanguage } from "../core/types";
import type { BaseParser, ParserFactory as IParserFactory } from "./base";
import { GoParser } from "./go";
import { JavaParser } from "./java";
import { PythonParser } from "./python";
import { TypeScriptParser } from "./typescript";

/**
 * 통합 파서 팩토리
 */
export class ParserFactory implements IParserFactory {
	private static instance: ParserFactory;
	private fileExtensionMap = new Map<string, SupportedLanguage>();

	constructor() {
		this.buildExtensionMap();
	}

	/**
	 * 싱글톤 인스턴스 가져오기
	 */
	static getInstance(): ParserFactory {
		if (!ParserFactory.instance) {
			ParserFactory.instance = new ParserFactory();
		}
		return ParserFactory.instance;
	}

	/**
	 * 언어별 파서 생성 (항상 새 인스턴스 생성)
	 */
	createParser(language: SupportedLanguage): BaseParser {
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
				throw new Error(`Parser for language "${language}" not found`);
		}
	}

	/**
	 * 파일 경로로 파서 자동 선택
	 */
	createParserForFile(filePath: string): BaseParser | null {
		const extension = this.extractFileExtension(filePath);
		const language = this.fileExtensionMap.get(extension);

		if (!language) {
			return null;
		}

		return this.createParser(language);
	}

	/**
	 * 지원되는 언어 목록
	 */
	getSupportedLanguages(): SupportedLanguage[] {
		return ["typescript", "tsx", "javascript", "jsx", "java", "python", "go"];
	}

	/**
	 * 지원되는 파일 확장자 목록
	 */
	getSupportedExtensions(): string[] {
		return Array.from(this.fileExtensionMap.keys());
	}

	/**
	 * 파일이 지원되는지 확인
	 */
	isFileSupported(filePath: string): boolean {
		const extension = this.extractFileExtension(filePath);
		return this.fileExtensionMap.has(extension);
	}

	/**
	 * 모든 파서 정보 조회
	 */
	getParserInfo(): Array<{
		language: SupportedLanguage;
		extensions: string[];
		parserClass: string;
	}> {
		const languages: SupportedLanguage[] = [
			"typescript",
			"java",
			"python",
			"go",
			"javascript",
		];
		return languages.map((language) => {
			const parser = this.createParser(language);
			return {
				language,
				extensions: parser.getSupportedExtensions(),
				parserClass: parser.constructor.name,
			};
		});
	}

	/**
	 * 파일 확장자 맵 구축
	 */
	private buildExtensionMap(): void {
		const languageExtensions: Record<SupportedLanguage, string[]> = {
			typescript: ["ts", "tsx"],
			tsx: ["tsx"],
			javascript: ["js", "jsx"],
			jsx: ["jsx"],
			java: ["java"],
			python: ["py", "pyi"],
			go: ["go"],
		};

		for (const [language, extensions] of Object.entries(languageExtensions)) {
			for (const ext of extensions) {
				this.fileExtensionMap.set(ext, language as SupportedLanguage);
			}
		}
	}

	/**
	 * 파일 확장자 추출
	 */
	private extractFileExtension(filePath: string): string {
		const match = filePath.match(/\.([^.]+)$/);
		return match ? match[1].toLowerCase() : "";
	}
}

/**
 * 전역 파서 팩토리 인스턴스
 */
export const globalParserFactory = ParserFactory.getInstance();

/**
 * 편의 함수들
 */

/**
 * 언어별 파서 생성
 */
export function createParser(language: SupportedLanguage): BaseParser {
	return globalParserFactory.createParser(language);
}

/**
 * 파일 경로로 파서 자동 선택
 */
export function createParserForFile(filePath: string): BaseParser | null {
	return globalParserFactory.createParserForFile(filePath);
}

/**
 * 파일이 지원되는지 확인
 */
export function isFileSupported(filePath: string): boolean {
	return globalParserFactory.isFileSupported(filePath);
}

/**
 * 지원되는 언어 목록
 */
export function getSupportedLanguages(): SupportedLanguage[] {
	return globalParserFactory.getSupportedLanguages();
}

/**
 * 지원되는 파일 확장자 목록
 */
export function getSupportedExtensions(): string[] {
	return globalParserFactory.getSupportedExtensions();
}

/**
 * 통합 파싱 함수 - 소스 코드
 */
export async function parseCode(
	sourceCode: string,
	language: SupportedLanguage,
	filePath?: string,
) {
	const parser = createParser(language);
	return parser.parse(sourceCode, { filePath });
}

/**
 * 통합 파싱 함수 - 파일
 */
export async function parseFile(filePath: string) {
	const parser = createParserForFile(filePath);
	if (!parser) {
		throw new Error(`No parser available for file: ${filePath}`);
	}
	return parser.parseFile(filePath);
}

export default ParserFactory;
