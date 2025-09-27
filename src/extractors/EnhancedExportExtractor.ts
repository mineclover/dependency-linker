/**
 * Enhanced Export Extractor - Modular and Optimized Version
 *
 * This file serves as a bridge between the legacy interface and the new modular implementation.
 * The actual implementation is now in the enhanced-export directory with improved architecture.
 */

import type Parser from "tree-sitter";
// Import the new modular implementation
import {
	type EnhancedExportExtractionResult,
	EnhancedExportExtractor as ModularEnhancedExportExtractor,
} from "./enhanced-export/index";
import type {
	AST,
	ExtractorConfiguration,
	ExtractorMetadata,
	IDataExtractor,
	OutputSchema,
	ValidationResult,
} from "./IDataExtractor.js";

// Legacy types for backward compatibility (re-exported from modular implementation)
export type {
	ClassExportInfo,
	ClassMethodInfo,
	ClassPropertyInfo,
	DeclarationType,
	EnhancedExportExtractionResult,
	ExportMethodInfo,
	ExportStatistics,
	ExportType,
	ParameterInfo,
	SourceLocation,
} from "./enhanced-export/index";

/**
 * Enhanced Export Extractor with modular architecture
 *
 * This class maintains the same interface as the original EnhancedExportExtractor
 * but delegates to the new modular implementation for better performance and maintainability.
 */
export class EnhancedExportExtractor
	implements IDataExtractor<EnhancedExportExtractionResult>
{
	readonly name = "EnhancedExportExtractor";
	readonly version = "3.0.0";
	readonly description =
		"Enhanced AST-based export extractor with optimized modular architecture";

	private modularExtractor: ModularEnhancedExportExtractor;

	constructor() {
		this.modularExtractor = new ModularEnhancedExportExtractor();
	}

	/**
	 * Extract exports from AST using the new modular implementation
	 */
	extractExports(
		ast: Parser.Tree,
		filePath: string,
	): EnhancedExportExtractionResult {
		return this.modularExtractor.extractExports(ast, filePath);
	}

	/**
	 * Legacy method for backward compatibility
	 */
	extract(ast: AST, filePath: string): EnhancedExportExtractionResult {
		// Convert AST to Parser.Tree if needed
		const tree = ast as Parser.Tree;
		return this.extractExports(tree, filePath);
	}

	/**
	 * Check if this extractor supports the given file
	 */
	supports(filePath: string): boolean {
		const ext = filePath.split(".").pop()?.toLowerCase();
		return ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx";
	}

	/**
	 * Get extractor metadata
	 */
	getMetadata(): ExtractorMetadata {
		return {
			name: this.name,
			version: this.version,
			description: this.description,
			author: "Dependency Linker",
			supportedLanguages: ["typescript", "javascript"],
			outputTypes: ["exports", "classes", "statistics"],
			dependencies: [],
			performance: {
				averageTimePerNode: 0.1,
				memoryUsage: "medium",
				timeComplexity: "linear",
				maxRecommendedFileSize: 1000000,
			},
		};
	}

	/**
	 * Get extractor name
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * Get extractor version
	 */
	getVersion(): string {
		return this.version;
	}

	/**
	 * Validate extraction result
	 */
	validate(result: EnhancedExportExtractionResult): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			// Basic validation
			if (!result || typeof result !== "object") {
				errors.push("Result is null or not an object");
			}

			if (!Array.isArray(result.exportMethods)) {
				errors.push("exportMethods must be an array");
			}

			if (!result.statistics || typeof result.statistics !== "object") {
				errors.push("statistics must be an object");
			}

			if (!Array.isArray(result.classes)) {
				errors.push("classes must be an array");
			}

			// Validate required fields in exports
			for (const exportInfo of result.exportMethods || []) {
				if (
					!exportInfo.name ||
					!exportInfo.exportType ||
					!exportInfo.declarationType ||
					!exportInfo.location
				) {
					errors.push(
						`Export missing required fields: ${exportInfo.name || "unnamed"}`,
					);
				}
			}

			return {
				isValid: errors.length === 0,
				errors,
				warnings,
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [
					`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
				],
				warnings,
			};
		}
	}

	/**
	 * Configure extractor (for future extensibility)
	 */
	configure(_options: ExtractorConfiguration): void {
		// Future: could pass configuration to modular extractor
	}

	/**
	 * Clear caches (useful for testing or memory management)
	 */
	clearCaches(): void {
		this.modularExtractor.clearCaches();
	}

	/**
	 * Get current configuration
	 */
	getConfiguration(): ExtractorConfiguration {
		return {
			enabled: true,
			priority: 1,
			timeout: 30000,
			memoryLimit: 100 * 1024 * 1024, // 100MB
			languages: ["typescript", "javascript"],
			errorHandling: "lenient",
			logLevel: "info",
		};
	}

	/**
	 * Get output schema for validation
	 */
	getOutputSchema(): OutputSchema {
		return {
			type: "object",
			version: "3.0.0",
			required: ["exportMethods", "statistics", "classes"],
			properties: {
				exportMethods: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							exportType: {
								type: "string",
								constraints: {
									enum: [
										"function",
										"class",
										"variable",
										"type",
										"enum",
										"default",
										"class_method",
										"class_property",
										"re_export",
									],
								},
							},
							declarationType: {
								type: "string",
								constraints: {
									enum: [
										"named_export",
										"default_export",
										"assignment_export",
										"class_member",
										"re_export",
									],
								},
							},
							location: {
								type: "object",
								properties: {
									line: { type: "number", constraints: { minimum: 1 } },
									column: { type: "number", constraints: { minimum: 1 } },
									endLine: { type: "number", constraints: { minimum: 1 } },
									endColumn: { type: "number", constraints: { minimum: 1 } },
								},
							},
							parentClass: { type: "string" },
							isAsync: { type: "boolean" },
							isStatic: { type: "boolean" },
							visibility: {
								type: "string",
								constraints: { enum: ["public", "private", "protected"] },
							},
							parameters: {
								type: "array",
								items: {
									type: "object",
									properties: {
										name: { type: "string" },
										type: { type: "string" },
										optional: { type: "boolean" },
										defaultValue: { type: "string" },
									},
								},
							},
							returnType: { type: "string" },
						},
					},
				},
				statistics: {
					type: "object",
					properties: {
						totalExports: { type: "number", constraints: { minimum: 0 } },
						functionExports: { type: "number", constraints: { minimum: 0 } },
						classExports: { type: "number", constraints: { minimum: 0 } },
						variableExports: { type: "number", constraints: { minimum: 0 } },
						typeExports: { type: "number", constraints: { minimum: 0 } },
						defaultExports: { type: "number", constraints: { minimum: 0 } },
						classMethodsExports: {
							type: "number",
							constraints: { minimum: 0 },
						},
						classPropertiesExports: {
							type: "number",
							constraints: { minimum: 0 },
						},
					},
				},
				classes: {
					type: "array",
					items: {
						type: "object",
						properties: {
							className: { type: "string" },
							location: {
								type: "object",
								properties: {
									line: { type: "number", constraints: { minimum: 1 } },
									column: { type: "number", constraints: { minimum: 1 } },
									endLine: { type: "number", constraints: { minimum: 1 } },
									endColumn: { type: "number", constraints: { minimum: 1 } },
								},
							},
							methods: { type: "array" },
							properties: { type: "array" },
							isDefaultExport: { type: "boolean" },
							superClass: { type: "string" },
							implementsInterfaces: {
								type: "array",
								items: { type: "string" },
							},
						},
					},
				},
			},
		};
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		this.modularExtractor.clearCaches();
	}
}
