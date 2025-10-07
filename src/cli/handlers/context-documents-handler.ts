import {
	type ContextDocumentGenerator,
	createContextDocumentGenerator,
} from "../../context/ContextDocumentGenerator";
import type { GraphNode } from "../../database/GraphDatabase";
import { GraphDatabase } from "../../database/GraphDatabase";

export interface ContextDocumentsHandlerOptions {
	projectRoot?: string;
	databasePath?: string;
	outputPath?: string;
	enableAutoGeneration?: boolean;
	includeDependencies?: boolean;
	includeDependents?: boolean;
	includeMetadata?: boolean;
	overwriteExisting?: boolean;
}

export class ContextDocumentsHandler {
	private generator: ContextDocumentGenerator;
	private database: GraphDatabase;
	private options: Required<ContextDocumentsHandlerOptions>;

	constructor(options: ContextDocumentsHandlerOptions = {}) {
		this.options = {
			projectRoot: options.projectRoot || process.cwd(),
			databasePath: options.databasePath || "dependency-linker.db",
			outputPath: options.outputPath || ".dependency-linker/context",
			enableAutoGeneration: options.enableAutoGeneration ?? true,
			includeDependencies: options.includeDependencies ?? true,
			includeDependents: options.includeDependents ?? true,
			includeMetadata: options.includeMetadata ?? true,
			overwriteExisting: options.overwriteExisting ?? false,
		};

		this.generator = createContextDocumentGenerator(this.options.projectRoot);
		this.database = new GraphDatabase(this.options.databasePath);
	}

	/**
	 * 파일 컨텍스트 문서 생성
	 */
	async generateFileContext(
		filePath: string,
		options?: {
			includeDependencies?: boolean;
			includeDependents?: boolean;
			overwriteExisting?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`📄 파일 컨텍스트 문서 생성: ${filePath}`);

			// 데이터베이스에서 파일 노드 찾기
			const nodes = await this.database.findNodes({
				sourceFiles: [filePath],
			});

			if (nodes.length === 0) {
				console.log(`⚠️ 파일을 찾을 수 없습니다: ${filePath}`);
				return;
			}

			const node = nodes[0];
			let dependencies: string[] = [];
			let dependents: string[] = [];

			// 의존성 정보 수집
			if (options?.includeDependencies ?? this.options.includeDependencies) {
				const deps = await this.database.findNodeDependencies(node.id!);
				dependencies = deps.map((dep) => dep.sourceFile || dep.name);
			}

			// 의존자 정보 수집
			if (options?.includeDependents ?? this.options.includeDependents) {
				const deps = await this.database.findNodeDependents(node.id!);
				dependents = deps.map((dep) => dep.sourceFile || dep.name);
			}

			// 컨텍스트 문서 생성
			const documentPath = await this.generator.generateFileContext(
				node,
				dependencies,
				dependents,
			);

			console.log(`✅ 파일 컨텍스트 문서 생성 완료:`);
			console.log(`  - 파일: ${filePath}`);
			console.log(`  - 문서 경로: ${documentPath}`);
			console.log(`  - 의존성: ${dependencies.length}개`);
			console.log(`  - 의존자: ${dependents.length}개`);
		} catch (error) {
			console.error(
				`❌ 파일 컨텍스트 문서 생성 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 심볼 컨텍스트 문서 생성
	 */
	async generateSymbolContext(
		filePath: string,
		symbolPath: string,
		options?: {
			symbolKind?: string;
			overwriteExisting?: boolean;
		},
	): Promise<void> {
		try {
			console.log(`📄 심볼 컨텍스트 문서 생성: ${filePath}#${symbolPath}`);

			// 데이터베이스에서 심볼 노드 찾기
			const nodes = await this.database.findNodes({
				sourceFiles: [filePath],
			});

			// 심볼 이름으로 필터링
			const symbolNodes = nodes.filter((node) => node.name === symbolPath);

			if (symbolNodes.length === 0) {
				console.log(`⚠️ 심볼을 찾을 수 없습니다: ${filePath}#${symbolPath}`);
				return;
			}

			const node = symbolNodes[0];

			// 컨텍스트 문서 생성
			const documentPath = await this.generator.generateSymbolContext(
				node,
				symbolPath,
				options?.symbolKind,
			);

			console.log(`✅ 심볼 컨텍스트 문서 생성 완료:`);
			console.log(`  - 파일: ${filePath}`);
			console.log(`  - 심볼: ${symbolPath}`);
			console.log(`  - 문서 경로: ${documentPath}`);
			console.log(`  - 심볼 타입: ${options?.symbolKind || "unknown"}`);
		} catch (error) {
			console.error(
				`❌ 심볼 컨텍스트 문서 생성 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 프로젝트 전체 컨텍스트 문서 생성
	 */
	async generateProjectContext(options?: {
		includeFiles?: boolean;
		includeSymbols?: boolean;
		includeDependencies?: boolean;
		includeDependents?: boolean;
		overwriteExisting?: boolean;
	}): Promise<void> {
		try {
			console.log(`📄 프로젝트 전체 컨텍스트 문서 생성`);

			// 모든 노드 조회
			const allNodes = await this.database.findNodes({});
			const fileNodes = allNodes.filter((node) => node.type === "file");
			const symbolNodes = allNodes.filter((node) => node.type !== "file");

			let generatedFiles = 0;
			let generatedSymbols = 0;

			// 파일 컨텍스트 문서 생성
			if (options?.includeFiles ?? true) {
				console.log(`📁 파일 컨텍스트 문서 생성 중... (${fileNodes.length}개)`);

				for (const node of fileNodes) {
					try {
						let dependencies: string[] = [];
						let dependents: string[] = [];

						// 의존성 정보 수집
						if (
							options?.includeDependencies ??
							this.options.includeDependencies
						) {
							const deps = await this.database.findNodeDependencies(node.id!);
							dependencies = deps.map((dep) => dep.sourceFile || dep.name);
						}

						// 의존자 정보 수집
						if (options?.includeDependents ?? this.options.includeDependents) {
							const deps = await this.database.findNodeDependents(node.id!);
							dependents = deps.map((dep) => dep.sourceFile || dep.name);
						}

						await this.generator.generateFileContext(
							node,
							dependencies,
							dependents,
						);
						generatedFiles++;
					} catch (error) {
						console.warn(
							`⚠️ 파일 컨텍스트 문서 생성 실패: ${node.sourceFile || node.name}`,
						);
					}
				}
			}

			// 심볼 컨텍스트 문서 생성
			if (options?.includeSymbols ?? true) {
				console.log(
					`🔧 심볼 컨텍스트 문서 생성 중... (${symbolNodes.length}개)`,
				);

				for (const node of symbolNodes) {
					try {
						const symbolPath = node.name || "unknown";
						await this.generator.generateSymbolContext(node, symbolPath);
						generatedSymbols++;
					} catch (error) {
						console.warn(`⚠️ 심볼 컨텍스트 문서 생성 실패: ${node.name}`);
					}
				}
			}

			console.log(`✅ 프로젝트 전체 컨텍스트 문서 생성 완료:`);
			console.log(`  - 생성된 파일 문서: ${generatedFiles}개`);
			console.log(`  - 생성된 심볼 문서: ${generatedSymbols}개`);
			console.log(`  - 총 생성된 문서: ${generatedFiles + generatedSymbols}개`);
		} catch (error) {
			console.error(
				`❌ 프로젝트 전체 컨텍스트 문서 생성 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 컨텍스트 문서 목록 조회
	 */
	async listDocuments(): Promise<void> {
		try {
			console.log(`📋 컨텍스트 문서 목록 조회`);

			const documents = await this.generator.listDocuments();

			console.log(`✅ 컨텍스트 문서 목록 조회 완료:`);
			console.log(`  - 파일 문서: ${documents.files.length}개`);
			console.log(`  - 심볼 문서: ${documents.symbols.length}개`);
			console.log(
				`  - 총 문서: ${documents.files.length + documents.symbols.length}개`,
			);

			if (documents.files.length > 0) {
				console.log(`\n📁 파일 문서:`);
				documents.files.forEach((file, index) => {
					console.log(`  ${index + 1}. ${file}`);
				});
			}

			if (documents.symbols.length > 0) {
				console.log(`\n🔧 심볼 문서:`);
				documents.symbols.forEach((symbol, index) => {
					console.log(`  ${index + 1}. ${symbol}`);
				});
			}
		} catch (error) {
			console.error(
				`❌ 컨텍스트 문서 목록 조회 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 컨텍스트 문서 업데이트
	 */
	async updateDocuments(options?: {
		includeFiles?: boolean;
		includeSymbols?: boolean;
		includeDependencies?: boolean;
		includeDependents?: boolean;
		overwriteExisting?: boolean;
	}): Promise<void> {
		try {
			console.log(`🔄 컨텍스트 문서 업데이트`);

			// 기존 문서 목록 조회
			const existingDocuments = await this.generator.listDocuments();
			console.log(`  - 기존 파일 문서: ${existingDocuments.files.length}개`);
			console.log(`  - 기존 심볼 문서: ${existingDocuments.symbols.length}개`);

			// 프로젝트 전체 컨텍스트 문서 재생성
			await this.generateProjectContext({
				includeFiles: options?.includeFiles ?? true,
				includeSymbols: options?.includeSymbols ?? true,
				includeDependencies:
					options?.includeDependencies ?? this.options.includeDependencies,
				includeDependents:
					options?.includeDependents ?? this.options.includeDependents,
				overwriteExisting:
					options?.overwriteExisting ?? this.options.overwriteExisting,
			});

			console.log(`✅ 컨텍스트 문서 업데이트 완료`);
		} catch (error) {
			console.error(
				`❌ 컨텍스트 문서 업데이트 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 컨텍스트 문서 정리
	 */
	async cleanupDocuments(options?: {
		includeFiles?: boolean;
		includeSymbols?: boolean;
		confirm?: boolean;
	}): Promise<void> {
		try {
			console.log(`🧹 컨텍스트 문서 정리`);

			if (!options?.confirm) {
				console.log(
					`⚠️ 컨텍스트 문서 정리를 확인하려면 --confirm 옵션을 사용하세요`,
				);
				return;
			}

			const documents = await this.generator.listDocuments();
			let cleanedFiles = 0;
			let cleanedSymbols = 0;

			// 파일 문서 정리
			if (options?.includeFiles ?? true) {
				for (const file of documents.files) {
					try {
						await require("fs").promises.unlink(file);
						cleanedFiles++;
					} catch (error) {
						console.warn(`⚠️ 파일 삭제 실패: ${file}`);
					}
				}
			}

			// 심볼 문서 정리
			if (options?.includeSymbols ?? true) {
				for (const symbol of documents.symbols) {
					try {
						await require("fs").promises.unlink(symbol);
						cleanedSymbols++;
					} catch (error) {
						console.warn(`⚠️ 심볼 삭제 실패: ${symbol}`);
					}
				}
			}

			console.log(`✅ 컨텍스트 문서 정리 완료:`);
			console.log(`  - 삭제된 파일 문서: ${cleanedFiles}개`);
			console.log(`  - 삭제된 심볼 문서: ${cleanedSymbols}개`);
			console.log(`  - 총 삭제된 문서: ${cleanedFiles + cleanedSymbols}개`);
		} catch (error) {
			console.error(`❌ 컨텍스트 문서 정리 실패: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 컨텍스트 문서 통계 생성
	 */
	async generateStatistics(): Promise<void> {
		try {
			console.log(`📊 컨텍스트 문서 통계 생성`);

			const documents = await this.generator.listDocuments();
			const allNodes = await this.database.findNodes({});
			const fileNodes = allNodes.filter((node) => node.type === "file");
			const symbolNodes = allNodes.filter((node) => node.type !== "file");

			console.log(`\n📊 컨텍스트 문서 통계:`);
			console.log(`  - 프로젝트 루트: ${this.options.projectRoot}`);
			console.log(`  - 출력 경로: ${this.options.outputPath}`);
			console.log(`  - 데이터베이스 경로: ${this.options.databasePath}`);
			console.log(
				`  - 자동 생성: ${this.options.enableAutoGeneration ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 의존성 포함: ${this.options.includeDependencies ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 의존자 포함: ${this.options.includeDependents ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 메타데이터 포함: ${this.options.includeMetadata ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`  - 기존 덮어쓰기: ${this.options.overwriteExisting ? "Enabled" : "Disabled"}`,
			);

			console.log(`\n📊 문서 현황:`);
			console.log(`  - 생성된 파일 문서: ${documents.files.length}개`);
			console.log(`  - 생성된 심볼 문서: ${documents.symbols.length}개`);
			console.log(
				`  - 총 생성된 문서: ${documents.files.length + documents.symbols.length}개`,
			);

			console.log(`\n📊 데이터베이스 현황:`);
			console.log(`  - 총 노드 수: ${allNodes.length}개`);
			console.log(`  - 파일 노드: ${fileNodes.length}개`);
			console.log(`  - 심볼 노드: ${symbolNodes.length}개`);

			console.log(`\n📊 문서 생성률:`);
			const fileGenerationRate =
				fileNodes.length > 0
					? (documents.files.length / fileNodes.length) * 100
					: 0;
			const symbolGenerationRate =
				symbolNodes.length > 0
					? (documents.symbols.length / symbolNodes.length) * 100
					: 0;
			console.log(`  - 파일 문서 생성률: ${Math.round(fileGenerationRate)}%`);
			console.log(`  - 심볼 문서 생성률: ${Math.round(symbolGenerationRate)}%`);
		} catch (error) {
			console.error(
				`❌ 컨텍스트 문서 통계 생성 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 핸들러 초기화
	 */
	async initialize(): Promise<void> {
		try {
			await this.database.initialize();
			console.log("✅ Context Documents Handler 초기화 완료");
		} catch (error) {
			console.error(
				`❌ Context Documents Handler 초기화 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	/**
	 * 핸들러 종료
	 */
	async close(): Promise<void> {
		try {
			await this.database.close();
			console.log("✅ Context Documents Handler 종료 완료");
		} catch (error) {
			console.error(
				`❌ Context Documents Handler 종료 실패: ${(error as Error).message}`,
			);
			throw error;
		}
	}
}
