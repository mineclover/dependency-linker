/**
 * JavaScriptParser implementation
 * Specialized TypeScript parser configured for JavaScript files
 */

import type { ParserOptions } from "./ILanguageParser";
import { TypeScriptParser } from "./TypeScriptParser";

export class JavaScriptParser extends TypeScriptParser {
	constructor(options: ParserOptions = {}) {
		super({
			language: "javascript",
			...options,
		});
	}

	/**
	 * Checks if this parser supports the given language
	 */
	override supports(language: string): boolean {
		return ["javascript", "js", "jsx"].includes(language.toLowerCase());
	}

	/**
	 * Detects the language from file path and/or content
	 */
	override detectLanguage(filePath: string, content?: string): string {
		const result = super.detectLanguage(filePath, content);

		// Override TypeScript detection for JavaScript files
		if (result === "typescript") {
			return "javascript";
		}
		if (result === "tsx") {
			return "jsx";
		}

		return result;
	}

	/**
	 * Gets parser metadata
	 */
	override getMetadata() {
		const metadata = super.getMetadata();
		return {
			...metadata,
			name: "JavaScriptParser",
			supportedLanguages: ["javascript", "js", "jsx"],
			supportedExtensions: [".js", ".jsx", ".mjs", ".cjs"],
		};
	}
}
