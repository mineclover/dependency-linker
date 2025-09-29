/**
 * Python Parser Module
 * Python 파싱 모듈 메인 익스포트
 */

export { PythonParser } from "./PythonParser";

// 편의 함수들
import PythonParser from "./PythonParser";

/**
 * Python 파서 인스턴스 생성
 */
export function createPythonParser(): PythonParser {
	return new PythonParser();
}

/**
 * Python 소스 코드 빠른 파싱
 */
export async function parsePython(sourceCode: string, filePath?: string) {
	const parser = new PythonParser();
	return parser.parse(sourceCode, { filePath });
}

/**
 * Python 파일 빠른 파싱
 */
export async function parsePythonFile(filePath: string) {
	const parser = new PythonParser();
	return parser.parseFile(filePath);
}
