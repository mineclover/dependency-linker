/**
 * Package.json Resolver
 * package.json 파일에서 실제 설치된 라이브러리 버전 정보를 추출
 */

import * as fs from "fs";
import * as path from "path";

export interface PackageInfo {
	name: string;
	version: string;
	path: string;
	isDevDependency: boolean;
	isPeerDependency: boolean;
	isOptionalDependency: boolean;
}

export interface PackageJsonData {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

export class PackageJsonResolver {
	private packageJsonCache = new Map<string, PackageJsonData>();
	private nodeModulesCache = new Map<string, PackageInfo>();

	constructor(private projectRoot: string) {}

	/**
	 * package.json에서 라이브러리 정보 조회
	 */
	async getPackageInfo(libraryName: string): Promise<PackageInfo | null> {
		// 캐시에서 먼저 확인
		if (this.nodeModulesCache.has(libraryName)) {
			return this.nodeModulesCache.get(libraryName)!;
		}

		// package.json에서 버전 정보 조회
		const packageJson = await this.loadPackageJson();
		if (!packageJson) {
			return null;
		}

		// 의존성 타입별로 확인
		const dependencyTypes = [
			{
				deps: packageJson.dependencies,
				isDev: false,
				isPeer: false,
				isOptional: false,
			},
			{
				deps: packageJson.devDependencies,
				isDev: true,
				isPeer: false,
				isOptional: false,
			},
			{
				deps: packageJson.peerDependencies,
				isDev: false,
				isPeer: true,
				isOptional: false,
			},
			{
				deps: packageJson.optionalDependencies,
				isDev: false,
				isPeer: false,
				isOptional: true,
			},
		];

		for (const { deps, isDev, isPeer, isOptional } of dependencyTypes) {
			if (deps && deps[libraryName]) {
				const version = deps[libraryName];
				const packageInfo: PackageInfo = {
					name: libraryName,
					version: this.normalizeVersion(version),
					path: path.join(this.projectRoot, "node_modules", libraryName),
					isDevDependency: isDev,
					isPeerDependency: isPeer,
					isOptionalDependency: isOptional,
				};

				// 캐시에 저장
				this.nodeModulesCache.set(libraryName, packageInfo);
				return packageInfo;
			}
		}

		return null;
	}

	/**
	 * 모든 설치된 패키지 정보 조회
	 */
	async getAllPackages(): Promise<PackageInfo[]> {
		const packageJson = await this.loadPackageJson();
		if (!packageJson) {
			return [];
		}

		const allPackages: PackageInfo[] = [];

		// 모든 의존성 타입을 순회
		const dependencyTypes = [
			{
				deps: packageJson.dependencies,
				isDev: false,
				isPeer: false,
				isOptional: false,
			},
			{
				deps: packageJson.devDependencies,
				isDev: true,
				isPeer: false,
				isOptional: false,
			},
			{
				deps: packageJson.peerDependencies,
				isDev: false,
				isPeer: true,
				isOptional: false,
			},
			{
				deps: packageJson.optionalDependencies,
				isDev: false,
				isPeer: false,
				isOptional: true,
			},
		];

		for (const { deps, isDev, isPeer, isOptional } of dependencyTypes) {
			if (deps) {
				for (const [name, version] of Object.entries(deps)) {
					allPackages.push({
						name,
						version: this.normalizeVersion(version),
						path: path.join(this.projectRoot, "node_modules", name),
						isDevDependency: isDev,
						isPeerDependency: isPeer,
						isOptionalDependency: isOptional,
					});
				}
			}
		}

		return allPackages;
	}

	/**
	 * package.json 파일 로드
	 */
	private async loadPackageJson(): Promise<PackageJsonData | null> {
		const packageJsonPath = path.join(this.projectRoot, "package.json");

		// 캐시에서 확인
		if (this.packageJsonCache.has(packageJsonPath)) {
			return this.packageJsonCache.get(packageJsonPath)!;
		}

		try {
			const content = await fs.promises.readFile(packageJsonPath, "utf-8");
			const packageJson = JSON.parse(content) as PackageJsonData;

			// 캐시에 저장
			this.packageJsonCache.set(packageJsonPath, packageJson);
			return packageJson;
		} catch (error) {
			console.warn(`Failed to load package.json: ${error}`);
			return null;
		}
	}

	/**
	 * 버전 문자열 정규화
	 * ^1.2.3, ~1.2.3, >=1.2.3 등의 범위를 실제 버전으로 변환
	 */
	private normalizeVersion(version: string): string {
		// 범위 기호 제거 (^, ~, >=, <= 등)
		return version.replace(/^[\^~>=<]+/, "");
	}

	/**
	 * 라이브러리가 실제로 설치되어 있는지 확인
	 */
	async isPackageInstalled(libraryName: string): Promise<boolean> {
		const packageInfo = await this.getPackageInfo(libraryName);
		if (!packageInfo) {
			return false;
		}

		try {
			await fs.promises.access(packageInfo.path);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * 캐시 클리어
	 */
	clearCache(): void {
		this.packageJsonCache.clear();
		this.nodeModulesCache.clear();
	}
}
