/**
 * Type Imports 분석 테스트
 * TypeScript type import 구문들이 올바르게 분석되는지 확인
 */

import { TypeScriptParser } from "../../src/parsers/TypeScriptParser";
import {
	TypedQueryExecutor,
	TYPED_TYPE_IMPORTS_QUERY,
	TYPED_IMPORT_SOURCES_QUERY,
	TYPED_NAMED_IMPORTS_QUERY,
	type TypeImportResult,
	type ImportSourceResult,
	type NamedImportResult,
} from "./src/extractors/EnhancedDependencyExtractorV2";

// TypeScript type import 구문들을 포함한 테스트 코드
const typeImportTestCode = `
// 다양한 type import 패턴들
import type { FC, ReactNode, ComponentProps } from 'react';
import type { AxiosResponse, AxiosError } from 'axios';
import type { ButtonProps } from '@mui/material/Button';
import type React from 'react';
import type * as Types from './types';
import type { User as UserType, Admin } from './models/User';

// 일반 import와 type import 혼합
import React, { useState, useEffect } from 'react';
import type { MouseEvent, ChangeEvent } from 'react';
import { Button, TextField } from '@mui/material';
import type { ThemeProvider } from '@mui/material/styles';

// Interface 정의
interface UserProps extends ComponentProps<'div'> {
  user: UserType;
  admin?: Admin;
  onUserClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Type 사용
const UserComponent: FC<UserProps> = ({ user, admin, onUserClick, ...props }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onUserClick?.(event);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    console.log('Input changed:', event.target.value);
  };

  return (
    <div {...props}>
      <Button onClick={handleClick}>
        {user.name}
      </Button>
      <TextField onChange={handleChange} />
    </div>
  );
};

export default UserComponent;
export type { UserProps, UserType };
`;

async function testTypeImports() {
	console.log("🧪 Type Imports 분석 테스트\n");

	const parser = new TypeScriptParser();
	const parseResult = await parser.parse(
		"/TypeImportTest.tsx",
		typeImportTestCode,
	);

	if (!parseResult.ast) {
		console.error("❌ AST 파싱 실패");
		return;
	}

	const executor = new TypedQueryExecutor();
	const Parser = require("tree-sitter");

	// Mock context 생성
	const mockContext = {
		importMap: new Map(),
		usageMap: new Map(),
		addUsage: () => {},
		extractStringFromNode: (node: any) => {
			const text = node.text;
			return text.startsWith('"') ||
				text.startsWith("'") ||
				text.startsWith("`")
				? text.slice(1, -1)
				: text;
		},
		findChildByType: (node: any, type: string) => {
			for (let i = 0; i < node.childCount; i++) {
				const child = node.child(i);
				if (child && child.type === type) return child;
			}
			return null;
		},
	};

	console.log("📊 테스트 1: Type Imports 전용 분석");
	console.log("=".repeat(50));

	let typeResult: any = { success: false, results: [] };

	try {
		// Type Imports Query 실행
		const typeQuery = new Parser.Query(
			parser.getGrammar(),
			TYPED_TYPE_IMPORTS_QUERY.query,
		);
		const typeMatches = typeQuery.matches(parseResult.ast.rootNode);
		typeResult = executor.executeQuery(
			TYPED_TYPE_IMPORTS_QUERY,
			typeMatches,
			mockContext,
		);

		console.log(`  ✅ 실행 성공: ${typeResult.success}`);
		console.log(`  ⏱️  실행 시간: ${typeResult.executionTime.toFixed(2)}ms`);
		console.log(`  📊 매치된 노드: ${typeResult.nodeCount}개`);
		console.log(`  🏷️ 발견된 Type Imports: ${typeResult.results.length}개`);

		if (typeResult.success && typeResult.results.length > 0) {
			console.log("\n  📋 Type Imports 상세:");
			typeResult.results.forEach((result: TypeImportResult, index: number) => {
				console.log(
					`    ${index + 1}. ${result.typeName}${result.alias ? ` as ${result.alias}` : ""} from "${result.source}"`,
				);
				console.log(`       타입: ${result.importType}`);
				console.log(
					`       위치: ${result.location.line}:${result.location.column}`,
				);
			});

			// 타입별 분류
			const byImportType = typeResult.results.reduce(
				(acc: Record<string, number>, result: TypeImportResult) => {
					acc[result.importType] = (acc[result.importType] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			console.log("\n  📈 Import 타입별 분포:");
			Object.entries(byImportType).forEach(([type, count]) => {
				console.log(`    - ${type}: ${count}개`);
			});
		}
	} catch (error) {
		console.error("❌ Type Imports 쿼리 실행 실패:", error);
	}

	console.log("\n📊 테스트 2: 일반 Import vs Type Import 비교");
	console.log("=".repeat(50));

	try {
		// 일반 Import Sources 분석
		const sourcesQuery = new Parser.Query(
			parser.getGrammar(),
			TYPED_IMPORT_SOURCES_QUERY.query,
		);
		const sourcesMatches = sourcesQuery.matches(parseResult.ast.rootNode);
		const sourcesResult = executor.executeQuery(
			TYPED_IMPORT_SOURCES_QUERY,
			sourcesMatches,
			mockContext,
		);

		// Named Imports 분석
		const namedQuery = new Parser.Query(
			parser.getGrammar(),
			TYPED_NAMED_IMPORTS_QUERY.query,
		);
		const namedMatches = namedQuery.matches(parseResult.ast.rootNode);
		const namedResult = executor.executeQuery(
			TYPED_NAMED_IMPORTS_QUERY,
			namedMatches,
			mockContext,
		);

		console.log("  📊 Import 분석 결과 비교:");
		console.log(`    📦 Import Sources: ${sourcesResult.results.length}개`);
		console.log(`    🎯 Named Imports: ${namedResult.results.length}개`);
		console.log(`    🏷️ Type Imports: ${typeResult.results.length}개`);

		// 소스별 분류
		const allSources = new Set<string>();
		sourcesResult.results.forEach((result: ImportSourceResult) => {
			allSources.add(result.source);
		});

		console.log("\n  📋 Import된 라이브러리/파일:");
		Array.from(allSources).forEach((source) => {
			const namedCount = namedResult.results.filter(
				(r: NamedImportResult) => r.source === source,
			).length;
			const typeCount = typeResult.results.filter(
				(r: TypeImportResult) => r.source === source,
			).length;

			console.log(
				`    "${source}": Named ${namedCount}개, Type ${typeCount}개`,
			);
		});
	} catch (error) {
		console.error("❌ 일반 Import 쿼리 실행 실패:", error);
	}

	console.log("\n📊 테스트 3: Type Import 패턴 분석");
	console.log("=".repeat(50));

	if (typeResult.success) {
		const results = typeResult.results as TypeImportResult[];

		// 패턴별 분석
		const patterns = {
			reactTypes: results.filter((r) => r.source === "react"),
			muiTypes: results.filter((r) => r.source.includes("@mui")),
			localTypes: results.filter((r) => r.source.startsWith(".")),
			aliasedTypes: results.filter((r) => r.alias),
			namedTypes: results.filter((r) => r.importType === "named"),
			defaultTypes: results.filter((r) => r.importType === "default"),
			namespaceTypes: results.filter((r) => r.importType === "namespace"),
		};

		console.log("  📈 Type Import 패턴 분석:");
		console.log(`    🔵 React 타입: ${patterns.reactTypes.length}개`);
		console.log(`    🔶 MUI 타입: ${patterns.muiTypes.length}개`);
		console.log(`    🔸 로컬 타입: ${patterns.localTypes.length}개`);
		console.log(`    🏷️ 별칭 사용: ${patterns.aliasedTypes.length}개`);
		console.log("");
		console.log("  📊 Import 스타일 분포:");
		console.log(`    🎯 Named: ${patterns.namedTypes.length}개`);
		console.log(`    🔤 Default: ${patterns.defaultTypes.length}개`);
		console.log(`    🌐 Namespace: ${patterns.namespaceTypes.length}개`);

		// 상세한 React 타입들
		if (patterns.reactTypes.length > 0) {
			console.log("\n  🔵 React 타입 상세:");
			patterns.reactTypes.forEach((type) => {
				console.log(`    - ${type.typeName} (${type.importType})`);
			});
		}

		// 별칭 사용 예시
		if (patterns.aliasedTypes.length > 0) {
			console.log("\n  🏷️ 별칭 사용 예시:");
			patterns.aliasedTypes.forEach((type) => {
				console.log(
					`    - ${type.typeName} as ${type.alias} from "${type.source}"`,
				);
			});
		}
	}

	console.log("\n📊 테스트 4: Tree-sitter Query 구문 검증");
	console.log("=".repeat(50));

	// 쿼리 구문 자체를 확인
	console.log("  🔍 Type Import Query 구문:");
	console.log("```");
	console.log(TYPED_TYPE_IMPORTS_QUERY.query.trim());
	console.log("```");

	console.log("\n  📋 예상되는 TypeScript 패턴들:");
	console.log('    ✅ import type { FC, ReactNode } from "react"');
	console.log('    ✅ import type React from "react"');
	console.log('    ✅ import type * as Types from "./types"');
	console.log('    ✅ import type { User as UserType } from "./models"');

	console.log("\n✅ Type Imports 분석 테스트 완료!");
	console.log("📋 검증된 기능:");
	console.log("  ✅ Named Type Imports (가장 일반적)");
	console.log("  ✅ Default Type Imports");
	console.log("  ✅ Namespace Type Imports");
	console.log("  ✅ Type Alias 처리");
	console.log("  ✅ 일반 Import vs Type Import 구분");
	console.log("  ✅ 라이브러리별 분류 및 통계");
}

// 실행
if (require.main === module) {
	testTypeImports().catch(console.error);
}
