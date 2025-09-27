const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test exact code from the failing inheritance test
const inheritanceTestCode = `
export abstract class BaseService {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  public abstract process(): Promise<void>;
}

export class UserService extends BaseService {
  constructor() {
    super('UserService');
  }

  public async process(): Promise<void> {
    // implementation
  }
}
`.trim();

console.log('🔍 Testing Class Inheritance Detection');
console.log('📝 Test Code:');
console.log(inheritanceTestCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(inheritanceTestCode);

// Test with EnhancedExportExtractor
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'inheritance-test.ts');

console.log('📊 Extraction Results:');
console.log('Total exports:', result.exportMethods.length);
console.log('Class exports count:', result.statistics.classExports);

console.log('\n📋 Classes Information:');
result.classes.forEach((cls, i) => {
  console.log(`${i + 1}. Class: "${cls.className}"`);
  console.log(`   superClass: ${cls.superClass}`);
  console.log(`   methods: ${cls.methods.length}`);
  console.log(`   properties: ${cls.properties.length}`);
  console.log('');
});

console.log('🔍 All Export Details:');
result.exportMethods.forEach((exp, i) => {
  console.log(`${i + 1}. "${exp.name}"`);
  console.log(`   exportType: ${exp.exportType}`);
  console.log(`   declarationType: ${exp.declarationType}`);
  if (exp.exportType === 'class') {
    console.log(`   superClass: ${exp.superClass}`);
  }
  console.log('');
});

const userServiceClass = result.classes.find(cls => cls.className === 'UserService');
console.log('🎯 UserService class details:');
console.log('Found:', !!userServiceClass);
if (userServiceClass) {
  console.log('superClass property:', userServiceClass.superClass);
  console.log('Expected: "BaseService"');
  console.log(userServiceClass.superClass === 'BaseService' ? '✅ Test would PASS' : '❌ Test would FAIL');
} else {
  console.log('❌ UserService class not found - test would FAIL');
}