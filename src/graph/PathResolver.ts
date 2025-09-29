/**
 * Path Resolver
 * Import 경로를 프로젝트 루트 기준 절대 경로로 변환
 */

import { promises as fs } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import type {
	PathResolutionOptions,
	PathResolutionResult,
} from "./types";

/**
 * 경로 해결기 클래스
 */
export class PathResolver {
	private options: Required<PathResolutionOptions>;

	constructor(options: PathResolutionOptions) {
		this.options = {
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
			aliasMap: {},
			useTsConfig: true,
			...options,
		};
	}

	/**
	 * Import 경로를 절대 경로로 해결
	 */
	async resolvePath(importPath: string): Promise<PathResolutionResult> {
		const originalPath = importPath;

		// 1. 내장 모듈 체크
		if (this.isBuiltinModule(importPath)) {
			return {
				resolvedPath: importPath,
				originalPath,
				resolutionType: "builtin",
				exists: true,
			};
		}

		// 2. 외부 패키지 체크 (node_modules)
		if (this.isExternalPackage(importPath)) {
			return {
				resolvedPath: importPath,
				originalPath,
				resolutionType: "external",
				exists: true, // 외부 패키지는 존재한다고 가정
			};
		}

		// 3. Alias 매핑 적용
		const aliasResolved = this.resolveAlias(importPath);

		// 4. 상대/절대 경로 해결
		let targetPath: string;
		let resolutionType: PathResolutionResult["resolutionType"];

		if (isAbsolute(aliasResolved)) {
			targetPath = aliasResolved;
			resolutionType = "absolute";
		} else if (aliasResolved.startsWith(".")) {
			targetPath = resolve(this.options.basePath, aliasResolved);
			resolutionType = "relative";
		} else if (aliasResolved !== importPath) {
			// Alias가 적용됨
			targetPath = resolve(this.options.projectRoot, aliasResolved);
			resolutionType = "alias";
		} else {
			// 상대 경로로 처리
			targetPath = resolve(this.options.basePath, aliasResolved);
			resolutionType = "relative";
		}

		// 5. 파일 확장자 해결
		const fileResolution = await this.resolveFileExtension(targetPath);

		return {
			resolvedPath: fileResolution.path,
			originalPath,
			resolutionType,
			exists: fileResolution.exists,
			extension: fileResolution.extension,
		};
	}

	/**
	 * 여러 경로를 일괄 해결
	 */
	async resolvePaths(importPaths: string[]): Promise<PathResolutionResult[]> {
		const promises = importPaths.map((path) => this.resolvePath(path));
		return Promise.all(promises);
	}

	/**
	 * 내장 모듈 여부 확인
	 */
	private isBuiltinModule(moduleName: string): boolean {
		const builtinModules = [
			// Node.js built-in modules
			"fs", "path", "os", "crypto", "events", "stream", "util", "url",
			"querystring", "http", "https", "net", "tls", "dns", "child_process",
			"cluster", "worker_threads", "timers", "readline", "zlib", "buffer",

			// Node.js prefixed modules
			"node:fs", "node:path", "node:os", "node:crypto", "node:events",
			"node:stream", "node:util", "node:url", "node:querystring",
			"node:http", "node:https", "node:net", "node:tls", "node:dns",
			"node:child_process", "node:cluster", "node:worker_threads",
			"node:timers", "node:readline", "node:zlib", "node:buffer",
		];

		return builtinModules.includes(moduleName);
	}

	/**
	 * 외부 패키지 여부 확인
	 */
	private isExternalPackage(moduleName: string): boolean {
		// 상대 경로가 아니고, 내장 모듈도 아니면 외부 패키지
		return !moduleName.startsWith(".") &&
		       !moduleName.startsWith("/") &&
		       !this.isBuiltinModule(moduleName);
	}

	/**
	 * Alias 매핑 해결
	 */
	private resolveAlias(importPath: string): string {
		for (const [alias, target] of Object.entries(this.options.aliasMap)) {
			if (importPath.startsWith(alias)) {
				return importPath.replace(alias, target);
			}
		}
		return importPath;
	}

	/**
	 * 파일 확장자 해결
	 */
	private async resolveFileExtension(targetPath: string): Promise<{
		path: string;
		exists: boolean;
		extension?: string;
	}> {
		// 이미 확장자가 있는 경우
		if (extname(targetPath)) {
			const exists = await this.fileExists(targetPath);
			return {
				path: targetPath,
				exists,
				extension: exists ? extname(targetPath) : undefined,
			};
		}

		// 확장자 시도
		for (const ext of this.options.extensions) {
			const pathWithExt = targetPath + ext;
			if (await this.fileExists(pathWithExt)) {
				return {
					path: pathWithExt,
					exists: true,
					extension: ext,
				};
			}
		}

		// index 파일 시도
		for (const ext of this.options.extensions) {
			const indexPath = join(targetPath, `index${ext}`);
			if (await this.fileExists(indexPath)) {
				return {
					path: indexPath,
					exists: true,
					extension: ext,
				};
			}
		}

		// 해결 실패
		return {
			path: targetPath,
			exists: false,
		};
	}

	/**
	 * 파일 존재 여부 확인
	 */
	private async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * 프로젝트 루트에서 상대 경로로 변환
	 */
	getRelativeFromRoot(absolutePath: string): string {
		return resolve(absolutePath).replace(this.options.projectRoot + "/", "");
	}

	/**
	 * 새로운 베이스 경로로 resolver 생성
	 */
	withBasePath(basePath: string): PathResolver {
		return new PathResolver({
			...this.options,
			basePath: dirname(basePath),
		});
	}
}

/**
 * 경로 해결기 팩토리 함수
 */
export function createPathResolver(options: PathResolutionOptions): PathResolver {
	return new PathResolver(options);
}

/**
 * 간단한 경로 해결 함수 (기본 설정 사용)
 */
export async function resolvePath(
	importPath: string,
	projectRoot: string,
	currentFilePath: string,
): Promise<string> {
	const resolver = createPathResolver({
		projectRoot,
		basePath: dirname(currentFilePath),
	});

	const result = await resolver.resolvePath(importPath);
	return result.resolvedPath;
}