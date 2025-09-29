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
	private parsers = new Map<SupportedLanguage, BaseParser>();
	private fileExtensionMap = new Map<string, SupportedLanguage>();

	constructor() {
		this.initializeParsers();
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
	 * 언어별 파서 생성
	 */
	createParser(language: SupportedLanguage): BaseParser {
		const parser = this.parsers.get(language);
		if (!parser) {
			throw new Error(`Parser for language "${language}" not found`);
		}
		return parser;
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
		return Array.from(this.parsers.keys());
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
	 * 언어별 파서 등록
	 */
	registerParser(language: SupportedLanguage, parser: BaseParser): void {
		this.parsers.set(language, parser);
		this.updateExtensionMap(language, parser);
	}

	/**
	 * 모든 파서 정보 조회
	 */
	getParserInfo(): Array<{
		language: SupportedLanguage;
		extensions: string[];
		parserClass: string;
	}> {
		return Array.from(this.parsers.entries()).map(([language, parser]) => ({
			language,
			extensions: parser.getSupportedExtensions(),
			parserClass: parser.constructor.name,
		}));
	}

	/**
	 * 파서 초기화
	 */
	private initializeParsers(): void {
		// TypeScript 파서
		this.parsers.set("typescript", new TypeScriptParser());

		// Java 파서
		this.parsers.set("java", new JavaParser());

		// Python 파서
		this.parsers.set("python", new PythonParser());

		// Go 파서
		this.parsers.set("go", new GoParser());

		// JavaScript는 TypeScript 파서 재사용
		this.parsers.set("javascript", new TypeScriptParser());
	}

	/**
	 * 파일 확장자 맵 구축
	 */
	private buildExtensionMap(): void {
		for (const [language, parser] of this.parsers) {
			this.updateExtensionMap(language, parser);
		}
	}

	/**
	 * 특정 파서의 확장자 맵 업데이트
	 */
	private updateExtensionMap(
		language: SupportedLanguage,
		parser: BaseParser,
	): void {
		const extensions = parser.getSupportedExtensions();
		for (const ext of extensions) {
			this.fileExtensionMap.set(ext, language);
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
