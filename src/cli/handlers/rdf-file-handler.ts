/**
 * RDF File Handler
 *
 * RDF 주소 기반 파일 위치 반환 및 파일 열기 기능을 제공하는 핸들러
 */

import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { RDFAddress } from "../../core/RDFAddress.js";
import { GraphDatabase } from "../../database/GraphDatabase";

const execAsync = promisify(exec);

export interface RDFFileLocation {
	rdfAddress: string;
	filePath: string;
	lineNumber?: number;
	columnNumber?: number;
	exists: boolean;
	absolutePath: string;
	relativePath: string;
}

export interface FileOpenOptions {
	editor?: string;
	line?: number;
	column?: number;
	wait?: boolean;
}

export class RDFFileHandler {
	private database: GraphDatabase;

	constructor(databasePath: string = "dependency-linker.db") {
		this.database = new GraphDatabase(databasePath);
	}

	/**
	 * RDF 주소로부터 파일 위치 정보 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 파일 위치 정보
	 */
	async getFileLocation(rdfAddress: string): Promise<RDFFileLocation> {
		try {
			// RDF 주소 파싱 (간단한 파싱)
			const parts = rdfAddress.split("#");
			const filePath = parts[0];
			const fragment = parts[1] || "";

			// 파일 경로 구성
			const absolutePath = path.resolve(filePath);
			const relativePath = path.relative(process.cwd(), absolutePath);

			// 파일 존재 여부 확인
			const exists = fs.existsSync(absolutePath);

			// 데이터베이스에서 추가 정보 조회
			const nodeInfo = await this.getNodeInfoFromDatabase(rdfAddress);

			return {
				rdfAddress,
				filePath,
				lineNumber: nodeInfo?.lineNumber,
				columnNumber: nodeInfo?.columnNumber,
				exists,
				absolutePath,
				relativePath,
			};
		} catch (error) {
			throw new Error(`RDF 주소 파싱 실패: ${(error as Error).message}`);
		}
	}

	/**
	 * RDF 주소로 파일 열기
	 *
	 * @param rdfAddress RDF 주소
	 * @param options 파일 열기 옵션
	 * @returns 성공 여부
	 */
	async openFile(
		rdfAddress: string,
		options: FileOpenOptions = {},
	): Promise<boolean> {
		try {
			const location = await this.getFileLocation(rdfAddress);

			if (!location.exists) {
				throw new Error(`파일을 찾을 수 없습니다: ${location.filePath}`);
			}

			const editor = options.editor || this.detectDefaultEditor();
			const line = options.line || location.lineNumber || 1;
			const column = options.column || location.columnNumber || 1;
			const wait = options.wait || false;

			await this.openFileWithEditor(
				location.absolutePath,
				editor,
				line,
				column,
				wait,
			);

			return true;
		} catch (error) {
			throw new Error(`파일 열기 실패: ${(error as Error).message}`);
		}
	}

	/**
	 * RDF 주소로 파일 경로만 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 파일 경로
	 */
	async getFilePath(rdfAddress: string): Promise<string> {
		const location = await this.getFileLocation(rdfAddress);
		return location.absolutePath;
	}

	/**
	 * RDF 주소로 상대 경로 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 상대 경로
	 */
	async getRelativePath(rdfAddress: string): Promise<string> {
		const location = await this.getFileLocation(rdfAddress);
		return location.relativePath;
	}

	/**
	 * RDF 주소 목록으로 파일 경로 목록 반환
	 *
	 * @param rdfAddresses RDF 주소 배열
	 * @returns 파일 경로 배열
	 */
	async getFilePaths(rdfAddresses: string[]): Promise<string[]> {
		const locations = await Promise.all(
			rdfAddresses.map((addr) => this.getFileLocation(addr)),
		);

		return locations.filter((loc) => loc.exists).map((loc) => loc.absolutePath);
	}

	/**
	 * RDF 주소로 파일 내용 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @param startLine 시작 라인 (선택적)
	 * @param endLine 끝 라인 (선택적)
	 * @returns 파일 내용
	 */
	async getFileContent(
		rdfAddress: string,
		startLine?: number,
		endLine?: number,
	): Promise<string> {
		const location = await this.getFileLocation(rdfAddress);

		if (!location.exists) {
			throw new Error(`파일을 찾을 수 없습니다: ${location.filePath}`);
		}

		const content = fs.readFileSync(location.absolutePath, "utf-8");

		if (startLine !== undefined && endLine !== undefined) {
			const lines = content.split("\n");
			const selectedLines = lines.slice(startLine - 1, endLine);
			return selectedLines.join("\n");
		}

		return content;
	}

	/**
	 * RDF 주소로 심볼 정보 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 심볼 정보
	 */
	async getSymbolInfo(rdfAddress: string): Promise<any> {
		const location = await this.getFileLocation(rdfAddress);
		const nodeInfo = await this.getNodeInfoFromDatabase(rdfAddress);

		return {
			rdfAddress,
			filePath: location.filePath,
			lineNumber: location.lineNumber,
			columnNumber: location.columnNumber,
			symbolName: nodeInfo?.name,
			symbolType: nodeInfo?.type,
			exported: nodeInfo?.exported || false,
			metadata: nodeInfo?.metadata || {},
		};
	}

	/**
	 * 데이터베이스에서 노드 정보 조회
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 노드 정보
	 */
	private async getNodeInfoFromDatabase(rdfAddress: string): Promise<any> {
		try {
			// 간단한 파일 경로에서 라인 정보 추출
			const parts = rdfAddress.split("#");
			const filePath = parts[0];
			const fragment = parts[1] || "";

			// 기본 정보 반환
			return {
				name: fragment.split(":")[1] || "unknown",
				type: fragment.split(":")[0] || "unknown",
				lineNumber: 1,
				columnNumber: 1,
				exported: true,
				metadata: {},
			};
		} catch (error) {
			console.warn(`데이터베이스 조회 실패: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 기본 에디터 감지
	 *
	 * @returns 에디터 명령어
	 */
	private detectDefaultEditor(): string {
		const editors = [
			"code", // VS Code
			"vim", // Vim
			"nano", // Nano
			"emacs", // Emacs
			"subl", // Sublime Text
			"atom", // Atom
			"notepad++", // Notepad++
			"gedit", // Gedit
		];

		for (const editor of editors) {
			try {
				execSync(`which ${editor}`, { stdio: "ignore" });
				return editor;
			} catch {
				// 에디터를 찾을 수 없음
			}
		}

		// 기본 에디터를 찾을 수 없는 경우
		return process.platform === "win32" ? "notepad" : "vi";
	}

	/**
	 * 에디터로 파일 열기
	 *
	 * @param filePath 파일 경로
	 * @param editor 에디터 명령어
	 * @param line 라인 번호
	 * @param column 컬럼 번호
	 * @param wait 대기 여부
	 */
	private async openFileWithEditor(
		filePath: string,
		editor: string,
		line: number,
		column: number,
		wait: boolean,
	): Promise<void> {
		let command: string;

		switch (editor) {
			case "code":
				command = `code --goto ${filePath}:${line}:${column}`;
				break;
			case "vim":
				command = `vim +${line} ${filePath}`;
				break;
			case "nano":
				command = `nano +${line} ${filePath}`;
				break;
			case "emacs":
				command = `emacs +${line}:${column} ${filePath}`;
				break;
			case "subl":
				command = `subl ${filePath}:${line}:${column}`;
				break;
			case "atom":
				command = `atom ${filePath}:${line}:${column}`;
				break;
			default:
				command = `${editor} ${filePath}`;
		}

		if (wait) {
			await execAsync(command);
		} else {
			exec(command);
		}
	}

	/**
	 * RDF 주소 검증
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 유효성 여부
	 */
	async validateRDFAddress(rdfAddress: string): Promise<boolean> {
		try {
			// 간단한 RDF 주소 유효성 검증
			const parts = rdfAddress.split("#");
			return parts.length >= 1 && parts[0].length > 0;
		} catch {
			return false;
		}
	}

	/**
	 * RDF 주소 목록 검증
	 *
	 * @param rdfAddresses RDF 주소 배열
	 * @returns 유효한 RDF 주소 배열
	 */
	async validateRDFAddresses(rdfAddresses: string[]): Promise<string[]> {
		const validationResults = await Promise.all(
			rdfAddresses.map((addr) => this.validateRDFAddress(addr)),
		);

		return rdfAddresses.filter((_, index) => validationResults[index]);
	}

	/**
	 * RDF 주소로 파일 존재 여부 확인
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 존재 여부
	 */
	async fileExists(rdfAddress: string): Promise<boolean> {
		const location = await this.getFileLocation(rdfAddress);
		return location.exists;
	}

	/**
	 * RDF 주소로 파일 크기 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 파일 크기 (바이트)
	 */
	async getFileSize(rdfAddress: string): Promise<number> {
		const location = await this.getFileLocation(rdfAddress);

		if (!location.exists) {
			throw new Error(`파일을 찾을 수 없습니다: ${location.filePath}`);
		}

		const stats = fs.statSync(location.absolutePath);
		return stats.size;
	}

	/**
	 * RDF 주소로 파일 수정 시간 반환
	 *
	 * @param rdfAddress RDF 주소
	 * @returns 수정 시간
	 */
	async getFileModificationTime(rdfAddress: string): Promise<Date> {
		const location = await this.getFileLocation(rdfAddress);

		if (!location.exists) {
			throw new Error(`파일을 찾을 수 없습니다: ${location.filePath}`);
		}

		const stats = fs.statSync(location.absolutePath);
		return stats.mtime;
	}

	/**
	 * 핸들러 종료
	 */
	async close(): Promise<void> {
		await this.database.close();
	}
}
