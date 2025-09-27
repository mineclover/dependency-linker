import type {
	DeclarationType,
	ExportType,
	ParameterInfo,
	SourceLocation,
} from "./export-types";

// Re-export ParameterInfo for other modules that import from result-types
export type { ParameterInfo };

/**
 * Detailed information about an exported item
 */
export interface ExportMethodInfo {
	/**
	 * Name of the exported item
	 *
	 * For aliased exports (export { internal as external }), this contains
	 * the external name that consumers will import.
	 */
	name: string;

	/**
	 * Type classification of the export
	 *
	 * CRITICAL: deps-cli expects this field to be named "exportType" (not "type").
	 * This field determines how deps-cli categorizes and processes the export.
	 */
	exportType: ExportType;

	/**
	 * How the export is declared in source code
	 *
	 * Helps distinguish between different export patterns:
	 * - "named_export": export const foo = ...
	 * - "default_export": export default ...
	 * - "re_export": export { foo } from './module'
	 * - "class_member": method/property within exported class
	 */
	declarationType: DeclarationType;

	/**
	 * Source location of the export declaration
	 *
	 * Contains line/column information for IDE integration and error reporting.
	 */
	location: SourceLocation;

	/**
	 * Parent class name for class members
	 *
	 * Only present when exportType is "class_method" or "class_property".
	 * Allows deps-cli to understand the relationship between class and its members.
	 */
	parentClass?: string;

	/**
	 * Superclass name for class inheritance
	 *
	 * Only present when exportType is "class" and the class extends another class.
	 * Contains the name of the parent class being extended.
	 */
	superClass?: string;

	/**
	 * Whether this is an async function
	 *
	 * Only applicable for functions and methods (exportType: "function" or "class_method").
	 */
	isAsync?: boolean;

	/**
	 * Whether this is a static method/property
	 *
	 * Only applicable for class members (exportType: "class_method" or "class_property").
	 */
	isStatic?: boolean;

	/**
	 * Visibility modifier for class members
	 *
	 * Only applicable for class members. Defaults to "public" if not specified.
	 */
	visibility?: "public" | "private" | "protected";

	/**
	 * Function/method parameters with type information
	 *
	 * Only present for functions and methods. Contains parameter names and
	 * whether they are optional.
	 */
	parameters?: ParameterInfo[];

	/**
	 * Return type annotation (if available)
	 *
	 * Only present for functions and methods with explicit return type annotations.
	 * Contains the raw TypeScript type string.
	 */
	returnType?: string;
}

/**
 * Information about class methods
 */
export interface ClassMethodInfo {
	name: string;
	isStatic: boolean;
	isAsync: boolean;
	visibility: "public" | "private" | "protected";
	parameters: ParameterInfo[];
	returnType?: string;
	location: SourceLocation;
}

/**
 * Information about class properties
 */
export interface ClassPropertyInfo {
	name: string;
	isStatic: boolean;
	visibility: "public" | "private" | "protected";
	type?: string;
	initialValue?: string;
	location: SourceLocation;
}

/**
 * Detailed information about exported classes
 */
export interface ClassExportInfo {
	className: string;
	location: SourceLocation;
	methods: ClassMethodInfo[];
	properties: ClassPropertyInfo[];
	isDefaultExport: boolean;
	superClass?: string;
	implementsInterfaces?: string[];
}

/**
 * Summary statistics of all exports
 */
export interface ExportStatistics {
	/** Total number of all exports (sum of all other counts) */
	totalExports: number;

	/** Number of exported functions (export function name() {}) */
	functionExports: number;

	/** Number of exported classes (export class Name {}) */
	classExports: number;

	/** Number of exported variables/constants (export const name = ...) */
	variableExports: number;

	/** Number of exported types (interfaces, type aliases, enums) */
	typeExports: number;

	/** Number of default exports (export default ...) */
	defaultExports: number;

	/** Number of methods in exported classes */
	classMethodsExports: number;

	/** Number of properties in exported classes */
	classPropertiesExports: number;
}

/**
 * Complete result of enhanced export extraction
 */
export interface EnhancedExportExtractionResult {
	/**
	 * All exported items with detailed information
	 *
	 * CRITICAL: deps-cli expects this field to exist and be an array.
	 * Contains functions, classes, variables, types, and class members.
	 * Each item includes the essential "exportType" field for categorization.
	 */
	exportMethods: ExportMethodInfo[];

	/**
	 * Summary statistics of all exports
	 *
	 * Provides aggregate counts by export type for reporting and analysis.
	 * Useful for understanding the composition of a module's public API.
	 */
	statistics: ExportStatistics;

	/**
	 * Detailed information about exported classes
	 *
	 * Contains class-specific details like inheritance, methods, and properties.
	 * Separate from exportMethods to provide richer class analysis.
	 */
	classes: ClassExportInfo[];
}
