/**
 * PathResolverInterpreter와 PathResolutionUtils 활용 예시
 * 프로젝트 루트로 경로 해결하는 다양한 방법들
 */

import { PathResolverInterpreter } from '@context-action/dependency-linker/dist/interpreters/PathResolverInterpreter';
import {
  resolveDependencyPath,
  batchResolvePaths,
  createResolutionContext,
  loadTsconfigPaths,
  groupDependenciesByType
} from '@context-action/dependency-linker/dist/utils/PathResolutionUtils';
import { DependencyExtractor } from '@context-action/dependency-linker/dist/extractors/DependencyExtractor';
import { TypeScriptParser } from '@context-action/dependency-linker/dist/parsers/TypeScriptParser';
import type { InterpreterContext } from '@context-action/dependency-linker/dist/interpreters/IDataInterpreter';

// ===== 예시 1: PathResolverInterpreter 기본 사용법 =====

async function basicPathResolverExample() {
  console.log('🔍 PathResolverInterpreter 기본 사용 예시');

  const pathResolver = new PathResolverInterpreter();

  // 가상의 의존성 데이터 (실제로는 DependencyExtractor에서 추출)
  const mockDependencyData = {
    dependencies: [
      { source: './components/Header.tsx' },      // 상대 경로
      { source: '../utils/helpers.ts' },         // 상위 디렉토리 참조
      { source: '@/components/Button.tsx' },     // 별칭 경로
      { source: 'react' },                       // NPM 패키지
      { source: 'node:fs' },                     // Node.js 내장 모듈
      { source: '/absolute/path/file.ts' }       // 절대 경로
    ],
    totalCount: 6,
    importCount: 6,
    exportCount: 0,
    dynamicImportCount: 0,
    typeOnlyImportCount: 0
  };

  // 분석 컨텍스트 설정
  const context: InterpreterContext = {
    filePath: '/Users/project/src/pages/index.tsx',
    language: 'typescript',
    metadata: {},
    timestamp: new Date(),
    projectContext: {
      rootPath: '/Users/project',
      projectType: 'library'
    }
  };

  // 경로 해결 실행
  const result = pathResolver.interpret(mockDependencyData, context);

  console.log('📊 분석 결과:');
  console.log(`총 의존성: ${result.summary.totalDependencies}`);
  console.log(`해결된 경로: ${result.summary.resolvedCount}`);
  console.log(`내부 파일: ${result.summary.internalCount}`);
  console.log(`외부 패키지: ${result.summary.externalCount}`);

  console.log('\n📁 해결된 경로들:');
  result.resolvedDependencies.forEach(dep => {
    console.log(`  ${dep.originalSource} → ${dep.resolvedPath || 'UNRESOLVED'}`);
    console.log(`    타입: ${dep.resolutionType}, 존재: ${dep.exists ? '✅' : '❌'}`);
  });

  return result;
}

// ===== 예시 2: PathResolutionUtils 직접 사용 =====

async function pathResolutionUtilsExample() {
  console.log('\n🛠 PathResolutionUtils 직접 사용 예시');

  const projectRoot = '/Users/project';
  const sourceFileDir = '/Users/project/src/components';

  // tsconfig.json에서 경로 매핑 로드
  const pathMappings = await loadTsconfigPaths(projectRoot);
  console.log('🗺 경로 매핑:', pathMappings);

  // 해결 컨텍스트 생성
  const context = {
    projectRoot,
    sourceFileDir,
    aliases: {
      '@': 'src',
      '@components': 'src/components',
      '@utils': 'src/utils',
      '~': '.'
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  };

  // 단일 경로 해결
  const singlePath = await resolveDependencyPath('./Button.tsx', context);
  console.log(`\n📍 단일 경로 해결: './Button.tsx' → ${singlePath}`);

  // 다중 경로 일괄 해결
  const dependencySources = [
    './Header.tsx',
    '../shared/constants',
    '@/utils/format',
    'react',
    'node:path'
  ];

  const resolvedPaths = await batchResolvePaths(dependencySources, context);
  console.log('\n📋 일괄 경로 해결:');
  resolvedPaths.forEach((resolved, original) => {
    console.log(`  ${original} → ${resolved || 'UNRESOLVED'}`);
  });

  return { resolvedPaths, context };
}

// ===== 예시 3: 실제 파일 분석과 경로 해결 통합 =====

async function realFileAnalysisExample() {
  console.log('\n📄 실제 파일 분석 + 경로 해결 예시');

  const filePath = '/Users/project/src/components/UserProfile.tsx';
  const projectRoot = '/Users/project';

  // 실제 파일 내용 (시뮬레이션)
  const fileContent = `
import React from 'react';
import { Button } from './Button';
import { formatDate } from '../utils/dateUtils';
import { User } from '@/types/User';
import { API_ENDPOINTS } from '@/constants/api';
import axios from 'axios';

export const UserProfile: React.FC = () => {
  // 컴포넌트 구현
  return <div>User Profile</div>;
};
`;

  try {
    // 1. TypeScript 파서로 AST 생성
    const parser = new TypeScriptParser();
    const parseResult = await parser.parse(filePath, fileContent);

    if (!parseResult.ast) {
      throw new Error('파싱 실패');
    }

    // 2. 의존성 추출
    const extractor = new DependencyExtractor();
    const extractedData = extractor.extract(parseResult.ast, filePath);

    console.log(`📦 추출된 의존성 수: ${extractedData.totalCount}`);

    // 3. 경로 해결 인터프리터로 분석
    const pathResolver = new PathResolverInterpreter();
    const context: InterpreterContext = {
      filePath,
      language: 'typescript',
      metadata: {},
      timestamp: new Date(),
      projectContext: {
        rootPath: projectRoot,
        projectType: 'frontend'
      }
    };

    const result = pathResolver.interpret(extractedData, context);

    // 4. 결과 분석 및 출력
    console.log('\n📊 분석 완료:');
    console.log(`프로젝트 루트: ${result.resolutionBase.projectRoot}`);
    console.log(`소스 파일 디렉토리: ${result.resolutionBase.sourceFileDir}`);

    // 타입별 분류
    const dependencySources = result.resolvedDependencies.map(dep => dep.originalSource);
    const groupedDeps = groupDependenciesByType(dependencySources);

    console.log('\n📁 의존성 타입별 분류:');
    console.log(`  상대 경로: ${groupedDeps.relative.length}개`);
    console.log(`  절대 경로: ${groupedDeps.absolute.length}개`);
    console.log(`  NPM 패키지: ${groupedDeps.nodeModules.length}개`);
    console.log(`  내장 모듈: ${groupedDeps.builtin.length}개`);

    // 프로젝트 내부 파일만 필터링
    const internalFiles = result.resolvedDependencies.filter(dep =>
      dep.resolutionType === 'relative' || dep.resolutionType === 'alias'
    );

    console.log('\n🏠 프로젝트 내부 파일들:');
    internalFiles.forEach(dep => {
      console.log(`  ${dep.originalSource}`);
      console.log(`    → ${dep.projectRelativePath || dep.resolvedPath}`);
      console.log(`    존재: ${dep.exists ? '✅' : '❌'}, 타입: ${dep.resolutionType}`);
    });

    return result;

  } catch (error) {
    console.error('❌ 분석 중 오류:', error);
    return null;
  }
}

// ===== 예시 4: 고급 설정 및 커스터마이징 =====

async function advancedConfigurationExample() {
  console.log('\n⚙️ 고급 설정 및 커스터마이징 예시');

  const pathResolver = new PathResolverInterpreter();

  // 커스텀 설정
  pathResolver.configure({
    resolveNodeModules: true,
    includePackageInfo: true,
    validateFileExists: true,
    resolveSymlinks: false,
    customExtensions: ['.ts', '.tsx', '.vue', '.svelte'],
    aliasPatterns: {
      '@pages': 'src/pages',
      '@components': 'src/components',
      '@hooks': 'src/hooks',
      '@styles': 'src/styles'
    }
  });

  // 복잡한 의존성 시나리오
  const complexDependencyData = {
    dependencies: [
      { source: '@pages/Dashboard' },
      { source: '@components/forms/LoginForm' },
      { source: '@hooks/useAuth' },
      { source: '@styles/theme.css' },
      { source: '../../../shared/utils' },
      { source: 'lodash/debounce' },
      { source: '@types/node' }
    ],
    totalCount: 7,
    importCount: 7,
    exportCount: 0,
    dynamicImportCount: 0,
    typeOnlyImportCount: 0
  };

  const context: InterpreterContext = {
    filePath: '/Users/project/src/features/auth/components/LoginPage.tsx',
    language: 'typescript',
    metadata: {},
    timestamp: new Date(),
    projectContext: {
      rootPath: '/Users/project',
      projectType: 'webapp'
    }
  };

  const result = pathResolver.interpret(complexDependencyData, context);

  console.log('🎯 고급 분석 결과:');
  console.log(`별칭 경로: ${result.summary.aliasCount}개`);
  console.log(`상대 경로: ${result.summary.relativeCount}개`);

  // 경로 매핑 정보 출력
  console.log('\n🗺 사용된 경로 매핑:');
  Object.entries(result.pathMappings).forEach(([alias, target]) => {
    console.log(`  ${alias} → ${target}`);
  });

  return result;
}

// ===== 예시 5: 에러 처리 및 디버깅 =====

async function errorHandlingExample() {
  console.log('\n🐛 에러 처리 및 디버깅 예시');

  // 의도적으로 문제가 있는 의존성들
  const problematicDependencies = {
    dependencies: [
      { source: './nonexistent-file.ts' },
      { source: '../../../outside-project/file.ts' },
      { source: '@invalid/alias' },
      { source: '' }, // 빈 경로
      { source: '/invalid/absolute/path.ts' }
    ],
    totalCount: 5,
    importCount: 5,
    exportCount: 0,
    dynamicImportCount: 0,
    typeOnlyImportCount: 0
  };

  const pathResolver = new PathResolverInterpreter();
  const context: InterpreterContext = {
    filePath: '/Users/project/src/test.ts',
    language: 'typescript',
    metadata: {},
    timestamp: new Date(),
    projectContext: {
      rootPath: '/Users/project',
      projectType: 'library'
    }
  };

  const result = pathResolver.interpret(problematicDependencies, context);

  console.log('⚠️ 문제가 있는 의존성 분석:');
  console.log(`미해결: ${result.summary.unresolvedCount}개`);

  result.resolvedDependencies.forEach(dep => {
    if (!dep.exists || dep.resolutionType === 'unresolved') {
      console.log(`❌ ${dep.originalSource}`);
      console.log(`   이유: ${dep.error || '파일 없음'}`);
      console.log(`   타입: ${dep.resolutionType}`);
    }
  });

  return result;
}

// ===== 메인 실행 함수 =====

export async function runPathResolutionExamples() {
  console.log('🚀 PathResolverInterpreter & PathResolutionUtils 예시 실행\n');

  try {
    await basicPathResolverExample();
    await pathResolutionUtilsExample();
    await realFileAnalysisExample();
    await advancedConfigurationExample();
    await errorHandlingExample();

    console.log('\n✅ 모든 예시 완료!');
  } catch (error) {
    console.error('❌ 예시 실행 중 오류:', error);
  }
}

// 직접 실행 시
if (require.main === module) {
  runPathResolutionExamples();
}