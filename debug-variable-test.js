const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test exact code from the failing test
const variableTestCode = `
export const API_URL = 'https://api.example.com';
export let counter = 0;
export var debugMode = false;

const internal = 'private';
export { internal as publicInternal };
`.trim();

console.log('🔍 Testing Variable Export Detection (from failing test)');
console.log('📝 Test Code:');
console.log(variableTestCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(variableTestCode);

// Test with EnhancedExportExtractor
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'variable-test.ts');

console.log('📊 Extraction Results:');
console.log('Total exports:', result.exportMethods.length);
console.log('Statistics:', JSON.stringify(result.statistics, null, 2));

console.log('\n📋 All Export Details:');
result.exportMethods.forEach((exp, i) => {
  console.log(`${i + 1}. "${exp.name}"`);
  console.log(`   exportType: ${exp.exportType}`);
  console.log(`   declarationType: ${exp.declarationType}`);
  console.log('');
});

console.log('🔍 Variable exports found:');
const variableExports = result.exportMethods.filter(e => e.exportType === 'variable');
variableExports.forEach((exp, i) => {
  console.log(`${i + 1}. ${exp.name} (${exp.exportType})`);
});

console.log(`\nExpected: >=3 variable exports, Got: ${variableExports.length} variable exports`);
if (variableExports.length >= 3) {
  console.log('✅ Test would PASS');
} else {
  console.log('❌ Test would FAIL');
}