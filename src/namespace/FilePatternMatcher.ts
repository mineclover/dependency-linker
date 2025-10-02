import { glob } from "glob";
import type { NamespaceConfig } from "./types";

/**
 * File pattern matching utilities for namespace-based file filtering
 */
export class FilePatternMatcher {
	/**
	 * List files matching namespace patterns
	 */
	async listFiles(
		config: NamespaceConfig,
		cwd: string = process.cwd(),
	): Promise<string[]> {
		if (!config.filePatterns || config.filePatterns.length === 0) {
			return [];
		}

		const files = await glob(config.filePatterns, {
			cwd,
			ignore: config.excludePatterns || [],
			nodir: true,
			dot: false,
		});

		return files.sort();
	}

	/**
	 * Filter files by namespace patterns
	 */
	async filterFiles(
		files: string[],
		config: NamespaceConfig,
	): Promise<string[]> {
		if (!config.filePatterns || config.filePatterns.length === 0) {
			return [];
		}

		const matched: string[] = [];

		for (const file of files) {
			if (await this.matchesPattern(file, config)) {
				matched.push(file);
			}
		}

		return matched.sort();
	}

	/**
	 * Check if a file matches namespace patterns
	 */
	private async matchesPattern(
		file: string,
		config: NamespaceConfig,
	): Promise<boolean> {
		// Check include patterns
		let isMatch = false;
		for (const pattern of config.filePatterns || []) {
			const globResult = await glob(pattern, { nodir: true, dot: false });
			if (globResult.includes(file)) {
				isMatch = true;
				break;
			}
		}

		if (!isMatch) return false;

		// Check exclude patterns
		if (config.excludePatterns && config.excludePatterns.length > 0) {
			for (const pattern of config.excludePatterns) {
				const globResult = await glob(pattern, { nodir: true, dot: false });
				if (globResult.includes(file)) {
					return false;
				}
			}
		}

		return true;
	}
}

export const filePatternMatcher = new FilePatternMatcher();
