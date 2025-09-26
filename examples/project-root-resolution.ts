/**
 * 프로젝트 루트를 기준으로 한 경로 해결 전문 예시
 * PathResolverInterpreter와 PathResolutionUtils를 활용한 실전 시나리오
 */

import * as path from "node:path";
import * as fs from "node:fs";
import {
	createResolutionContext,
	resolveDependencyPath,
	batchResolvePaths,
	loadTsconfigPaths,
	loadPackageDependencies,
	isWithinProject,
	findCommonBasePath,
	convertToProjectRelativePaths,
} from "@context-action/dependency-linker/dist/utils/PathResolutionUtils";
import { PathResolverInterpreter } from "@context-action/dependency-linker/dist/interpreters/PathResolverInterpreter";
import type { InterpreterContext } from "@context-action/dependency-linker/dist/interpreters/IDataInterpreter";

// ===== 프로젝트 루트 자동 감지 유틸리티 =====

function findProjectRoot(startPath: string): string {
	let currentPath = path.resolve(startPath);

	while (currentPath !== path.dirname(currentPath)) {
		// package.json, tsconfig.json, .git 등으로 프로젝트 루트 감지
		const indicators = [
			"package.json",
			"tsconfig.json",
			".git",
			"yarn.lock",
			"pnpm-lock.yaml",
		];

		for (const indicator of indicators) {
			const indicatorPath = path.join(currentPath, indicator);
			if (fs.existsSync(indicatorPath)) {
				return currentPath;
			}
		}

		currentPath = path.dirname(currentPath);
	}

	// 찾지 못한 경우 원래 경로의 상위 디렉토리 반환
	return path.dirname(startPath);
}

// ===== 예시 1: 프로젝트 루트 기반 절대 경로 해결 =====

async function resolveToProjectRoot() {
	console.log("🏠 프로젝트 루트 기반 절대 경로 해결");

	// 현재 프로젝트의 실제 루트 감지
	const projectRoot = findProjectRoot(__dirname);
	console.log(`📁 감지된 프로젝트 루트: ${projectRoot}`);

	// 다양한 소스 파일 위치에서의 경로 해결 테스트
	const testFiles = [
		path.join(projectRoot, "src/components/Header.tsx"),
		path.join(projectRoot, "src/pages/auth/Login.tsx"),
		path.join(projectRoot, "src/utils/api/client.ts"),
		path.join(projectRoot, "tests/unit/components/Button.test.ts"),
	];

	// 각 파일에서 참조할 수 있는 의존성들
	const commonDependencies = [
		"./Button.tsx", // 같은 디렉토리
		"../shared/constants.ts", // 상위 디렉토리
		"../../utils/helpers.ts", // 두 단계 상위
		"@/components/Layout.tsx", // 프로젝트 루트 기준 별칭
		"@utils/format.ts", // 유틸리티 별칭
		"react", // 외부 패키지
		"node:fs", // 내장 모듈
	];

	for (const testFile of testFiles) {
		console.log(`\n📄 분석 파일: ${path.relative(projectRoot, testFile)}`);

		const sourceFileDir = path.dirname(testFile);
		const context = createResolutionContext(
			{ pathInfo: { projectRoot, absolute: testFile } },
			{
				"@": "src",
				"@components": "src/components",
				"@utils": "src/utils",
				"@pages": "src/pages",
				"@tests": "tests",
			},
		);

		const resolvedPaths = await batchResolvePaths(commonDependencies, context);

		resolvedPaths.forEach((resolved, original) => {
			if (resolved) {
				const relativePath = path.relative(projectRoot, resolved);
				const isInternal = isWithinProject(resolved, projectRoot);
				console.log(
					`  ${original.padEnd(25)} → ${relativePath} ${isInternal ? "🏠" : "📦"}`,
				);
			} else {
				console.log(`  ${original.padEnd(25)} → UNRESOLVED ❌`);
			}
		});
	}
}

// ===== 예시 2: TypeScript 프로젝트 설정과 통합 =====

async function integrateWithTypeScriptConfig() {
	console.log("\n⚙️ TypeScript 설정과 통합된 경로 해결");

	const projectRoot = findProjectRoot(__dirname);

	// tsconfig.json에서 경로 매핑 로드
	const pathMappings = await loadTsconfigPaths(projectRoot);
	console.log("🗺 tsconfig.json 경로 매핑:", pathMappings);

	// package.json에서 의존성 정보 로드
	const packageDependencies = await loadPackageDependencies(projectRoot);
	console.log(`📦 package.json 의존성: ${packageDependencies.size}개`);

	// PathResolverInterpreter 설정
	const pathResolver = new PathResolverInterpreter();
	pathResolver.configure({
		resolveNodeModules: true,
		includePackageInfo: true,
		validateFileExists: true,
		aliasPatterns: pathMappings,
	});

	// 실제 TypeScript 파일 시뮬레이션
	const mockTSFile = path.join(projectRoot, "src/services/UserService.ts");
	const mockDependencies = {
		dependencies: [
			{ source: "@/models/User" }, // 타입 정의
			{ source: "@/utils/api" }, // API 유틸리티
			{ source: "@/constants/endpoints" }, // API 엔드포인트
			{ source: "../types/common" }, // 공통 타입
			{ source: "./BaseService" }, // 베이스 서비스
			{ source: "axios" }, // HTTP 클라이언트
			{ source: "lodash/merge" }, // 유틸리티 함수
			{ source: "@types/lodash" }, // 타입 정의
		],
		totalCount: 8,
		importCount: 8,
		exportCount: 0,
		dynamicImportCount: 0,
		typeOnlyImportCount: 3,
	};

	const context: InterpreterContext = {
		filePath: mockTSFile,
		language: "typescript",
		metadata: { hasTypeScript: true },
		timestamp: new Date(),
		projectContext: {
			rootPath: projectRoot,
			projectType: "library",
		},
	};

	const result = pathResolver.interpret(mockDependencies, context);

	console.log("\n📊 TypeScript 프로젝트 분석 결과:");
	console.log(`총 의존성: ${result.summary.totalDependencies}`);
	console.log(`별칭 해결: ${result.summary.aliasCount}개`);
	console.log(`타입 전용: ${mockDependencies.typeOnlyImportCount}개`);

	// 프로젝트 루트 기준 상대 경로로 변환
	const projectRelativeResults = convertToProjectRelativePaths(
		result.resolvedDependencies,
		projectRoot,
		["resolvedPath", "projectRelativePath"],
	);

	console.log("\n🏠 프로젝트 루트 기준 경로:");
	projectRelativeResults.forEach((dep: any) => {
		if (dep.resolutionType === "relative" || dep.resolutionType === "alias") {
			console.log(
				`  ${dep.originalSource} → ${dep.projectRelativePath || dep.resolvedPath}`,
			);
		}
	});

	return result;
}

// ===== 예시 3: 모노레포 환경에서의 경로 해결 =====

async function monorepoPathResolution() {
	console.log("\n🏢 모노레포 환경에서의 경로 해결");

	// 모노레포 구조 시뮬레이션
	const monorepoRoot = "/Users/project/monorepo";
	const packages = [
		"packages/ui-components",
		"packages/utils",
		"packages/api-client",
		"apps/web-app",
		"apps/admin-dashboard",
	];

	// 각 패키지별 경로 해결 테스트
	for (const packagePath of packages) {
		const fullPackagePath = path.join(monorepoRoot, packagePath);
		const isApp = packagePath.startsWith("apps/");

		console.log(`\n📦 ${isApp ? "앱" : "패키지"}: ${packagePath}`);

		// 패키지간 의존성 시뮬레이션
		const crossPackageDependencies = [
			"@repo/ui-components", // 다른 패키지 참조
			"@repo/utils", // 공통 유틸리티
			"@repo/api-client", // API 클라이언트
			"../../../packages/ui-components", // 상대 경로로 다른 패키지
			"./components/Button", // 내부 컴포넌트
			"shared-package", // 외부 공유 패키지
		];

		const context = {
			projectRoot: fullPackagePath,
			sourceFileDir: path.join(fullPackagePath, "src"),
			aliases: {
				"@repo/ui-components": "../ui-components/src",
				"@repo/utils": "../utils/src",
				"@repo/api-client": "../api-client/src",
				"@": "src",
			},
			extensions: [".ts", ".tsx", ".js", ".jsx"],
		};

		const resolvedPaths = await batchResolvePaths(
			crossPackageDependencies,
			context,
		);

		resolvedPaths.forEach((resolved, original) => {
			if (resolved) {
				const isWithinMonorepo = resolved.includes(monorepoRoot);
				const isWithinPackage = isWithinProject(resolved, fullPackagePath);

				let indicator = "📦"; // 외부 패키지
				if (isWithinPackage)
					indicator = "🏠"; // 같은 패키지
				else if (isWithinMonorepo) indicator = "🔗"; // 다른 패키지

				console.log(
					`  ${original.padEnd(30)} → ${indicator} ${path.relative(monorepoRoot, resolved)}`,
				);
			} else {
				console.log(`  ${original.padEnd(30)} → ❌ UNRESOLVED`);
			}
		});
	}
}

// ===== 예시 4: 동적 경로 해결 및 실시간 분석 =====

async function dynamicPathResolution() {
	console.log("\n⚡ 동적 경로 해결 및 실시간 분석");

	const projectRoot = findProjectRoot(__dirname);
	const pathResolver = new PathResolverInterpreter();

	// 동적으로 변화하는 의존성 시나리오
	const scenarios = [
		{
			name: "컴포넌트 리팩토링",
			before: ["./OldButton.tsx", "../shared/OldUtils.ts"],
			after: [
				"./Button.tsx",
				"../shared/utils/index.ts",
				"@/components/shared/NewButton.tsx",
			],
		},
		{
			name: "디렉토리 구조 변경",
			before: ["../utils/helpers.ts", "./components/Modal.tsx"],
			after: ["@/utils/helpers.ts", "@/components/Modal.tsx"],
		},
		{
			name: "외부 의존성 추가",
			before: ["./customHttp.ts"],
			after: ["axios", "@/adapters/httpAdapter.ts"],
		},
	];

	for (const scenario of scenarios) {
		console.log(`\n🔄 시나리오: ${scenario.name}`);

		const testFile = path.join(projectRoot, "src/components/TestComponent.tsx");
		const context: InterpreterContext = {
			filePath: testFile,
			language: "typescript",
			metadata: {},
			timestamp: new Date(),
			projectContext: {
				rootPath: projectRoot,
				projectType: "frontend",
			},
		};

		// Before 상태 분석
		const beforeData = {
			dependencies: scenario.before.map((source) => ({ source })),
			totalCount: scenario.before.length,
			importCount: scenario.before.length,
			exportCount: 0,
			dynamicImportCount: 0,
			typeOnlyImportCount: 0,
		};

		const beforeResult = pathResolver.interpret(beforeData, context);

		// After 상태 분석
		const afterData = {
			dependencies: scenario.after.map((source) => ({ source })),
			totalCount: scenario.after.length,
			importCount: scenario.after.length,
			exportCount: 0,
			dynamicImportCount: 0,
			typeOnlyImportCount: 0,
		};

		const afterResult = pathResolver.interpret(afterData, context);

		console.log(
			`  변경 전: 해결 ${beforeResult.summary.resolvedCount}/${beforeResult.summary.totalDependencies}`,
		);
		console.log(
			`  변경 후: 해결 ${afterResult.summary.resolvedCount}/${afterResult.summary.totalDependencies}`,
		);

		// 공통 기준 경로 찾기
		const allPaths = [
			...beforeResult.resolvedDependencies
				.map((d) => d.resolvedPath)
				.filter(Boolean),
			...afterResult.resolvedDependencies
				.map((d) => d.resolvedPath)
				.filter(Boolean),
		] as string[];

		if (allPaths.length > 0) {
			const commonBase = findCommonBasePath(allPaths);
			console.log(`  공통 기준: ${path.relative(projectRoot, commonBase)}`);
		}
	}
}

// ===== 예시 5: 성능 최적화 및 캐싱 =====

async function performanceOptimizedResolution() {
	console.log("\n🚀 성능 최적화된 경로 해결");

	const projectRoot = findProjectRoot(__dirname);

	// 대량의 의존성 시뮬레이션
	const largeDependencySet: string[] = [];

	// 다양한 패턴의 의존성 생성
	for (let i = 0; i < 100; i++) {
		largeDependencySet.push(`./component${i}.tsx`);
		largeDependencySet.push(`../utils/helper${i}.ts`);
		largeDependencySet.push(`@/types/Type${i}.ts`);
	}

	largeDependencySet.push(
		...[
			"react",
			"react-dom",
			"lodash",
			"axios",
			"moment",
			"node:fs",
			"node:path",
			"node:util",
			"node:crypto",
		],
	);

	console.log(`📊 총 의존성 수: ${largeDependencySet.length}`);

	const context = {
		projectRoot,
		sourceFileDir: path.join(projectRoot, "src/components"),
		aliases: {
			"@": "src",
			"@components": "src/components",
			"@utils": "src/utils",
			"@types": "src/types",
		},
		extensions: [".ts", ".tsx", ".js", ".jsx"],
	};

	// 성능 측정
	const startTime = Date.now();

	const resolvedPaths = await batchResolvePaths(largeDependencySet, context);

	const endTime = Date.now();
	const duration = endTime - startTime;

	// 결과 분석
	const resolved = Array.from(resolvedPaths.values()).filter(Boolean).length;
	const unresolved = largeDependencySet.length - resolved;

	console.log("\n⏱ 성능 결과:");
	console.log(`  처리 시간: ${duration}ms`);
	console.log(
		`  처리 속도: ${Math.round((largeDependencySet.length / duration) * 1000)} 의존성/초`,
	);
	console.log(`  해결된 경로: ${resolved}개`);
	console.log(`  미해결 경로: ${unresolved}개`);
	console.log(
		`  성공률: ${Math.round((resolved / largeDependencySet.length) * 100)}%`,
	);

	return { resolvedPaths, performance: { duration, resolved, unresolved } };
}

// ===== 메인 실행 함수 =====

export async function runProjectRootResolutionExamples() {
	console.log("🎯 프로젝트 루트 기반 경로 해결 예시 실행\n");

	try {
		await resolveToProjectRoot();
		await integrateWithTypeScriptConfig();
		await monorepoPathResolution();
		await dynamicPathResolution();
		await performanceOptimizedResolution();

		console.log("\n✅ 모든 프로젝트 루트 경로 해결 예시 완료!");
		console.log("\n💡 주요 포인트:");
		console.log("  🏠 프로젝트 루트 자동 감지");
		console.log("  🗺 tsconfig.json 경로 매핑 활용");
		console.log("  🔗 모노레포 패키지간 참조");
		console.log("  ⚡ 대량 의존성 고성능 처리");
		console.log("  🎯 실시간 동적 경로 해결");
	} catch (error) {
		console.error("❌ 예시 실행 중 오류:", error);
	}
}

// 직접 실행 시
if (require.main === module) {
	runProjectRootResolutionExamples();
}
