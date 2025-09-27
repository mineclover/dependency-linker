const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test export * only
const exportStarCode = `export * from './types';`;

console.log('🔍 Testing Export * Pattern');
console.log('📝 Test Code:');
console.log(exportStarCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(exportStarCode);

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

// Test with EnhancedExportExtractor
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'export-star-test.ts');

console.log('\n📊 Extraction Results:');
console.log('Total exports:', result.exportMethods.length);
result.exportMethods.forEach((exp, i) => {
    console.log(`${i + 1}. "${exp.name}" (${exp.exportType}) - ${exp.declarationType}`);
});