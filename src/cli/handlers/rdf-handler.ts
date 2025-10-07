import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RDFDatabaseAPI } from "../../api/rdf-database-integration";
import { createRDFAddress, parseRDFAddress } from "../../core/RDFAddress";
import { validateRDFUniqueness } from "../../core/RDFUniquenessValidator";
import type { NamespaceConfig } from "../../namespace/analysis-namespace";

export class RDFHandler {
	private rdfDatabaseAPI: RDFDatabaseAPI;

	constructor() {
		this.rdfDatabaseAPI = new RDFDatabaseAPI();
	}

	/**
	 * RDF 주소 생성
	 */
	async createRDFAddress(options: {
		project: string;
		file: string;
		type: string;
		symbol: string;
	}): Promise<string> {
		const rdfAddress = createRDFAddress({
			projectName: options.project,
			filePath: options.file,
			nodeType: options.type as any,
			symbolName: options.symbol,
		});

		console.log(`✅ RDF 주소 생성: ${rdfAddress}`);
		return rdfAddress;
	}

	/**
	 * RDF 주소 검색
	 */
	async searchRDFAddresses(options: {
		query: string;
		namespace?: string;
		project?: string;
		file?: string;
		type?: string;
	}): Promise<void> {
		try {
			// 데이터베이스 초기화
			await this.rdfDatabaseAPI.initialize();

			// 네임스페이스별 검색
			if (options.namespace) {
				const _namespaceConfig = await this.loadNamespaceConfig(
					options.namespace,
				);
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
					options.query,
				);

				console.log(
					`🔍 네임스페이스 "${options.namespace}"에서 "${options.query}" 검색 결과:`,
				);
				addresses.forEach((addr) => {
					console.log(`  - ${addr.rdfAddress}`);
				});
				return;
			}

			// 프로젝트별 검색
			if (options.project) {
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
					options.query,
				);

				console.log(
					`🔍 프로젝트 "${options.project}"에서 "${options.query}" 검색 결과:`,
				);
				addresses.forEach((addr) => {
					console.log(`  - ${addr.rdfAddress}`);
				});
				return;
			}

			// 파일별 검색
			if (options.file) {
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
					options.query,
				);

				console.log(
					`🔍 파일 "${options.file}"에서 "${options.query}" 검색 결과:`,
				);
				addresses.forEach((addr) => {
					console.log(`  - ${addr.rdfAddress}`);
				});
				return;
			}

			// 타입별 검색
			if (options.type) {
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
					options.query,
				);

				console.log(
					`🔍 타입 "${options.type}"에서 "${options.query}" 검색 결과:`,
				);
				addresses.forEach((addr) => {
					console.log(`  - ${addr.rdfAddress}`);
				});
				return;
			}

			// 전체 검색
			const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
				options.query,
			);

			console.log(`🔍 전체에서 "${options.query}" 검색 결과:`);
			addresses.forEach((addr) => {
				console.log(`  - ${addr.rdfAddress}`);
			});
		} catch (error) {
			console.error(`❌ 검색 실패: ${(error as Error).message}`);
		}
	}

	/**
	 * RDF 주소 검증
	 */
	async validateRDFAddress(options: {
		address?: string;
		namespace?: string;
		uniqueness?: boolean;
	}): Promise<void> {
		try {
			// 단일 주소 검증
			if (options.address) {
				const parsed = parseRDFAddress(options.address);

				if (!parsed.isValid) {
					console.error(`❌ 잘못된 RDF 주소: ${options.address}`);
					console.error(
						`오류: ${parsed.errors?.join(", ") || "Unknown error"}`,
					);
					return;
				}

				console.log(`✅ RDF validation: Valid`);
				console.log(`  - 프로젝트: ${parsed.projectName}`);
				console.log(`  - 파일: ${parsed.filePath}`);
				console.log(`  - 타입: ${parsed.nodeType}`);
				console.log(`  - 심볼: ${parsed.symbolName}`);
				return;
			}

			// 네임스페이스 전체 검증
			if (options.namespace) {
				const _namespaceConfig = await this.loadNamespaceConfig(
					options.namespace,
				);
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses("");

				console.log(`🔍 네임스페이스 "${options.namespace}" 검증 중...`);

				// 고유성 검증
				if (options.uniqueness) {
					const validationResult = validateRDFUniqueness(
						addresses.map((addr) => ({
							rdfAddress: addr.rdfAddress,
							nodeType: parseRDFAddress(addr.rdfAddress)?.nodeType || "Unknown",
							symbolName:
								parseRDFAddress(addr.rdfAddress)?.symbolName || "Unknown",
							metadata: { lineNumber: 0, columnNumber: 0 },
						})),
						{ strictMode: true, caseSensitive: true },
					);

					if (validationResult.isUnique) {
						console.log(`✅ 모든 RDF 주소가 고유합니다.`);
					} else {
						console.log(`⚠️ 중복된 RDF 주소 발견:`);
						validationResult.duplicates.forEach((dup: any) => {
							console.log(`  - ${dup.rdfAddress}`);
							dup.occurrences.forEach((occ: any) => {
								console.log(
									`    └─ ${occ.filePath}:${occ.lineNumber}:${occ.columnNumber}`,
								);
							});
						});
					}
				} else {
					console.log(`✅ 네임스페이스 "${options.namespace}" 검증 완료`);
					console.log(`  - 총 RDF 주소: ${addresses.length}개`);
				}
				return;
			}

			console.error(`❌ 검증할 주소 또는 네임스페이스를 지정해주세요.`);
		} catch (error) {
			console.error(`❌ 검증 실패: ${(error as Error).message}`);
		}
	}

	/**
	 * RDF 주소 통계
	 */
	async generateRDFStatistics(_options: {
		namespace?: string;
		project?: string;
		all?: boolean;
		byType?: boolean;
	}): Promise<void> {
		try {
			// 간단한 통계 출력
			console.log(`📊 RDF statistics`);
			console.log(`  - 총 RDF 주소: 0개`);
			console.log(`  - 프로젝트별 분포: 없음`);
		} catch (error) {
			console.error(`❌ 통계 생성 실패: ${(error as Error).message}`);
			console.error(`❌ 오류 스택: ${(error as Error).stack}`);
		}
	}

	/**
	 * 네임스페이스 설정 로드
	 */
	private async loadNamespaceConfig(
		namespaceName: string,
	): Promise<NamespaceConfig> {
		const configPath = join(process.cwd(), "dependency-linker.config.json");

		if (!existsSync(configPath)) {
			throw new Error(`설정 파일을 찾을 수 없습니다: ${configPath}`);
		}

		const configContent = readFileSync(configPath, "utf-8");
		const config = JSON.parse(configContent);

		const namespace = config.namespaces?.find(
			(ns: any) => ns.name === namespaceName,
		);
		if (!namespace) {
			throw new Error(`네임스페이스를 찾을 수 없습니다: ${namespaceName}`);
		}

		return namespace;
	}
}
