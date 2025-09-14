/**
 * FileAnalyzer service
 * High-level service for analyzing files using the new plugin architecture
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { AnalysisConfig } from "../models/AnalysisConfig";
import type { AnalysisResult } from "../models/AnalysisResult";
import { AnalysisEngine } from "./AnalysisEngine";

export interface FileAnalysisOptions {
	includeDependencies?: boolean;
	includeExports?: boolean;
	includeImports?: boolean;
	enableCaching?: boolean;
	cacheTimeout?: number;
}

export class FileAnalyzer {
	private analysisEngine: AnalysisEngine;

	constructor() {
		this.analysisEngine = new AnalysisEngine();
	}

	/**
	 * Analyze a single file
	 */
	async analyzeFile(
		filePath: string,
		options?: FileAnalysisOptions,
	): Promise<AnalysisResult> {
		const config: AnalysisConfig = {
			useCache: options?.enableCaching ?? true,
			cacheTtl: options?.cacheTimeout ?? 300000,
			extractors: [],
			interpreters: [],
		};

		// Configure extractors based on options
		if (options?.includeDependencies) {
			config.extractors!.push("dependency");
			config.interpreters!.push("dependency-analysis");
		}

		if (options?.includeExports) {
			config.extractors!.push("identifier"); // Includes exports
		}

		if (options?.includeImports) {
			config.extractors!.push("dependency"); // Includes imports
		}

		return this.analysisEngine.analyzeFile(filePath, config);
	}

	/**
	 * Analyze multiple files
	 */
	async analyzeFiles(
		filePaths: string[],
		options?: FileAnalysisOptions,
	): Promise<AnalysisResult[]> {
		const results = await Promise.all(
			filePaths.map((filePath) => this.analyzeFile(filePath, options)),
		);
		return results;
	}

	/**
	 * Analyze directory
	 */
	async analyzeDirectory(
		dirPath: string,
		options?: FileAnalysisOptions & { pattern?: string },
	): Promise<AnalysisResult[]> {
		const files = await this.findFiles(
			dirPath,
			options?.pattern || "**/*.{ts,tsx,js,jsx,go,java}",
		);
		return this.analyzeFiles(files, options);
	}

	/**
	 * Check if file is supported
	 */
	async isSupported(filePath: string): Promise<boolean> {
		const ext = path.extname(filePath).toLowerCase();
		const supportedExtensions = [".ts", ".tsx", ".js", ".jsx", ".go", ".java"];
		return supportedExtensions.includes(ext);
	}

	/**
	 * Get file analysis statistics
	 */
	async getStats(filePath: string): Promise<{
		fileSize: number;
		lineCount: number;
		language: string;
		supported: boolean;
	}> {
		const stats = await fs.stat(filePath);
		const content = await fs.readFile(filePath, "utf8");
		const lineCount = content.split("\n").length;
		const ext = path.extname(filePath).toLowerCase();

		const languageMap: Record<string, string> = {
			".ts": "typescript",
			".tsx": "typescript",
			".js": "javascript",
			".jsx": "javascript",
			".go": "go",
			".java": "java",
		};

		return {
			fileSize: stats.size,
			lineCount,
			language: languageMap[ext] || "unknown",
			supported: await this.isSupported(filePath),
		};
	}

	/**
	 * Find files matching pattern
	 */
	private async findFiles(dirPath: string, pattern: string): Promise<string[]> {
		// Simple implementation - could be enhanced with glob matching
		const files: string[] = [];

		async function walk(dir: string) {
			const entries = await fs.readdir(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory() && !entry.name.startsWith(".")) {
					await walk(fullPath);
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name).toLowerCase();
					if ([".ts", ".tsx", ".js", ".jsx", ".go", ".java"].includes(ext)) {
						files.push(fullPath);
					}
				}
			}
		}

		await walk(dirPath);
		return files;
	}

	/**
	 * Clear analysis cache
	 */
	async clearCache(): Promise<void> {
		this.analysisEngine.clearCache();
	}
}
