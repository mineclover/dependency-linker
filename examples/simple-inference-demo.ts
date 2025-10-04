/**
 * 간단한 관계 추론 데모
 * 현재 프로젝트의 실제 파일을 기반으로 의존성 그래프 추론을 시연
 */

import { runFileDependencyAnalysisExample } from "../src/database/examples/FileDependencyExample";
import { GraphDatabase } from "../src/database/GraphDatabase";
import * as fs from "fs";
import * as path from "path";

async function demonstrateInference() {
	console.log("\n" + "=".repeat(80));
	console.log(
		"🔍 Graph Inference Demo - Transitive & Hierarchical Relationships",
	);
	console.log("=".repeat(80) + "\n");

	const projectRoot = process.cwd();
	const dbPath = path.join(projectRoot, ".tmp", "inference-demo.db");

	// 기존 DB 삭제
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath);
	}

	console.log("📝 Step 1: 실제 프로젝트 의존성 분석");
	console.log("-".repeat(80));

	// 실제 프로젝트 파일을 분석
	const result = await runFileDependencyAnalysisExample(dbPath, projectRoot);

	console.log(`\n✅ 분석 완료:`);
	console.log(`  - 총 노드: ${result.stats.totalNodes}개`);
	console.log(`  - 총 관계: ${result.stats.totalRelationships}개`);
	console.log(`  - 미싱 링크: ${result.stats.missingLinks}개\n`);

	// DB 재연결하여 추가 쿼리 실행
	const db = new GraphDatabase(dbPath);
	await db.initialize();

	console.log("=".repeat(80));
	console.log("\n📊 Step 2: 직접 관계 (Direct Relationships)");
	console.log("-".repeat(80) + "\n");

	// 파일 간 직접 의존성
	const directEdges = await db.getEdgesByType("imports", { limit: 10 });

	console.log(`직접 imports 관계 샘플 (최대 10개):`);
	for (const edge of directEdges) {
		const fromNode =
			edge.fromNode?.name || edge.fromNode?.identifier || "unknown";
		const toNode = edge.toNode?.name || edge.toNode?.identifier || "unknown";
		console.log(`  ${fromNode} --[imports]--> ${toNode}`);
	}

	console.log("\n" + "=".repeat(80));
	console.log("\n🔄 Step 3: Transitive 관계 추론 개념");
	console.log("-".repeat(80) + "\n");

	console.log("Transitive 관계란?");
	console.log("  A --[depends_on]--> B");
	console.log("  B --[depends_on]--> C");
	console.log("  ⇒ A --[depends_on]--> C (추론됨)\n");

	console.log("Schema에서 정의된 Transitive 타입:");
	console.log("  • depends_on: 일반적인 의존성 (transitive=true)");
	console.log("  • contains: 포함 관계 (transitive=true)");
	console.log("  • belongs_to: 소속 관계 (transitive=true)\n");

	console.log("예시:");
	console.log("  App.tsx → utils/helpers.ts → lib/math.ts");
	console.log("  ⇒ App.tsx는 간접적으로 lib/math.ts에 의존\n");

	console.log("\n" + "=".repeat(80));
	console.log("\n🏗️  Step 4: 계층적 관계 (Hierarchical Relationships)");
	console.log("-".repeat(80) + "\n");

	console.log("계층적 관계란?");
	console.log("  imports는 depends_on의 특수한 형태 (parent 관계)");
	console.log("  → imports 관계는 자동으로 depends_on을 암시함\n");

	console.log("Schema 정의:");
	console.log("  • imports (parent: depends_on)");
	console.log("  • calls (parent: depends_on)");
	console.log("  • references (parent: depends_on)");
	console.log("  • uses (parent: depends_on)\n");

	console.log("의미:");
	console.log("  A --[imports]--> B 이면");
	console.log("  자동으로 A --[depends_on]--> B 도 성립\n");

	console.log("\n" + "=".repeat(80));
	console.log("\n⚙️  Step 5: Edge Type 추론 규칙");
	console.log("-".repeat(80) + "\n");

	console.log("Edge Type 속성:");
	console.log("  1. is_transitive: A→B, B→C ⇒ A→C");
	console.log("  2. is_inheritable: parent(A,B), rel(B,C) ⇒ rel(A,C)");
	console.log("  3. parent_type: 계층 구조 (imports → depends_on)\n");

	console.log("추론 규칙 조합:");
	console.log("  • imports(A,B) + is_transitive ⇒ depends_on(A,B)");
	console.log("  • depends_on(B,C) + transitive ⇒ depends_on(A,C)");
	console.log("  • 결과: imports(A,B) + depends_on(B,C) ⇒ depends_on(A,C)\n");

	console.log("\n" + "=".repeat(80));
	console.log("\n🎯 Step 6: 실제 활용 예시");
	console.log("-".repeat(80) + "\n");

	console.log("1️⃣  순환 의존성 탐지:");
	console.log("  transitive 추론으로 간접 순환 찾기");
	console.log("  A → B → C → A (직접+추론 조합)\n");

	console.log("2️⃣  영향 분석:");
	console.log('  "이 파일을 변경하면 어떤 파일들이 영향받는가?"');
	console.log("  → transitive depends_on 관계로 모든 의존 파일 추적\n");

	console.log("3️⃣  리팩토링 계획:");
	console.log('  "이 모듈을 제거하면 어디를 수정해야 하는가?"');
	console.log("  → 계층적 관계로 직접/간접 의존성 모두 파악\n");

	console.log("4️⃣  아키텍처 검증:");
	console.log('  "레이어 규칙이 지켜지고 있는가?"');
	console.log("  → UI 레이어가 DB 레이어를 직접 참조하는지 추론으로 탐지\n");

	console.log("\n" + "=".repeat(80));
	console.log("\n💡 Step 7: 추론 캐시 (edge_inference_cache)");
	console.log("-".repeat(80) + "\n");

	console.log("성능 최적화:");
	console.log("  • 추론된 관계를 캐시 테이블에 저장");
	console.log("  • 매번 재계산 없이 빠른 조회");
	console.log("  • edge 변경 시 자동 무효화 (trigger)\n");

	console.log("Cache 구조:");
	console.log("  - start_node_id, end_node_id");
	console.log("  - inferred_type (추론된 관계 타입)");
	console.log("  - edge_path (추론 경로)");
	console.log("  - depth (추론 깊이)\n");

	console.log("\n" + "=".repeat(80));
	console.log("\n✅ 데모 완료!");
	console.log("=".repeat(80) + "\n");

	console.log("핵심 개념 요약:");
	console.log("  1️⃣  직접 관계: 코드에서 직접 추출 (imports, calls 등)");
	console.log("  2️⃣  Transitive: A→B→C ⇒ A→C (재귀적 추론)");
	console.log("  3️⃣  Hierarchical: imports는 depends_on의 특수 형태");
	console.log("  4️⃣  추론 캐시: 성능을 위한 사전 계산 결과 저장");
	console.log("  5️⃣  실용성: 순환 탐지, 영향 분석, 리팩토링 계획에 활용\n");

	console.log(`📁 생성된 DB: ${dbPath}`);
	console.log(`📖 Schema: src/database/schema.sql\n`);

	await db.close();
}

demonstrateInference().catch(console.error);
