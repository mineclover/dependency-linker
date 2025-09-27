/**
 * Export type classifications for different kinds of exported items
 */
export type ExportType =
	| "function" // export function myFunc()
	| "class" // export class MyClass
	| "variable" // export const/let/var
	| "type" // export type/interface
	| "enum" // export enum
	| "default" // export default
	| "class_method" // class method inside exported class
	| "class_property" // class property inside exported class
	| "re_export"; // export { foo } from 'module'

/**
 * Declaration type classifications for how exports are declared
 */
export type DeclarationType =
	| "named_export" // export function foo() {}
	| "default_export" // export default function() {}
	| "assignment_export" // export const foo = () => {}
	| "class_member" // method/property inside class
	| "re_export"; // export from other module

/**
 * Source code location information
 */
export interface SourceLocation {
	line: number;
	column: number;
	endLine?: number;
	endColumn?: number;
}

/**
 * Parameter information for functions and methods
 */
export interface ParameterInfo {
	name: string;
	type?: string;
	optional?: boolean;
	defaultValue?: string;
}
