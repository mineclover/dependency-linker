/**
 * Namespace-based dependency analysis module
 */

export * from "./types";
export { ConfigManager, configManager } from "./ConfigManager";
export { FilePatternMatcher, filePatternMatcher } from "./FilePatternMatcher";
export {
	NamespaceDependencyAnalyzer,
	namespaceDependencyAnalyzer,
} from "./NamespaceDependencyAnalyzer";
export { NamespaceGraphDB } from "./NamespaceGraphDB";
