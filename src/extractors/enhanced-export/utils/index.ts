// AST traversal utilities

export type { NodePredicate, NodeVisitor } from "./ASTTraverser";
export { ASTTraverser } from "./ASTTraverser";
export type { ICache } from "./Cache";
// Caching utilities
export {
	CacheManager,
	globalCacheManager,
	LRUCache,
	memoize,
	SimpleCache,
} from "./Cache";
// Node utilities
export { NodeUtils } from "./NodeUtils";
export type { ExportMatch } from "./TextMatcher";
// Text pattern matching
export { TextMatcher } from "./TextMatcher";
