# Tag Parsing System Integration

## Overview

이 문서는 태그 파싱 명세서와 기존 시스템의 통합 방법을 설명합니다.

## System Architecture Integration

### 1. Tag Type Definitions Integration

#### 1.1 Specification-based Tag Types
```typescript
// specs/006-tag-parsing-specifications/spec.md에서 정의된 태그 유형들을
// src/parsers/markdown/MarkdownTagTypeDefinitions.ts에 통합

interface SpecificationTagType {
  id: string;
  name: string;
  patterns: string[];
  priority: number;
  category: string;
  relatedTags: string[];
  rules: string[];
  examples: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    author: string;
  };
}
```

#### 1.2 Dynamic Tag Type Loading
```typescript
// 명세서에서 태그 유형을 동적으로 로드
class SpecificationTagTypeLoader {
  async loadTagTypesFromSpec(specPath: string): Promise<TagTypeDefinition[]> {
    // 명세서 파일에서 태그 유형 정의 추출
    const specContent = await fs.readFile(specPath, 'utf-8');
    const tagTypes = this.parseTagTypesFromSpec(specContent);
    return tagTypes;
  }
  
  private parseTagTypesFromSpec(content: string): TagTypeDefinition[] {
    // 마크다운 명세서에서 태그 유형 정의 파싱
    const tagTypeRegex = /#### (\d+\.\d+) (\w+) Tags/g;
    const matches = [...content.matchAll(tagTypeRegex)];
    
    return matches.map(match => ({
      id: match[2].toLowerCase(),
      name: match[2],
      patterns: this.extractPatterns(content, match[1]),
      priority: this.extractPriority(content, match[1]),
      category: this.extractCategory(content, match[1]),
      relatedTags: this.extractRelatedTags(content, match[1]),
      rules: this.extractRules(content, match[1]),
      examples: this.extractExamples(content, match[1]),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: "1.0.0",
        author: "specification"
      }
    }));
  }
}
```

### 2. Code Parsing Targets Integration

#### 2.1 TypeScript/JavaScript Parsing Integration
```typescript
// specs/006-tag-parsing-specifications/code-parsing-targets.md에서 정의된
// 파싱 대상을 기존 파서 시스템에 통합

interface CodeParsingTarget {
  type: 'class' | 'interface' | 'function' | 'method' | 'property' | 'enum' | 'type';
  pattern: string;
  extraction: string[];
  metadata: string[];
  examples: string[];
}

class SpecificationCodeParser {
  private targets: CodeParsingTarget[] = [];
  
  async loadParsingTargetsFromSpec(specPath: string): Promise<void> {
    const specContent = await fs.readFile(specPath, 'utf-8');
    this.targets = this.parseCodeTargetsFromSpec(specContent);
  }
  
  parseCodeElement(sourceCode: string, target: CodeParsingTarget): ParsedElement[] {
    const regex = new RegExp(target.pattern, 'g');
    const matches = [...sourceCode.matchAll(regex)];
    
    return matches.map(match => ({
      type: target.type,
      name: match[1],
      pattern: target.pattern,
      extraction: this.extractData(match, target.extraction),
      metadata: this.extractMetadata(match, target.metadata),
      location: this.extractLocation(match)
    }));
  }
}
```

#### 2.2 Markdown Parsing Integration
```typescript
// 마크다운 파싱 대상을 기존 마크다운 파서에 통합

interface MarkdownParsingTarget {
  type: 'heading' | 'link' | 'code' | 'list' | 'table';
  pattern: string;
  extraction: string[];
  metadata: string[];
  examples: string[];
}

class SpecificationMarkdownParser {
  private targets: MarkdownParsingTarget[] = [];
  
  async loadMarkdownTargetsFromSpec(specPath: string): Promise<void> {
    const specContent = await fs.readFile(specPath, 'utf-8');
    this.targets = this.parseMarkdownTargetsFromSpec(specContent);
  }
  
  parseMarkdownElement(sourceCode: string, target: MarkdownParsingTarget): ParsedElement[] {
    const regex = new RegExp(target.pattern, 'g');
    const matches = [...sourceCode.matchAll(regex)];
    
    return matches.map(match => ({
      type: target.type,
      name: match[1],
      pattern: target.pattern,
      extraction: this.extractData(match, target.extraction),
      metadata: this.extractMetadata(match, target.metadata),
      location: this.extractLocation(match)
    }));
  }
}
```

### 3. CLI Integration

#### 3.1 Specification-based CLI Commands
```typescript
// 명세서 기반 CLI 명령어 추가

program
  .command("spec")
  .description("Manage parsing specifications")
  .option("--load-tag-types", "Load tag types from specification")
  .option("--load-code-targets", "Load code parsing targets from specification")
  .option("--load-markdown-targets", "Load markdown parsing targets from specification")
  .option("--validate-spec", "Validate specification format")
  .option("--generate-spec", "Generate specification from current system")
  .action(async (options) => {
    const specManager = new SpecificationManager();
    
    if (options.loadTagTypes) {
      await specManager.loadTagTypesFromSpec();
    }
    
    if (options.loadCodeTargets) {
      await specManager.loadCodeTargetsFromSpec();
    }
    
    if (options.loadMarkdownTargets) {
      await specManager.loadMarkdownTargetsFromSpec();
    }
    
    if (options.validateSpec) {
      await specManager.validateSpecification();
    }
    
    if (options.generateSpec) {
      await specManager.generateSpecification();
    }
  });
```

#### 3.2 Specification Manager
```typescript
class SpecificationManager {
  private tagTypeLoader: SpecificationTagTypeLoader;
  private codeParser: SpecificationCodeParser;
  private markdownParser: SpecificationMarkdownParser;
  
  constructor() {
    this.tagTypeLoader = new SpecificationTagTypeLoader();
    this.codeParser = new SpecificationCodeParser();
    this.markdownParser = new SpecificationMarkdownParser();
  }
  
  async loadTagTypesFromSpec(): Promise<void> {
    const specPath = 'specs/006-tag-parsing-specifications/spec.md';
    const tagTypes = await this.tagTypeLoader.loadTagTypesFromSpec(specPath);
    
    // 기존 태그 유형 컨테이너에 추가
    for (const tagType of tagTypes) {
      globalTagTypeContainer.setDefinition(tagType);
    }
    
    console.log(`✅ Loaded ${tagTypes.length} tag types from specification`);
  }
  
  async loadCodeTargetsFromSpec(): Promise<void> {
    const specPath = 'specs/006-tag-parsing-specifications/code-parsing-targets.md';
    await this.codeParser.loadParsingTargetsFromSpec(specPath);
    
    console.log(`✅ Loaded code parsing targets from specification`);
  }
  
  async loadMarkdownTargetsFromSpec(): Promise<void> {
    const specPath = 'specs/006-tag-parsing-specifications/code-parsing-targets.md';
    await this.markdownParser.loadMarkdownTargetsFromSpec(specPath);
    
    console.log(`✅ Loaded markdown parsing targets from specification`);
  }
  
  async validateSpecification(): Promise<void> {
    // 명세서 형식 검증
    const specPath = 'specs/006-tag-parsing-specifications/spec.md';
    const specContent = await fs.readFile(specPath, 'utf-8');
    
    const validation = this.validateSpecFormat(specContent);
    if (validation.isValid) {
      console.log('✅ Specification format is valid');
    } else {
      console.log('❌ Specification format is invalid:', validation.errors);
    }
  }
  
  async generateSpecification(): Promise<void> {
    // 현재 시스템 상태에서 명세서 생성
    const currentTagTypes = globalTagTypeContainer.getAllDefinitions();
    const currentCodeTargets = this.codeParser.getCurrentTargets();
    const currentMarkdownTargets = this.markdownParser.getCurrentTargets();
    
    const spec = this.generateSpecFromCurrentSystem(
      currentTagTypes,
      currentCodeTargets,
      currentMarkdownTargets
    );
    
    await fs.writeFile('specs/006-tag-parsing-specifications/generated-spec.md', spec);
    console.log('✅ Generated specification from current system');
  }
}
```

### 4. API Integration

#### 4.1 Specification-based API
```typescript
// 명세서 기반 API 엔드포인트

interface SpecificationAPI {
  // 태그 유형 관련
  getTagTypes(): Promise<TagTypeDefinition[]>;
  getTagTypeById(id: string): Promise<TagTypeDefinition | null>;
  createTagType(tagType: TagTypeDefinition): Promise<void>;
  updateTagType(id: string, tagType: TagTypeDefinition): Promise<void>;
  deleteTagType(id: string): Promise<void>;
  
  // 코드 파싱 대상 관련
  getCodeTargets(): Promise<CodeParsingTarget[]>;
  getCodeTargetByType(type: string): Promise<CodeParsingTarget | null>;
  createCodeTarget(target: CodeParsingTarget): Promise<void>;
  updateCodeTarget(type: string, target: CodeParsingTarget): Promise<void>;
  deleteCodeTarget(type: string): Promise<void>;
  
  // 마크다운 파싱 대상 관련
  getMarkdownTargets(): Promise<MarkdownParsingTarget[]>;
  getMarkdownTargetByType(type: string): Promise<MarkdownParsingTarget | null>;
  createMarkdownTarget(target: MarkdownParsingTarget): Promise<void>;
  updateMarkdownTarget(type: string, target: MarkdownParsingTarget): Promise<void>;
  deleteMarkdownTarget(type: string): Promise<void>;
  
  // 명세서 관리
  loadSpecification(specPath: string): Promise<void>;
  validateSpecification(specPath: string): Promise<ValidationResult>;
  generateSpecification(): Promise<string>;
  exportSpecification(format: 'markdown' | 'json' | 'yaml'): Promise<string>;
}
```

#### 4.2 REST API Implementation
```typescript
// Express.js 기반 REST API 구현

app.get('/api/specifications/tag-types', async (req, res) => {
  try {
    const tagTypes = await specificationAPI.getTagTypes();
    res.json(tagTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/specifications/code-targets', async (req, res) => {
  try {
    const codeTargets = await specificationAPI.getCodeTargets();
    res.json(codeTargets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/specifications/markdown-targets', async (req, res) => {
  try {
    const markdownTargets = await specificationAPI.getMarkdownTargets();
    res.json(markdownTargets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/specifications/load', async (req, res) => {
  try {
    const { specPath } = req.body;
    await specificationAPI.loadSpecification(specPath);
    res.json({ message: 'Specification loaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/specifications/validate', async (req, res) => {
  try {
    const { specPath } = req.body;
    const validation = await specificationAPI.validateSpecification(specPath);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/specifications/generate', async (req, res) => {
  try {
    const spec = await specificationAPI.generateSpecification();
    res.json({ specification: spec });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Database Integration

#### 5.1 Specification Storage
```sql
-- 명세서 정보를 데이터베이스에 저장
CREATE TABLE specifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tag_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  specification_id INTEGER NOT NULL,
  tag_type_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  patterns TEXT NOT NULL,
  priority INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL,
  related_tags TEXT,
  rules TEXT,
  examples TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specification_id) REFERENCES specifications(id)
);

CREATE TABLE code_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  specification_id INTEGER NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  pattern TEXT NOT NULL,
  extraction TEXT NOT NULL,
  metadata TEXT,
  examples TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specification_id) REFERENCES specifications(id)
);

CREATE TABLE markdown_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  specification_id INTEGER NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  pattern TEXT NOT NULL,
  extraction TEXT NOT NULL,
  metadata TEXT,
  examples TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specification_id) REFERENCES specifications(id)
);
```

#### 5.2 Database Operations
```typescript
class SpecificationDatabase {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async saveSpecification(spec: Specification): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO specifications (name, version, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(spec.name, spec.version, spec.content, spec.createdAt, spec.updatedAt);
    
    // 태그 유형 저장
    for (const tagType of spec.tagTypes) {
      await this.saveTagType(spec.id, tagType);
    }
    
    // 코드 대상 저장
    for (const codeTarget of spec.codeTargets) {
      await this.saveCodeTarget(spec.id, codeTarget);
    }
    
    // 마크다운 대상 저장
    for (const markdownTarget of spec.markdownTargets) {
      await this.saveMarkdownTarget(spec.id, markdownTarget);
    }
  }
  
  async loadSpecification(id: number): Promise<Specification | null> {
    const spec = this.db.prepare(`
      SELECT * FROM specifications WHERE id = ?
    `).get(id);
    
    if (!spec) return null;
    
    const tagTypes = await this.loadTagTypes(id);
    const codeTargets = await this.loadCodeTargets(id);
    const markdownTargets = await this.loadMarkdownTargets(id);
    
    return {
      id: spec.id,
      name: spec.name,
      version: spec.version,
      content: spec.content,
      tagTypes,
      codeTargets,
      markdownTargets,
      createdAt: spec.created_at,
      updatedAt: spec.updated_at
    };
  }
  
  async updateSpecification(id: number, spec: Specification): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE specifications 
      SET name = ?, version = ?, content = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(spec.name, spec.version, spec.content, spec.updatedAt, id);
    
    // 기존 데이터 삭제 후 새로 저장
    await this.deleteSpecificationData(id);
    await this.saveSpecification(spec);
  }
}
```

### 6. Testing Integration

#### 6.1 Specification-based Testing
```typescript
// 명세서 기반 테스트 케이스 생성

describe('Tag Parsing Specifications', () => {
  let specManager: SpecificationManager;
  
  beforeEach(async () => {
    specManager = new SpecificationManager();
    await specManager.loadTagTypesFromSpec();
  });
  
  describe('Tag Type Definitions', () => {
    it('should load all tag types from specification', async () => {
      const tagTypes = globalTagTypeContainer.getAllDefinitions();
      expect(tagTypes).toHaveLength(8);
    });
    
    it('should validate tag type patterns', async () => {
      const functionDefinition = globalTagTypeContainer.getDefinition('function_definition');
      expect(functionDefinition?.patterns).toContain('#기능');
      expect(functionDefinition?.patterns).toContain('#function');
      expect(functionDefinition?.patterns).toContain('#define');
    });
    
    it('should validate tag type priorities', async () => {
      const tagTypes = globalTagTypeContainer.getAllDefinitions();
      const priorities = tagTypes.map(t => t.priority).sort((a, b) => b - a);
      expect(priorities[0]).toBe(10); // function_definition
      expect(priorities[1]).toBe(9);  // requirement
      expect(priorities[2]).toBe(8);  // example, user_scenario, error_type
    });
  });
  
  describe('Code Parsing Targets', () => {
    it('should parse class declarations', async () => {
      const sourceCode = 'class MyClass { }';
      const result = await specManager.codeParser.parseCodeElement(sourceCode, 'class');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('MyClass');
    });
    
    it('should parse interface declarations', async () => {
      const sourceCode = 'interface MyInterface { }';
      const result = await specManager.codeParser.parseCodeElement(sourceCode, 'interface');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('MyInterface');
    });
    
    it('should parse function declarations', async () => {
      const sourceCode = 'function myFunction() { }';
      const result = await specManager.codeParser.parseCodeElement(sourceCode, 'function');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('myFunction');
    });
  });
  
  describe('Markdown Parsing Targets', () => {
    it('should parse headings', async () => {
      const markdown = '# My Heading\n## Another Heading';
      const result = await specManager.markdownParser.parseMarkdownElement(markdown, 'heading');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('My Heading');
      expect(result[1].name).toBe('Another Heading');
    });
    
    it('should parse links', async () => {
      const markdown = '[Link Text](./file.md)';
      const result = await specManager.markdownParser.parseMarkdownElement(markdown, 'link');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Link Text');
    });
    
    it('should parse code blocks', async () => {
      const markdown = '```typescript\nconst code = "example";\n```';
      const result = await specManager.markdownParser.parseMarkdownElement(markdown, 'code');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('typescript');
    });
  });
});
```

#### 6.2 Integration Testing
```typescript
describe('Specification Integration', () => {
  it('should integrate tag types with validation system', async () => {
    const validator = new MarkdownTagTypeValidator();
    const result = await validator.validateTagTypes(
      '## My Heading #기능',
      'test.md',
      'test-project'
    );
    
    expect(result.validations).toHaveLength(1);
    expect(result.validations[0].expectedType).toBe('function_definition');
  });
  
  it('should integrate code targets with parsing system', async () => {
    const parser = new SpecificationCodeParser();
    await parser.loadParsingTargetsFromSpec();
    
    const sourceCode = 'class MyClass { method() { } }';
    const result = parser.parseCodeElement(sourceCode, 'class');
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('MyClass');
  });
  
  it('should integrate markdown targets with parsing system', async () => {
    const parser = new SpecificationMarkdownParser();
    await parser.loadMarkdownTargetsFromSpec();
    
    const markdown = '# My Heading\n[Link](./file.md)';
    const headings = parser.parseMarkdownElement(markdown, 'heading');
    const links = parser.parseMarkdownElement(markdown, 'link');
    
    expect(headings).toHaveLength(1);
    expect(links).toHaveLength(1);
  });
});
```

### 7. Documentation Integration

#### 7.1 Auto-generated Documentation
```typescript
// 명세서에서 자동으로 문서 생성

class SpecificationDocumentationGenerator {
  async generateAPIDocumentation(): Promise<string> {
    const tagTypes = globalTagTypeContainer.getAllDefinitions();
    const codeTargets = await this.loadCodeTargets();
    const markdownTargets = await this.loadMarkdownTargets();
    
    let content = '# API Documentation\n\n';
    
    // 태그 유형 문서
    content += '## Tag Types\n\n';
    for (const tagType of tagTypes) {
      content += `### ${tagType.name}\n\n`;
      content += `**ID**: ${tagType.id}\n\n`;
      content += `**Patterns**: ${tagType.patterns.join(', ')}\n\n`;
      content += `**Priority**: ${tagType.priority}\n\n`;
      content += `**Category**: ${tagType.category}\n\n`;
      content += `**Rules**:\n`;
      for (const rule of tagType.rules) {
        content += `- ${rule}\n`;
      }
      content += '\n';
    }
    
    // 코드 파싱 대상 문서
    content += '## Code Parsing Targets\n\n';
    for (const target of codeTargets) {
      content += `### ${target.type}\n\n`;
      content += `**Pattern**: \`${target.pattern}\`\n\n`;
      content += `**Extraction**: ${target.extraction.join(', ')}\n\n`;
      content += `**Metadata**: ${target.metadata.join(', ')}\n\n`;
    }
    
    // 마크다운 파싱 대상 문서
    content += '## Markdown Parsing Targets\n\n';
    for (const target of markdownTargets) {
      content += `### ${target.type}\n\n`;
      content += `**Pattern**: \`${target.pattern}\`\n\n`;
      content += `**Extraction**: ${target.extraction.join(', ')}\n\n`;
      content += `**Metadata**: ${target.metadata.join(', ')}\n\n`;
    }
    
    return content;
  }
}
```

### 8. Monitoring and Analytics

#### 8.1 Specification Usage Analytics
```typescript
class SpecificationAnalytics {
  private db: Database;
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async trackTagTypeUsage(tagTypeId: string, filePath: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO tag_type_usage (tag_type_id, file_path, used_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(tagTypeId, filePath, new Date());
  }
  
  async trackCodeTargetUsage(targetType: string, filePath: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO code_target_usage (target_type, file_path, used_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(targetType, filePath, new Date());
  }
  
  async trackMarkdownTargetUsage(targetType: string, filePath: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO markdown_target_usage (target_type, file_path, used_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(targetType, filePath, new Date());
  }
  
  async getUsageStatistics(): Promise<UsageStatistics> {
    const tagTypeUsage = this.db.prepare(`
      SELECT tag_type_id, COUNT(*) as usage_count
      FROM tag_type_usage
      GROUP BY tag_type_id
      ORDER BY usage_count DESC
    `).all();
    
    const codeTargetUsage = this.db.prepare(`
      SELECT target_type, COUNT(*) as usage_count
      FROM code_target_usage
      GROUP BY target_type
      ORDER BY usage_count DESC
    `).all();
    
    const markdownTargetUsage = this.db.prepare(`
      SELECT target_type, COUNT(*) as usage_count
      FROM markdown_target_usage
      GROUP BY target_type
      ORDER BY usage_count DESC
    `).all();
    
    return {
      tagTypeUsage,
      codeTargetUsage,
      markdownTargetUsage
    };
  }
}
```

### 9. Performance Optimization

#### 9.1 Specification Caching
```typescript
class SpecificationCache {
  private cache = new Map<string, any>();
  private ttl = new Map<string, number>();
  
  set(key: string, value: any, ttlMs: number = 300000): void { // 5분 기본 TTL
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }
  
  get(key: string): any | null {
    const ttl = this.ttl.get(key);
    if (ttl && Date.now() > ttl) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }
  
  clear(): void {
    this.cache.clear();
    this.ttl.clear();
  }
}
```

#### 9.2 Lazy Loading
```typescript
class LazySpecificationLoader {
  private loadedSpecs = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();
  
  async loadSpecification(specPath: string): Promise<any> {
    if (this.loadedSpecs.has(specPath)) {
      return this.cache.get(specPath);
    }
    
    if (this.loadingPromises.has(specPath)) {
      return this.loadingPromises.get(specPath);
    }
    
    const promise = this.loadSpecificationFromFile(specPath);
    this.loadingPromises.set(specPath, promise);
    
    try {
      const result = await promise;
      this.loadedSpecs.add(specPath);
      this.cache.set(specPath, result);
      return result;
    } finally {
      this.loadingPromises.delete(specPath);
    }
  }
}
```

### 10. Error Handling and Recovery

#### 10.1 Specification Validation
```typescript
class SpecificationValidator {
  validateTagTypeSpec(tagType: TagTypeDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!tagType.id) {
      errors.push('Tag type ID is required');
    }
    
    if (!tagType.name) {
      errors.push('Tag type name is required');
    }
    
    if (!tagType.patterns || tagType.patterns.length === 0) {
      errors.push('Tag type patterns are required');
    }
    
    if (tagType.priority < 1 || tagType.priority > 10) {
      warnings.push('Tag type priority should be between 1 and 10');
    }
    
    if (!tagType.category) {
      warnings.push('Tag type category is recommended');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  validateCodeTargetSpec(target: CodeParsingTarget): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!target.type) {
      errors.push('Code target type is required');
    }
    
    if (!target.pattern) {
      errors.push('Code target pattern is required');
    }
    
    try {
      new RegExp(target.pattern);
    } catch (error) {
      errors.push(`Invalid regex pattern: ${error.message}`);
    }
    
    if (!target.extraction || target.extraction.length === 0) {
      warnings.push('Code target extraction fields are recommended');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

#### 10.2 Error Recovery
```typescript
class SpecificationErrorRecovery {
  async recoverFromSpecificationError(specPath: string, error: Error): Promise<void> {
    console.error(`Specification error in ${specPath}:`, error);
    
    // 백업 명세서 로드 시도
    const backupPath = specPath.replace('.md', '.backup.md');
    if (await fs.exists(backupPath)) {
      console.log('Attempting to load backup specification...');
      await this.loadBackupSpecification(backupPath);
    }
    
    // 기본 명세서 로드 시도
    console.log('Attempting to load default specification...');
    await this.loadDefaultSpecification();
    
    // 오류 보고
    await this.reportSpecificationError(specPath, error);
  }
  
  private async loadBackupSpecification(backupPath: string): Promise<void> {
    // 백업 명세서 로드 로직
  }
  
  private async loadDefaultSpecification(): Promise<void> {
    // 기본 명세서 로드 로직
  }
  
  private async reportSpecificationError(specPath: string, error: Error): Promise<void> {
    // 오류 보고 로직
  }
}
```

이제 specifications 폴더가 태그 파싱 명세서와 코드 파싱 대상들을 체계적으로 관리할 수 있도록 확장되었습니다. 이 통합을 통해 명세서 기반의 파싱 시스템을 구축하고, 동적으로 파싱 규칙을 관리할 수 있게 됩니다.
