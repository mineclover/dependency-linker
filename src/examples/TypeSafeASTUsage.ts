/**
 * Example usage of the type-safe AST wrapper system
 * Demonstrates how to use TypeSafeAST for better type safety
 */

import { TypeScriptParser } from "../parsers/TypeScriptParser";
import type { TypeSafeAST } from "../types/ASTWrappers";
import { isExpressionNode, isStatementNode } from "../types/TreeSitterTypes";

/**
 * Example: Type-safe TypeScript code analysis
 */
export async function analyzeTypeScriptFile(filePath: string): Promise<void> {
	const parser = new TypeScriptParser();
	const result = await parser.parse(filePath);

	if (!result.ast || !result.typedAST) {
		console.error("Failed to parse TypeScript file");
		return;
	}

	// Get type-safe AST wrapper
	const typedAST = result.typedAST;
	const program = typedAST.program;

	if (!program) {
		console.error("No program node found");
		return;
	}

	console.log("=== TypeScript File Analysis ===");

	// Find all imports with type safety
	const imports = typedAST.findAllImports();
	console.log(`Found ${imports.length} import statements:`);

	for (const importNode of imports) {
		const source = importNode.source;
		if (source) {
			console.log(`  - Import from: ${source.value}`);
			console.log(`    Type-only: ${importNode.isTypeOnly}`);
			console.log(`    Specifiers: ${importNode.specifiers.length}`);
		}
	}

	// Find all exports with type safety
	const exports = typedAST.findAllExports();
	console.log(`\nFound ${exports.length} export statements:`);

	for (const exportNode of exports) {
		console.log(`  - Export type: ${exportNode.type}`);
		console.log(`    Default export: ${exportNode.isDefault}`);
		console.log(`    Type-only: ${exportNode.isTypeOnly}`);
	}

	// Find all functions with type safety
	const functions = typedAST.findAllFunctions();
	console.log(`\nFound ${functions.length} function declarations:`);

	for (const funcNode of functions) {
		const name = funcNode.name;
		if (name) {
			console.log(`  - Function: ${name.name}`);
			console.log(`    Parameters: ${funcNode.parameters.length}`);
			console.log(`    Async: ${funcNode.isAsync}`);
			console.log(`    Generator: ${funcNode.isGenerator}`);
		}
	}

	// Find all classes with type safety
	const classes = typedAST.findAllClasses();
	console.log(`\nFound ${classes.length} class declarations:`);

	for (const classNode of classes) {
		const name = classNode.name;
		if (name) {
			console.log(`  - Class: ${name.name}`);
			console.log(`    Methods: ${classNode.methods.length}`);
			console.log(`    Properties: ${classNode.properties.length}`);

			const superClass = classNode.superClass;
			if (superClass) {
				console.log(`    Extends: ${superClass.text}`);
			}
		}
	}

	// Find all interfaces with type safety
	const interfaces = typedAST.findAllInterfaces();
	console.log(`\nFound ${interfaces.length} interface declarations:`);

	for (const interfaceNode of interfaces) {
		const name = interfaceNode.name;
		if (name) {
			console.log(`  - Interface: ${name.name}`);
			console.log(`    Properties: ${interfaceNode.properties.length}`);
			console.log(`    Methods: ${interfaceNode.methods.length}`);
		}
	}
}

/**
 * Example: Custom AST traversal with type guards
 */
export function traverseWithTypeGuards(typedAST: TypeSafeAST): void {
	console.log("\n=== Custom AST Traversal ===");

	let statementCount = 0;
	let expressionCount = 0;

	typedAST.rootNode.traverse((node) => {
		const rawNode = node.getRawNode();

		// Use type guards for type-safe checking
		if (isStatementNode(rawNode)) {
			statementCount++;
			console.log(
				`Statement: ${rawNode.type} at line ${rawNode.startPosition.row + 1}`,
			);
		} else if (isExpressionNode(rawNode)) {
			expressionCount++;
			console.log(
				`Expression: ${rawNode.type} at line ${rawNode.startPosition.row + 1}`,
			);
		}
		return true; // Continue traversal
	});

	console.log(`\nTraversal Summary:`);
	console.log(`  Statements: ${statementCount}`);
	console.log(`  Expressions: ${expressionCount}`);
}

/**
 * Example: Working with specific node types
 */
export function analyzeCallExpressions(typedAST: TypeSafeAST): void {
	console.log("\n=== Call Expression Analysis ===");

	const callExpressions = typedAST.findAllNodesByType("call_expression");
	console.log(`Found ${callExpressions.length} call expressions`);

	for (const callExpr of callExpressions) {
		const funcNode =
			callExpr.findChildByType("member_expression") ||
			callExpr.findChildByType("identifier");

		if (funcNode) {
			console.log(`  - Call: ${funcNode.text}`);
			const args = callExpr.findChildByType("arguments");
			if (args) {
				console.log(`    Arguments: ${args.namedChildren.length}`);
			}
		}
	}
}

/**
 * Example: Error handling and validation
 */
export async function validateTypeScriptCode(
	filePath: string,
): Promise<boolean> {
	console.log("\n=== Code Validation ===");

	const parser = new TypeScriptParser();
	const result = await parser.parse(filePath);

	// Check for parse errors
	if (result.errors.length > 0) {
		console.error(`Parse errors found:`);
		for (const error of result.errors) {
			console.error(
				`  - ${error.type}: ${error.message} at line ${error.location.line}`,
			);
		}
		return false;
	}

	// Check for warnings
	if (result.warnings.length > 0) {
		console.warn(`Parse warnings found:`);
		for (const warning of result.warnings) {
			console.warn(
				`  - ${warning.code}: ${warning.message} at line ${warning.location.line}`,
			);
		}
	}

	// Validate AST structure
	if (!result.ast || !result.typedAST) {
		console.error("Invalid AST structure");
		return false;
	}

	const typedAST = result.typedAST;
	const program = typedAST.program;

	if (!program) {
		console.error("No program root found");
		return false;
	}

	console.log("✓ Code validation successful");
	console.log(`  Parse time: ${result.parseTime}ms`);
	console.log(`  AST nodes: ${result.metadata.nodeCount}`);
	console.log(`  Max depth: ${result.metadata.maxDepth}`);

	return true;
}

/**
 * Example: Converting to JSON for serialization
 */
export function serializeAST(typedAST: TypeSafeAST): string {
	console.log("\n=== AST Serialization ===");

	// Convert to JSON with type information preserved
	const astJson = typedAST.toJSON();
	const jsonString = JSON.stringify(astJson, null, 2);

	console.log(`Serialized AST size: ${jsonString.length} characters`);

	return jsonString;
}

/**
 * Main example function demonstrating all features
 */
export async function runTypeSafeASTExample(): Promise<void> {
	const exampleFilePath = "src/examples/sample.ts"; // You would provide a real file path

	try {
		console.log("🚀 Running TypeSafe AST Example");
		console.log("=".repeat(50));

		// Validate the code first
		const isValid = await validateTypeScriptCode(exampleFilePath);
		if (!isValid) {
			console.error("❌ Code validation failed");
			return;
		}

		// Analyze the TypeScript file
		await analyzeTypeScriptFile(exampleFilePath);

		// Perform custom traversal
		const parser = new TypeScriptParser();
		const result = await parser.parse(exampleFilePath);

		if (result.typedAST) {
			traverseWithTypeGuards(result.typedAST);
			analyzeCallExpressions(result.typedAST);

			// Serialize the AST
			const serialized = serializeAST(result.typedAST);
			console.log(`\n📄 Serialized AST preview:`);
			console.log(`${serialized.substring(0, 200)}...`);
		}

		console.log("\n✅ TypeSafe AST Example completed successfully");
	} catch (error) {
		console.error("❌ Error running TypeSafe AST example:", error);
	}
}
