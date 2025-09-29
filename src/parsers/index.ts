/**
 * Parsers Module
 * 모든 파서 모듈의 통합 익스포트
 */

// ===== BASE INTERFACES =====
export * from "./base";
export * from "./go";
export * from "./java";
// ===== PARSER FACTORY =====
export * from "./ParserFactory";
export {
	createParser,
	createParserForFile,
	getSupportedExtensions,
	getSupportedLanguages,
	globalParserFactory,
	isFileSupported,
	ParserFactory,
	parseCode,
	parseFile,
} from "./ParserFactory";
export * from "./python";
// ===== LANGUAGE PARSERS =====
export * from "./typescript";

// ===== CONVENIENCE EXPORTS =====
import {
	createParser,
	createParserForFile,
	getSupportedExtensions,
	getSupportedLanguages,
	globalParserFactory,
	isFileSupported,
	parseCode,
	parseFile,
} from "./ParserFactory";

export const Parsers = {
	// Factory methods
	createParser,
	createParserForFile,
	parseCode,
	parseFile,

	// Utility methods
	isFileSupported,
	getSupportedLanguages,
	getSupportedExtensions,

	// Global factory
	factory: globalParserFactory,
};

export default Parsers;
