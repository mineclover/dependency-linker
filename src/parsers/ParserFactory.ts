/**
 * ParserFactory implementation
 * Factory for creating language-specific parsers
 */

import { GoParser } from "./GoParser";
import type {
	ILanguageParser,
	IParserFactory,
	ParserOptions,
} from "./ILanguageParser";
import { JavaParser } from "./JavaParser";
import { JavaScriptParser } from "./JavaScriptParser";
import { TypeScriptParser } from "./TypeScriptParser";

export class ParserFactory implements IParserFactory {
	private static readonly LANGUAGE_PARSER_MAP: Record<
		string,
		new (
			options?: ParserOptions,
		) => ILanguageParser
	> = {
		typescript: TypeScriptParser,
		ts: TypeScriptParser,
		tsx: TypeScriptParser,
		javascript: JavaScriptParser,
		js: JavaScriptParser,
		jsx: JavaScriptParser,
		go: GoParser,
		golang: GoParser,
		java: JavaParser,
	};

	/**
	 * Creates a parser for the specified language
	 */
	createParser(
		language: string,
		options?: ParserOptions,
	): ILanguageParser | undefined {
		const normalizedLanguage = language.toLowerCase();
		const ParserClass = ParserFactory.LANGUAGE_PARSER_MAP[normalizedLanguage];

		if (!ParserClass) {
			return undefined;
		}

		try {
			return new ParserClass(options);
		} catch (error) {
			console.error(
				`Failed to create parser for language '${language}':`,
				error,
			);
			return undefined;
		}
	}

	/**
	 * Gets available parser types
	 */
	getAvailableLanguages(): string[] {
		return Object.keys(ParserFactory.LANGUAGE_PARSER_MAP);
	}

	/**
	 * Checks if a language can be parsed
	 */
	canParse(language: string): boolean {
		const normalizedLanguage = language.toLowerCase();
		return normalizedLanguage in ParserFactory.LANGUAGE_PARSER_MAP;
	}

	/**
	 * Creates a parser from file extension
	 */
	createParserFromExtension(
		extension: string,
		options?: ParserOptions,
	): ILanguageParser | undefined {
		const language = this.mapExtensionToLanguage(extension);
		return language ? this.createParser(language, options) : undefined;
	}

	/**
	 * Creates multiple parsers for different languages
	 */
	createParsers(
		languages: string[],
		options?: ParserOptions,
	): Map<string, ILanguageParser> {
		const parsers = new Map<string, ILanguageParser>();

		for (const language of languages) {
			const parser = this.createParser(language, options);
			if (parser) {
				parsers.set(language, parser);
			}
		}

		return parsers;
	}

	/**
	 * Creates all available parsers
	 */
	createAllParsers(options?: ParserOptions): Map<string, ILanguageParser> {
		return this.createParsers(this.getAvailableLanguages(), options);
	}

	/**
	 * Gets parser metadata for a language
	 */
	getParserMetadata(language: string): any {
		const parser = this.createParser(language);
		if (parser) {
			const metadata = parser.getMetadata();
			parser.dispose();
			return metadata;
		}
		return undefined;
	}

	/**
	 * Validates parser configuration
	 */
	validateConfiguration(
		language: string,
		options: ParserOptions,
	): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.canParse(language)) {
			errors.push(`Unsupported language: ${language}`);
		}

		if (options.maxFileSize && options.maxFileSize < 0) {
			errors.push("maxFileSize must be positive");
		}

		if (options.memoryLimit && options.memoryLimit < 0) {
			errors.push("memoryLimit must be positive");
		}

		if (options.timeout && options.timeout < 0) {
			errors.push("timeout must be positive");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	private mapExtensionToLanguage(extension: string): string | undefined {
		const normalized = extension.toLowerCase().replace(/^\./, "");

		const extensionMap: Record<string, string> = {
			ts: "typescript",
			tsx: "typescript",
			js: "javascript",
			jsx: "javascript",
			mjs: "javascript",
			cjs: "javascript",
			go: "go",
			java: "java",
		};

		return extensionMap[normalized];
	}
}
