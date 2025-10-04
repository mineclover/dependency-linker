/**
 * Built-in Scenarios
 *
 * Standard scenario specifications provided by the dependency-linker framework.
 */

export { basicStructureSpec } from "./basic-structure";
export { fileDependencySpec } from "./file-dependency";
export { symbolDependencySpec } from "./symbol-dependency";
export { markdownLinkingSpec } from "./markdown-linking";
export { methodAnalysisSpec } from "./method-analysis";

/**
 * All built-in scenario specifications
 */
export const BUILTIN_SCENARIOS = [
	"basic-structure",
	"file-dependency",
	"symbol-dependency",
	"markdown-linking",
	"method-analysis",
] as const;

export type BuiltinScenarioId = (typeof BUILTIN_SCENARIOS)[number];
