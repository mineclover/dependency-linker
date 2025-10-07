const {
	TypeScriptParser,
} = require("./dist/parsers/typescript/TypeScriptParser.js");
const fs = require("fs");
const path = require("path");

console.log("🔍 TypeScript 파싱 디버그 테스트 시작...");

async function debugParsing() {
	try {
		const parser = new TypeScriptParser();
		console.log("✅ Parser 인스턴스 생성 성공");

		// 간단한 TypeScript 코드 테스트
		const simpleCode = "const x = 1;";
		console.log("📝 간단한 코드 파싱 테스트:", simpleCode);

		const result = await parser.parse(simpleCode);
		console.log("📊 파싱 결과:", {
			hasTree: !!result.tree,
			hasRootNode: !!result.tree?.rootNode,
			nodeCount: result.metadata?.nodeCount,
			parseTime: result.metadata?.parseTime,
		});

		if (result.tree && result.tree.rootNode) {
			console.log("✅ 파싱 성공!");
			console.log("🌳 Root node type:", result.tree.rootNode.type);
			console.log("🌳 Root node text:", result.tree.rootNode.text);
			console.log("🌳 Children count:", result.tree.rootNode.childCount);
		} else {
			console.log("❌ 파싱 실패 - rootNode 없음");
		}

		// 실제 테스트 파일로 테스트
		const testFile = path.join(
			__dirname,
			"tests/fixtures/test-project/test-component.tsx",
		);
		if (fs.existsSync(testFile)) {
			console.log("\n📁 실제 테스트 파일 파싱 테스트:", testFile);
			const fileContent = fs.readFileSync(testFile, "utf-8");
			console.log("📄 파일 내용 길이:", fileContent.length);
			console.log("📄 파일 내용 미리보기:", fileContent.slice(0, 100));

			const fileResult = await parser.parse(fileContent);
			console.log("📊 파일 파싱 결과:", {
				hasTree: !!fileResult.tree,
				hasRootNode: !!fileResult.tree?.rootNode,
				nodeCount: fileResult.metadata?.nodeCount,
				parseTime: fileResult.metadata?.parseTime,
			});

			if (fileResult.tree && fileResult.tree.rootNode) {
				console.log("✅ 파일 파싱 성공!");
				console.log("🌳 Root node type:", fileResult.tree.rootNode.type);
				console.log("🌳 Children count:", fileResult.tree.rootNode.childCount);
			} else {
				console.log("❌ 파일 파싱 실패 - rootNode 없음");
			}
		} else {
			console.log("❌ 테스트 파일이 존재하지 않음:", testFile);
		}
	} catch (error) {
		console.error("💥 오류 발생:", error.message);
		console.error("📚 스택 트레이스:", error.stack);
	}
}

debugParsing();
