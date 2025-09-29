// AST traversal utilities
export type { NodePredicate, NodeVisitor } from "./ASTTraverser";
export {
	findNode,
	findNodes,
	findNodesByType,
	findNodesByTypes,
	getChildByType,
	getChildren,
	getChildrenByType,
	traverse,
} from "./ASTTraverser";

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
export {
	clearTextCache,
	findAncestor,
	getDepth,
	getIdentifierName,
	getNamedChildren,
	getSourceLocation,
	getText,
	getVisibility,
	hasChildOfType,
	isAsync,
	isClassDeclaration,
	isExportStatement,
	isFunctionDeclaration,
	isStatic,
	isTypeDeclaration,
	isVariableDeclaration,
	isWithinExport,
} from "./NodeUtils";

export type { ExportMatch } from "./TextMatcher";
// Text pattern matching
export {
	cleanExportText,
	countExports,
	findAllExports,
	findExportsByType,
	hasExports,
	parseNamedExports,
} from "./TextMatcher";
