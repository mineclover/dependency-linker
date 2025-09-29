/**
 * Go Parser Module
 * Go 파싱 모듈 메인 익스포트
 */

export { GoParser } from "./GoParser";

// 편의 함수들
import GoParser from "./GoParser";

/**
 * Go 파서 인스턴스 생성
 */
export function createGoParser(): GoParser {
	return new GoParser();
}

/**
 * Go 소스 코드 빠른 파싱
 */
export async function parseGo(sourceCode: string, filePath?: string) {
	const parser = new GoParser();
	return parser.parse(sourceCode, { filePath });
}

/**
 * Go 파일 빠른 파싱
 */
export async function parseGoFile(filePath: string) {
	const parser = new GoParser();
	return parser.parseFile(filePath);
}
