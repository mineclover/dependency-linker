import { runTypeScriptProjectAnalysis } from "../handlers/typescript-handler.js";
import { runMarkdownAnalysis } from "../handlers/markdown-handler.js";
import { TypeScriptParser } from "../../parsers/typescript/TypeScriptParser.js";
import { SymbolExtractor } from "../../core/SymbolExtractor.js";
import { RDFIntegratedGraphDatabase } from "../../database/RDFIntegratedGraphDatabase.js";
import { createRDFAddress } from "../../core/RDFAddress.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
	DATABASE_CONFIG,
	initializeUnifiedDatabase,
} from "../config/database-config.js";

export interface AnalyzeActionOptions {
	pattern?: string;
	directory?: string;
	recursive?: boolean;
	output?: string;
	format?: string;
	performance?: boolean;
	verbose?: boolean;
	database?: string;
}

export async function executeAnalyzeAction(
	options: AnalyzeActionOptions,
): Promise<void> {
	try {
		console.log("🔍 Starting dependency analysis...");

		// 파일 패턴 또는 디렉토리 설정
		const pattern = options.pattern || "**/*.{ts,js,tsx,jsx,py,java,go,md}";
		const directory = options.directory || process.cwd();

		// 성능 최적화 옵션 처리
		if (options.performance) {
			console.log("⚡ Performance optimization enabled");
		}

		// 파일 패턴 분석
		if (options.pattern) {
			const { glob } = await import("glob");
			const files = await glob(options.pattern, {
				cwd: options.directory || process.cwd(),
				absolute: true,
			});

			console.log(
				`📁 Found ${files.length} files matching pattern: ${options.pattern}`,
			);

			if (options.verbose) {
				for (const file of files) {
					console.log(`  - ${file}`);
				}
			}

			// 실제 파일 분석 수행
			console.log("🔍 Analyzing files and extracting symbols...");

			// TypeScript/JavaScript 파일 분석
			const tsFiles = files.filter(
				(file) =>
					file.endsWith(".ts") ||
					file.endsWith(".tsx") ||
					file.endsWith(".js") ||
					file.endsWith(".jsx"),
			);

			if (tsFiles.length > 0) {
				console.log(
					`📊 Analyzing ${tsFiles.length} TypeScript/JavaScript files...`,
				);

				// 심볼 추출 및 저장을 위한 초기화
				console.log("🔧 Initializing symbol extraction and storage...");

				// 통일된 데이터베이스 초기화
				const rdfDatabase = await initializeUnifiedDatabase();
				console.log(`📊 Using database: ${DATABASE_CONFIG.getDatabasePath()}`);

				// 기본 Edge type들 초기화
				await initializeBasicEdgeTypes(rdfDatabase);

				let extractedSymbols = 0;
				let savedSymbols = 0;

				// 개별 파일 분석 및 심볼 저장
				for (const file of tsFiles) {
					try {
						console.log(`🔍 Processing: ${path.basename(file)}`);

						// 1. 파일 읽기
						const sourceCode = await fs.readFile(file, "utf-8");

						// 2. Tree-sitter 기반 심볼 추출
						const symbols = await extractSymbolsWithTreeSitter(
							sourceCode,
							file,
						);

						// 3. 의존성 관계 추출
						const relationships = extractDependencyRelationships(
							sourceCode,
							file,
						);

						// 4. 심볼을 데이터베이스에 저장
						for (const symbol of symbols) {
							console.log(
								`  📝 Found symbol: ${symbol.type} ${symbol.name} at line ${symbol.line}`,
							);

							// 데이터베이스에 저장
							await saveSymbolToDatabaseSimple(symbol, file, rdfDatabase);
							savedSymbols++;
						}

						// 5. 의존성 관계를 데이터베이스에 저장
						for (const relationship of relationships) {
							console.log(
								`  🔗 Found relationship: ${relationship.type} from ${relationship.from} to ${relationship.to}`,
							);

							// 데이터베이스에 저장
							await saveDependencyRelationship(relationship, rdfDatabase);
						}

						extractedSymbols += symbols.length;
						console.log(
							`  ✅ Extracted ${symbols.length} symbols, ${relationships.length} relationships`,
						);
					} catch (error) {
						console.error(`  ❌ Failed to process ${file}:`, error);
					}
				}

				console.log(
					`📊 Symbol extraction completed: ${extractedSymbols} symbols extracted, ${savedSymbols} symbols saved`,
				);
			}

			// Markdown 파일 분석
			const mdFiles = files.filter(
				(file) => file.endsWith(".md") || file.endsWith(".markdown"),
			);

			if (mdFiles.length > 0) {
				console.log(`📊 Analyzing ${mdFiles.length} Markdown files...`);
				for (const file of mdFiles) {
					await runMarkdownAnalysis(file);
				}
			}
		}

		// 디렉토리 분석
		else if (options.directory) {
			const { glob } = await import("glob");
			const pattern = options.recursive ? "**/*" : "*";
			const files = await glob(pattern, {
				cwd: options.directory,
				absolute: true,
			});

			console.log(
				`📁 Found ${files.length} files in directory: ${options.directory}`,
			);

			// 실제 파일 분석 수행
			console.log("🔍 Analyzing files and extracting symbols...");
			await runTypeScriptProjectAnalysis(options.directory, {
				performance: options.performance,
			});
		}

		console.log(
			"✅ Analysis completed - symbols and dependencies extracted to database",
		);
	} catch (error) {
		console.error("❌ Analysis failed:", error);
		process.exit(1);
	}
}

/**
 * 심볼을 데이터베이스에 저장
 */
async function saveSymbolToDatabase(
	symbol: any,
	filePath: string,
	rdfDatabase: RDFIntegratedGraphDatabase,
): Promise<void> {
	try {
		// 프로젝트명 추출 (파일 경로에서)
		const projectName = extractProjectName(filePath);

		// RDF 주소 생성
		const rdfAddress = createRDFAddress({
			projectName: projectName,
			filePath: filePath,
			nodeType: symbol.type,
			symbolName: symbol.name,
		});

		// RDF 주소 저장
		await rdfDatabase.storeRDFAddress({
			rdfAddress,
			projectName,
			filePath,
			nodeType: symbol.type,
			symbolName: symbol.name,
			namespace: symbol.namespace || projectName,
			localName: symbol.name,
			lineNumber: symbol.startLine || 0,
			columnNumber: symbol.startColumn || 0,
			accessModifier: symbol.accessModifier || "public",
			isStatic: symbol.isStatic || false,
			isAsync: symbol.isAsync || false,
			isAbstract: symbol.isAbstract || false,
		});

		// 노드 저장
		await rdfDatabase.upsertNode({
			identifier: `${filePath}::${symbol.type}::${symbol.name}`,
			type: symbol.type,
			name: symbol.name,
			sourceFile: filePath,
			language: "typescript",
			semanticTags: symbol.tags || [],
			metadata: {
				namespace: symbol.namespace,
				accessModifier: symbol.accessModifier,
				isStatic: symbol.isStatic,
				isAsync: symbol.isAsync,
				isAbstract: symbol.isAbstract,
			},
			startLine: symbol.startLine,
			startColumn: symbol.startColumn,
			endLine: symbol.endLine,
			endColumn: symbol.endColumn,
		});
	} catch (error) {
		console.error(`❌ Failed to save symbol ${symbol.name}:`, error);
	}
}

/**
 * 간단한 심볼 데이터베이스 저장
 */
async function saveSymbolToDatabaseSimple(
	symbol: { type: string; name: string; line: number },
	filePath: string,
	rdfDatabase: RDFIntegratedGraphDatabase,
): Promise<void> {
	try {
		// 프로젝트명 추출
		const projectName = extractProjectName(filePath);

		// RDF 주소 생성
		const rdfAddress = `${projectName}/${filePath}#${symbol.type}:${symbol.name}`;

		// RDF 주소 저장
		await rdfDatabase.storeRDFAddress({
			rdfAddress,
			projectName,
			filePath,
			nodeType: symbol.type as any,
			symbolName: symbol.name,
			namespace: projectName,
			localName: symbol.name,
			lineNumber: symbol.line,
			columnNumber: 0,
			accessModifier: "public",
			isStatic: false,
			isAsync: false,
			isAbstract: false,
		});

		console.log(`  💾 Saved to database: ${symbol.name}`);
	} catch (error) {
		console.error(`❌ Failed to save symbol ${symbol.name}:`, error);
	}
}

/**
 * 간단한 심볼 추출 (정규식 기반)
 */
function extractSymbolsFromSource(
	sourceCode: string,
	filePath: string,
): Array<{
	type: string;
	name: string;
	line: number;
}> {
	const symbols: Array<{ type: string; name: string; line: number }> = [];
	const lines = sourceCode.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// 클래스 추출
		const classMatch = line.match(/class\s+(\w+)/);
		if (classMatch) {
			symbols.push({ type: "Class", name: classMatch[1], line: lineNumber });
		}

		// 함수 추출
		const functionMatch = line.match(/function\s+(\w+)/);
		if (functionMatch) {
			symbols.push({
				type: "Function",
				name: functionMatch[1],
				line: lineNumber,
			});
		}

		// const/let/var 변수 추출
		const variableMatch = line.match(/(?:const|let|var)\s+(\w+)/);
		if (variableMatch) {
			symbols.push({
				type: "Variable",
				name: variableMatch[1],
				line: lineNumber,
			});
		}

		// 인터페이스 추출
		const interfaceMatch = line.match(/interface\s+(\w+)/);
		if (interfaceMatch) {
			symbols.push({
				type: "Interface",
				name: interfaceMatch[1],
				line: lineNumber,
			});
		}

		// 타입 추출
		const typeMatch = line.match(/type\s+(\w+)/);
		if (typeMatch) {
			symbols.push({ type: "Type", name: typeMatch[1], line: lineNumber });
		}
	}

	return symbols;
}

/**
 * Tree-sitter 기반 심볼 추출
 */
async function extractSymbolsWithTreeSitter(
	sourceCode: string,
	filePath: string,
): Promise<
	Array<{
		type: string;
		name: string;
		line: number;
	}>
> {
	try {
		// TypeScriptParser 사용
		const parser = new TypeScriptParser();
		const parseResult = await parser.parse(sourceCode);

		if (!parseResult.tree || !parseResult.tree.rootNode) {
			console.warn(
				`  ⚠️ Tree-sitter parsing failed for ${filePath}, falling back to regex`,
			);
			return extractSymbolsFromSource(sourceCode, filePath);
		}

		const symbols: Array<{ type: string; name: string; line: number }> = [];
		const rootNode = parseResult.tree.rootNode;

		// Tree-sitter AST 순회를 통한 심볼 추출
		function traverseNode(node: any, depth = 0) {
			if (!node) return;

			// Tree-sitter AST 순회를 통한 심볼 추출

			// 클래스 선언
			if (node.type === "class_declaration") {
				const nameNode = node.childForFieldName("name");
				if (nameNode) {
					symbols.push({
						type: "Class",
						name: nameNode.text,
						line: nameNode.startPosition.row + 1,
					});
				}
			}

			// 함수 선언
			if (node.type === "function_declaration") {
				const nameNode = node.childForFieldName("name");
				if (nameNode) {
					symbols.push({
						type: "Function",
						name: nameNode.text,
						line: nameNode.startPosition.row + 1,
					});
				}
			}

			// 변수 선언 (lexical_declaration)
			if (node.type === "lexical_declaration") {
				// 직접 자식 노드에서 변수명 찾기
				for (let i = 0; i < node.childCount; i++) {
					const child = node.child(i);
					if (child && child.type === "variable_declarator") {
						const nameNode = child.childForFieldName("name");
						if (nameNode) {
							symbols.push({
								type: "Variable",
								name: nameNode.text,
								line: nameNode.startPosition.row + 1,
							});
						}
					}
				}
			}

			// 변수 선언 (variable_declaration)
			if (node.type === "variable_declaration") {
				const declarator = node.childForFieldName("declarator");
				if (declarator) {
					const nameNode = declarator.childForFieldName("name");
					if (nameNode) {
						symbols.push({
							type: "Variable",
							name: nameNode.text,
							line: nameNode.startPosition.row + 1,
						});
					}
				}
			}

			// 인터페이스 선언
			if (node.type === "interface_declaration") {
				const nameNode = node.childForFieldName("name");
				if (nameNode) {
					symbols.push({
						type: "Interface",
						name: nameNode.text,
						line: nameNode.startPosition.row + 1,
					});
				}
			}

			// 타입 별칭
			if (node.type === "type_alias_declaration") {
				const nameNode = node.childForFieldName("name");
				if (nameNode) {
					symbols.push({
						type: "Type",
						name: nameNode.text,
						line: nameNode.startPosition.row + 1,
					});
				}
			}

			// 자식 노드들 순회
			for (let i = 0; i < node.childCount; i++) {
				traverseNode(node.child(i), depth + 1);
			}
		}

		traverseNode(rootNode);

		console.log(`  🌳 Tree-sitter extracted ${symbols.length} symbols`);
		return symbols;
	} catch (error) {
		console.warn(`  ⚠️ Tree-sitter parsing failed for ${filePath}:`, error);
		console.warn(`  🔄 Falling back to regex-based extraction`);
		return extractSymbolsFromSource(sourceCode, filePath);
	}
}

/**
 * 의존성 관계 추출 (import/export 분석)
 */
function extractDependencyRelationships(
	sourceCode: string,
	filePath: string,
): Array<{
	type: string;
	from: string;
	to: string;
	line: number;
}> {
	const relationships: Array<{
		type: string;
		from: string;
		to: string;
		line: number;
	}> = [];
	const lines = sourceCode.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// import 문 분석
		const importMatch = line.match(
			/import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/,
		);
		if (importMatch) {
			const importedModule = importMatch[1];
			relationships.push({
				type: "imports",
				from: filePath,
				to: importedModule,
				line: lineNumber,
			});
		}

		// export 문 분석
		const exportMatch = line.match(
			/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/,
		);
		if (exportMatch) {
			relationships.push({
				type: "exports",
				from: filePath,
				to: exportMatch[1],
				line: lineNumber,
			});
		}
	}

	return relationships;
}

/**
 * 의존성 관계를 데이터베이스에 저장
 */
async function saveDependencyRelationship(
	relationship: {
		type: string;
		from: string;
		to: string;
		line: number;
	},
	rdfDatabase: RDFIntegratedGraphDatabase,
): Promise<void> {
	try {
		// 파일 기반 노드 ID 찾기 또는 생성
		const fromNodeId = await findOrCreateFileNode(
			relationship.from,
			rdfDatabase,
		);
		const toNodeId = await findOrCreateFileNode(relationship.to, rdfDatabase);

		if (fromNodeId && toNodeId) {
			// Edge 저장
			await (rdfDatabase as any).upsertRelationship({
				fromNodeId: fromNodeId,
				toNodeId: toNodeId,
				type: relationship.type,
				label: `${relationship.from} -> ${relationship.to}`,
				weight: 1.0,
				metadata: {
					fromFile: relationship.from,
					toFile: relationship.to,
					line: relationship.line,
				},
			});

			console.log(
				`  🔗 Saved relationship: ${relationship.type} from ${relationship.from} to ${relationship.to}`,
			);
		} else {
			console.warn(
				`  ⚠️ Could not find/create nodes for relationship: ${relationship.type}`,
			);
		}
	} catch (error) {
		console.error(`❌ Failed to save relationship:`, error);
	}
}

/**
 * 파일 기반 노드 찾기 또는 생성
 */
async function findOrCreateFileNode(
	filePath: string,
	rdfDatabase: RDFIntegratedGraphDatabase,
): Promise<number | null> {
	try {
		// 기존 노드 찾기
		const existingNodes = await (rdfDatabase as any).findNodes({
			label: filePath,
			nodeType: "File",
		});

		if (existingNodes.length > 0) {
			return existingNodes[0].id;
		}

		// 새 노드 생성
		await (rdfDatabase as any).upsertNode({
			label: filePath,
			name: filePath,
			identifier: filePath,
			type: "File",
			nodeType: "File",
			sourceFile: filePath,
			language: "typescript",
			metadata: {
				filePath: filePath,
				createdAt: new Date().toISOString(),
			},
		});

		// 생성된 노드 다시 찾기
		const createdNodes = await (rdfDatabase as any).findNodes({
			label: filePath,
			nodeType: "File",
		});

		if (createdNodes.length > 0) {
			return createdNodes[0].id;
		}

		return null;
	} catch (error) {
		console.warn(`⚠️ Failed to find/create file node for ${filePath}:`, error);
		return null;
	}
}

/**
 * 파일 경로에서 프로젝트명 추출
 */
function extractProjectName(filePath: string): string {
	const parts = filePath.split("/");
	// 프로젝트 루트 디렉토리명을 프로젝트명으로 사용
	const projectIndex = parts.findIndex(
		(part) => part === "src" || part === "lib" || part === "app",
	);
	if (projectIndex > 0) {
		return parts[projectIndex - 1];
	}
	// 기본값: dependency-linker
	return "dependency-linker";
}

/**
 * 기본 Edge type들 초기화
 */
async function initializeBasicEdgeTypes(
	rdfDatabase: RDFIntegratedGraphDatabase,
): Promise<void> {
	try {
		console.log("🔧 Initializing basic edge types...");

		// 기본 Edge type들 정의
		const basicEdgeTypes = [
			{
				type: "defines",
				description: "Symbol defines relationship (A defines B)",
				schema: JSON.stringify({}),
				isDirected: true,
				isTransitive: false,
				isInheritable: true,
				priority: 0,
			},
			{
				type: "imports",
				description: "File imports another file",
				schema: JSON.stringify({
					importPath: "string",
					isNamespace: "boolean",
				}),
				isDirected: true,
				isTransitive: false,
				isInheritable: false,
				priority: 0,
			},
			{
				type: "exports",
				description: "File exports to another file",
				schema: JSON.stringify({ exportName: "string", isDefault: "boolean" }),
				isDirected: true,
				isTransitive: false,
				isInheritable: false,
				priority: 0,
			},
		];

		// Edge type들 생성
		for (const edgeType of basicEdgeTypes) {
			try {
				await (rdfDatabase as any).createEdgeType(edgeType);
				console.log(`  ✅ Created edge type: ${edgeType.type}`);
			} catch (error) {
				// 이미 존재하는 경우 무시
				if (!(error as Error).message.includes("UNIQUE constraint")) {
					console.warn(
						`  ⚠️ Failed to create edge type ${edgeType.type}:`,
						error,
					);
				}
			}
		}

		console.log("✅ Basic edge types initialized");
	} catch (error) {
		console.error("❌ Failed to initialize basic edge types:", error);
	}
}
