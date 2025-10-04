/**
 * Graph Inference Demo - Transitive and Hierarchical Relationship Inference
 *
 * 이 데모는 다음을 보여줍니다:
 * 1. 직접 관계 (Direct Relationships)
 * 2. 추론된 관계 (Inferred Relationships)
 *    - Transitive: A->B, B->C ⇒ A->C
 *    - Hierarchical: parent(A,B), relation(B,C) ⇒ relation(A,C)
 */

import { GraphDatabase } from "../src/database/GraphDatabase";
import { FileDependencyAnalyzer } from "../src/database/services/FileDependencyAnalyzer";
import { SupportedLanguage } from "../src/core/types";
import * as fs from "fs";
import * as path from "path";

interface ImportData {
	importSources: Array<{
		source: string;
		specifiers: string[];
		isTypeOnly: boolean;
		isDynamic: boolean;
	}>;
}

async function runInferenceDemo() {
	const projectRoot = process.cwd();
	const dbPath = path.join(projectRoot, ".tmp", "inference-demo.db");

	// Clean up old database
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath);
	}

	console.log("\n🚀 Graph Inference Demo\n");
	console.log("=".repeat(80));

	const db = new GraphDatabase(dbPath);
	await db.initialize();

	const analyzer = new FileDependencyAnalyzer(db, projectRoot);

	// ===== 시나리오 구성 =====
	console.log("\n📝 시나리오: 프로젝트 의존성 체인");
	console.log("-".repeat(80));

	// File A -> File B -> File C 의존성 체인
	const fileA = "/src/components/App.tsx";
	const fileB = "/src/utils/helpers.ts";
	const fileC = "/src/lib/math.ts";
	const reactLib = "react";

	console.log(`\n파일 구조:`);
	console.log(`  ${fileA} --imports--> ${fileB}`);
	console.log(`  ${fileB} --imports--> ${fileC}`);
	console.log(`  ${fileA} --imports--> ${reactLib}`);

	// File A 분석 (imports File B and React)
	const importDataA: ImportData = {
		importSources: [
			{
				source: "../utils/helpers",
				specifiers: ["formatDate", "calculate"],
				isTypeOnly: false,
				isDynamic: false,
			},
			{
				source: "react",
				specifiers: ["useState", "useEffect"],
				isTypeOnly: false,
				isDynamic: false,
			},
		],
	};

	// File B 분석 (imports File C)
	const importDataB: ImportData = {
		importSources: [
			{
				source: "../lib/math",
				specifiers: ["add", "multiply"],
				isTypeOnly: false,
				isDynamic: false,
			},
		],
	};

	// File C 분석 (no imports)
	const importDataC: ImportData = {
		importSources: [],
	};

	console.log("\n⚙️  의존성 분석 실행 중...\n");

	await analyzer.analyzeFile(
		fileA,
		"typescript" as SupportedLanguage,
		importDataA.importSources,
	);
	await analyzer.analyzeFile(
		fileB,
		"typescript" as SupportedLanguage,
		importDataB.importSources,
	);
	await analyzer.analyzeFile(
		fileC,
		"typescript" as SupportedLanguage,
		importDataC.importSources,
	);

	// ===== 1. 직접 관계 조회 =====
	console.log("=".repeat(80));
	console.log("\n📊 1. 직접 관계 (Direct Relationships)\n");

	const directEdges = await db.db.all(`
    SELECT
      n1.identifier as from_node,
      e.type,
      n2.identifier as to_node,
      e.weight
    FROM edges e
    JOIN nodes n1 ON e.start_node_id = n1.id
    JOIN nodes n2 ON e.end_node_id = n2.id
    ORDER BY n1.identifier, e.type
  `);

	console.log("모든 직접 의존성:");
	directEdges.forEach((edge: any) => {
		const from = edge.from_node.split("::").pop();
		const to = edge.to_node.split("::").pop();
		console.log(`  ${from} --[${edge.type}]--> ${to} (weight: ${edge.weight})`);
	});

	// ===== 2. Transitive 관계 추론 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n🔄 2. Transitive 관계 추론 (A->B, B->C ⇒ A->C)\n");

	// depends_on은 transitive 속성을 가짐 (schema.sql 참조)
	const transitiveQuery = `
    WITH RECURSIVE transitive_deps AS (
      -- Base case: direct dependencies
      SELECT
        e.start_node_id,
        e.end_node_id,
        e.type,
        1 as depth,
        n1.identifier as from_node,
        n2.identifier as to_node,
        n1.identifier || ' -> ' || n2.identifier as path
      FROM edges e
      JOIN nodes n1 ON e.start_node_id = n1.id
      JOIN nodes n2 ON e.end_node_id = n2.id
      WHERE e.type = 'depends_on'

      UNION ALL

      -- Recursive case: transitive dependencies
      SELECT
        td.start_node_id,
        e.end_node_id,
        'depends_on' as type,
        td.depth + 1,
        td.from_node,
        n.identifier as to_node,
        td.path || ' -> ' || n.identifier as path
      FROM transitive_deps td
      JOIN edges e ON td.end_node_id = e.start_node_id
      JOIN nodes n ON e.end_node_id = n.id
      WHERE e.type = 'depends_on'
        AND td.depth < 5  -- Prevent infinite recursion
        AND td.start_node_id != e.end_node_id  -- Prevent cycles
    )
    SELECT DISTINCT
      from_node,
      to_node,
      depth,
      path
    FROM transitive_deps
    WHERE depth > 1  -- Only show inferred (not direct) relationships
    ORDER BY depth, from_node
  `;

	const transitiveResults = await db.db.all(transitiveQuery);

	if (transitiveResults.length > 0) {
		console.log("추론된 Transitive 의존성:");
		transitiveResults.forEach((result: any) => {
			const from = result.from_node.split("::").pop();
			const to = result.to_node.split("::").pop();
			const pathSimplified = result.path
				.split(" -> ")
				.map((p: string) => p.split("::").pop())
				.join(" -> ");
			console.log(
				`  ✨ ${from} --[depends_on (depth=${result.depth})]-> ${to}`,
			);
			console.log(`     경로: ${pathSimplified}`);
		});
	} else {
		console.log(
			"  (Transitive 추론 결과 없음 - depends_on 타입 관계가 충분하지 않음)",
		);
	}

	// ===== 3. 파일 의존성 트리 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n🌳 3. 파일 의존성 트리 (File A 기준)\n");

	const tree = await analyzer.getDependencyTree(fileA, 3);

	function printTree(node: any, indent: string = "", isLast: boolean = true) {
		const connector = isLast ? "└── " : "├── ";
		const fileName = node.file.split("/").pop();
		const typeInfo = node.type === "library" ? "📦" : "📄";
		console.log(`${indent}${connector}${typeInfo} ${fileName}`);

		if (node.dependencies && node.dependencies.length > 0) {
			const newIndent = indent + (isLast ? "    " : "│   ");
			node.dependencies.forEach((dep: any, index: number) => {
				printTree(dep, newIndent, index === node.dependencies.length - 1);
			});
		}
	}

	printTree(tree);

	// ===== 4. 통계 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n📈 4. 그래프 통계\n");

	const stats = await db.getStatistics();

	console.log("노드 통계:");
	Object.entries(stats.nodes).forEach(([type, count]) => {
		console.log(`  ${type}: ${count}`);
	});

	console.log("\n관계 통계:");
	Object.entries(stats.edges).forEach(([type, count]) => {
		console.log(`  ${type}: ${count}`);
	});

	console.log(`\n미싱 링크: ${stats.missingLinks}`);

	// ===== 5. Edge Type 추론 규칙 확인 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n⚙️  5. Edge Type 추론 규칙 (schema.sql 정의)\n");

	const edgeTypes = await db.db.all(`
    SELECT
      type,
      description,
      is_transitive,
      is_inheritable,
      parent_type
    FROM edge_types
    WHERE is_transitive = TRUE OR is_inheritable = TRUE OR parent_type IS NOT NULL
    ORDER BY type
  `);

	console.log("추론 가능한 Edge Types:");
	edgeTypes.forEach((et: any) => {
		const properties = [];
		if (et.is_transitive) properties.push("Transitive");
		if (et.is_inheritable) properties.push("Inheritable");
		if (et.parent_type) properties.push(`Parent: ${et.parent_type}`);

		console.log(`  • ${et.type}: ${et.description}`);
		console.log(`    ${properties.join(", ")}`);
	});

	// ===== 6. 실제 추론 예시: imports -> depends_on 계층 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n🔗 6. 계층적 관계 추론 (imports는 depends_on의 자식)\n");

	console.log("Schema 정의에서:");
	console.log("  imports (parent: depends_on)");
	console.log("  → imports 관계는 자동으로 depends_on 관계를 암시함\n");

	const importsCount = await db.db.all(`
    SELECT COUNT(*) as count FROM edges WHERE type = 'imports'
  `);

	const dependsOnCount = await db.db.all(`
    SELECT COUNT(*) as count FROM edges WHERE type = 'depends_on'
  `);

	console.log(`현재 그래프:`);
	console.log(`  직접 imports 관계: ${importsCount[0].count}개`);
	console.log(`  직접 depends_on 관계: ${dependsOnCount[0].count}개`);
	console.log(
		`  → 추론 가능한 depends_on: ${importsCount[0].count}개 (imports가 depends_on을 암시)`,
	);

	// ===== 마무리 =====
	console.log("\n" + "=".repeat(80));
	console.log("\n✅ 데모 완료!\n");
	console.log("핵심 개념:");
	console.log("  1️⃣  직접 관계: 실제 코드에서 추출된 의존성");
	console.log("  2️⃣  Transitive: A->B, B->C ⇒ A->C (재귀적 추론)");
	console.log("  3️⃣  Hierarchical: imports는 depends_on의 특수한 형태");
	console.log("  4️⃣  추론 캐시: edge_inference_cache 테이블에 저장 가능\n");

	await db.close();

	console.log(`📁 데이터베이스: ${dbPath}\n`);
}

// Run demo
runInferenceDemo().catch(console.error);
