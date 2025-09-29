/**
 * 관계 추론 데모
 * Transitive와 Hierarchical 관계 추론 시연
 */

import { GraphDatabase } from '../src/database/GraphDatabase';
import { FileDependencyAnalyzer, ImportSource } from '../src/database/services/FileDependencyAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

async function runInferenceDemo() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 관계 추론 데모 - Transitive & Hierarchical Relationships');
  console.log('='.repeat(80) + '\n');

  const projectRoot = '/test-project';
  const dbPath = path.join(process.cwd(), '.tmp', 'inference-demo.db');

  // DB 초기화
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new GraphDatabase(dbPath);
  await db.initialize();
  const analyzer = new FileDependencyAnalyzer(db, projectRoot);

  // ========== 시나리오 구성 ==========
  console.log('📝 시나리오: 의존성 체인 구축');
  console.log('-'.repeat(80));
  console.log('\n파일 구조:');
  console.log('  App.tsx → utils/helpers.ts → lib/math.ts');
  console.log('  App.tsx → react (library)');
  console.log('  utils/helpers.ts → lodash (library)\n');

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
      source: '../utils/helpers',
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

  // ========== 1. 직접 관계 ==========
  console.log('='.repeat(80));
  console.log('\n📊 1. 직접 관계 (Direct Relationships)\n');

  const importEdges = await db.getEdgesByType('imports');

  console.log('모든 직접 imports 관계:');
  importEdges.forEach((edge) => {
    const from = edge.fromNode?.identifier?.split('::').pop() || 'unknown';
    const to = edge.toNode?.identifier?.split('::').pop() || 'unknown';
    console.log(`  ${from} --[imports]--> ${to}`);
  });

  // ========== 2. Schema 확인 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n⚙️  2. Edge Type 추론 규칙 (schema.sql 정의)\n');

  console.log('추론 가능한 Edge Types:');
  console.log('  • depends_on: 일반적인 의존성 (transitive=true)');
  console.log('    → A→B, B→C이면 A→C도 성립');
  console.log('  • imports: 파일 import (parent: depends_on)');
  console.log('    → imports는 자동으로 depends_on을 암시함');
  console.log('  • contains: 포함 관계 (transitive=true, inheritable=true)');
  console.log('    → 파일이 클래스를 포함하면 그 클래스의 메서드도 포함');

  // ========== 3. Transitive 추론 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n🔄 3. Transitive 관계 추론');
  console.log('-'.repeat(80) + '\n');

  console.log('개념:');
  console.log('  A --[depends_on]--> B');
  console.log('  B --[depends_on]--> C');
  console.log('  ⇒ A --[depends_on]--> C (추론됨)\n');

  console.log('현재 체인:');
  console.log('  App.tsx --[imports]--> helpers.ts');
  console.log('  helpers.ts --[imports]--> math.ts');
  console.log('  ⇒ App.tsx는 간접적으로 math.ts에 의존\n');

  console.log('추론 쿼리 (Recursive CTE):');
  console.log('  SQL로 재귀적으로 의존성 체인을 탐색');
  console.log('  depth=1: 직접 의존성');
  console.log('  depth=2: 2단계 간접 의존성');
  console.log('  depth=3: 3단계 간접 의존성\n');

  // ========== 4. Hierarchical 관계 ==========
  console.log('='.repeat(80));
  console.log('\n🏗️  4. 계층적 관계 (Hierarchical)\n');

  console.log('계층 구조:');
  console.log('  depends_on (상위 개념)');
  console.log('    ├─ imports (파일 import)');
  console.log('    ├─ calls (메서드 호출)');
  console.log('    ├─ references (참조)');
  console.log('    └─ uses (사용)\n');

  console.log('의미:');
  console.log('  A --[imports]--> B 이면');
  console.log('  자동으로 A --[depends_on]--> B 도 성립\n');

  console.log('장점:');
  console.log('  • 구체적인 관계 타입(imports)과 일반적인 개념(depends_on) 모두 사용 가능');
  console.log('  • 세밀한 분석(imports만)과 광범위한 분석(depends_on 전체) 모두 지원');

  // ========== 5. 의존성 트리 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n🌳 5. 의존성 트리 (Dependency Tree)\n');

  const tree = await analyzer.getDependencyTree(fileA, 3);

  function printTree(node: any, indent: string = '', isLast: boolean = true) {
    const connector = isLast ? '└── ' : '├── ';
    const fileName = node.file.split('/').pop();
    const typeIcon = node.type === 'library' ? '📦' : '📄';
    console.log(`${indent}${connector}${typeIcon} ${fileName}`);

    if (node.dependencies && node.dependencies.length > 0) {
      const newIndent = indent + (isLast ? '    ' : '│   ');
      node.dependencies.forEach((dep: any, index: number) => {
        printTree(dep, newIndent, index === node.dependencies.length - 1);
      });
    }
  }

  printTree(tree);

  // ========== 6. 실제 활용 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 6. 실제 활용 시나리오\n');

  console.log('1️⃣  순환 의존성 탐지:');
  console.log('  const cycles = await db.findCircularDependencies();');
  console.log('  → Transitive 추론으로 간접 순환까지 탐지\n');

  console.log('2️⃣  영향 분석:');
  console.log('  const dependents = await db.findNodeDependents(nodeId);');
  console.log('  → 이 파일을 변경하면 영향받는 모든 파일 추적\n');

  console.log('3️⃣  리팩토링 계획:');
  console.log('  const dependencies = await db.findNodeDependencies(nodeId);');
  console.log('  → 이 모듈을 제거하려면 수정해야 할 곳 파악\n');

  console.log('4️⃣  레이어 검증:');
  console.log('  const path = await db.findDependencyPath(uiNode, dbNode);');
  console.log('  → UI 레이어가 DB 레이어를 직접 참조하는지 확인\n');

  // ========== 7. 추론 캐시 ==========
  console.log('='.repeat(80));
  console.log('\n💡 7. 추론 캐시 (edge_inference_cache)\n');

  console.log('성능 최적화:');
  console.log('  • 추론된 관계를 캐시 테이블에 미리 저장');
  console.log('  • 매번 재귀 쿼리 없이 빠른 조회');
  console.log('  • edge 변경 시 자동 무효화 (trigger)\n');

  console.log('Cache 구조:');
  console.log('  CREATE TABLE edge_inference_cache (');
  console.log('    start_node_id INTEGER,');
  console.log('    end_node_id INTEGER,');
  console.log('    inferred_type TEXT,      -- 추론된 관계 타입');
  console.log('    edge_path TEXT,          -- 추론 경로');
  console.log('    depth INTEGER            -- 추론 깊이');
  console.log('  );\n');

  // ========== 8. 통계 ==========
  console.log('='.repeat(80));
  console.log('\n📈 8. 그래프 통계\n');

  const stats = await db.getStatistics();

  console.log('노드:');
  Object.entries(stats).forEach(([key, value]) => {
    if (key.includes('Nodes')) {
      console.log(`  ${key}: ${value}`);
    }
  });

  console.log('\n관계:');
  Object.entries(stats).forEach(([key, value]) => {
    if (key.includes('Edges') || key.includes('Relationships')) {
      console.log(`  ${key}: ${value}`);
    }
  });

  // ========== 완료 ==========
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 데모 완료!');
  console.log('='.repeat(80) + '\n');

  console.log('핵심 개념 요약:');
  console.log('  1️⃣  직접 관계: 코드에서 직접 추출 (imports, calls)');
  console.log('  2️⃣  Transitive: A→B→C ⇒ A→C (재귀적 추론)');
  console.log('  3️⃣  Hierarchical: imports는 depends_on의 특수 형태');
  console.log('  4️⃣  추론 캐시: 성능을 위한 사전 계산 저장');
  console.log('  5️⃣  실용성: 순환 탐지, 영향 분석, 리팩토링 계획\n');

  console.log(`📁 데이터베이스: ${dbPath}`);
  console.log(`📖 Schema: src/database/schema.sql\n`);

  await db.close();
}

runInferenceDemo().catch(console.error);