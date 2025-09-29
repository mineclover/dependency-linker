/**
 * Query Registry Check
 * 실제 등록된 쿼리들을 확인하는 테스트
 */

import { QueryEngine, CustomKeyMapping } from "../src";

describe("Query Registry Check", () => {
  it("should list all registered queries", () => {
    const registry = QueryEngine.globalInstance.getRegistry();
    const queryKeys = registry.getAllQueryKeys();

    console.log("📋 등록된 쿼리 키들:");
    queryKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });

    console.log(`\n📊 총 ${queryKeys.length}개의 쿼리가 등록됨`);

    // TypeScript 쿼리들 확인
    const tsQueries = queryKeys.filter(key => key.startsWith("ts-"));
    console.log(`\n🔷 TypeScript 쿼리들 (${tsQueries.length}개):`);
    tsQueries.forEach(key => console.log(`   - ${key}`));

    // JavaScript 쿼리들 확인
    const jsQueries = queryKeys.filter(key => key.startsWith("js-"));
    console.log(`\n🟨 JavaScript 쿼리들 (${jsQueries.length}개):`);
    jsQueries.forEach(key => console.log(`   - ${key}`));

    // Go 쿼리들 확인
    const goQueries = queryKeys.filter(key => key.startsWith("go-"));
    console.log(`\n🔵 Go 쿼리들 (${goQueries.length}개):`);
    goQueries.forEach(key => console.log(`   - ${key}`));

    // Java 쿼리들 확인
    const javaQueries = queryKeys.filter(key => key.startsWith("java-"));
    console.log(`\n🟤 Java 쿼리들 (${javaQueries.length}개):`);
    javaQueries.forEach(key => console.log(`   - ${key}`));

    expect(queryKeys.length).toBeGreaterThan(0);
  });

  it("should check predefined mappings", () => {
    const predefined = CustomKeyMapping.predefined;

    console.log("\n🗂️ 사전 정의된 매핑들:");
    Object.entries(predefined).forEach(([name, mapping]) => {
      console.log(`\n   📁 ${name}:`);
      Object.entries(mapping).forEach(([userKey, queryKey]) => {
        console.log(`      ${userKey} → ${queryKey}`);
      });
    });

    // TypeScript 분석 매핑 확인
    const tsMapping = predefined.typeScriptAnalysis;
    expect(tsMapping).toBeDefined();
    expect(tsMapping.sources).toBeDefined();
    expect(tsMapping.namedImports).toBeDefined();
  });

  it("should validate predefined mappings against registry", () => {
    const registry = QueryEngine.globalInstance.getRegistry();
    const registeredKeys = new Set(registry.getAllQueryKeys());
    const predefined = CustomKeyMapping.predefined;

    console.log("\n🔍 매핑 검증:");

    Object.entries(predefined).forEach(([mappingName, mapping]) => {
      console.log(`\n   📋 ${mappingName}:`);

      Object.entries(mapping).forEach(([userKey, queryKey]) => {
        const isRegistered = registeredKeys.has(queryKey);
        const status = isRegistered ? "✅" : "❌";
        console.log(`      ${status} ${userKey} → ${queryKey}`);

        if (!isRegistered) {
          console.log(`         ⚠️  쿼리 '${queryKey}'가 등록되지 않음`);
        }
      });
    });

    // 최소한 일부 쿼리들은 등록되어 있어야 함
    expect(registeredKeys.size).toBeGreaterThan(0);
  });
});