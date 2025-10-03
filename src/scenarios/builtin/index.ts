/**
 * Built-in Scenarios
 *
 * Standard scenario specifications provided by the dependency-linker framework.
 */

export { basicStructureSpec } from "./basic-structure";
export { fileDependencySpec } from "./file-dependency";
export { symbolDependencySpec } from "./symbol-dependency";
export { markdownLinkingSpec } from "./markdown-linking";

/**
 * All built-in scenario specifications
 */
export const BUILTIN_SCENARIOS = [
	"basic-structure",
	"file-dependency",
	"symbol-dependency",
	"markdown-linking",
] as const;

export type BuiltinScenarioId = (typeof BUILTIN_SCENARIOS)[number];
