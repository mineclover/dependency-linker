import type {
	EnhancedExportExtractionResult,
	ExportMethodInfo,
} from "../types/result-types";

/**
 * Validation error information
 */
export interface ValidationError {
	type: "error" | "warning";
	code: string;
	message: string;
	exportName?: string;
	location?: {
		line: number;
		column: number;
	};
}

/**
 * Validation result
 */
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

/**
 * Validator for export extraction results
 */
export class ExportValidator {
	/**
	 * Validate extraction result
	 * @param result Extraction result to validate
	 * @returns Validation result
	 */
	validate(result: EnhancedExportExtractionResult): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationError[] = [];

		// Validate basic structure
		this.validateStructure(result, errors);

		// Validate individual exports
		for (const exportInfo of result.exportMethods) {
			this.validateExport(exportInfo, errors, warnings);
		}

		// Validate statistics consistency
		this.validateStatistics(result, errors, warnings);

		// Validate class information consistency
		this.validateClasses(result, errors, warnings);

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Validate basic result structure
	 */
	private validateStructure(
		result: EnhancedExportExtractionResult,
		errors: ValidationError[],
	): void {
		if (!result) {
			errors.push({
				type: "error",
				code: "NULL_RESULT",
				message: "Extraction result is null or undefined",
			});
			return;
		}

		if (!Array.isArray(result.exportMethods)) {
			errors.push({
				type: "error",
				code: "INVALID_EXPORT_METHODS",
				message: "exportMethods must be an array",
			});
		}

		if (!result.statistics) {
			errors.push({
				type: "error",
				code: "MISSING_STATISTICS",
				message: "statistics object is required",
			});
		}

		if (!Array.isArray(result.classes)) {
			errors.push({
				type: "error",
				code: "INVALID_CLASSES",
				message: "classes must be an array",
			});
		}
	}

	/**
	 * Validate individual export
	 */
	private validateExport(
		exportInfo: ExportMethodInfo,
		errors: ValidationError[],
		warnings: ValidationError[],
	): void {
		// Validate required fields
		if (!exportInfo.name) {
			errors.push({
				type: "error",
				code: "MISSING_NAME",
				message: "Export name is required",
				exportName: exportInfo.name,
			});
		}

		if (!exportInfo.exportType) {
			errors.push({
				type: "error",
				code: "MISSING_EXPORT_TYPE",
				message: "Export type is required",
				exportName: exportInfo.name,
			});
		}

		if (!exportInfo.declarationType) {
			errors.push({
				type: "error",
				code: "MISSING_DECLARATION_TYPE",
				message: "Declaration type is required",
				exportName: exportInfo.name,
			});
		}

		if (!exportInfo.location) {
			errors.push({
				type: "error",
				code: "MISSING_LOCATION",
				message: "Location information is required",
				exportName: exportInfo.name,
			});
		}

		// Validate export type values
		const validExportTypes = [
			"function",
			"class",
			"variable",
			"type",
			"enum",
			"default",
			"class_method",
			"class_property",
			"re_export",
		];
		if (
			exportInfo.exportType &&
			!validExportTypes.includes(exportInfo.exportType)
		) {
			errors.push({
				type: "error",
				code: "INVALID_EXPORT_TYPE",
				message: `Invalid export type: ${exportInfo.exportType}`,
				exportName: exportInfo.name,
			});
		}

		// Validate declaration type values
		const validDeclarationTypes = [
			"named_export",
			"default_export",
			"assignment_export",
			"class_member",
			"re_export",
		];
		if (
			exportInfo.declarationType &&
			!validDeclarationTypes.includes(exportInfo.declarationType)
		) {
			errors.push({
				type: "error",
				code: "INVALID_DECLARATION_TYPE",
				message: `Invalid declaration type: ${exportInfo.declarationType}`,
				exportName: exportInfo.name,
			});
		}

		// Validate class member consistency
		if (
			exportInfo.exportType === "class_method" ||
			exportInfo.exportType === "class_property"
		) {
			if (!exportInfo.parentClass) {
				warnings.push({
					type: "warning",
					code: "MISSING_PARENT_CLASS",
					message: "Class members should have parentClass specified",
					exportName: exportInfo.name,
				});
			}
		}

		// Validate location structure
		if (exportInfo.location) {
			this.validateLocation(exportInfo.location, exportInfo.name, errors);
		}

		// Validate parameters for functions
		if (
			exportInfo.exportType === "function" ||
			exportInfo.exportType === "class_method"
		) {
			this.validateParameters(exportInfo.parameters, exportInfo.name, warnings);
		}
	}

	/**
	 * Validate location information
	 */
	private validateLocation(
		location: ExportMethodInfo["location"],
		exportName: string,
		errors: ValidationError[],
	): void {
		if (typeof location.line !== "number" || location.line < 1) {
			errors.push({
				type: "error",
				code: "INVALID_LINE",
				message: "Location line must be a positive number",
				exportName,
				location: { line: location.line, column: location.column },
			});
		}

		if (typeof location.column !== "number" || location.column < 1) {
			errors.push({
				type: "error",
				code: "INVALID_COLUMN",
				message: "Location column must be a positive number",
				exportName,
				location: { line: location.line, column: location.column },
			});
		}

		// Validate end positions if present
		if (location.endLine !== undefined) {
			if (
				typeof location.endLine !== "number" ||
				location.endLine < location.line
			) {
				errors.push({
					type: "error",
					code: "INVALID_END_LINE",
					message: "End line must be greater than or equal to start line",
					exportName,
					location: { line: location.line, column: location.column },
				});
			}
		}

		if (
			location.endColumn !== undefined &&
			location.endLine === location.line
		) {
			if (
				typeof location.endColumn !== "number" ||
				location.endColumn < location.column
			) {
				errors.push({
					type: "error",
					code: "INVALID_END_COLUMN",
					message: "End column must be greater than or equal to start column",
					exportName,
					location: { line: location.line, column: location.column },
				});
			}
		}
	}

	/**
	 * Validate parameters array
	 */
	private validateParameters(
		parameters: ExportMethodInfo["parameters"],
		exportName: string,
		warnings: ValidationError[],
	): void {
		if (!parameters) {
			return; // Parameters are optional
		}

		for (const param of parameters) {
			if (!param.name) {
				warnings.push({
					type: "warning",
					code: "MISSING_PARAMETER_NAME",
					message: "Parameter should have a name",
					exportName,
				});
			}

			// Check for suspicious parameter patterns
			if (param.name && param.name.includes("...") && !param.optional) {
				warnings.push({
					type: "warning",
					code: "REST_PARAMETER_NOT_OPTIONAL",
					message: "Rest parameters should typically be marked as optional",
					exportName,
				});
			}
		}
	}

	/**
	 * Validate statistics consistency
	 */
	private validateStatistics(
		result: EnhancedExportExtractionResult,
		errors: ValidationError[],
		warnings: ValidationError[],
	): void {
		if (!result.statistics) {
			return; // Already validated in structure check
		}

		const stats = result.statistics;
		const exports = result.exportMethods;

		// Count exports by type
		const actualCounts = {
			function: exports.filter((e) => e.exportType === "function").length,
			class: exports.filter((e) => e.exportType === "class").length,
			variable: exports.filter((e) => e.exportType === "variable").length,
			type: exports.filter(
				(e) => e.exportType === "type" || e.exportType === "enum",
			).length,
			default: exports.filter((e) => e.exportType === "default").length,
			classMethod: exports.filter((e) => e.exportType === "class_method")
				.length,
			classProperty: exports.filter((e) => e.exportType === "class_property")
				.length,
		};

		// Validate counts
		if (stats.functionExports !== actualCounts.function) {
			warnings.push({
				type: "warning",
				code: "INCONSISTENT_FUNCTION_COUNT",
				message: `Function count mismatch: expected ${actualCounts.function}, got ${stats.functionExports}`,
			});
		}

		if (stats.classExports !== actualCounts.class) {
			warnings.push({
				type: "warning",
				code: "INCONSISTENT_CLASS_COUNT",
				message: `Class count mismatch: expected ${actualCounts.class}, got ${stats.classExports}`,
			});
		}

		if (stats.variableExports !== actualCounts.variable) {
			warnings.push({
				type: "warning",
				code: "INCONSISTENT_VARIABLE_COUNT",
				message: `Variable count mismatch: expected ${actualCounts.variable}, got ${stats.variableExports}`,
			});
		}

		// Validate total
		const expectedTotal =
			actualCounts.function +
			actualCounts.class +
			actualCounts.variable +
			actualCounts.type +
			actualCounts.default +
			actualCounts.classMethod +
			actualCounts.classProperty;

		if (stats.totalExports !== expectedTotal) {
			warnings.push({
				type: "warning",
				code: "INCONSISTENT_TOTAL_COUNT",
				message: `Total count mismatch: expected ${expectedTotal}, got ${stats.totalExports}`,
			});
		}
	}

	/**
	 * Validate class information consistency
	 */
	private validateClasses(
		result: EnhancedExportExtractionResult,
		errors: ValidationError[],
		warnings: ValidationError[],
	): void {
		const classExports = result.exportMethods.filter(
			(e) => e.exportType === "class",
		);
		const classInfos = result.classes;

		// Check if all exported classes have corresponding class info
		for (const classExport of classExports) {
			const classInfo = classInfos.find(
				(c) => c.className === classExport.name,
			);
			if (!classInfo) {
				warnings.push({
					type: "warning",
					code: "MISSING_CLASS_INFO",
					message: `Missing detailed class information for exported class: ${classExport.name}`,
					exportName: classExport.name,
				});
			}
		}

		// Check if all class infos correspond to exported classes
		for (const classInfo of classInfos) {
			const classExport = classExports.find(
				(e) => e.name === classInfo.className,
			);
			if (!classExport) {
				warnings.push({
					type: "warning",
					code: "ORPHANED_CLASS_INFO",
					message: `Class info exists for non-exported class: ${classInfo.className}`,
					exportName: classInfo.className,
				});
			}
		}
	}

	/**
	 * Get validation summary
	 * @param result Validation result
	 * @returns Human-readable summary
	 */
	getValidationSummary(result: ValidationResult): string {
		const summary: string[] = [];

		if (result.isValid) {
			summary.push("✓ Validation passed");
		} else {
			summary.push("✗ Validation failed");
		}

		if (result.errors.length > 0) {
			summary.push(`${result.errors.length} error(s)`);
		}

		if (result.warnings.length > 0) {
			summary.push(`${result.warnings.length} warning(s)`);
		}

		return summary.join(", ");
	}
}
