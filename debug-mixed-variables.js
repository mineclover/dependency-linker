const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test mixed export scenario that should have 2 variables, not 3
const mixedExportCode = `
export const API_BASE_URL = 'https://api.example.com';
export const MAX_RETRIES = 3;
export function fetchUser(id: string) {
  return fetch(\`\${API_BASE_URL}/users/\${id}\`);
}
export class UserService {
  static async getUser(id: string) {
    return fetchUser(id);
  }
}
`.trim();

console.log('🔍 Testing Mixed Export Variable Count');
console.log('📝 Test Code:');
console.log(mixedExportCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(mixedExportCode);

// Test with EnhancedExportExtractor
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'mixed-exports-test.ts');

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

console.log(`\nExpected: 2 variable exports, Got: ${variableExports.length} variable exports`);