/**
 * Edge Type Validation Demo
 * EdgeTypeRegistry의 계층 구조 검증 및 시각화
 */

import { EdgeTypeRegistry } from "../src/database/inference/EdgeTypeRegistry";

console.log("\n" + "=".repeat(80));
console.log("🔍 Edge Type Registry Validation");
console.log("=".repeat(80) + "\n");

// ===== 1. 계층 구조 검증 =====
console.log("📋 1. 계층 구조 검증\n");

const validation = EdgeTypeRegistry.validateHierarchy();

if (validation.valid) {
	console.log("✅ 계층 구조 검증 성공!");
	console.log(
		`   총 ${EdgeTypeRegistry.getAll().length}개의 edge types 정의됨\n`,
	);
} else {
	console.log("❌ 계층 구조 검증 실패!");
	console.log("   에러:");
	validation.errors.forEach((error) => {
		console.log(`   - ${error}`);
	});
	console.log();
}

// ===== 2. Core vs Extended Types =====
console.log("=".repeat(80));
console.log("\n📚 2. Edge Type 분류\n");

const coreTypes = EdgeTypeRegistry.getCoreTypes();
const extendedTypes = EdgeTypeRegistry.getExtendedTypes();

console.log(`Core Types (schema.sql에 정의): ${coreTypes.length}개`);
coreTypes.slice(0, 5).forEach((def) => {
	console.log(`  • ${def.type} (parent: ${def.parentType || "none"})`);
});
if (coreTypes.length > 5) {
	console.log(`  ... 외 ${coreTypes.length - 5}개`);
}

console.log(`\nExtended Types (동적 등록 필요): ${extendedTypes.length}개`);
extendedTypes.forEach((def) => {
	console.log(`  • ${def.type} (parent: ${def.parentType || "none"})`);
});

// ===== 3. 계층 구조 시각화 =====
console.log("\n" + "=".repeat(80));
console.log("\n🌳 3. 계층 구조 시각화\n");

console.log(EdgeTypeRegistry.printHierarchy());

// ===== 4. 특정 타입의 계층 경로 =====
console.log("\n" + "=".repeat(80));
console.log("\n🔗 4. 타입별 계층 경로\n");

const typesToCheck = [
	"imports_library",
	"imports_file",
	"imports",
	"calls",
	"extends",
];

typesToCheck.forEach((type) => {
	const path = EdgeTypeRegistry.getHierarchyPath(type);
	const pathStr = path.reverse().join(" → ");
	console.log(`${type}:`);
	console.log(`  ${pathStr}\n`);
});

// ===== 5. Parent-Child 관계 =====
console.log("=".repeat(80));
console.log("\n👨‍👧‍👦 5. Parent-Child 관계\n");

const parentsToCheck = ["depends_on", "imports", "contains"];

parentsToCheck.forEach((parent) => {
	const children = EdgeTypeRegistry.getChildTypes(parent);
	console.log(`${parent}의 자식들 (${children.length}개):`);
	children.forEach((child) => {
		const props = [];
		if (child.isTransitive) props.push("transitive");
		if (child.isInheritable) props.push("inheritable");
		const propStr = props.length > 0 ? ` [${props.join(", ")}]` : "";
		console.log(`  • ${child.type}${propStr}`);
	});
	console.log();
});

// ===== 6. 추론 규칙 요약 =====
console.log("=".repeat(80));
console.log("\n💡 6. 추론 규칙 요약\n");

const transitiveTypes = EdgeTypeRegistry.getAll().filter(
	(def) => def.isTransitive,
);
const inheritableTypes = EdgeTypeRegistry.getAll().filter(
	(def) => def.isInheritable,
);

console.log(`Transitive Types (${transitiveTypes.length}개):`);
console.log("  A→B, B→C ⇒ A→C");
transitiveTypes.forEach((def) => {
	console.log(`  • ${def.type}`);
});

console.log(`\nInheritable Types (${inheritableTypes.length}개):`);
console.log("  parent(A,B), rel(B,C) ⇒ rel(A,C)");
inheritableTypes.forEach((def) => {
	console.log(`  • ${def.type}`);
});

// ===== 7. 실제 사용 예시 =====
console.log("\n" + "=".repeat(80));
console.log("\n🎯 7. 실제 사용 패턴\n");

console.log("FileDependencyAnalyzer에서:");
console.log(
	"  const typesToRegister = EdgeTypeRegistry.getTypesForDynamicRegistration();",
);
console.log("  → imports_library, imports_file 자동 등록\n");

console.log("쿼리 작성 시:");
console.log("  • 세밀한 쿼리: WHERE type = 'imports_library'");
console.log("  • 중간 쿼리: WHERE type = 'imports'");
console.log("  • 광범위 쿼리: WHERE type = 'depends_on'\n");

console.log("계층 추론:");
console.log("  imports_library → imports → depends_on");
console.log("  따라서 imports_library는 자동으로 depends_on을 암시\n");

// ===== 완료 =====
console.log("=".repeat(80));
console.log("\n✅ 검증 완료!\n");

console.log("핵심 개념:");
console.log("  1️⃣  EdgeTypeRegistry: 모든 edge type을 코드로 중앙 관리");
console.log("  2️⃣  계층 구조: parent-child 관계로 추론 가능");
console.log("  3️⃣  자동 검증: 순환 참조, 존재하지 않는 parent 탐지");
console.log("  4️⃣  동적 등록: Extended types는 runtime에 DB 등록");
console.log("  5️⃣  일관성: schema.sql과 코드가 동기화 기준점 제공\n");
