const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test abstract class structure
const abstractCode = `export abstract class BaseService {
  protected name: string;
}`;

console.log('🔍 Analyzing AST for Abstract Class');
console.log('📝 Test Code:');
console.log(abstractCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(abstractCode);

function printASTNode(node, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${node.type} [${node.startPosition.row}:${node.startPosition.column}-${node.endPosition.row}:${node.endPosition.column}] "${node.text.substring(0, 50).replace(/\n/g, '\\n')}"`);

    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
            printASTNode(child, depth + 1);
        }
    }
}

console.log('📊 AST Structure:');
printASTNode(ast.rootNode);