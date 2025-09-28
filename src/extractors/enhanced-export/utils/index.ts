// AST traversal utilities
export type { NodePredicate, NodeVisitor } from "./ASTTraverser";
export {
	traverse,
	findNodes,
	findNode,
	findNodesByType,
	findNodesByTypes,
	getChildren,
	getChildrenByType,
	getChildByType,
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
	getText,
	clearTextCache,
	getSourceLocation,
	hasChildOfType,
	getIdentifierName,
	isExportStatement,
	isFunctionDeclaration,
	isClassDeclaration,
	isVariableDeclaration,
	isTypeDeclaration,
	getNamedChildren,
	findAncestor,
	isWithinExport,
	getVisibility,
	isStatic,
	isAsync,
	getDepth,
} from "./NodeUtils";

export type { ExportMatch } from "./TextMatcher";
// Text pattern matching
export {
	findAllExports,
	findExportsByType,
	hasExports,
	countExports,
	parseNamedExports,
	cleanExportText,
} from "./TextMatcher";
