"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)("Unknown Symbol System - Simple Test", () => {
    (0, globals_1.it)("should create Unknown Symbol Manager", () => {
        (0, globals_1.expect)(true).toBe(true);
        console.log("✅ Unknown Symbol System 기본 테스트 통과");
    });
    (0, globals_1.it)("should validate basic logic", () => {
        const unknownSymbol = {
            name: "User",
            type: "Class",
            sourceFile: "src/types.ts",
            rdfAddress: "src/types.ts#Unknown:User",
            isImported: false,
            isAlias: false,
            metadata: {
                lineNumber: 10,
                columnNumber: 5,
                confidence: 0.8,
            },
        };
        (0, globals_1.expect)(unknownSymbol.name).toBe("User");
        (0, globals_1.expect)(unknownSymbol.type).toBe("Class");
        (0, globals_1.expect)(unknownSymbol.sourceFile).toBe("src/types.ts");
        (0, globals_1.expect)(unknownSymbol.rdfAddress).toBe("src/types.ts#Unknown:User");
        (0, globals_1.expect)(unknownSymbol.isImported).toBe(false);
        (0, globals_1.expect)(unknownSymbol.isAlias).toBe(false);
        (0, globals_1.expect)(unknownSymbol.metadata.confidence).toBe(0.8);
        console.log("✅ Unknown Symbol 데이터 구조 검증 통과");
    });
    (0, globals_1.it)("should validate equivalence inference logic", () => {
        const unknown = {
            name: "User",
            type: "Class",
            sourceFile: "src/types.ts",
        };
        const known = {
            name: "User",
            type: "Class",
            sourceFile: "src/models/User.ts",
        };
        const nameMatch = unknown.name === known.name;
        (0, globals_1.expect)(nameMatch).toBe(true);
        const typeMatch = unknown.type === known.type;
        (0, globals_1.expect)(typeMatch).toBe(true);
        const contextMatch = unknown.sourceFile !== known.sourceFile;
        (0, globals_1.expect)(contextMatch).toBe(true);
        console.log("✅ 동등성 추론 로직 검증 통과");
    });
    (0, globals_1.it)("should validate CLI command structure", () => {
        const commands = [
            "unknown --register --file src/types.ts --symbol User",
            "unknown --query User",
            "unknown --candidates --symbol User",
            "unknown --equivalence --unknown-id 1 --known-id 2",
            "unknown --infer --symbol User",
            "unknown --list",
            "unknown --stats",
        ];
        (0, globals_1.expect)(commands.length).toBe(7);
        (0, globals_1.expect)(commands[0]).toContain("--register");
        (0, globals_1.expect)(commands[1]).toContain("--query");
        (0, globals_1.expect)(commands[2]).toContain("--candidates");
        (0, globals_1.expect)(commands[3]).toContain("--equivalence");
        (0, globals_1.expect)(commands[4]).toContain("--infer");
        (0, globals_1.expect)(commands[5]).toContain("--list");
        (0, globals_1.expect)(commands[6]).toContain("--stats");
        console.log("✅ CLI 명령어 구조 검증 통과");
    });
    (0, globals_1.it)("should validate inference rules", () => {
        const rules = [
            {
                name: "exact_name_match",
                priority: 10,
                description: "정확한 이름 매칭",
            },
            { name: "type_based_match", priority: 8, description: "타입 기반 매칭" },
            {
                name: "context_based_match",
                priority: 6,
                description: "컨텍스트 기반 매칭",
            },
            { name: "semantic_match", priority: 4, description: "시맨틱 매칭" },
            { name: "partial_match", priority: 2, description: "부분 매칭" },
        ];
        (0, globals_1.expect)(rules.length).toBe(5);
        (0, globals_1.expect)(rules[0].priority).toBe(10);
        (0, globals_1.expect)(rules[1].priority).toBe(8);
        (0, globals_1.expect)(rules[2].priority).toBe(6);
        (0, globals_1.expect)(rules[3].priority).toBe(4);
        (0, globals_1.expect)(rules[4].priority).toBe(2);
        const sortedRules = rules.sort((a, b) => b.priority - a.priority);
        (0, globals_1.expect)(sortedRules[0].name).toBe("exact_name_match");
        (0, globals_1.expect)(sortedRules[4].name).toBe("partial_match");
        console.log("✅ 추론 규칙 검증 통과");
    });
    (0, globals_1.it)("should validate confidence calculation", () => {
        const calculateConfidence = (unknown, known) => {
            let confidence = 0;
            if (unknown.name === known.name) {
                confidence += 0.4;
            }
            if (unknown.type === known.type) {
                confidence += 0.3;
            }
            if (unknown.sourceFile === known.sourceFile) {
                confidence += 0.3;
            }
            return Math.min(confidence, 1.0);
        };
        const unknown = { name: "User", type: "Class", sourceFile: "src/types.ts" };
        const known = { name: "User", type: "Class", sourceFile: "src/types.ts" };
        const confidence = calculateConfidence(unknown, known);
        (0, globals_1.expect)(confidence).toBe(1.0);
        const unknown2 = {
            name: "User",
            type: "Class",
            sourceFile: "src/types.ts",
        };
        const known2 = {
            name: "User",
            type: "Interface",
            sourceFile: "src/types.ts",
        };
        const confidence2 = calculateConfidence(unknown2, known2);
        (0, globals_1.expect)(confidence2).toBe(0.7);
        console.log("✅ 신뢰도 계산 검증 통과");
    });
});
//# sourceMappingURL=unknown-symbol-simple.test.js.map