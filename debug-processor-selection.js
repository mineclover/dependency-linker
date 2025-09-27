const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test simple named export
const namedExportCode = `export { UserService, ApiService } from './services';`;

console.log('🔍 Testing Processor Selection for Named Re-export');
console.log('📝 Test Code:');
console.log(namedExportCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(namedExportCode);

// Get the export statement
const exportStatement = ast.rootNode.child(0);
console.log('Export statement type:', exportStatement.type);
console.log('Export statement text:', exportStatement.text);

// Test processor selection manually
const { DefaultProcessor, ClassProcessor, VariableProcessor, FunctionProcessor, TypeProcessor } = require('./dist/extractors/enhanced-export/processors/index.js');

const processors = [
    { name: 'DefaultProcessor', processor: new DefaultProcessor() },
    { name: 'FunctionProcessor', processor: new FunctionProcessor() },
    { name: 'ClassProcessor', processor: new ClassProcessor() },
    { name: 'VariableProcessor', processor: new VariableProcessor() },
    { name: 'TypeProcessor', processor: new TypeProcessor() }
];

console.log('\n🔍 Testing which processor can handle the export statement:');
for (const { name, processor } of processors) {
    const canProcess = processor.canProcess(exportStatement);
    console.log(`- ${name}: ${canProcess}`);

    if (canProcess) {
        console.log(`  ${name} will handle this node`);
        break;
    }
}