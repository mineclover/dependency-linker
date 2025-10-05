/**
 * Common Queries 테스트
 * 실제 프로젝트에서 자주 사용되는 분석 패턴들을 테스트
 */

import { TypeScriptParser } from "../../src/parsers/TypeScriptParser";
import {
	EnhancedDependencyExtractorV2,
	QueryConfigurationBuilder,
} from "../../src/extractors/EnhancedDependencyExtractorV2";
import {
	ALL_COMMON_QUERIES,
	IMPORT_QUERIES,
	USAGE_QUERIES,
	JSX_QUERIES,
	TYPESCRIPT_QUERIES,
} from "../../src/extractors/CommonQueries";

// 복잡한 실제 프로젝트 패턴을 시뮬레이션한 테스트 코드
const realWorldCode = `
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FC, ReactNode, MouseEvent } from 'react';
import { format, addDays, isValid } from 'date-fns';
import axios, { AxiosResponse } from 'axios';
import * as utils from './utils';
import { debounce } from 'lodash';
import { Button, TextField, Dialog } from '@mui/material';

interface UserData {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface Props {
  userId: number;
  onUserUpdate?: (user: UserData) => void;
  children: ReactNode;
}

const UserProfile: FC<Props> = ({ userId, onUserUpdate, children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출
  const fetchUser = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response: AxiosResponse<UserData> = await axios.get(\`/api/users/\${id}\`);
      const userData = response.data;

      if (isValid(new Date(userData.createdAt))) {
        setUser(userData);
        onUserUpdate?.(userData);
      }
    } catch (err) {
      setError(utils.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onUserUpdate]);

  // 디바운스된 검색
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      console.log('Searching:', searchTerm);
    }, 300),
    []
  );

  useEffect(() => {
    fetchUser(userId);
  }, [userId, fetchUser]);

  // 날짜 포맷팅
  const formattedDate = user ? format(new Date(user.createdAt), 'PPP') : '';
  const nextWeek = user ? addDays(new Date(user.createdAt), 7) : null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    debouncedSearch(user?.name || '');
  };

  const { processedName, displayEmail } = utils.processUserData(user);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Dialog open={true}>
        <div>Error: {error}</div>
      </Dialog>
    );
  }

  return (
    <div className="user-profile">
      <h1>{processedName}</h1>
      <p>Email: {displayEmail}</p>
      <p>Created: {formattedDate}</p>
      <Button onClick={handleClick} variant="contained">
        Search User
      </Button>
      <TextField
        value={user?.name || ''}
        onChange={(e) => debouncedSearch(e.target.value)}
        label="Search"
      />
      {children}
    </div>
  );
};

export default UserProfile;
`;

async function testCommonQueries() {
	console.log("🧪 Common Queries 종합 테스트\n");

	const parser = new TypeScriptParser();
	const parseResult = await parser.parse("/UserProfile.tsx", realWorldCode);

	if (!parseResult.ast) {
		console.error("❌ AST 파싱 실패");
		return;
	}

	// 테스트 1: 모든 쿼리 활성화
	console.log("📊 테스트 1: 모든 분석 쿼리 실행");
	console.log("=".repeat(50));

	const allQueriesConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	// 기본 쿼리 + 모든 공통 쿼리 추가
	ALL_COMMON_QUERIES.forEach((query) => {
		if (query.name.includes("import")) {
			allQueriesConfig.importQueries.push(query);
		} else {
			allQueriesConfig.usageQueries.push(query);
		}
	});

	const extractorAll = new EnhancedDependencyExtractorV2(allQueriesConfig);
	const resultAll = extractorAll.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	console.log("\n결과 요약:", {
		dependencies: resultAll.enhancedDependencies.length,
		totalImports: resultAll.usageAnalysis.totalImports,
		usedImports: resultAll.usageAnalysis.usedImports,
		unusedImports: resultAll.usageAnalysis.unusedImports,
	});

	// 테스트 2: Import 전용 분석
	console.log("\n📦 테스트 2: Import 전용 분석");
	console.log("=".repeat(50));

	const importConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	IMPORT_QUERIES.forEach((query) => {
		importConfig.importQueries.push(query);
	});

	const extractorImport = new EnhancedDependencyExtractorV2(importConfig);
	extractorImport.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	// 테스트 3: Usage 전용 분석
	console.log("\n🔧 테스트 3: Usage 전용 분석");
	console.log("=".repeat(50));

	const usageConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	USAGE_QUERIES.forEach((query) => {
		usageConfig.usageQueries.push(query);
	});

	const extractorUsage = new EnhancedDependencyExtractorV2(usageConfig);
	extractorUsage.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	// 테스트 4: JSX 전용 분석
	console.log("\n🎨 테스트 4: JSX 전용 분석");
	console.log("=".repeat(50));

	const jsxConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	JSX_QUERIES.forEach((query) => {
		jsxConfig.usageQueries.push(query);
	});

	const extractorJSX = new EnhancedDependencyExtractorV2(jsxConfig);
	extractorJSX.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	// 테스트 5: TypeScript 타입 전용 분석
	console.log("\n🏷️ 테스트 5: TypeScript 타입 전용 분석");
	console.log("=".repeat(50));

	const typeConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	TYPESCRIPT_QUERIES.forEach((query) => {
		typeConfig.importQueries.push(query);
	});

	const extractorType = new EnhancedDependencyExtractorV2(typeConfig);
	extractorType.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	// 테스트 6: 선별적 쿼리 조합
	console.log("\n🎯 테스트 6: 선별적 쿼리 조합 (React 프로젝트 최적화)");
	console.log("=".repeat(50));

	const reactOptimizedConfig = new QueryConfigurationBuilder()
		.updateSettings({ enableFallback: false, debug: false })
		.build();

	// React 프로젝트에 최적화된 쿼리만 선별
	const reactQueries = ALL_COMMON_QUERIES.filter(
		(query) =>
			query.name.includes("import") ||
			query.name.includes("hook") ||
			query.name.includes("jsx") ||
			query.name.includes("function-calls"),
	);

	reactQueries.forEach((query) => {
		if (query.name.includes("import")) {
			reactOptimizedConfig.importQueries.push(query);
		} else {
			reactOptimizedConfig.usageQueries.push(query);
		}
	});

	const extractorReact = new EnhancedDependencyExtractorV2(
		reactOptimizedConfig,
	);
	const reactResult = extractorReact.extractEnhanced(
		parseResult.ast,
		"/UserProfile.tsx",
		parser.getGrammar(),
	);

	console.log("\nReact 최적화 결과:", {
		dependencies: reactResult.enhancedDependencies.length,
		mostUsedMethods: reactResult.usageAnalysis.mostUsedMethods.slice(0, 5),
	});

	console.log("\n✅ Common Queries 테스트 완료!");
	console.log("\n📋 활용 가능한 분석 패턴:");
	console.log("  📦 Import Sources - 외부 라이브러리 의존성 분석");
	console.log("  🎯 Named Imports - 사용된 구체적 함수/변수 추적");
	console.log("  🔤 Default Imports - 메인 라이브러리 imports");
	console.log("  🌐 Namespace Imports - 전체 모듈 imports");
	console.log("  🔧 Function Calls - 함수 호출 패턴 분석");
	console.log("  🎪 Property Access - 객체 속성 접근 패턴");
	console.log("  🎨 JSX Components - React 컴포넌트 사용");
	console.log("  🪝 React Hooks - Hook 사용 패턴");
	console.log("  🏷️ Type Imports - TypeScript 타입 의존성");
	console.log("  ⛓️ Method Chaining - 메서드 체이닝 분석");
	console.log("  🔄 Destructuring - 구조분해할당 패턴");
}

// 실행
if (require.main === module) {
	testCommonQueries().catch(console.error);
}
