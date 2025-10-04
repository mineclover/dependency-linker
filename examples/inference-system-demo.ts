/**
 * Inference System Demo
 *
 * Hierarchical, Transitive, Inheritable 추론 시스템 데모
 */

import { GraphDatabase } from "../src/database/GraphDatabase";
import {
	FileDependencyAnalyzer,
	ImportSource,
} from "../src/database/services/FileDependencyAnalyzer";
import { EdgeTypeRegistry, InferenceEngine } from "../src/database/inference";
import * as fs from "fs";
import * as path from "path";

async function runInferenceDemo() {
	console.log("\n" + "=".repeat(80));
	console.log("🧠 Inference System Demo");
	console.log("=".repeat(80) + "\n");

	const projectRoot = "/test-project";
	const dbPath = path.join(process.cwd(), ".tmp", "inference-system.db");

	// DB 초기화
	if (fs.existsSync(dbPath)) {
		fs.unlinkSync(dbPath);
	}

	const db = new GraphDatabase(dbPath);
	await db.initialize();
	const analyzer = new FileDependencyAnalyzer(db, projectRoot);
	const inferenceEngine = new InferenceEngine(db);

	// ========== 테스트 데이터 구성 ==========
	console.log("📝 테스트 데이터 구성\n");
	console.log("파일 구조:");
	console.log("  App.tsx → utils/helpers.ts → lib/math.ts");
	console.log("  App.tsx → react (library)");
	console.log("  helpers.ts → lodash (library)\n");

	// 파일 의존성 분석
	await analyzer.analyzeFile("/src/App.tsx", "typescript", [
		{
			type: "library",
			source: "react",
			imports: [{ name: "React", isDefault: true, isNamespace: false }],
			location: { line: 1, column: 1 },
		},
		{
			type: "relative",
			source: "./utils/helpers",
			imports: [{ name: "formatDate", isDefault: false, isNamespace: false }],
			location: { line: 2, column: 1 },
		},
	]);

	await analyzer.analyzeFile("/src/utils/helpers.ts", "typescript", [
		{
			type: "library",
			source: "lodash",
			imports: [{ name: "map", isDefault: false, isNamespace: false }],
			location: { line: 1, column: 1 },
		},
		{
			type: "relative",
			source: "../lib/math",
			imports: [{ name: "add", isDefault: false, isNamespace: false }],
			location: { line: 2, column: 1 },
		},
	]);

	await analyzer.analyzeFile("/src/lib/math.ts", "typescript", []);

	// ========== 1. Hierarchical 추론 테스트 ==========
	console.log("=".repeat(80));
	console.log("\n📊 1. Hierarchical 추론 (계층적 타입 조회)\n");

	console.log("개념: 자식 타입들을 부모 타입으로 조회");
	console.log("  imports_library → imports → depends_on");
	console.log("  imports_file → imports → depends_on\n");

	// 'imports' 타입으로 조회 (자식 타입 포함)
	console.log('❓ Query: 모든 "imports" 관계 조회 (자식 타입 포함)');
	const allImports = await db.queryHierarchicalRelationships("imports", {
		includeChildren: true,
		includeParents: false,
	});

	console.log(`✅ 결과: ${allImports.length}개 관계 발견`);
	const groupedByType = allImports.reduce(
		(acc, rel) => {
			acc[rel.type] = (acc[rel.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	Object.entries(groupedByType).forEach(([type, count]) => {
		console.log(`   - ${type}: ${count}개`);
	});

	// 'depends_on' 타입으로 조회 (모든 하위 의존성)
	console.log('\n❓ Query: 모든 "depends_on" 관계 조회 (자식 타입 포함)');
	const allDependencies = await db.queryHierarchicalRelationships(
		"depends_on",
		{
			includeChildren: true,
			includeParents: false,
		},
	);

	console.log(`✅ 결과: ${allDependencies.length}개 관계 발견`);
	console.log(
		"   계층 구조 덕분에 imports_library, imports_file도 자동 포함됨",
	);

	// ========== 2. Transitive 추론 테스트 ==========
	console.log("\n" + "=".repeat(80));
	console.log("\n🔄 2. Transitive 추론 (전이적 의존성)\n");

	console.log("개념: A→B, B→C ⇒ A→C");
	console.log("  App.tsx → helpers.ts → math.ts");
	console.log("  ⇒ App.tsx는 math.ts에 간접 의존\n");

	// App.tsx 노드 찾기
	const appNodes = await db.findNodes({ sourceFiles: ["/src/App.tsx"] });
	if (appNodes.length === 0) {
		throw new Error("App.tsx node not found");
	}
	const appNodeId = appNodes[0].id!;

	console.log("❓ Query: App.tsx의 전이적 imports_file 의존성");

	// imports_file은 depends_on의 자식이므로 transitive 속성 상속
	// 하지만 EdgeTypeRegistry에서 imports_file 자체는 transitive=false로 정의되어 있음
	// depends_on으로 조회해야 함
	try {
		const transitiveImports = await db.queryTransitiveRelationships(
			appNodeId,
			"imports_file", // imports_file 타입으로 전이 추론
			10,
		);

		console.log(`✅ 결과: ${transitiveImports.length}개 전이 관계 발견`);

		// 노드 정보 출력
		for (const rel of transitiveImports) {
			const allNodes = await db.findNodes({});
			const toNode = allNodes.find((n) => n.id === rel.toNodeId);
			if (toNode) {
				console.log(`   → ${toNode.name} (via imports_file chain)`);
			}
		}
	} catch (error: any) {
		console.log("⚠️ ", error.message);
		console.log(
			"   → imports_file은 transitive 타입이 아니므로 직접 추론 불가",
		);
		console.log("   → depends_on으로 조회하거나 InferenceEngine 사용 필요\n");
	}

	// depends_on으로 전이 추론 (depends_on은 transitive)
	console.log("❓ Query: depends_on 타입으로 전이적 의존성 조회");

	// depends_on 타입 관계 직접 추가 (테스트용)
	const helperNodes = await db.findNodes({
		sourceFiles: ["/src/utils/helpers.ts"],
	});
	const mathNodes = await db.findNodes({ sourceFiles: ["/src/lib/math.ts"] });

	if (helperNodes.length > 0 && mathNodes.length > 0) {
		await db.upsertRelationship({
			fromNodeId: appNodeId,
			toNodeId: helperNodes[0].id!,
			type: "depends_on",
			label: "depends on",
			sourceFile: "/src/App.tsx",
			weight: 1.0,
		});

		await db.upsertRelationship({
			fromNodeId: helperNodes[0].id!,
			toNodeId: mathNodes[0].id!,
			type: "depends_on",
			label: "depends on",
			sourceFile: "/src/utils/helpers.ts",
			weight: 1.0,
		});

		const transitiveDeps = await db.queryTransitiveRelationships(
			appNodeId,
			"depends_on",
			10,
		);

		console.log(`✅ 결과: ${transitiveDeps.length}개 전이 관계 발견`);

		for (const rel of transitiveDeps) {
			const allNodes = await db.findNodes({});
			const toNode = allNodes.find((n) => n.id === rel.toNodeId);
			if (toNode) {
				console.log(`   → ${toNode.name}`);
			}
		}
	}

	// ========== 3. Inheritable 추론 테스트 ==========
	console.log("\n" + "=".repeat(80));
	console.log("\n🧬 3. Inheritable 추론 (상속 가능한 관계)\n");

	console.log("개념: parent(A,B), rel(B,C) ⇒ rel(A,C)");
	console.log("  File contains Class, Class extends BaseClass");
	console.log("  ⇒ File extends BaseClass (상속됨)\n");

	console.log("❓ Query: 상속 가능한 extends 관계");
	console.log("⚠️  현재 테스트 데이터에는 contains/extends 관계 없음");
	console.log("   → 실제 사용 시 코드 구조 분석기에서 생성 필요\n");

	// ========== 4. Edge Type 계층 구조 확인 ==========
	console.log("=".repeat(80));
	console.log("\n🌳 4. Edge Type 계층 구조\n");

	const validation = EdgeTypeRegistry.validateHierarchy();
	if (validation.valid) {
		console.log("✅ 계층 구조 검증 성공!\n");
	} else {
		console.log("❌ 계층 구조 검증 실패:");
		validation.errors.forEach((err) => console.log(`  - ${err}`));
		console.log();
	}

	console.log("주요 계층 경로:");
	const importsPaths = EdgeTypeRegistry.getHierarchyPath("imports_library");
	console.log(`  imports_library: ${importsPaths.reverse().join(" → ")}`);

	const dependsPaths = EdgeTypeRegistry.getHierarchyPath("depends_on");
	console.log(`  depends_on: ${dependsPaths.reverse().join(" → ")}`);

	// ========== 5. 추론 규칙 요약 ==========
	console.log("\n" + "=".repeat(80));
	console.log("\n💡 5. 추론 규칙 요약\n");

	const transitiveTypes = EdgeTypeRegistry.getAll().filter(
		(def) => def.isTransitive,
	);
	const inheritableTypes = EdgeTypeRegistry.getAll().filter(
		(def) => def.isInheritable,
	);

	console.log(`Transitive Types (${transitiveTypes.length}개):`);
	console.log("  → A→B, B→C ⇒ A→C");
	transitiveTypes.forEach((def) => {
		console.log(`  • ${def.type}`);
	});

	console.log(`\nInheritable Types (${inheritableTypes.length}개):`);
	console.log("  → parent(A,B), rel(B,C) ⇒ rel(A,C)");
	inheritableTypes.forEach((def) => {
		console.log(`  • ${def.type}`);
	});

	// ========== 6. InferenceEngine 사용 예제 ==========
	console.log("\n" + "=".repeat(80));
	console.log("\n⚙️  6. InferenceEngine 고급 사용\n");

	console.log("InferenceEngine은 타입 안전하고 캐시 가능한 추론 API 제공");
	console.log("  - queryHierarchical: 계층적 타입 조회");
	console.log("  - queryTransitive: 전이적 관계 추론");
	console.log("  - queryInheritable: 상속 가능한 관계 추론");
	console.log("  - inferAll: 모든 추론 통합 실행\n");

	try {
		const hierarchicalResult = await inferenceEngine.queryHierarchical(
			"imports",
			{
				includeChildren: true,
				includeParents: false,
			},
		);

		console.log(`✅ Hierarchical 추론: ${hierarchicalResult.length}개 관계`);

		const typeCount = hierarchicalResult.reduce(
			(acc, rel) => {
				acc[rel.type] = (acc[rel.type] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		Object.entries(typeCount).forEach(([type, count]) => {
			console.log(`   - ${type}: ${count}개`);
		});
	} catch (error: any) {
		console.error("❌ InferenceEngine 오류:", error.message);
	}

	// ========== 완료 ==========
	console.log("\n" + "=".repeat(80));
	console.log("\n✅ Inference System Demo 완료!\n");

	console.log("핵심 확인 사항:");
	console.log("  1️⃣  Hierarchical: 자식 타입들을 부모 타입으로 조회 가능");
	console.log(
		"  2️⃣  Transitive: A→B→C 체인에서 A→C 추론 가능 (SQL Recursive CTE)",
	);
	console.log("  3️⃣  Inheritable: 상속 가능한 관계는 부모를 통해 전파");
	console.log("  4️⃣  Type-Safe: InferenceTypes로 타입 안전성 보장");
	console.log("  5️⃣  SQL-Based: Recursive CTE로 효율적인 그래프 순회\n");

	console.log(`📁 데이터베이스: ${dbPath}\n`);

	await db.close();
}

runInferenceDemo().catch(console.error);
