/**
 * 간단한 Named Import 분석 예시
 * EnhancedDependencyExtractor를 사용한 기본 사용법
 */

import { EnhancedDependencyExtractor } from "../src/extractors/EnhancedDependencyExtractor";
import { TypeScriptParser } from "../src/parsers/TypeScriptParser";

async function simpleNamedImportAnalysis() {
	console.log("🎯 Named Import 사용 메서드 분석 - 간단 예시\n");

	// 분석할 간단한 코드
	const code = `
import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { debounce, throttle } from 'lodash';

function MyComponent() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const tomorrow = addDays(date, 1);
    console.log(format(tomorrow, 'yyyy-MM-dd'));
  }, [date]);

  const debouncedUpdate = debounce(() => {
    setDate(new Date());
  }, 1000);

  // throttle은 import했지만 사용하지 않음

  return <div onClick={debouncedUpdate}>Click me</div>;
}
`;

	const parser = new TypeScriptParser();
	const parseResult = await parser.parse("/example.tsx", code);

	if (!parseResult.ast) {
		console.error("파싱 실패");
		return;
	}

	const extractor = new EnhancedDependencyExtractor();
	const result = extractor.extractEnhanced(parseResult.ast, "/example.tsx");

	console.log("📊 분석 결과:");
	console.log(`총 의존성: ${result.dependencies.length}개`);
	console.log(`사용된 메서드: ${result.usageAnalysis.usedImports}개`);
	console.log(`사용하지 않은 항목: ${result.usageAnalysis.unusedImports}개`);

	console.log("\n📋 상세 분석:");
	result.enhancedDependencies.forEach((dep) => {
		console.log(`\n📦 ${dep.source}:`);
		console.log(`  Import: ${dep.importedNames?.join(", ")}`);
		console.log(
			`  사용: ${dep.usedMethods?.map((m) => `${m.methodName}(${m.callCount}회)`).join(", ") || "None"}`,
		);

		if (dep.unusedImports?.length) {
			console.log(`  ⚠️  미사용: ${dep.unusedImports.join(", ")}`);
		}
	});
}

// 실행
simpleNamedImportAnalysis();
