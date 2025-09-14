/**
 * ParserRegistry service implementation
 * Manages registration and discovery of language parsers
 */

import type {
	ILanguageParser,
	IParserRegistry,
} from "../parsers/ILanguageParser";

export class ParserRegistry implements IParserRegistry {
	private parsers: Map<string, ILanguageParser> = new Map();

	/**
	 * Registers a language parser
	 */
	register(parser: ILanguageParser): void {
		const metadata = parser.getMetadata();

		// Register parser for each supported language
		for (const language of metadata.supportedLanguages) {
			if (this.parsers.has(language)) {
				console.warn(
					`Parser for language '${language}' is already registered. Overwriting.`,
				);
			}
			this.parsers.set(language, parser);
		}
	}

	/**
	 * Unregisters a language parser
	 */
	unregister(language: string): boolean {
		return this.parsers.delete(language);
	}

	/**
	 * Gets a parser for the specified language
	 */
	getParser(language: string): ILanguageParser | undefined {
		return this.parsers.get(language);
	}

	/**
	 * Gets all registered parsers
	 */
	getAllParsers(): Map<string, ILanguageParser> {
		return new Map(this.parsers);
	}

	/**
	 * Detects language and returns appropriate parser
	 */
	detectAndGetParser(
		filePath: string,
		content?: string,
	): ILanguageParser | undefined {
		// Try each parser's language detection
		for (const parser of this.parsers.values()) {
			const detectedLanguage = parser.detectLanguage(filePath, content);
			if (parser.supports(detectedLanguage)) {
				return parser;
			}
		}
		return undefined;
	}

	/**
	 * Gets supported languages
	 */
	getSupportedLanguages(): string[] {
		return Array.from(this.parsers.keys());
	}

	/**
	 * Checks if a language is supported
	 */
	isSupported(language: string): boolean {
		return this.parsers.has(language);
	}

	/**
	 * Clears all registered parsers
	 */
	clear(): void {
		// Dispose of all parsers first
		for (const parser of this.parsers.values()) {
			parser.dispose();
		}
		this.parsers.clear();
	}
}
