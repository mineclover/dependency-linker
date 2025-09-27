const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Exact test code from the failing test
const testCode = `
export { UserService, ApiService } from './services';
export * from './types';
export { default as DefaultLogger } from './logger';
`;

console.log('🔍 Testing Re-export Detection (Exact Test Code)');
console.log('📝 Test Code:');
console.log(testCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(testCode);

// Create extractor and extract
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'reexport-test.ts');

console.log('📊 Extraction Results:');
console.log('Total exports:', result.exportMethods.length);
console.log('\n📋 All Export Details:');
result.exportMethods.forEach((exp, i) => {
    console.log(`${i + 1}. "${exp.name}"`);
    console.log(`   exportType: ${exp.exportType}`);
    console.log(`   declarationType: ${exp.declarationType}`);
    console.log('');
});

// Filter re-exports like the test does
const reExports = result.exportMethods.filter(
    (exp) => exp.exportType === "re_export"
);
console.log(`🔍 Re-exports found (exportType === "re_export"): ${reExports.length}`);
reExports.forEach((exp, i) => {
    console.log(`${i + 1}. ${exp.name} (${exp.exportType})`);
});

console.log('\n📈 Statistics:');
console.log(JSON.stringify(result.statistics, null, 2));