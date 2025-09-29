/**
 * Complete Pipeline Demo
 * Tree-sitter 쿼리 실행부터 CustomKeyMapper까지 전체 파이프라인 데모
 */

import {
	CustomKeyMapping,
	createCustomKeyMapper,
} from "./src/mappers/CustomKeyMapper";
import { parseCode } from "./src/parsers";
import { globalQueryEngine } from "./src/core/QueryEngine";
import { globalTreeSitterQueryEngine, registerTreeSitterQuery, setTreeSitterParser } from "./src/core/TreeSitterQueryEngine";
import type { QueryExecutionContext, QueryMatch } from "./src/core/types";
import {
	registerTypeScriptQueries,
	registerJavaQueries,
	registerPythonQueries
} from "./src/index";

// TypeScript parser 및 쿼리 설정을 위한 기본 정의들
const TYPESCRIPT_QUERIES = {
	"ts-import-sources": `
		(import_statement
			source: (string) @source)
	`,
	"ts-named-imports": `
		(import_statement
			import_clause: (import_clause
				named_imports: (named_imports
					(import_specifier
						name: (identifier) @name))))
	`,
	"ts-default-imports": `
		(import_statement
			import_clause: (import_clause
				name: (identifier) @name))
	`,
	"ts-export-declarations": `
		(export_statement) @export
	`
};

// 테스트용 TypeScript 소스 코드
const testSourceCode = `
import React, { useState, useEffect } from 'react';
import type { User, UserProfile } from './types/user';
import { ApiClient } from '@/lib/api-client';
import axios from 'axios';

export interface ComponentProps {
	userId: string;
	theme?: 'light' | 'dark';
}

export const UserProfileComponent: React.FC<ComponentProps> = ({ userId, theme = 'light' }) => {
	const [user, setUser] = useState<User | null>(null);

	return (
		<div className={\`user-profile \${theme}\`}>
			<h2>{user?.name}</h2>
		</div>
	);
};

export default UserProfileComponent;
export { ComponentProps as Props };
`;

async function demonstrateCompletePipeline() {
	console.log("🚀 Complete Pipeline Demo 시작\n");

	// 0. 시스템 초기화
	console.log("🔧 0. 시스템 초기화...");

	// 쿼리 등록
	registerTypeScriptQueries(globalQueryEngine);
	registerJavaQueries(globalQueryEngine);
	registerPythonQueries(globalQueryEngine);

	// Tree-sitter 쿼리도 등록 (실제로는 파서 모듈에서 해야 함)
	for (const [queryName, queryString] of Object.entries(TYPESCRIPT_QUERIES)) {
		registerTreeSitterQuery("typescript", queryName, queryString);
	}

	console.log("   ✅ 쿼리 등록 완료");

	// 1. 소스 코드 파싱
	console.log("\n📝 1. 소스 코드 파싱...");
	const parseResult = await parseCode(testSourceCode, "typescript", "UserProfile.tsx");
	console.log(`   ✅ 파싱 완료: ${parseResult.metadata.nodeCount}개 노드`);

	const context: QueryExecutionContext = parseResult.context;

	// 2. Tree-sitter 쿼리 실행 (시뮬레이션)
	console.log("\n🔍 2. Tree-sitter 쿼리 실행 시뮬레이션...");

	// 실제로는 Tree-sitter query를 실행해야 하지만, 데모를 위해 시뮬레이션
	const simulatedMatches: Record<string, QueryMatch[]> = {
		"ts-import-sources": [
			{
				queryName: "ts-import-sources",
				captures: [{ name: "source", node: context.tree.rootNode.child(0)! }]
			},
			{
				queryName: "ts-import-sources",
				captures: [{ name: "source", node: context.tree.rootNode.child(1)! }]
			}
		],
		"ts-named-imports": [
			{
				queryName: "ts-named-imports",
				captures: [{ name: "name", node: context.tree.rootNode.child(0)! }]
			}
		],
		"ts-export-declarations": [
			{
				queryName: "ts-export-declarations",
				captures: [{ name: "export", node: context.tree.rootNode.child(5)! }]
			}
		]
	};

	console.log("   📊 시뮬레이션된 매치 결과:");
	Object.entries(simulatedMatches).forEach(([queryName, matches]) => {
		console.log(`     - ${queryName}: ${matches.length}개 매치`);
	});

	// 3. CustomKeyMapper로 사용자 친화적 분석
	console.log("\n🎨 3. CustomKeyMapper로 사용자 친화적 분석...");

	const customMapping: CustomKeyMapping = {
		"모든_임포트": "ts-import-sources",
		"네임드_임포트": "ts-named-imports",
		"익스포트": "ts-export-declarations",
	};

	const customMapper = createCustomKeyMapper(customMapping);
	console.log("   📋 커스텀 매핑 정보:");
	console.log(`   - 사용자 키: ${customMapper.getUserKeys().join(", ")}`);
	console.log(`   - 쿼리 키: ${customMapper.getQueryKeys().join(", ")}`);

	// 4. 시뮬레이션된 쿼리 처리기 실행
	console.log("\n🔄 4. 쿼리 처리기로 구조화된 결과 생성...");

	try {
		// 각 매핑된 쿼리에 대해 직접 처리기 실행
		const customResults = {};

		for (const [userKey, queryKey] of Object.entries(customMapping)) {
			const matches = simulatedMatches[queryKey] || [];

			if (matches.length > 0) {
				// 실제로는 globalQueryEngine.execute()를 사용하지만,
				// 시뮬레이션을 위해 간단한 결과 생성
				const processedResults = matches.map((match, index) => ({
					queryName: match.queryName,
					location: {
						line: 1 + index,
						column: 1,
						offset: 0,
						endLine: 1 + index,
						endColumn: 10,
						endOffset: 10
					},
					nodeText: `${match.queryName}_result_${index}`,
					// 쿼리별 특별 속성들
					...(queryKey === "ts-import-sources" && {
						source: `'./mock-source-${index}.ts'`,
						isRelative: true
					}),
					...(queryKey === "ts-named-imports" && {
						name: `MockImport${index}`,
						isTypeOnly: false
					}),
					...(queryKey === "ts-export-declarations" && {
						exportType: "named"
					})
				}));

				customResults[userKey] = processedResults;
			} else {
				customResults[userKey] = [];
			}
		}

		console.log("   📊 사용자 친화적 분석 결과:");
		Object.entries(customResults).forEach(([userKey, results]) => {
			console.log(`   - ${userKey}: ${(results as any[]).length}개`);
			if ((results as any[]).length > 0) {
				(results as any[]).slice(0, 2).forEach((result, i) => {
					console.log(`     ${i + 1}. ${result.nodeText} (${result.location.line}:${result.location.column})`);
				});
			}
		});

	} catch (error) {
		console.log(`   ❌ 처리기 실행 실패: ${error}`);
	}

	// 5. 조건부 실행 데모
	console.log("\n🎯 5. 조건부 실행 데모");

	const conditions = {
		"모든_임포트": true,
		"네임드_임포트": false,  // 실행하지 않음
		"익스포트": true,
	};

	console.log("   📊 조건부 실행 결과:");
	Object.entries(conditions).forEach(([key, enabled]) => {
		if (enabled) {
			const matches = simulatedMatches[customMapping[key]] || [];
			console.log(`   - ${key}: ${matches.length}개 (✅ 실행됨)`);
		} else {
			console.log(`   - ${key}: ❌ 실행안됨`);
		}
	});

	// 6. 시스템 상태 요약
	console.log("\n📊 6. 시스템 상태 요약");

	const registry = globalQueryEngine.getRegistry();
	const allQueryKeys = registry.getAllQueryKeys();
	const tsQueries = allQueryKeys.filter(key => key.startsWith('ts-'));

	console.log(`   - 등록된 쿼리 프로세서: ${allQueryKeys.length}개`);
	console.log(`   - TypeScript 쿼리 프로세서: ${tsQueries.length}개`);
	console.log(`   - Tree-sitter 쿼리: ${Object.keys(TYPESCRIPT_QUERIES).length}개 (시뮬레이션)`);
	console.log(`   - 커스텀 매핑: ${Object.keys(customMapping).length}개`);

	console.log("\n✅ Complete Pipeline Demo 완료!");
	console.log("\n💡 구현된 기능:");
	console.log("   - ✅ 쿼리 등록 시스템");
	console.log("   - ✅ AST 파싱");
	console.log("   - ✅ CustomKeyMapper 인터페이스");
	console.log("   - ✅ 조건부 실행");
	console.log("   - ✅ 사용자 친화적 키 매핑");

	console.log("\n🔧 구현 필요 사항:");
	console.log("   - ⚠️  Tree-sitter 쿼리 실행 엔진");
	console.log("   - ⚠️  언어별 쿼리 문자열 정의");
	console.log("   - ⚠️  쿼리 결과와 프로세서 연결");
	console.log("   - ⚠️  통합 분석 파이프라인");
}

// 실행
if (require.main === module) {
	demonstrateCompletePipeline().catch(console.error);
}

export { demonstrateCompletePipeline };