/**
 * New QueryResultMap Structure Test
 * 새로운 QueryResultMap 기반 구조 테스트
 */

import {
  QueryEngine,
  CustomKeyMapping,
  LIBRARY_INFO,
  QueryResultMap,
  QueryKey,
  QueryResult,
} from "../src";

describe("New QueryResultMap Structure", () => {
  it("should export main library info", () => {
    expect(LIBRARY_INFO.name).toBe("Query-Based AST Analysis Library");
    expect(LIBRARY_INFO.version).toBe("3.0.0");
    expect(LIBRARY_INFO.description).toContain("TypeScript-first");
  });

  it("should export QueryEngine with global instance", () => {
    expect(QueryEngine).toBeDefined();
    expect(QueryEngine.globalInstance).toBeDefined();
    expect(typeof QueryEngine.registerQuery).toBe("function");
    expect(typeof QueryEngine.executeQuery).toBe("function");
    expect(typeof QueryEngine.executeQueries).toBe("function");
  });

  it("should export CustomKeyMapping utilities", () => {
    expect(CustomKeyMapping).toBeDefined();
    expect(typeof CustomKeyMapping.execute).toBe("function");
    expect(typeof CustomKeyMapping.createMapper).toBe("function");
    expect(CustomKeyMapping.predefined).toBeDefined();
  });

  it("should have TypeScript analysis predefined mapping", () => {
    const tsMapping = CustomKeyMapping.predefined.typeScriptAnalysis;
    expect(tsMapping).toBeDefined();
    expect(tsMapping.sources).toBe("ts-import-sources");
    expect(tsMapping.namedImports).toBe("ts-named-imports");
    expect(tsMapping.defaultImports).toBe("ts-default-imports");
    expect(tsMapping.typeImports).toBe("ts-type-imports");
  });

  it("should have proper library features listed", () => {
    expect(LIBRARY_INFO.features).toContain("QueryResultMap-based type safety");
    expect(LIBRARY_INFO.features).toContain("Language-specific query grouping");
    expect(LIBRARY_INFO.features).toContain("Custom key mapping system");
    expect(LIBRARY_INFO.features).toContain("Extensible query architecture");
    expect(LIBRARY_INFO.features).toContain("TypeScript-first design");
  });

  it("should register TypeScript queries by default", () => {
    // QueryEngine이 기본 TypeScript 쿼리들을 자동으로 등록했는지 확인
    const registry = QueryEngine.globalInstance.getRegistry();
    const queryKeys = registry.getAllQueryKeys();
    expect(queryKeys.length).toBeGreaterThan(0);
  });
});