/**
 * Simple Export Analysis Test
 * Quick test to verify the enhanced export extractor works
 */

import { EnhancedExportExtractor } from "../src/extractors/EnhancedExportExtractor";
import { TypeScriptParser } from "../src/parsers/TypeScriptParser";

async function testExportExtraction() {
	console.log("🧪 Testing Enhanced Export Extraction\n");

	// Simple test code
	const testCode = `
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export class Calculator {
  public add(a: number, b: number): number {
    return a + b;
  }

  private multiply(a: number, b: number): number {
    return a * b;
  }
}

export const PI = 3.14159;
export let counter = 0;
`;

	try {
		const parser = new TypeScriptParser();
		const extractor = new EnhancedExportExtractor();

		console.log("📝 Test code:");
		console.log(testCode);
		console.log("\n🔍 Analyzing...\n");

		const parseResult = await parser.parse("/test.ts", testCode);
		if (!parseResult.ast || parseResult.errors.length > 0) {
			console.error("❌ Parse failed:", parseResult.errors);
			return;
		}

		const exportResult = extractor.extractExports(parseResult.ast, "/test.ts");

		console.log("📊 Results:");
		console.log(
			"Statistics:",
			JSON.stringify(exportResult.statistics, null, 2),
		);
		console.log("\n📋 Export Methods:");

		exportResult.exportMethods.forEach((method, index) => {
			console.log(`${index + 1}. ${method.name}`);
			console.log(`   Type: ${method.exportType}`);
			console.log(`   Declaration: ${method.declarationType}`);
			console.log(`   Location: Line ${method.location.line}`);

			if (method.parentClass) {
				console.log(`   Parent Class: ${method.parentClass}`);
				console.log(`   Visibility: ${method.visibility}`);
				console.log(`   Static: ${method.isStatic}`);
			}

			if (method.parameters && method.parameters.length > 0) {
				const params = method.parameters
					.map((p) => `${p.name}${p.optional ? "?" : ""}`)
					.join(", ");
				console.log(`   Parameters: (${params})`);
			}

			console.log();
		});

		console.log("🏗️ Classes:");
		exportResult.classes.forEach((cls) => {
			console.log(
				`- ${cls.className} (${cls.methods.length} methods, ${cls.properties.length} properties)`,
			);
		});
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

testExportExtraction();
