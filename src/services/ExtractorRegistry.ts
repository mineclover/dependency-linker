/**
 * ExtractorRegistry service implementation
 * Manages registration and execution of data extraction plugins
 */

import type {
	AST,
	ExtractorOptions,
	IDataExtractor,
} from "../extractors/IDataExtractor";

export interface IExtractorRegistry {
	/**
	 * Registers a data extractor
	 */
	register<T>(name: string, extractor: IDataExtractor<T>): void;

	/**
	 * Unregisters a data extractor
	 */
	unregister(name: string): boolean;

	/**
	 * Gets a registered extractor
	 */
	getExtractor<T>(name: string): IDataExtractor<T> | undefined;

	/**
	 * Gets all registered extractors
	 */
	getAllExtractors(): Map<string, IDataExtractor<any>>;

	/**
	 * Gets extractors that support a specific language
	 */
	getExtractorsForLanguage(language: string): IDataExtractor<any>[];

	/**
	 * Executes all registered extractors on an AST
	 */
	executeAll(
		ast: any,
		filePath: string,
		language: string,
		options?: ExtractorOptions,
	): Record<string, any>;

	/**
	 * Executes specific extractors
	 */
	executeSelected(
		extractorNames: string[],
		ast: any,
		filePath: string,
		options?: ExtractorOptions,
	): Record<string, any>;

	/**
	 * Clears all registered extractors
	 */
	clear(): void;
}

export class ExtractorRegistry implements IExtractorRegistry {
	private extractors: Map<string, IDataExtractor<unknown>> = new Map();

	/**
	 * Registers a data extractor
	 */
	register<T>(name: string, extractor: IDataExtractor<T>): void {
		if (this.extractors.has(name)) {
			console.warn(`Extractor '${name}' is already registered. Overwriting.`);
		}
		this.extractors.set(name, extractor as IDataExtractor<unknown>);
	}

	/**
	 * Unregisters a data extractor
	 */
	unregister(name: string): boolean {
		const extractor = this.extractors.get(name);
		if (extractor) {
			extractor.dispose();
			return this.extractors.delete(name);
		}
		return false;
	}

	/**
	 * Gets a registered extractor
	 */
	getExtractor<T>(name: string): IDataExtractor<T> | undefined {
		return this.extractors.get(name) as IDataExtractor<T> | undefined;
	}

	/**
	 * Gets all registered extractors
	 */
	getAllExtractors(): Map<string, IDataExtractor<unknown>> {
		return new Map(this.extractors);
	}

	/**
	 * Gets extractors that support a specific language
	 */
	getExtractorsForLanguage(language: string): IDataExtractor<unknown>[] {
		return Array.from(this.extractors.values()).filter((extractor) =>
			extractor.supports(language),
		);
	}

	/**
	 * Executes all registered extractors on an AST
	 */
	executeAll(
		ast: AST,
		filePath: string,
		language: string,
		options?: ExtractorOptions,
	): Record<string, unknown> {
		const results: Record<string, unknown> = {};

		for (const [name, extractor] of this.extractors) {
			if (extractor.supports(language)) {
				try {
					const result = extractor.extract(ast, filePath, options);
					const validation = extractor.validate(result);

					if (validation.isValid) {
						results[name] = result;
					} else {
						console.warn(
							`Extractor '${name}' produced invalid data:`,
							validation.errors,
						);
						results[name] = null;
					}
				} catch (error) {
					console.error(`Error executing extractor '${name}':`, error);
					results[name] = null;
				}
			}
		}

		return results;
	}

	/**
	 * Executes specific extractors
	 */
	executeSelected(
		extractorNames: string[],
		ast: AST,
		filePath: string,
		options?: ExtractorOptions,
	): Record<string, unknown> {
		const results: Record<string, unknown> = {};

		for (const name of extractorNames) {
			const extractor = this.extractors.get(name);
			if (!extractor) {
				console.warn(`Extractor '${name}' not found`);
				results[name] = null;
				continue;
			}

			try {
				const result = extractor.extract(ast, filePath, options);
				const validation = extractor.validate(result);

				if (validation.isValid) {
					results[name] = result;
				} else {
					console.warn(
						`Extractor '${name}' produced invalid data:`,
						validation.errors,
					);
					results[name] = null;
				}
			} catch (error) {
				console.error(`Error executing extractor '${name}':`, error);
				results[name] = null;
			}
		}

		return results;
	}

	/**
	 * Clears all registered extractors
	 */
	clear(): void {
		// Dispose of all extractors first
		for (const extractor of this.extractors.values()) {
			extractor.dispose();
		}
		this.extractors.clear();
	}
}
