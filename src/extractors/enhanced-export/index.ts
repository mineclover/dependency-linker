import type Parser from "tree-sitter";
// Analyzers
import {
	ClassAnalyzer,
	LocationAnalyzer,
	ParameterAnalyzer,
} from "./analyzers/index";
// Processors
import {
	ClassProcessor,
	DefaultProcessor,
	FunctionProcessor,
	type NodeProcessor,
	type ProcessingContext,
	TypeProcessor,
	VariableProcessor,
} from "./processors/index";
// Types
import type {
	ClassExportInfo,
	EnhancedExportExtractionResult,
	ExportMethodInfo,
	ExportStatistics,
} from "./types/result-types";
// Utilities
import {
	findAllExports,
	findNodesByTypes,
	LRUCache,
	memoize,
	parseNamedExports,
} from "./utils/index";

// Validators
import { ExportValidator } from "./validators/index";

/**
 * Enhanced Export Extractor with modular architecture and optimized performance
 */
export class EnhancedExportExtractor {
	private readonly processors: Map<string, NodeProcessor>;
	private readonly validator: ExportValidator;
	private readonly cache: LRUCache<string, any>;

	// Memoized methods for performance
	private memoizedExtractExports: typeof this.extractExports | undefined;
	private memoizedBuildStatistics: typeof this.buildStatistics | undefined;

	constructor() {
		this.processors = new Map();
		this.classAnalyzer = new ClassAnalyzer();
		this.parameterAnalyzer = new ParameterAnalyzer();
		this.locationAnalyzer = new LocationAnalyzer();
		this.validator = new ExportValidator();
		this.cache = new LRUCache<string, any>(100);

		this.initializeProcessors();
		this.initializeMemoizedMethods();
	}

	/**
	 * Extract exports from AST
	 * @param ast Parsed AST tree
	 * @param filePath File path being analyzed
	 * @returns Enhanced export extraction result
	 */
	extractExports(
		ast: Parser.Tree,
		filePath: string,
	): EnhancedExportExtractionResult {
		const sourceCode = ast.rootNode.text;
		this.locationAnalyzer = new LocationAnalyzer(sourceCode);

		// Create processing context
		const context: ProcessingContext = {
			sourceCode,
			filePath,
			isWithinExport: false,
			cache: new Map<string, any>(),
		};

		// Extract all exports using processors
		const exports = this.processExports(ast.rootNode, context);

		// Build detailed class information
		const classes = this.extractClassInformation(exports, context);

		// Generate statistics
		const statistics = this.buildStatistics(exports);

		const result: EnhancedExportExtractionResult = {
			exportMethods: exports,
			statistics,
			classes,
		};

		// Validate result
		const validation = this.validator.validate(result);
		if (!validation.isValid) {
			console.warn(
				`Export extraction validation failed for ${filePath}:`,
				validation.errors,
			);
		}

		return result;
	}

	/**
	 * Process exports using the processor architecture
	 */
	private processExports(
		rootNode: Parser.SyntaxNode,
		context: ProcessingContext,
	): ExportMethodInfo[] {
		const exports: ExportMethodInfo[] = [];

		// Find all potential export nodes efficiently
		const exportNodes = this.findExportNodes(rootNode);

		for (const node of exportNodes) {
			const processor = this.getProcessorForNode(node);
			if (processor) {
				// Update context for export processing
				const exportContext: ProcessingContext = {
					...context,
					isWithinExport: true,
				};

				const nodeExports = processor.process(node, exportContext);
				exports.push(...nodeExports);
			}
		}

		// Supplement with text-based pattern matching for missed exports
		const supplementaryExports = this.supplementWithTextMatching(
			context.sourceCode,
			exports,
		);
		exports.push(...supplementaryExports);

		// Remove duplicates and validate
		return this.deduplicateExports(exports);
	}

	/**
	 * Find all nodes that might contain exports
	 */
	private findExportNodes(rootNode: Parser.SyntaxNode): Parser.SyntaxNode[] {
		const exportNodeTypes = new Set([
			"export_statement",
			"function_declaration",
			"class_declaration",
			"abstract_class_declaration", // Add abstract class support
			"variable_declaration",
			"lexical_declaration",
			"interface_declaration",
			"type_alias_declaration",
			"enum_declaration",
		]);

		const allNodes = findNodesByTypes(rootNode, exportNodeTypes);

		// Filter logic to prevent duplicate processing while allowing legitimate exports
		return allNodes.filter((node) => {
			if (node.type === "export_statement") {
				return true; // Always include export statements
			}

			// For declaration nodes, only include them if they're actually exported
			// Either by being a child of export_statement or having export keywords
			let parent = node.parent;
			let isExported = false;

			while (parent) {
				if (parent.type === "export_statement") {
					const exportText = parent.text;
					if (exportText.includes("export default")) {
						// Skip - default exports are handled by DefaultProcessor
						return false;
					} else {
						// This is a named export statement like "export class MyClass"
						// Allow it to be processed by the specific processor
						isExported = true;
						break;
					}
				}
				parent = parent.parent;
			}

			// Also check if this node itself contains export keywords (standalone exports)
			if (!isExported) {
				// Check if this is a top-level declaration that might be exported
				// by looking at preceding siblings for export keywords
				const parentNode = node.parent;
				if (parentNode && parentNode.type === "program") {
					// This is a top-level declaration, but only include if it's actually exported
					// For now, we'll be conservative and not include standalone declarations
					// unless they're clearly within export statements
					return false;
				}
			}

			return isExported;
		});
	}

	/**
	 * Get appropriate processor for a node
	 */
	private getProcessorForNode(
		node: Parser.SyntaxNode,
	): NodeProcessor | undefined {
		for (const processor of this.processors.values()) {
			if (processor.canProcess(node)) {
				return processor;
			}
		}
		return undefined;
	}

	/**
	 * Supplement AST-based extraction with text pattern matching
	 */
	private supplementWithTextMatching(
		sourceCode: string,
		existingExports: ExportMethodInfo[],
	): ExportMethodInfo[] {
		const supplementaryExports: ExportMethodInfo[] = [];
		const existingNames = new Set(existingExports.map((e) => e.name));

		// Handle named re-exports: export { ... } from '...'
		const namedReExportPattern =
			/export\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"]/g;
		let match;
		while ((match = namedReExportPattern.exec(sourceCode)) !== null) {
			const specifiers = match[1];
			const _moduleName = match[2];

			// Parse the specifiers (e.g., "UserService, ApiService" or "default as DefaultLogger")
			const specifierList = specifiers.split(",").map((s) => s.trim());

			for (const specifier of specifierList) {
				let exportName;

				// Handle "name as alias" pattern
				const aliasMatch = specifier.match(/^(.+)\s+as\s+(.+)$/);
				if (aliasMatch) {
					exportName = aliasMatch[2].trim();
				} else {
					exportName = specifier.trim();
				}

				if (!existingNames.has(exportName)) {
					supplementaryExports.push({
						name: exportName,
						exportType: "re_export",
						declarationType: "re_export",
						location: {
							line: this.getLineFromIndex(sourceCode, match.index),
							column: this.getColumnFromIndex(sourceCode, match.index),
						},
					});
					// Add to existingNames to prevent duplicates from TextMatcher
					existingNames.add(exportName);
				}
			}
		}

		// Handle export * patterns
		const exportStarPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
		while ((match = exportStarPattern.exec(sourceCode)) !== null) {
			const moduleName = match[1];
			const exportName = `* from ${moduleName}`;

			if (!existingNames.has(exportName)) {
				supplementaryExports.push({
					name: exportName,
					exportType: "re_export",
					declarationType: "re_export",
					location: {
						line: this.getLineFromIndex(sourceCode, match.index),
						column: this.getColumnFromIndex(sourceCode, match.index),
					},
				});
				// Add to existingNames to prevent duplicates
				existingNames.add(exportName);
			}
		}

		// Use original text matcher for other exports (non-re-exports)
		const textMatches = findAllExports(sourceCode);
		for (const textMatch of textMatches) {
			if (textMatch.type === "named") {
				const namedExports = parseNamedExports(textMatch.groups[0] || "");

				// Only process if this is NOT a re-export (no 'from' in the match)
				const matchText = sourceCode.substring(
					textMatch.startIndex,
					textMatch.endIndex,
				);
				const isReExport =
					matchText.includes(" from ") || /from\s+['"]/.test(matchText);

				if (!isReExport) {
					for (const namedExport of namedExports) {
						const exportName = namedExport.alias || namedExport.name;
						if (!existingNames.has(exportName)) {
							supplementaryExports.push({
								name: exportName,
								exportType: "variable",
								declarationType: "named_export",
								location: {
									line: this.getLineFromIndex(sourceCode, textMatch.startIndex),
									column: this.getColumnFromIndex(
										sourceCode,
										textMatch.startIndex,
									),
								},
							});
						}
					}
				}
			}
		}

		return supplementaryExports;
	}

	/**
	 * Remove duplicate exports
	 */
	private deduplicateExports(exports: ExportMethodInfo[]): ExportMethodInfo[] {
		const seen = new Set<string>();
		const unique: ExportMethodInfo[] = [];

		for (const exportInfo of exports) {
			const key = `${exportInfo.name}:${exportInfo.exportType}:${exportInfo.parentClass || ""}`;
			if (!seen.has(key)) {
				seen.add(key);
				unique.push(exportInfo);
			}
		}

		return unique;
	}

	/**
	 * Extract detailed class information
	 */
	private extractClassInformation(
		exports: ExportMethodInfo[],
		_context: ProcessingContext,
	): ClassExportInfo[] {
		const classExports = exports.filter((e) => e.exportType === "class");
		const classes: ClassExportInfo[] = [];

		// This would require access to the original AST nodes
		// For now, we'll build from the export information
		const classGroups = new Map<string, ExportMethodInfo[]>();

		// Group class members by parent class
		for (const exportInfo of exports) {
			if (exportInfo.parentClass) {
				if (!classGroups.has(exportInfo.parentClass)) {
					classGroups.set(exportInfo.parentClass, []);
				}
				classGroups.get(exportInfo.parentClass)?.push(exportInfo);
			}
		}

		// Build class information
		for (const classExport of classExports) {
			const members = classGroups.get(classExport.name) || [];
			const methods = members
				.filter((m) => m.exportType === "class_method")
				.map((m) => ({
					name: m.name,
					isStatic: m.isStatic || false,
					isAsync: m.isAsync || false,
					visibility: m.visibility || "public",
					parameters: m.parameters || [],
					returnType: m.returnType,
					location: m.location,
				}));

			const properties = members
				.filter((m) => m.exportType === "class_property")
				.map((m) => ({
					name: m.name,
					isStatic: m.isStatic || false,
					visibility: m.visibility || "public",
					type: m.returnType, // Using returnType as property type
					location: m.location,
				}));

			classes.push({
				className: classExport.name,
				location: classExport.location,
				methods,
				properties,
				isDefaultExport: classExport.declarationType === "default_export",
				superClass: classExport.superClass, // Add superClass property
			});
		}

		return classes;
	}

	/**
	 * Build export statistics
	 */
	private buildStatistics(exports: ExportMethodInfo[]): ExportStatistics {
		const stats: ExportStatistics = {
			totalExports: exports.length,
			functionExports: 0,
			classExports: 0,
			variableExports: 0,
			typeExports: 0,
			defaultExports: 0,
			classMethodsExports: 0,
			classPropertiesExports: 0,
		};

		for (const exportInfo of exports) {
			switch (exportInfo.exportType) {
				case "function":
					stats.functionExports++;
					break;
				case "class":
					stats.classExports++;
					break;
				case "variable":
					stats.variableExports++;
					break;
				case "type":
				case "enum":
					stats.typeExports++;
					break;
				case "default":
					stats.defaultExports++;
					break;
				case "class_method":
					stats.classMethodsExports++;
					break;
				case "class_property":
					stats.classPropertiesExports++;
					break;
			}

			// Count default exports by declaration type (only if not already counted by exportType)
			if (
				exportInfo.declarationType === "default_export" &&
				exportInfo.exportType !== "default"
			) {
				stats.defaultExports++;
			}
		}

		return stats;
	}

	/**
	 * Initialize processors
	 */
	private initializeProcessors(): void {
		// DefaultProcessor should come first to handle default exports correctly
		this.processors.set("default", new DefaultProcessor());
		this.processors.set("function", new FunctionProcessor());
		this.processors.set("class", new ClassProcessor());
		this.processors.set("variable", new VariableProcessor());
		this.processors.set("type", new TypeProcessor());
	}

	/**
	 * Initialize memoized methods
	 */
	private initializeMemoizedMethods(): void {
		this.memoizedExtractExports = memoize(
			this.extractExports.bind(this),
			(ast, filePath) => `${filePath}:${ast.rootNode.toString()}`,
		);

		this.memoizedBuildStatistics = memoize(
			this.buildStatistics.bind(this),
			(exports) =>
				JSON.stringify(
					exports.map((e) => ({ name: e.name, type: e.exportType })),
				),
		);
	}

	/**
	 * Get line number from character index
	 */
	private getLineFromIndex(sourceCode: string, index: number): number {
		return sourceCode.substring(0, index).split("\n").length;
	}

	/**
	 * Get column number from character index
	 */
	private getColumnFromIndex(sourceCode: string, index: number): number {
		const lines = sourceCode.substring(0, index).split("\n");
		return lines[lines.length - 1].length + 1;
	}

	/**
	 * Clear caches (useful for testing or memory management)
	 */
	clearCaches(): void {
		this.cache.clear();
		// Clear memoized function caches
		(this.memoizedExtractExports as any).clearCache?.();
		(this.memoizedBuildStatistics as any).clearCache?.();
	}
}

export * from "./analyzers/index";
export * from "./processors/index";
// Export all types and utilities for external use
export * from "./types/index";
export * from "./utils/index";
export * from "./validators/index";
