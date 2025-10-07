/**
 * File Dependency Analysis Example
 * 실제 import-sources 데이터를 기반으로 한 파일 의존성 분석 예제
 */

import type { GraphDatabase } from "../GraphDatabase";
import {
	type DependencyAnalysisResult,
	type DependencyTree,
	FileDependencyAnalyzer,
	type ImportSource,
	type MissingLink,
} from "../services/FileDependencyAnalyzer";

/**
 * 실제 프로젝트의 import 데이터 예제
 */
export function getSampleImportData(): Record<string, ImportSource[]> {
	return {
		// 메인 앱 컴포넌트
		"/src/App.tsx": [
			{
				type: "library",
				source: "react",
				imports: [
					{ name: "React", isDefault: true, isNamespace: false },
					{ name: "useState", isDefault: false, isNamespace: false },
					{ name: "useEffect", isDefault: false, isNamespace: false },
				],
				location: { line: 1, column: 1 },
			},
			{
				type: "relative",
				source: "./components/Header",
				imports: [{ name: "Header", isDefault: true, isNamespace: false }],
				location: { line: 2, column: 1 },
			},
			{
				type: "relative",
				source: "./components/UserProfile",
				imports: [{ name: "UserProfile", isDefault: true, isNamespace: false }],
				location: { line: 3, column: 1 },
			},
			{
				type: "absolute",
				source: "@/utils/api",
				imports: [
					{ name: "fetchUserData", isDefault: false, isNamespace: false },
					{ name: "ApiResponse", isDefault: false, isNamespace: false },
				],
				location: { line: 4, column: 1 },
			},
			{
				type: "library",
				source: "@mui/material",
				imports: [
					{ name: "Button", isDefault: false, isNamespace: false },
					{ name: "Container", isDefault: false, isNamespace: false },
				],
				location: { line: 5, column: 1 },
			},
		],

		// Header 컴포넌트
		"/src/components/Header.tsx": [
			{
				type: "library",
				source: "react",
				imports: [{ name: "React", isDefault: true, isNamespace: false }],
				location: { line: 1, column: 1 },
			},
			{
				type: "relative",
				source: "../hooks/useAuth",
				imports: [{ name: "useAuth", isDefault: true, isNamespace: false }],
				location: { line: 2, column: 1 },
			},
			{
				type: "absolute",
				source: "@/types/user",
				imports: [
					{ name: "User", isDefault: false, isNamespace: false },
					{ name: "AuthState", isDefault: false, isNamespace: false },
				],
				location: { line: 3, column: 1 },
			},
			{
				type: "library",
				source: "@mui/icons-material",
				imports: [
					{ name: "AccountCircle", isDefault: false, isNamespace: false },
					{ name: "Menu", isDefault: false, isNamespace: false },
				],
				location: { line: 4, column: 1 },
			},
		],

		// 사용자 프로필 컴포넌트
		"/src/components/UserProfile.tsx": [
			{
				type: "library",
				source: "react",
				imports: [
					{ name: "React", isDefault: true, isNamespace: false },
					{ name: "useState", isDefault: false, isNamespace: false },
					{ name: "useCallback", isDefault: false, isNamespace: false },
				],
				location: { line: 1, column: 1 },
			},
			{
				type: "absolute",
				source: "@/types/user",
				imports: [
					{ name: "User", isDefault: false, isNamespace: false },
					{ name: "UserPreferences", isDefault: false, isNamespace: false },
				],
				location: { line: 2, column: 1 },
			},
			{
				type: "absolute",
				source: "@/utils/validation",
				imports: [
					{ name: "validateEmail", isDefault: false, isNamespace: false },
					{ name: "validatePhoneNumber", isDefault: false, isNamespace: false },
				],
				location: { line: 3, column: 1 },
			},
			{
				type: "relative",
				source: "./Avatar",
				imports: [{ name: "Avatar", isDefault: true, isNamespace: false }],
				location: { line: 4, column: 1 },
			},
			{
				type: "relative",
				source: "./MissingComponent", // 존재하지 않는 파일
				imports: [
					{ name: "MissingComponent", isDefault: true, isNamespace: false },
				],
				location: { line: 5, column: 1 },
			},
		],

		// Auth Hook
		"/src/hooks/useAuth.ts": [
			{
				type: "library",
				source: "react",
				imports: [
					{ name: "useState", isDefault: false, isNamespace: false },
					{ name: "useEffect", isDefault: false, isNamespace: false },
					{ name: "useContext", isDefault: false, isNamespace: false },
				],
				location: { line: 1, column: 1 },
			},
			{
				type: "absolute",
				source: "@/contexts/AuthContext",
				imports: [
					{ name: "AuthContext", isDefault: false, isNamespace: false },
				],
				location: { line: 2, column: 1 },
			},
			{
				type: "absolute",
				source: "@/utils/storage",
				imports: [
					{
						name: "localStorage",
						alias: "storage",
						isDefault: false,
						isNamespace: false,
					},
				],
				location: { line: 3, column: 1 },
			},
			{
				type: "builtin",
				source: "crypto",
				imports: [
					{ name: "randomBytes", isDefault: false, isNamespace: false },
				],
				location: { line: 4, column: 1 },
			},
		],

		// API 유틸리티
		"/src/utils/api.ts": [
			{
				type: "library",
				source: "axios",
				imports: [
					{ name: "axios", isDefault: true, isNamespace: false },
					{ name: "AxiosResponse", isDefault: false, isNamespace: false },
				],
				location: { line: 1, column: 1 },
			},
			{
				type: "absolute",
				source: "@/types/api",
				imports: [
					{ name: "ApiResponse", isDefault: false, isNamespace: false },
					{ name: "ErrorResponse", isDefault: false, isNamespace: false },
				],
				location: { line: 2, column: 1 },
			},
			{
				type: "relative",
				source: "./config",
				imports: [
					{ name: "API_BASE_URL", isDefault: false, isNamespace: false },
					{ name: "API_TIMEOUT", isDefault: false, isNamespace: false },
				],
				location: { line: 3, column: 1 },
			},
		],

		// 타입 정의
		"/src/types/user.ts": [
			// 순수 타입 파일 - import 없음
		],

		// Avatar 컴포넌트
		"/src/components/Avatar.tsx": [
			{
				type: "library",
				source: "react",
				imports: [{ name: "React", isDefault: true, isNamespace: false }],
				location: { line: 1, column: 1 },
			},
			{
				type: "library",
				source: "classnames",
				imports: [{ name: "classNames", isDefault: true, isNamespace: false }],
				location: { line: 2, column: 1 },
			},
		],
	};
}

/**
 * 파일 의존성 분석 실행 예제
 */
export async function runFileDependencyAnalysisExample(
	database: GraphDatabase,
	projectRoot: string = "/project",
): Promise<void> {
	console.log("🚀 파일 의존성 분석 예제 시작\n");

	const analyzer = new FileDependencyAnalyzer(database, projectRoot);
	const importData = getSampleImportData();

	const results: DependencyAnalysisResult[] = [];
	const allMissingLinks: MissingLink[] = [];

	// 1. 각 파일 분석
	console.log("📁 파일별 의존성 분석 시작...\n");

	for (const [filePath, importSources] of Object.entries(importData)) {
		console.log(`\n🔍 분석 중: ${filePath}`);

		const result = await analyzer.analyzeFile(
			filePath,
			"typescript",
			importSources,
		);

		results.push(result);
		allMissingLinks.push(...result.missingLinks);

		// 결과 출력
		console.log(`  📊 Import: ${result.stats.totalImports}개`);
		console.log(`  📚 라이브러리: ${result.stats.libraryImports}개`);
		console.log(`  📁 로컬 파일: ${result.stats.relativeImports}개`);
		console.log(`  ❌ 미싱 링크: ${result.stats.missingFiles}개`);

		if (result.missingLinks.length > 0) {
			console.log(`  🔗 미싱 링크 목록:`);
			result.missingLinks.forEach((link) => {
				console.log(`    - ${link.from} → ${link.to} (${link.type})`);
			});
		}
	}

	// 2. 전체 통계
	console.log(`\n${"=".repeat(60)}`);
	console.log("📈 전체 분석 결과");
	console.log("=".repeat(60));

	const totalStats = results.reduce(
		(acc, result) => ({
			totalFiles: acc.totalFiles + 1,
			totalImports: acc.totalImports + result.stats.totalImports,
			totalLibraryImports:
				acc.totalLibraryImports + result.stats.libraryImports,
			totalFileImports: acc.totalFileImports + result.stats.relativeImports,
			totalMissingLinks: acc.totalMissingLinks + result.stats.missingFiles,
		}),
		{
			totalFiles: 0,
			totalImports: 0,
			totalLibraryImports: 0,
			totalFileImports: 0,
			totalMissingLinks: 0,
		},
	);

	console.log(`📁 총 분석 파일: ${totalStats.totalFiles}개`);
	console.log(`📊 총 Import: ${totalStats.totalImports}개`);
	console.log(`📚 라이브러리 Import: ${totalStats.totalLibraryImports}개`);
	console.log(`📁 파일 Import: ${totalStats.totalFileImports}개`);
	console.log(`❌ 총 미싱 링크: ${totalStats.totalMissingLinks}개`);

	// 3. 미싱 링크 상세 분석
	if (allMissingLinks.length > 0) {
		console.log(`\n${"=".repeat(60)}`);
		console.log("🔗 미싱 링크 상세 분석");
		console.log("=".repeat(60));

		const missingLinksByType = allMissingLinks.reduce(
			(acc, link) => {
				acc[link.type] = (acc[link.type] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		Object.entries(missingLinksByType).forEach(([type, count]) => {
			console.log(`${type}: ${count}개`);
		});

		console.log("\n미싱 링크 목록:");
		allMissingLinks.forEach((link, index) => {
			console.log(`${index + 1}. ${link.from}`);
			console.log(`   → ${link.to} (${link.type})`);
			console.log(`   원본: ${link.originalImport.source}\n`);
		});
	}

	// 4. 의존성 트리 생성 예제
	console.log("=".repeat(60));
	console.log("🌳 의존성 트리 분석");
	console.log("=".repeat(60));

	const rootFile = "/src/App.tsx";
	console.log(`\n📁 루트 파일: ${rootFile}`);

	const dependencyTree = await analyzer.getDependencyTree(rootFile, 3);
	printDependencyTree(dependencyTree, 0);

	// 5. 데이터베이스 쿼리 예제
	console.log(`\n${"=".repeat(60)}`);
	console.log("🔍 GraphDatabase 쿼리 예제");
	console.log("=".repeat(60));

	await demonstrateQueries(database);

	console.log("\n✅ 파일 의존성 분석 예제 완료!");
}

/**
 * 의존성 트리 출력
 */
function printDependencyTree(tree: DependencyTree, indent: number = 0): void {
	const prefix = "  ".repeat(indent);
	const icon = tree.isLibrary ? "📚" : "📁";
	const circularMark = tree.isCircular ? " (순환)" : "";

	console.log(`${prefix}${icon} ${tree.file}${circularMark}`);

	tree.dependencies.forEach((dep) => {
		printDependencyTree(dep, indent + 1);
	});
}

/**
 * GraphDatabase 쿼리 데모
 */
async function demonstrateQueries(database: GraphDatabase): Promise<void> {
	// 1. 모든 파일 노드 조회
	console.log("\n1. 📁 모든 파일 노드 조회:");
	const fileNodes = await database.findNodes({ nodeTypes: ["file"] });
	console.log(`   총 ${fileNodes.length}개 파일 노드 발견`);

	fileNodes.slice(0, 3).forEach((node) => {
		const exists = node.metadata?.exists ? "✅" : "❌";
		console.log(`   ${exists} ${node.sourceFile}`);
	});

	// 2. 라이브러리 노드 조회
	console.log("\n2. 📚 라이브러리 노드 조회:");
	const libraryNodes = await database.findNodes({ nodeTypes: ["library"] });
	console.log(`   총 ${libraryNodes.length}개 라이브러리 노드 발견`);

	libraryNodes.slice(0, 3).forEach((node) => {
		const isBuiltin = node.metadata?.isBuiltin ? "(내장)" : "";
		console.log(`   📦 ${node.name} ${isBuiltin}`);
	});

	// 3. 의존성 관계 조회
	console.log("\n3. 🔗 의존성 관계 조회:");
	const relationships = await database.findRelationships({
		relationshipTypes: ["imports_file", "imports_library"],
	});
	console.log(`   총 ${relationships.length}개 의존성 관계 발견`);

	const relationshipsByType = relationships.reduce(
		(acc, rel) => {
			acc[rel.type] = (acc[rel.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	Object.entries(relationshipsByType).forEach(([type, count]) => {
		console.log(`   ${type}: ${count}개`);
	});

	// 4. 특정 파일의 의존성 조회
	const appNode = fileNodes.find((node) => node.sourceFile.includes("App.tsx"));
	if (appNode?.id) {
		console.log("\n4. 📁 App.tsx의 직접 의존성:");
		const dependencies = await database.findNodeDependencies(appNode.id, [
			"imports_file",
			"imports_library",
		]);

		dependencies.slice(0, 5).forEach((dep) => {
			const icon = dep.type === "library" ? "📚" : "📁";
			console.log(`   ${icon} ${dep.name}`);
		});
	}

	// 5. 미싱 링크 조회
	console.log("\n5. ❌ 존재하지 않는 파일들:");
	const missingFiles = fileNodes.filter(
		(node) => node.metadata?.exists === false,
	);

	missingFiles.forEach((node) => {
		console.log(`   ❌ ${node.sourceFile}`);
	});

	if (missingFiles.length === 0) {
		console.log("   모든 파일이 존재합니다! ✅");
	}
}

/**
 * 실시간 파일 업데이트 시뮬레이션
 */
export async function simulateFileUpdate(
	database: GraphDatabase,
	projectRoot: string = "/project",
): Promise<void> {
	console.log("\n🔄 실시간 파일 업데이트 시뮬레이션");
	console.log("=".repeat(60));

	const analyzer = new FileDependencyAnalyzer(database, projectRoot);

	// 1. 기존 파일 분석
	const originalImports: ImportSource[] = [
		{
			type: "library",
			source: "react",
			imports: [{ name: "React", isDefault: true, isNamespace: false }],
			location: { line: 1, column: 1 },
		},
		{
			type: "relative",
			source: "./OldComponent",
			imports: [{ name: "OldComponent", isDefault: true, isNamespace: false }],
			location: { line: 2, column: 1 },
		},
	];

	console.log("1️⃣ 기존 파일 분석...");
	await analyzer.analyzeFile(
		"/src/UpdatedFile.tsx",
		"typescript",
		originalImports,
	);

	// 2. 파일 내용 변경 시뮬레이션
	const updatedImports: ImportSource[] = [
		{
			type: "library",
			source: "react",
			imports: [
				{ name: "React", isDefault: true, isNamespace: false },
				{ name: "useState", isDefault: false, isNamespace: false },
			],
			location: { line: 1, column: 1 },
		},
		{
			type: "relative",
			source: "./NewComponent", // 새로운 컴포넌트
			imports: [{ name: "NewComponent", isDefault: true, isNamespace: false }],
			location: { line: 2, column: 1 },
		},
		{
			type: "absolute",
			source: "@/utils/helpers", // 새로 추가된 import
			imports: [{ name: "formatDate", isDefault: false, isNamespace: false }],
			location: { line: 3, column: 1 },
		},
	];

	console.log("2️⃣ 파일 업데이트 분석...");
	const result = await analyzer.analyzeFile(
		"/src/UpdatedFile.tsx",
		"typescript",
		updatedImports,
	);

	console.log(`✅ 업데이트 완료:`);
	console.log(`   - 새로운 Import: ${result.stats.totalImports}개`);
	console.log(`   - 기존 의존성은 자동으로 정리됨`);
	console.log(`   - 새로운 의존성 관계 생성됨`);

	// 3. 변경사항 확인
	console.log("\n📊 변경사항 요약:");
	console.log("   제거된 의존성: ./OldComponent");
	console.log("   추가된 의존성: ./NewComponent, @/utils/helpers");
	console.log("   유지된 의존성: react (useState 추가)");
}

/**
 * 대규모 프로젝트 시뮬레이션
 */
export async function simulateLargeProjectAnalysis(
	database: GraphDatabase,
	projectRoot: string = "/project",
): Promise<void> {
	console.log("\n🏗️ 대규모 프로젝트 의존성 분석 시뮬레이션");
	console.log("=".repeat(60));

	const analyzer = new FileDependencyAnalyzer(database, projectRoot);
	const startTime = Date.now();

	// 100개 파일 시뮬레이션
	const filePromises: Promise<DependencyAnalysisResult>[] = [];

	for (let i = 1; i <= 100; i++) {
		const filePath = `/src/components/Component${i}.tsx`;
		const imports: ImportSource[] = [
			{
				type: "library",
				source: "react",
				imports: [{ name: "React", isDefault: true, isNamespace: false }],
				location: { line: 1, column: 1 },
			},
		];

		// 일부 파일은 다른 컴포넌트를 import
		if (i > 1 && i % 3 === 0) {
			imports.push({
				type: "relative",
				source: `./Component${i - 1}`,
				imports: [
					{ name: `Component${i - 1}`, isDefault: true, isNamespace: false },
				],
				location: { line: 2, column: 1 },
			});
		}

		// 일부 파일은 유틸리티를 import
		if (i % 5 === 0) {
			imports.push({
				type: "absolute",
				source: "@/utils/common",
				imports: [{ name: "formatText", isDefault: false, isNamespace: false }],
				location: { line: 3, column: 1 },
			});
		}

		filePromises.push(analyzer.analyzeFile(filePath, "typescript", imports));
	}

	// 병렬 실행
	console.log("📁 100개 파일 병렬 분석 중...");
	const results = await Promise.all(filePromises);

	const endTime = Date.now();
	const duration = endTime - startTime;

	// 결과 집계
	const totalStats = results.reduce(
		(acc, result) => ({
			totalFiles: acc.totalFiles + 1,
			totalImports: acc.totalImports + result.stats.totalImports,
			totalRelationships:
				acc.totalRelationships + result.createdRelationships.length,
		}),
		{ totalFiles: 0, totalImports: 0, totalRelationships: 0 },
	);

	console.log(`⚡ 성능 결과:`);
	console.log(`   처리 시간: ${duration}ms`);
	console.log(`   파일당 평균: ${Math.round(duration / 100)}ms`);
	console.log(`   총 파일: ${totalStats.totalFiles}개`);
	console.log(`   총 Import: ${totalStats.totalImports}개`);
	console.log(`   총 관계: ${totalStats.totalRelationships}개`);
	console.log(
		`   처리율: ${Math.round(totalStats.totalFiles / (duration / 1000))} 파일/초`,
	);
}
