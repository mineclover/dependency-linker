/**
 * TypeScript Parser Module
 * TypeScript/TSX 파싱 모듈 메인 익스포트
 */

export { TypeScriptParser } from "./TypeScriptParser";

// 편의 함수들
import TypeScriptParser from "./TypeScriptParser";

/**
 * TypeScript 파서 인스턴스 생성
 */
export function createTypeScriptParser(): TypeScriptParser {
	return new TypeScriptParser();
}

/**
 * TypeScript 소스 코드 빠른 파싱
 */
export async function parseTypeScript(sourceCode: string, filePath?: string) {
	const parser = new TypeScriptParser();
	return parser.parse(sourceCode, { filePath });
}

/**
 * TypeScript 파일 빠른 파싱
 */
export async function parseTypeScriptFile(filePath: string) {
	const parser = new TypeScriptParser();
	return parser.parseFile(filePath);
}
