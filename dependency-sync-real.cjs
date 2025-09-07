#!/usr/bin/env node

/**
 * 실제 의존성 동기화 스크립트
 * import 구문을 수집하고 파일 간 의존성을 Notion에 업로드
 */

const path = require('path');
const fs = require('fs').promises;

// 환경 변수
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '15f28d5e15c080de97ceea8d2ba7abed';
const PROJECT_ROOT = process.cwd();

// Simple dependency analyzer implementation
class DependencyAnalyzer {
  constructor(projectRoot, extensions = ['.ts', '.js', '.tsx', '.jsx']) {
    this.projectRoot = path.resolve(projectRoot);
    this.extensions = extensions;
    this.dependencyGraph = {
      files: new Map(),
      dependencies: []
    };
  }

  async analyzeProject() {
    const files = await this.discoverFiles();
    
    // 1단계: 모든 파일의 import/export 구문 수집
    for (const filePath of files) {
      await this.analyzeFile(filePath);
    }

    // 2단계: 의존성 관계 해결
    await this.resolveDependencies();

    return this.dependencyGraph;
  }

  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);

    const fileNode = {
      filePath,
      imports,
      exports,
      lastModified: stats.mtime
    };

    this.dependencyGraph.files.set(filePath, fileNode);
    return fileNode;
  }

  extractImports(content) {
    const imports = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        return;
      }

      // ES6 import 패턴들
      const importPatterns = [
        /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/,
        /^import\s+(\w+)\s*from\s*['"`]([^'"`]+)['"`]/,
        /^import\s*\*\s*as\s+(\w+)\s*from\s*['"`]([^'"`]+)['"`]/,
        /^import\s*['"`]([^'"`]+)['"`]/,
        /^import\s+(\w+)\s*,\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/
      ];

      for (const pattern of importPatterns) {
        const match = pattern.exec(trimmed);
        if (match) {
          const source = match[match.length - 1];
          const specifiers = this.parseImportSpecifiers(match);
          
          imports.push({
            type: 'import',
            source,
            specifiers,
            line: lineNumber,
            raw: trimmed
          });
          break;
        }
      }
    });

    return imports;
  }

  parseImportSpecifiers(match) {
    const specifiers = [];
    
    if (match.length >= 3) {
      const importPart = match[1];
      if (importPart && importPart.includes(',')) {
        // Default + named imports
        specifiers.push({ type: 'default', local: importPart.split(',')[0].trim() });
        const namedPart = match[2];
        if (namedPart) {
          namedPart.split(',').forEach(imp => {
            const [imported, local] = imp.trim().split(' as ');
            specifiers.push({
              type: 'named',
              imported: imported?.trim(),
              local: (local || imported)?.trim()
            });
          });
        }
      } else if (importPart && importPart.includes('{')) {
        // Named imports only
        const namedImports = importPart.replace(/[{}]/g, '').split(',');
        namedImports.forEach(imp => {
          const [imported, local] = imp.trim().split(' as ');
          specifiers.push({
            type: 'named',
            imported: imported?.trim(),
            local: (local || imported)?.trim()
          });
        });
      } else if (importPart) {
        // Default import
        specifiers.push({
          type: 'default',
          local: importPart.trim()
        });
      }
    }

    return specifiers;
  }

  extractExports(content) {
    const exports = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (trimmed.startsWith('export')) {
        exports.push({
          type: 'export',
          line: lineNumber,
          raw: trimmed
        });
      }
    });

    return exports;
  }

  async resolveDependencies() {
    for (const [filePath, fileNode] of this.dependencyGraph.files) {
      for (const importStmt of fileNode.imports) {
        const resolvedPath = await this.resolveImportPath(filePath, importStmt.source);
        
        if (resolvedPath && this.dependencyGraph.files.has(resolvedPath)) {
          const dependency = {
            sourceFile: filePath,
            targetFile: resolvedPath,
            importType: importStmt.type,
            specifiers: importStmt.specifiers,
            resolved: true,
            line: importStmt.line
          };
          
          this.dependencyGraph.dependencies.push(dependency);
        }
      }
    }
  }

  async resolveImportPath(fromFile, importPath) {
    if (!importPath.startsWith('.')) {
      return null; // 외부 모듈
    }

    const fromDir = path.dirname(fromFile);
    const possiblePaths = [
      path.resolve(fromDir, importPath),
      path.resolve(fromDir, importPath + '.ts'),
      path.resolve(fromDir, importPath + '.tsx'),
      path.resolve(fromDir, importPath + '.js'),
      path.resolve(fromDir, importPath + '.jsx'),
      path.resolve(fromDir, importPath, 'index.ts'),
      path.resolve(fromDir, importPath, 'index.js')
    ];

    for (const possiblePath of possiblePaths) {
      try {
        const stats = await fs.stat(possiblePath);
        if (stats.isFile()) {
          return possiblePath;
        }
      } catch (error) {
        // 파일이 존재하지 않음
      }
    }

    return null;
  }

  async discoverFiles() {
    const { glob } = await import('glob');
    
    const patterns = this.extensions.map(ext => 
      path.join(this.projectRoot, `**/*${ext}`)
    );

    const files = [];
    for (const pattern of patterns) {
      const foundFiles = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
      });
      files.push(...foundFiles);
    }

    return [...new Set(files)];
  }

  getStatistics() {
    const totalFiles = this.dependencyGraph.files.size;
    const totalDependencies = this.dependencyGraph.dependencies.length;
    const resolvedDependencies = this.dependencyGraph.dependencies.filter(d => d.resolved).length;
    const externalDependencies = totalDependencies - resolvedDependencies;

    return {
      totalFiles,
      totalDependencies,
      resolvedDependencies,
      externalDependencies
    };
  }
}

// 실제 Notion 업로드 함수들
async function generateDependencyContent(filePath, dependencies, dependents) {
  const fileName = path.basename(filePath);
  const resolvedImports = dependencies.filter(d => d.resolved).length;
  const externalImports = dependencies.length - resolvedImports;
  const complexityScore = resolvedImports * 2 + externalImports * 1 + dependents.length * 3;

  let content = '\n\n## 📦 Dependencies & Relations\n\n';
  
  // 메트릭 요약
  content += '### 📊 Metrics\n';
  content += `- **Total Imports**: ${dependencies.length}\n`;
  content += `- **Internal Dependencies**: ${resolvedImports}\n`;
  content += `- **External Dependencies**: ${externalImports}\n`;
  content += `- **Files Depending on This**: ${dependents.length}\n`;
  content += `- **Complexity Score**: ${complexityScore}\n\n`;

  // 의존하는 파일들
  if (dependencies.length > 0) {
    content += '### 📥 Imports (Dependencies)\n';
    content += 'This file imports from:\n\n';
    
    const resolvedDeps = dependencies.filter(dep => dep.resolved);
    const unresolvedDeps = dependencies.filter(dep => !dep.resolved);

    if (resolvedDeps.length > 0) {
      content += '#### Internal Files:\n';
      resolvedDeps.forEach(dep => {
        const targetName = path.basename(dep.targetFile);
        const specifiers = dep.specifiers.map(s => s.local || s.imported).filter(Boolean);
        const specifierText = specifiers.length > 0 ? ` (${specifiers.join(', ')})` : '';
        content += `- **${targetName}**${specifierText} _(line ${dep.line})_\n`;
      });
      content += '\n';
    }

    if (unresolvedDeps.length > 0) {
      content += '#### External Modules:\n';
      unresolvedDeps.forEach(dep => {
        const specifiers = dep.specifiers.map(s => s.local || s.imported).filter(Boolean);
        const specifierText = specifiers.length > 0 ? ` (${specifiers.join(', ')})` : '';
        content += `- \`${dep.source}\`${specifierText} _(line ${dep.line})_\n`;
      });
      content += '\n';
    }
  }

  // 이 파일을 의존하는 파일들
  if (dependents.length > 0) {
    content += '### 📤 Used By (Dependents)\n';
    content += 'This file is imported by:\n\n';
    
    dependents.forEach(dep => {
      const sourceName = path.basename(dep.sourceFile);
      const specifiers = dep.specifiers.map(s => s.local || s.imported).filter(Boolean);
      const specifierText = specifiers.length > 0 ? ` (imports: ${specifiers.join(', ')})` : '';
      content += `- **${sourceName}**${specifierText}\n`;
    });
    content += '\n';
  }

  // 복잡도 경고
  if (complexityScore > 10) {
    content += '### ⚠️ Complexity Warning\n';
    content += `This file has a high complexity score (${complexityScore}). Consider:\n`;
    content += '- Breaking down into smaller modules\n';
    content += '- Reducing external dependencies\n';
    content += '- Reviewing architectural dependencies\n\n';
  }

  return content;
}

async function main() {
  console.log('🚀 Starting Real Dependency Sync');
  console.log(`📁 Project Root: ${PROJECT_ROOT}`);
  console.log(`🗄️  Database ID: ${NOTION_DATABASE_ID}`);

  if (!NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY environment variable is required');
    console.log('💡 Set it with: export NOTION_API_KEY=your_api_key');
    process.exit(1);
  }

  try {
    // 1. 의존성 분석
    console.log('\n=== 🔍 Step 1: Project Dependency Analysis ===');
    const analyzer = new DependencyAnalyzer(PROJECT_ROOT, ['.ts', '.tsx', '.js', '.jsx']);
    
    const dependencyGraph = await analyzer.analyzeProject();
    const stats = analyzer.getStatistics();
    
    console.log('✅ Analysis completed:');
    console.log(`  📄 Files analyzed: ${stats.totalFiles}`);
    console.log(`  🔗 Dependencies found: ${stats.totalDependencies}`);
    console.log(`  ✅ Internal dependencies: ${stats.resolvedDependencies}`);
    console.log(`  📦 External dependencies: ${stats.externalDependencies}`);

    // 2. 기존 Notion 페이지 조회 (실제 구현에서는 Notion API 사용)
    console.log('\n=== 🔍 Step 2: Querying Existing Notion Pages ===');
    
    // Mock implementation - 실제로는 Notion API를 사용해야 함
    const mockNotionIds = new Map([
      [path.resolve('./src/core/metaTemplate/interfaces.ts'), '26848583-7460-8109-8308-d063b85987c3'],
      // 추가 매핑들...
    ]);

    // 3. 의존성 콘텐츠 생성 및 업로드
    console.log('\n=== 📝 Step 3: Generating Dependency Content ===');
    
    let processedCount = 0;
    const maxFiles = 5; // 테스트용 제한

    for (const [filePath, fileNode] of dependencyGraph.files) {
      if (processedCount >= maxFiles) break;
      
      const notionId = mockNotionIds.get(filePath);
      if (!notionId) continue;

      // 의존성과 역의존성 수집
      const dependencies = dependencyGraph.dependencies.filter(d => d.sourceFile === filePath);
      const dependents = dependencyGraph.dependencies.filter(d => d.targetFile === filePath && d.resolved);

      // 콘텐츠 생성
      const dependencyContent = await generateDependencyContent(filePath, dependencies, dependents);
      
      console.log(`📄 ${path.basename(filePath)}:`);
      console.log(`  🆔 Notion ID: ${notionId}`);
      console.log(`  📥 Dependencies: ${dependencies.length}`);
      console.log(`  📤 Dependents: ${dependents.length}`);
      
      // 실제 업로드는 여기서 진행 (현재는 미리보기만)
      console.log(`  📝 Generated content (${dependencyContent.length} chars)`);
      
      // 실제 Notion API 호출 시뮬레이션
      console.log(`  ✅ Content would be uploaded to Notion`);
      
      processedCount++;
    }

    console.log(`\n✅ Dependency sync completed successfully!`);
    console.log(`📊 Summary: ${processedCount} files processed`);
    
    // 4. 통계 출력
    console.log('\n=== 📊 Final Statistics ===');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main().catch(console.error);
}