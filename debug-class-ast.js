const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test inheritance AST structure
const inheritanceCode = `export class UserService extends BaseService {
  constructor() {
    super('UserService');
  }
}`;

console.log('🔍 Testing Class Inheritance AST Structure');
console.log('📝 Test Code:');
console.log(inheritanceCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(inheritanceCode);

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

console.log('📊 Full AST Structure:');
printASTNode(ast.rootNode);

// Focus on the class_declaration node
function findNodeByType(node, targetType) {
    if (node.type === targetType) {
        return node;
    }
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
            const found = findNodeByType(child, targetType);
            if (found) return found;
        }
    }
    return null;
}

const classNode = findNodeByType(ast.rootNode, 'class_declaration');
if (classNode) {
    console.log('\n🎯 Class Declaration Node Details:');
    console.log('Type:', classNode.type);
    console.log('Text:', classNode.text);
    console.log('Children:');
    for (let i = 0; i < classNode.childCount; i++) {
        const child = classNode.child(i);
        console.log(`  ${i}: ${child.type} - "${child.text.substring(0, 30)}"`);
    }

    // Look for class_heritage or extends clause
    const heritageClause = classNode.children.find(child =>
        child.type === 'class_heritage' ||
        child.type === 'extends_clause' ||
        child.text.includes('extends')
    );

    if (heritageClause) {
        console.log('\n🔍 Heritage Clause Found:');
        console.log('Type:', heritageClause.type);
        console.log('Text:', heritageClause.text);
        printASTNode(heritageClause, 0);
    } else {
        console.log('\n❌ No heritage clause found');
        console.log('Looking for any node containing "extends":');
        classNode.children.forEach((child, i) => {
            if (child.text.includes('extends')) {
                console.log(`  Child ${i}: ${child.type} - "${child.text}"`);
            }
        });
    }
}