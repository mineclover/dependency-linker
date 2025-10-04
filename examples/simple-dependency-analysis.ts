/**
 * Simple Dependency Analysis Example
 * 간단한 의존성 분석 사용 예제 - 실제 파일로 테스트
 */

import { resolve } from "node:path";
import { promises as fs } from "node:fs";
import {
	analyzeTypeScriptFile,
	analyzeDependencies,
	createCustomKeyMapper,
	initializeAnalysisSystem,
} from "../src";

async function main() {
	console.log("🚀 간단한 의존성 분석 예제");

	// 시스템 초기화
	initializeAnalysisSystem();

	// ===== 1. 기본 파일 분석 =====
	console.log("\n📊 1. 기본 TypeScript 파일 분석");

	const sampleCode = `
import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import type { User } from './types/User';
import { apiClient } from '../utils/api';
import fs from 'node:fs';

export const UserComponent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiClient.getUser().then(setUser);
  }, []);

  return <Button>Hello {user?.name}</Button>;
};

export default UserComponent;
`;

	try {
		const analysis = await analyzeTypeScriptFile(
			sampleCode,
			"UserComponent.tsx",
		);

		console.log("✅ 분석 완료:");
		console.log(`  - 언어: ${analysis.language}`);
		console.log(
			`  - 파싱 시간: ${analysis.parseMetadata.parseTime.toFixed(2)}ms`,
		);
		console.log(`  - AST 노드 수: ${analysis.parseMetadata.nodeCount}개`);
		console.log(
			`  - 쿼리 실행 시간: ${analysis.performanceMetrics.queryExecutionTime.toFixed(2)}ms`,
		);

		// 쿼리 결과 개수 출력
		console.log("  - 쿼리 결과:");
		Object.entries(analysis.queryResults).forEach(([key, results]) => {
			console.log(`    ${key}: ${results.length}개`);
		});
	} catch (error) {
		console.error("❌ 분석 실패:", error);
	}

	// ===== 2. 커스텀 매핑 사용 =====
	console.log("\n📊 2. 커스텀 매핑으로 사용자 친화적 결과");

	const reactMapping = {
		리액트_임포트: "ts-import-sources",
		훅_사용: "ts-named-imports",
		컴포넌트_익스포트: "ts-export-declarations",
	};

	try {
		const mapper = createCustomKeyMapper(reactMapping);
		console.log("✅ 매핑 생성 완료");

		const analysis = await analyzeTypeScriptFile(
			sampleCode,
			"UserComponent.tsx",
			{
				mapping: reactMapping,
			},
		);

		if (analysis.customResults) {
			console.log("  - 커스텀 결과:");
			Object.entries(analysis.customResults).forEach(([key, results]) => {
				console.log(`    ${key}: ${results.length}개`);
				if (results.length > 0 && key === "리액트_임포트") {
					results.forEach((result: any, index) => {
						if (result.source) {
							console.log(`      ${index + 1}. ${result.source}`);
						}
					});
				}
			});
		}
	} catch (error) {
		console.error("❌ 커스텀 매핑 실패:", error);
	}

	// ===== 3. 의존성 분류 분석 =====
	console.log("\n📊 3. 의존성 분류 분석");

	try {
		const deps = await analyzeDependencies(
			sampleCode,
			"tsx",
			"UserComponent.tsx",
		);

		console.log("✅ 의존성 분류 완료:");
		console.log(`  - 내부 의존성: ${deps.internal.length}개`);
		deps.internal.forEach((dep, index) => {
			console.log(`    ${index + 1}. ${dep}`);
		});

		console.log(`  - 외부 의존성: ${deps.external.length}개`);
		deps.external.forEach((dep, index) => {
			console.log(`    ${index + 1}. ${dep}`);
		});

		console.log(`  - 내장 모듈: ${deps.builtin.length}개`);
		deps.builtin.forEach((dep, index) => {
			console.log(`    ${index + 1}. ${dep}`);
		});
	} catch (error) {
		console.error("❌ 의존성 분류 실패:", error);
	}

	// ===== 4. 실제 프로젝트 파일 분석 =====
	console.log("\n📊 4. 실제 프로젝트 파일 분석");

	const projectRoot = resolve(__dirname, "..");
	const targetFile = resolve(projectRoot, "src/api/analysis.ts");

	try {
		const fileExists = await fs
			.access(targetFile)
			.then(() => true)
			.catch(() => false);

		if (fileExists) {
			const sourceCode = await fs.readFile(targetFile, "utf-8");
			const analysis = await analyzeTypeScriptFile(sourceCode, targetFile);

			console.log(`✅ ${targetFile.replace(projectRoot, ".")} 분석 완료:`);
			console.log(`  - 파일 크기: ${sourceCode.length} characters`);
			console.log(`  - AST 노드: ${analysis.parseMetadata.nodeCount}개`);
			console.log(
				`  - 분석 시간: ${analysis.performanceMetrics.totalExecutionTime.toFixed(2)}ms`,
			);

			// 실제 의존성 분석
			const deps = await analyzeDependencies(
				sourceCode,
				"typescript",
				targetFile,
			);
			console.log(`  - 내부 의존성: ${deps.internal.length}개`);
			console.log(`  - 외부 의존성: ${deps.external.length}개`);
			console.log(`  - 내장 모듈: ${deps.builtin.length}개`);

			if (deps.internal.length > 0) {
				console.log("  - 내부 의존성 목록:");
				deps.internal.slice(0, 5).forEach((dep, index) => {
					console.log(`    ${index + 1}. ${dep}`);
				});
			}
		} else {
			console.log("❌ 파일을 찾을 수 없습니다:", targetFile);
		}
	} catch (error) {
		console.error("❌ 실제 파일 분석 실패:", error);
	}

	// ===== 5. 간단한 경로 해결 예제 =====
	console.log("\n📊 5. 경로 해결 시뮬레이션");

	const importPaths = [
		"./types/User", // 상대 경로
		"../utils/api", // 상대 경로 (상위)
		"react", // 외부 패키지
		"@mui/material", // 스코프드 패키지
		"node:fs", // Node.js 내장 모듈
	];

	importPaths.forEach((importPath) => {
		let category = "unknown";
		if (importPath.startsWith("./") || importPath.startsWith("../")) {
			category = "internal (relative)";
		} else if (
			importPath.startsWith("node:") ||
			["fs", "path", "os"].includes(importPath)
		) {
			category = "builtin";
		} else if (!importPath.startsWith("/")) {
			category = "external";
		}

		console.log(`  📁 ${importPath} → ${category}`);
	});

	console.log("\n🎉 간단한 의존성 분석 완료!");
	console.log("\n💡 다음 단계:");
	console.log("  - 실제 프로젝트 파일들을 대상으로 분석");
	console.log("  - 여러 파일 간의 의존성 관계 추적");
	console.log("  - 의존성 그래프 시각화 또는 리포트 생성");
}

// 예제 실행
if (require.main === module) {
	main().catch(console.error);
}

export { main as runSimpleDependencyExample };
