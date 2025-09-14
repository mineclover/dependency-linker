/**
 * TypeScriptParser service compatibility export
 * Re-exports TypeScriptParser from parsers directory
 */

export {
	ASTVisitor,
	ILanguageParser,
	ParseError,
	ParseResult,
	ParserMetadata,
	ParserOptions,
	ParseWarning,
	SyntaxValidationResult,
} from "../parsers/ILanguageParser";
export { TypeScriptParser } from "../parsers/TypeScriptParser";
