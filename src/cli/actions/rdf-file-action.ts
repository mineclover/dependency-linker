import { RDFFileHandler } from "../handlers/rdf-file-handler.js";

export interface RDFFileActionOptions {
	location?: string;
	open?: string;
	path?: string;
	relative?: string;
	content?: string;
	symbol?: string;
	exists?: string;
	validate?: string;
	database?: string;
}

export async function executeRDFFileAction(
	options: RDFFileActionOptions,
): Promise<void> {
	const handler = new RDFFileHandler();

	try {
		if (options.location) {
			// 파일 위치 정보 반환
			const location = await handler.getFileLocation(options.location);
			console.log(`📄 File Location: ${location.absolutePath}`);
			console.log(`📁 RDF Address: ${location.rdfAddress}`);
			console.log(`📂 Relative Path: ${location.relativePath}`);
		} else if (options.open) {
			// 파일 열기
			await handler.openFile(options.open);
			console.log(`✅ File opened: ${options.open}`);
		} else if (options.path) {
			// 파일 경로 반환
			const filePath = await handler.getFilePath(options.path);
			console.log(`📄 File Path: ${filePath}`);
		} else if (options.relative) {
			// 상대 경로 반환
			const relativePath = await handler.getRelativePath(options.relative);
			console.log(`📄 Relative Path: ${relativePath}`);
		} else if (options.content) {
			// 파일 내용 반환
			const content = await handler.getFileContent(options.content);
			console.log("📄 File Content:");
			console.log(content);
		} else if (options.symbol) {
			// 심볼 정보 반환
			const symbolInfo = await handler.getSymbolInfo(options.symbol);
			console.log(`🎯 Symbol: ${symbolInfo.name}`);
			console.log(`📄 File: ${symbolInfo.file}`);
			console.log(`📍 Line: ${symbolInfo.line}`);
			console.log(`📝 Type: ${symbolInfo.type}`);
		} else if (options.exists) {
			// 파일 존재 여부 확인
			const exists = await handler.fileExists(options.exists);
			console.log(`📄 File exists: ${exists ? "Yes" : "No"}`);
		} else if (options.validate) {
			// RDF 주소 유효성 검증
			const isValid = await handler.validateRDFAddress(options.validate);
			console.log(`✅ RDF Address valid: ${isValid ? "Yes" : "No"}`);
		} else {
			console.log(
				"❌ Please specify an action: --location, --open, --path, --relative, --content, --symbol, --exists, or --validate",
			);
			process.exit(1);
		}

		console.log("✅ RDF File operation completed");
	} catch (error) {
		console.error("❌ RDF File operation failed:", error);
		process.exit(1);
	}
}
