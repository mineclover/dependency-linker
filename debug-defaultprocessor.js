const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test simple named export
const namedExportCode = `export { UserService, ApiService } from './services';`;

console.log('🔍 Testing DefaultProcessor.process()');
console.log('📝 Test Code:');
console.log(namedExportCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(namedExportCode);

// Get the export statement
const exportStatement = ast.rootNode.child(0);
console.log('Export statement type:', exportStatement.type);
console.log('Export statement text:', exportStatement.text);

// Test DefaultProcessor directly
const { DefaultProcessor } = require('./dist/extractors/enhanced-export/processors/index.js');

const processor = new DefaultProcessor();
const context = {
    sourceCode: namedExportCode,
    filePath: 'test.ts',
    isWithinExport: true,
    cache: new Map(),
};

console.log('\n🔍 Testing DefaultProcessor.process():');
try {
    const result = processor.process(exportStatement, context);
    console.log('Process result:', result);
    console.log('Number of exports:', result.length);

    result.forEach((exp, i) => {
        console.log(`${i + 1}. "${exp.name}" (${exp.exportType}) - ${exp.declarationType}`);
    });
} catch (error) {
    console.error('Error in processor.process():', error);
}