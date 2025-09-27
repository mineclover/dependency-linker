const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;
const { EnhancedExportExtractor } = require('./dist/extractors/enhanced-export/index.js');

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test abstract class detection
const abstractCode = `
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
`;

console.log('🔍 Testing Abstract Class Detection');
console.log('📝 Test Code:');
console.log(abstractCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(abstractCode);

// Create extractor and extract
const extractor = new EnhancedExportExtractor();
const result = extractor.extractExports(ast, 'abstract-test.ts');

console.log('📊 Extraction Results:');
console.log('Total exports:', result.exportMethods.length);
console.log('Class exports count:', result.statistics.classExports);
console.log('\n📋 All Export Details:');
result.exportMethods.forEach((exp, i) => {
    console.log(`${i + 1}. "${exp.name}" (${exp.exportType}) - ${exp.declarationType}`);
    if (exp.parentClass) console.log(`   Parent: ${exp.parentClass}`);
    if (exp.location) {
        console.log(`   Location: Line ${exp.location.line}, Column ${exp.location.column}`);
    }
    console.log('');
});

console.log('📈 Statistics:');
console.log(JSON.stringify(result.statistics, null, 2));

console.log('\n🔍 Classes found:');
result.classes.forEach((cls, i) => {
    console.log(`${i + 1}. ${cls.className} (methods: ${cls.methods.length}, properties: ${cls.properties.length})`);
});