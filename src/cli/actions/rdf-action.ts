import { RDFHandler } from "../handlers/rdf-handler.js";

export interface RDFActionOptions {
	create?: boolean;
	search?: string;
	validate?: string;
	stats?: boolean;
	project?: string;
	file?: string;
	type?: string;
	symbol?: string;
	database?: string;
}

export async function executeRDFAction(
	options: RDFActionOptions,
): Promise<void> {
	const handler = new RDFHandler();

	try {
		if (options.create) {
			// RDF 주소 생성
			if (
				!options.project ||
				!options.file ||
				!options.type ||
				!options.symbol
			) {
				console.log(
					"❌ Please provide --project, --file, --type, and --symbol for RDF creation",
				);
				process.exit(1);
			}

			const rdfAddress = await handler.createRDFAddress({
				project: options.project,
				file: options.file,
				type: options.type,
				symbol: options.symbol,
			});

			console.log(`✅ RDF Address created: ${rdfAddress}`);
		} else if (options.search) {
			// RDF 주소 검색
			await handler.searchRDFAddresses({
				query: options.search,
			});
		} else if (options.validate) {
			// RDF 주소 검증
			await handler.validateRDFAddress({
				address: options.validate,
			});
		} else if (options.stats) {
			// RDF 통계
			await handler.generateRDFStatistics({
				all: true,
			});
		} else {
			console.log(
				"❌ Please specify an action: --create, --search, --validate, or --stats",
			);
			process.exit(1);
		}

		console.log("✅ RDF operation completed");
	} catch (error) {
		console.error("❌ RDF operation failed:", error);
		process.exit(1);
	}
}
