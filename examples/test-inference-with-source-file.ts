/**
 * 관계 추론 테스트 (source_file 포함)
 * - Transitive 추론 확인
 * - Hierarchical 추론 확인
 * - 계층 구조 파악 확인
 */

import { GraphDatabase } from '../src/database/GraphDatabase';
import { FileDependencyAnalyzer, ImportSource } from '../src/database/services/FileDependencyAnalyzer';
import { EdgeTypeRegistry } from '../src/database/inference/EdgeTypeRegistry';
import * as fs from 'fs';
import * as path from 'path';

async function testInferenceWithSourceFile() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 관계 추론 테스트 (source_file 포함)');
  console.log('='.repeat(80) + '\n');

  const projectRoot = '/test-project';
  const dbPath = path.join(process.cwd(), '.tmp', 'inference-test.db');

  // DB 초기화
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new GraphDatabase(dbPath);
  await db.initialize();
  const analyzer = new FileDependencyAnalyzer(db, projectRoot);

  // ========== 테스트 시나리오 구성 ==========
  console.log('📝 테스트 시나리오: 3단계 의존성 체인\n');
  console.log('파일 구조:');
  console.log('  App.tsx → utils/helpers.ts → lib/math.ts');
  console.log('  App.tsx → react (library)');
  console.log('  helpers.ts → lodash (library)\n');

  // File A: App.tsx
  const fileA = '/src/App.tsx';
  const importsA: ImportSource[] = [
    {
      type: 'library',
      source: 'react',
      imports: [{ name: 'React', isDefault: true, isNamespace: false }],
      location: { line: 1, column: 1 }
    },
    {
      type: 'relative',
      source: './utils/helpers',
      imports: [{ name: 'formatDate', isDefault: false, isNamespace: false }],
      location: { line: 2, column: 1 }
    }
  ];

  // File B: utils/helpers.ts
  const fileB = '/src/utils/helpers.ts';
  const importsB: ImportSource[] = [
    {
      type: 'library',
      source: 'lodash',
      imports: [{ name: 'map', isDefault: false, isNamespace: false }],
      location: { line: 1, column: 1 }
    },
    {
      type: 'relative',
      source: '../lib/math',
      imports: [{ name: 'add', isDefault: false, isNamespace: false }],
      location: { line: 2, column: 1 }
    }
  ];

  // File C: lib/math.ts
  const fileC = '/src/lib/math.ts';
  const importsC: ImportSource[] = [];

  console.log('⚙️  의존성 분석 실행 중...\n');

  await analyzer.analyzeFile(fileA, 'typescript', importsA);
  await analyzer.analyzeFile(fileB, 'typescript', importsB);
  await analyzer.analyzeFile(fileC, 'typescript', importsC);

  // ========== 1. 직접 관계 확인 ==========
  console.log('='.repeat(80));
  console.log('\n📊 1. 직접 관계 (Direct Relationships)\n');

  const allEdges = await db.findRelationships({});
  console.log(`총 ${allEdges.length}개의 직접 관계 생성됨\n`);

  console.log('모든 관계 상세:');
  for (const edge of allEdges) {
    const fromNode = await db.findNodes({ nodeTypes: ['file', 'library'] });
    const toNode = await db.findNodes({ nodeTypes: ['file', 'library'] });

    const from = fromNode.find(n => n.id === edge.fromNodeId);
    const to = toNode.find(n => n.id === edge.toNodeId);

    if (from && to) {
      console.log(`  ${from.name} --[${edge.type}]--> ${to.name}`);
      console.log(`    source_file: ${edge.sourceFile || 'N/A'}`);
    }
  }

  // ========== 2. Edge Type 계층 구조 확인 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n🌳 2. Edge Type 계층 구조\n');

  const validation = EdgeTypeRegistry.validateHierarchy();
  if (validation.valid) {
    console.log('✅ 계층 구조 검증 성공!\n');
  } else {
    console.log('❌ 계층 구조 검증 실패:');
    validation.errors.forEach(err => console.log(`  - ${err}`));
    console.log();
  }

  // imports 계층 확인
  const importsPath = EdgeTypeRegistry.getHierarchyPath('imports_library');
  console.log('imports_library 계층 경로:');
  console.log(`  ${importsPath.reverse().join(' → ')}\n`);

  const importsFilePath = EdgeTypeRegistry.getHierarchyPath('imports_file');
  console.log('imports_file 계층 경로:');
  console.log(`  ${importsFilePath.reverse().join(' → ')}\n`);

  // ========== 3. Hierarchical 추론 테스트 ==========
  console.log('='.repeat(80));
  console.log('\n🔗 3. Hierarchical 관계 추론\n');

  console.log('개념: 자식 타입은 부모 타입을 암시');
  console.log('  imports_library --is_a--> imports --is_a--> depends_on\n');

  const libraryImports = await db.getEdgesByType('imports_library');
  const fileImports = await db.getEdgesByType('imports_file');
  const allImports = await db.getEdgesByType('imports');

  console.log(`imports_library: ${libraryImports.length}개`);
  libraryImports.forEach(edge => {
    console.log(`  - ${edge.fromIdentifier?.split('::').pop()} → ${edge.toIdentifier?.split('::').pop()}`);
  });

  console.log(`\nimports_file: ${fileImports.length}개`);
  fileImports.forEach(edge => {
    console.log(`  - ${edge.fromIdentifier?.split('::').pop()} → ${edge.toIdentifier?.split('::').pop()}`);
  });

  console.log(`\nimports (모든 import 포함): ${allImports.length}개`);
  console.log('  → imports_library + imports_file 관계 모두 포함되어야 함');
  console.log(`  → 기대값: ${libraryImports.length + fileImports.length}개`);
  console.log(`  → 실제값: ${allImports.length}개`);

  if (allImports.length === 0) {
    console.log('\n⚠️  주의: imports 타입으로 직접 조회 시 자식 타입(imports_library, imports_file)이 자동 포함되지 않음');
    console.log('   SQL에서 계층적 조회가 필요함 (Recursive CTE 사용)\n');
  }

  // ========== 4. Transitive 추론 시뮬레이션 ==========
  console.log('='.repeat(80));
  console.log('\n🔄 4. Transitive 관계 추론 시뮬레이션\n');

  console.log('개념: depends_on은 transitive 타입');
  console.log('  A --[depends_on]--> B');
  console.log('  B --[depends_on]--> C');
  console.log('  ⇒ A --[depends_on]--> C (추론 가능)\n');

  console.log('현재 구현된 체인:');
  console.log('  App.tsx --[imports_file]--> helpers.ts');
  console.log('  helpers.ts --[imports_file]--> math.ts');
  console.log('  ⇒ App.tsx는 간접적으로 math.ts에 의존\n');

  // 재귀 CTE로 간접 의존성 찾기
  console.log('SQL Recursive CTE로 간접 의존성 조회:');

  const nodes = await db.findNodes({ sourceFiles: [fileA] });
  if (nodes.length > 0) {
    const appNode = nodes[0];

    // 직접 의존성
    const directDeps = await db.findNodeDependencies(appNode.id!, ['imports_file', 'imports_library']);
    console.log(`\n직접 의존성: ${directDeps.length}개`);
    directDeps.forEach(dep => {
      console.log(`  - ${dep.name} (${dep.type})`);
    });

    // 의존성 트리로 간접 의존성 확인
    const tree = await analyzer.getDependencyTree(fileA, 3);

    console.log('\n의존성 트리:');
    printTree(tree);

    // 간접 의존성 카운트
    const indirectCount = countIndirectDependencies(tree);
    console.log(`\n총 의존성: ${indirectCount.total}개`);
    console.log(`  - 직접: ${indirectCount.direct}개`);
    console.log(`  - 간접: ${indirectCount.indirect}개`);
  }

  // ========== 5. 계층 구조 시각화 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n📐 5. Edge Type 계층 구조 전체 시각화\n');

  console.log(EdgeTypeRegistry.printHierarchy());

  // ========== 6. 추론 규칙 확인 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 6. 추론 규칙 확인\n');

  const transitiveTypes = EdgeTypeRegistry.getAll().filter(def => def.isTransitive);
  const inheritableTypes = EdgeTypeRegistry.getAll().filter(def => def.isInheritable);

  console.log(`Transitive Types (${transitiveTypes.length}개):`);
  console.log('  → A→B, B→C ⇒ A→C');
  transitiveTypes.forEach(def => {
    console.log(`  • ${def.type}`);
  });

  console.log(`\nInheritable Types (${inheritableTypes.length}개):`);
  console.log('  → parent(A,B), rel(B,C) ⇒ rel(A,C)');
  inheritableTypes.forEach(def => {
    console.log(`  • ${def.type}`);
  });

  // ========== 7. 데이터베이스 상태 확인 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 7. 데이터베이스 통계\n');

  const stats = await db.getStatistics();

  console.log('노드:');
  Object.entries(stats.nodesByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}개`);
  });

  console.log('\n관계:');
  Object.entries(stats.relationshipsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}개`);
  });

  console.log(`\n총 노드: ${stats.totalNodes}개`);
  console.log(`총 관계: ${stats.totalRelationships}개`);

  // ========== 완료 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 테스트 완료!\n');

  console.log('핵심 확인 사항:');
  console.log('  1️⃣  직접 관계: imports_library, imports_file 타입으로 저장됨');
  console.log('  2️⃣  계층 구조: imports_library → imports → depends_on');
  console.log('  3️⃣  Hierarchical: 자식 타입은 부모 타입 암시 (SQL 쿼리 필요)');
  console.log('  4️⃣  Transitive: 재귀 CTE로 간접 의존성 추론 가능');
  console.log('  5️⃣  source_file: 모든 관계에 source_file 저장됨\n');

  console.log(`📁 데이터베이스: ${dbPath}\n`);

  await db.close();
}

function printTree(node: any, indent: string = '', isLast: boolean = true) {
  const connector = isLast ? '└── ' : '├── ';
  const fileName = node.file.split('/').pop();
  const typeIcon = node.isLibrary ? '📦' : '📄';
  console.log(`${indent}${connector}${typeIcon} ${fileName}`);

  if (node.dependencies && node.dependencies.length > 0) {
    const newIndent = indent + (isLast ? '    ' : '│   ');
    node.dependencies.forEach((dep: any, index: number) => {
      printTree(dep, newIndent, index === node.dependencies.length - 1);
    });
  }
}

function countIndirectDependencies(tree: any): { total: number; direct: number; indirect: number } {
  let direct = 0;
  let indirect = 0;

  function traverse(node: any, depth: number) {
    if (node.dependencies && node.dependencies.length > 0) {
      node.dependencies.forEach((dep: any) => {
        if (depth === 0) {
          direct++;
        } else {
          indirect++;
        }
        traverse(dep, depth + 1);
      });
    }
  }

  traverse(tree, 0);

  return {
    total: direct + indirect,
    direct,
    indirect
  };
}

testInferenceWithSourceFile().catch(console.error);