/**
 * Enhanced Dependency Analysis 예시
 * Named Import 사용 메서드까지 분석하는 고급 의존성 분석
 */

import { EnhancedDependencyExtractor } from "../src/extractors/EnhancedDependencyExtractor";
import { TypeScriptParser } from "../src/parsers/TypeScriptParser";

// ===== 예시 1: 기본 Named Import 사용 분석 =====

async function basicNamedImportAnalysis() {
	console.log("🔍 Named Import 사용 메서드 분석 예시\n");

	// 분석할 코드 예시
	const sampleCode = `
import React, { useState, useEffect, useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { debounce, throttle, merge } from 'lodash';
import * as utils from './utils';
import { Button } from './components/Button';
import axios from 'axios';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // date-fns 사용
  const formattedDate = format(new Date(), 'yyyy-MM-dd');
  const isValidDate = isValid(parseISO('2023-01-01'));

  // lodash 사용 (일부만)
  const debouncedSearch = debounce((query) => {
    console.log('Searching:', query);
  }, 300);

  // utils namespace 사용
  const result = utils.processData(user);
  const formatted = utils.format.currency(100);

  // 사용하지 않는 import: throttle, merge

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/user');
        setUser(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const memoizedValue = useMemo(() => {
    return user ? format(user.createdAt, 'PPP') : '';
  }, [user]);

  return (
    <div>
      <Button onClick={() => debouncedSearch('test')}>
        Search
      </Button>
      <p>Date: {formattedDate}</p>
      <p>User joined: {memoizedValue}</p>
    </div>
  );
};
`;

	try {
		// 1. TypeScript 파싱
		const parser = new TypeScriptParser();
		const parseResult = await parser.parse(
			"/example/UserProfile.tsx",
			sampleCode,
		);

		if (!parseResult.ast) {
			throw new Error("파싱 실패");
		}

		// 2. 확장된 의존성 분석
		const enhancedExtractor = new EnhancedDependencyExtractor();
		const result = enhancedExtractor.extractEnhanced(
			parseResult.ast,
			"/example/UserProfile.tsx",
		);

		console.log("📊 분석 결과 요약:");
		console.log(`총 의존성: ${result.dependencies.length}개`);
		console.log(`총 임포트 항목: ${result.usageAnalysis.totalImports}개`);
		console.log(`사용된 항목: ${result.usageAnalysis.usedImports}개`);
		console.log(`사용하지 않은 항목: ${result.usageAnalysis.unusedImports}개`);

		console.log("\n📋 의존성별 상세 분석:");

		result.enhancedDependencies.forEach((dep) => {
			console.log(`\n📦 ${dep.source}:`);
			console.log(
				`  임포트된 항목: ${dep.importedNames?.join(", ") || "None"}`,
			);
			console.log(`  사용된 메서드: ${dep.usedMethods?.length || 0}개`);
			console.log(`  총 사용 횟수: ${dep.usageCount || 0}회`);

			if (dep.usedMethods && dep.usedMethods.length > 0) {
				console.log("  사용 상세:");
				dep.usedMethods.forEach((method) => {
					console.log(
						`    - ${method.methodName}: ${method.callCount}회 (${method.usageType})`,
					);
					console.log(
						`      위치: ${method.locations.map((loc) => `L${loc.line}:${loc.column}`).join(", ")}`,
					);
				});
			}

			if (dep.unusedImports && dep.unusedImports.length > 0) {
				console.log(`  ⚠️  사용하지 않은 항목: ${dep.unusedImports.join(", ")}`);
			}
		});

		console.log("\n🏆 가장 많이 사용된 메서드:");
		result.usageAnalysis.mostUsedMethods.slice(0, 5).forEach((item, index) => {
			console.log(
				`  ${index + 1}. ${item.method} (${item.source}): ${item.count}회`,
			);
		});

		console.log("\n🚨 사용하지 않은 Import 목록:");
		result.usageAnalysis.unusedImportsList.forEach((item) => {
			console.log(`  ${item.source}: ${item.unusedItems.join(", ")}`);
		});

		return result;
	} catch (error) {
		console.error("❌ 분석 중 오류:", error);
		return null;
	}
}

// ===== 예시 2: Tree-shaking 최적화 제안 =====

async function treeshakingOptimizationAnalysis() {
	console.log("\n🌳 Tree-shaking 최적화 분석\n");

	const lodashHeavyCode = `
import _ from 'lodash';
import { debounce, throttle } from 'lodash';
import { format, addDays } from 'date-fns';

const data = [1, 2, 3, 4, 5];

// lodash default import 사용 (비효율적)
const uniqueData = _.uniq(data);
const sortedData = _.sortBy(data);
const groupedData = _.groupBy(data, (n) => n % 2);

// lodash named import 사용 (효율적)
const debouncedFn = debounce(() => console.log('debounced'), 100);

// date-fns 사용
const tomorrow = addDays(new Date(), 1);
const formattedDate = format(tomorrow, 'yyyy-MM-dd');

// 사용하지 않는 import
// throttle은 import했지만 사용하지 않음
`;

	try {
		const parser = new TypeScriptParser();
		const parseResult = await parser.parse(
			"/example/optimization.ts",
			lodashHeavyCode,
		);

		if (!parseResult.ast) return;

		const enhancedExtractor = new EnhancedDependencyExtractor();
		const result = enhancedExtractor.extractEnhanced(
			parseResult.ast,
			"/example/optimization.ts",
		);

		console.log("🎯 Tree-shaking 최적화 제안:");

		result.enhancedDependencies.forEach((dep) => {
			if (dep.source === "lodash") {
				console.log(`\n📦 ${dep.source} 최적화 제안:`);

				if (dep.usedMethods) {
					const defaultImportMethods = dep.usedMethods.filter((m) =>
						m.methodName.startsWith("_"),
					);
					const namedImportMethods = dep.usedMethods.filter(
						(m) => !m.methodName.startsWith("_"),
					);

					if (defaultImportMethods.length > 0) {
						console.log("  ⚠️  Default import 사용 (비효율적):");
						defaultImportMethods.forEach((method) => {
							const methodName = method.methodName.replace("_.", "");
							console.log(
								`    ${method.methodName} → import { ${methodName} } from 'lodash/${methodName}';`,
							);
						});
					}

					if (namedImportMethods.length > 0) {
						console.log("  ✅ Named import 사용 (효율적):");
						namedImportMethods.forEach((method) => {
							console.log(`    ${method.methodName}: 올바른 사용법`);
						});
					}
				}

				if (dep.unusedImports && dep.unusedImports.length > 0) {
					console.log(
						`  🗑️  제거 가능한 import: ${dep.unusedImports.join(", ")}`,
					);
				}
			}
		});

		// 번들 크기 추정
		const estimatedSavings = calculateBundleSavings(result);
		console.log(`\n📊 예상 번들 크기 절약: ${estimatedSavings.toFixed(1)}KB`);

		return result;
	} catch (error) {
		console.error("❌ 최적화 분석 중 오류:", error);
		return null;
	}
}

// ===== 예시 3: 의존성 사용 패턴 분석 =====

async function dependencyUsagePatternAnalysis() {
	console.log("\n📈 의존성 사용 패턴 분석\n");

	const complexCode = `
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import {
  debounce,
  throttle,
  merge,
  cloneDeep,
  isEmpty,
  isEqual,
  pick,
  omit
} from 'lodash';

const Dashboard: React.FC = () => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const previousFilters = useRef(filters);

  // 높은 사용 빈도: format (여러 번 호출)
  const formatDate = useCallback((date) => {
    return format(date, 'yyyy-MM-dd HH:mm');
  }, []);

  const formatShortDate = (date) => format(date, 'MMM dd');
  const formatLongDate = (date) => format(date, 'PPPP');

  // 중간 사용 빈도: debounce, merge
  const debouncedSearch = useMemo(() =>
    debounce((query) => {
      const mergedFilters = merge({}, filters, { search: query });
      setFilters(mergedFilters);
    }, 300), [filters]
  );

  // 낮은 사용 빈도: cloneDeep, isEmpty
  const processData = useCallback((rawData) => {
    if (isEmpty(rawData)) return [];

    return cloneDeep(rawData).map(item => ({
      ...item,
      formattedDate: formatDate(item.date),
      shortDate: formatShortDate(item.date)
    }));
  }, [formatDate]);

  // 조건부 사용: isAfter, isBefore
  const filterByDateRange = (items, startDate, endDate) => {
    return items.filter(item => {
      const itemDate = item.date;
      return isAfter(itemDate, startOfDay(startDate)) &&
             isBefore(itemDate, endOfDay(endDate));
    });
  };

  useEffect(() => {
    if (!isEqual(filters, previousFilters.current)) {
      previousFilters.current = cloneDeep(filters);
      // 데이터 다시 로드
    }
  }, [filters]);

  // 사용하지 않는 imports: throttle, pick, omit

  return <div>Dashboard Content</div>;
};
`;

	try {
		const parser = new TypeScriptParser();
		const parseResult = await parser.parse(
			"/example/Dashboard.tsx",
			complexCode,
		);

		if (!parseResult.ast) return;

		const enhancedExtractor = new EnhancedDependencyExtractor();
		const result = enhancedExtractor.extractEnhanced(
			parseResult.ast,
			"/example/Dashboard.tsx",
		);

		console.log("🔍 의존성 사용 패턴 분석:");

		// 사용 빈도별 분류
		const usageFrequency = categorizeByUsageFrequency(result);

		console.log("\n📊 사용 빈도별 분류:");
		console.log("🔥 높은 사용 빈도 (5회 이상):");
		usageFrequency.high.forEach((item) => {
			console.log(`  ${item.method} (${item.source}): ${item.count}회`);
		});

		console.log("\n🔶 중간 사용 빈도 (2-4회):");
		usageFrequency.medium.forEach((item) => {
			console.log(`  ${item.method} (${item.source}): ${item.count}회`);
		});

		console.log("\n🔷 낮은 사용 빈도 (1회):");
		usageFrequency.low.forEach((item) => {
			console.log(`  ${item.method} (${item.source}): ${item.count}회`);
		});

		// 패키지별 활용도 분석
		console.log("\n📦 패키지별 활용도:");
		const packageUtilization = calculatePackageUtilization(result);
		packageUtilization.forEach((pkg) => {
			console.log(`  ${pkg.source}:`);
			console.log(
				`    활용률: ${pkg.utilizationRate.toFixed(1)}% (${pkg.usedCount}/${pkg.totalCount})`,
			);
			console.log(`    핵심 메서드: ${pkg.coreMethods.join(", ")}`);
			if (pkg.deadWeight.length > 0) {
				console.log(`    데드 웨이트: ${pkg.deadWeight.join(", ")}`);
			}
		});

		return result;
	} catch (error) {
		console.error("❌ 패턴 분석 중 오류:", error);
		return null;
	}
}

// ===== 헬퍼 함수들 =====

function calculateBundleSavings(result: any): number {
	// 대략적인 번들 크기 절약 계산 (예시)
	let savings = 0;

	result.enhancedDependencies.forEach((dep: any) => {
		if (dep.source === "lodash" && dep.unusedImports) {
			savings += dep.unusedImports.length * 2; // 사용하지 않은 각 함수당 2KB 절약
		}
	});

	return savings;
}

function categorizeByUsageFrequency(result: any) {
	const high: any[] = [];
	const medium: any[] = [];
	const low: any[] = [];

	result.usageAnalysis.mostUsedMethods.forEach((item: any) => {
		if (item.count >= 5) {
			high.push(item);
		} else if (item.count >= 2) {
			medium.push(item);
		} else {
			low.push(item);
		}
	});

	return { high, medium, low };
}

function calculatePackageUtilization(result: any) {
	const packages: any[] = [];

	result.enhancedDependencies.forEach((dep: any) => {
		const totalCount = dep.importedNames?.length || 0;
		const usedCount = dep.usedMethods?.length || 0;
		const utilizationRate = totalCount > 0 ? (usedCount / totalCount) * 100 : 0;

		const coreMethods =
			dep.usedMethods
				?.filter((m: any) => m.callCount >= 2)
				?.map((m: any) => m.methodName) || [];

		const deadWeight = dep.unusedImports || [];

		packages.push({
			source: dep.source,
			totalCount,
			usedCount,
			utilizationRate,
			coreMethods,
			deadWeight,
		});
	});

	return packages.sort((a, b) => b.utilizationRate - a.utilizationRate);
}

// ===== 메인 실행 함수 =====

export async function runEnhancedDependencyAnalysis() {
	console.log("🚀 Enhanced Dependency Analysis 실행\n");

	try {
		await basicNamedImportAnalysis();
		await treeshakingOptimizationAnalysis();
		await dependencyUsagePatternAnalysis();

		console.log("\n✅ 모든 고급 의존성 분석 완료!");
		console.log("\n💡 주요 기능:");
		console.log("  🎯 Named Import 사용 메서드 추적");
		console.log("  📊 사용 빈도 및 패턴 분석");
		console.log("  🌳 Tree-shaking 최적화 제안");
		console.log("  🗑️  Dead Code 감지");
		console.log("  📦 패키지 활용도 측정");
	} catch (error) {
		console.error("❌ 분석 실행 중 오류:", error);
	}
}

// 직접 실행 시
if (require.main === module) {
	runEnhancedDependencyAnalysis();
}
