import { existsSync, readFileSync } from "fs";
import { join } from "path";
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
			// 네임스페이스별 검색
			if (options.namespace) {
				const namespaceConfig = await this.loadNamespaceConfig(
					options.namespace,
				);
				const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
					options.query,
				);

				console.log(
					`🔍 네임스페이스 "${options.namespace}"에서 "${options.query}" 검색 결과:`,
				);
				addresses.forEach((addr) => console.log(`  - ${addr.rdfAddress}`));
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
				addresses.forEach((addr) => console.log(`  - ${addr.rdfAddress}`));
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
				addresses.forEach((addr) => console.log(`  - ${addr.rdfAddress}`));
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
				addresses.forEach((addr) => console.log(`  - ${addr.rdfAddress}`));
				return;
			}

			// 전체 검색
			const addresses = await this.rdfDatabaseAPI.searchRDFAddresses(
				options.query,
			);

			console.log(`🔍 전체에서 "${options.query}" 검색 결과:`);
			addresses.forEach((addr) => console.log(`  - ${addr.rdfAddress}`));
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

				console.log(`✅ 유효한 RDF 주소: ${options.address}`);
				console.log(`  - 프로젝트: ${parsed.projectName}`);
				console.log(`  - 파일: ${parsed.filePath}`);
				console.log(`  - 타입: ${parsed.nodeType}`);
				console.log(`  - 심볼: ${parsed.symbolName}`);
				return;
			}

			// 네임스페이스 전체 검증
			if (options.namespace) {
				const namespaceConfig = await this.loadNamespaceConfig(
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
	async generateRDFStatistics(options: {
		namespace?: string;
		project?: string;
		all?: boolean;
		byType?: boolean;
	}): Promise<void> {
		try {
			let addresses: any[] = [];

			// 네임스페이스별 통계
			if (options.namespace) {
				const namespaceConfig = await this.loadNamespaceConfig(
					options.namespace,
				);
				addresses = await this.rdfDatabaseAPI.searchRDFAddresses("");

				console.log(`📊 네임스페이스 "${options.namespace}" 통계:`);
			}
			// 프로젝트별 통계
			else if (options.project) {
				addresses = await this.rdfDatabaseAPI.searchRDFAddresses("");
				console.log(`📊 프로젝트 "${options.project}" 통계:`);
			}
			// 전체 통계
			else if (options.all) {
				addresses = await this.rdfDatabaseAPI.searchRDFAddresses("");
				console.log(`📊 전체 통계:`);
			} else {
				console.error(
					`❌ 통계 범위를 지정해주세요 (--namespace, --project, --all)`,
				);
				return;
			}

			// 기본 통계
			console.log(`  - 총 RDF 주소: ${addresses.length}개`);

			// 타입별 통계
			if (options.byType) {
				const typeStats = new Map<string, number>();
				addresses.forEach((addr) => {
					const parsed = parseRDFAddress(addr.rdfAddress);
					if (parsed.isValid) {
						const type = parsed.nodeType;
						typeStats.set(type, (typeStats.get(type) || 0) + 1);
					}
				});

				console.log(`  - 타입별 분포:`);
				Array.from(typeStats.entries())
					.sort((a, b) => b[1] - a[1])
					.forEach(([type, count]) => {
						console.log(`    ${type}: ${count}개`);
					});
			}

			// 프로젝트별 통계
			const projectStats = new Map<string, number>();
			addresses.forEach((addr) => {
				const parsed = parseRDFAddress(addr.rdfAddress);
				if (parsed.isValid) {
					const project = parsed.projectName;
					projectStats.set(project, (projectStats.get(project) || 0) + 1);
				}
			});

			if (projectStats.size > 1) {
				console.log(`  - 프로젝트별 분포:`);
				Array.from(projectStats.entries())
					.sort((a, b) => b[1] - a[1])
					.forEach(([project, count]) => {
						console.log(`    ${project}: ${count}개`);
					});
			}
		} catch (error) {
			console.error(`❌ 통계 생성 실패: ${(error as Error).message}`);
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
