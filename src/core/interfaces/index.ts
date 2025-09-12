// Core service interfaces for dependency injection and modular architecture

// Core types for API layer
export {
	ParseOptions,
	ParseResult,
	ValidationResult,
} from "../types/ParseTypes";
export { IFileAnalyzer } from "./IFileAnalyzer";
export { IOutputFormatter } from "./IOutputFormatter";
export { ITypeScriptParser } from "./ITypeScriptParser";
