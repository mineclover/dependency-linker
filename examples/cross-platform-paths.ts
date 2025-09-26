#!/usr/bin/env npx tsx

/**
 * Cross-Platform Path Handling Examples
 * 운영체제별 경로 처리 최적화 예제 모음
 */

import {
	createPathInfo,
	createBatchPathInfo,
	PathInfo,
} from "../src/lib/index";
import { homedir } from "os";
import path from "path";

// =================================================================
// Windows 전용 경로 처리 유틸리티
// =================================================================

export class WindowsPathUtils {
	/**
	 * Windows 환경 변수 확장
	 */
	static expandVariables(inputPath: string): string {
		const variables: Record<string, string> = {
			"%USERPROFILE%": homedir(),
			"%APPDATA%":
				process.env.APPDATA || path.join(homedir(), "AppData", "Roaming"),
			"%LOCALAPPDATA%":
				process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"),
			"%PROGRAMFILES%": process.env.PROGRAMFILES || "C:\\Program Files",
			"%PROGRAMFILES(X86)%":
				process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
			"%SYSTEMROOT%": process.env.SYSTEMROOT || "C:\\Windows",
			"%TEMP%":
				process.env.TEMP || path.join(homedir(), "AppData", "Local", "Temp"),
			"%WINDIR%": process.env.WINDIR || "C:\\Windows",
		};

		let expandedPath = inputPath;
		for (const [variable, value] of Object.entries(variables)) {
			expandedPath = expandedPath.replace(
				new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
				value,
			);
		}

		return expandedPath;
	}

	/**
	 * Windows 드라이브 분석
	 */
	static analyzeDrive(pathInfo: PathInfo): {
		drive: string;
		isSystem: boolean;
		driveType: "local" | "network" | "removable" | "unknown";
	} {
		const absolutePath = pathInfo.absolute;
		const driveMatch = absolutePath.match(/^([A-Z]):/i);

		if (!driveMatch) {
			return { drive: "", isSystem: false, driveType: "unknown" };
		}

		const drive = driveMatch[1].toUpperCase();
		const isSystem = drive === "C";

		// 기본적인 드라이브 타입 추론 (실제로는 더 정교한 API 필요)
		let driveType: "local" | "network" | "removable" | "unknown" = "local";
		if (absolutePath.startsWith("\\\\")) driveType = "network";
		else if (["D", "E", "F", "G", "H"].includes(drive)) driveType = "removable";

		return { drive, isSystem, driveType };
	}

	/**
	 * UNC 경로 처리
	 */
	static handleUNCPath(uncPath: string): {
		server: string;
		share: string;
		relativePath: string;
		isValid: boolean;
	} {
		const uncRegex = /^\\\\([^\\]+)\\([^\\]+)\\?(.*)$/;
		const match = uncPath.match(uncRegex);

		if (!match) {
			return { server: "", share: "", relativePath: "", isValid: false };
		}

		return {
			server: match[1],
			share: match[2],
			relativePath: match[3] || "",
			isValid: true,
		};
	}
}

// =================================================================
// macOS 전용 경로 처리 유틸리티
// =================================================================

export class MacOSPathUtils {
	/**
	 * 틸드(~) 경로 확장
	 */
	static expandTildePath(inputPath: string): string {
		if (inputPath.startsWith("~/")) {
			return path.join(homedir(), inputPath.slice(2));
		}

		// ~username/ 패턴 처리 (기본 구현)
		const userMatch = inputPath.match(/^~([^/]+)\/(.*)/);
		if (userMatch) {
			const username = userMatch[1];
			const relativePath = userMatch[2];
			// 실제로는 /Users/{username} 확인 필요
			return `/Users/${username}/${relativePath}`;
		}

		return inputPath;
	}

	/**
	 * 앱 번들 경로 분석
	 */
	static analyzeAppBundle(pathInfo: PathInfo): {
		isAppBundle: boolean;
		appName: string;
		bundlePath: string;
		contentType:
			| "executable"
			| "resources"
			| "frameworks"
			| "plugins"
			| "other";
	} {
		const absolutePath = pathInfo.absolute;
		const appBundleMatch = absolutePath.match(/^(.+\.app)\/(.*)$/);

		if (!appBundleMatch) {
			return {
				isAppBundle: false,
				appName: "",
				bundlePath: "",
				contentType: "other",
			};
		}

		const bundlePath = appBundleMatch[1];
		const internalPath = appBundleMatch[2];
		const appName = path.basename(bundlePath, ".app");

		let contentType:
			| "executable"
			| "resources"
			| "frameworks"
			| "plugins"
			| "other" = "other";
		if (internalPath.startsWith("Contents/MacOS/")) contentType = "executable";
		else if (internalPath.startsWith("Contents/Resources/"))
			contentType = "resources";
		else if (internalPath.startsWith("Contents/Frameworks/"))
			contentType = "frameworks";
		else if (internalPath.startsWith("Contents/PlugIns/"))
			contentType = "plugins";

		return { isAppBundle: true, appName, bundlePath, contentType };
	}

	/**
	 * 시스템 경로 분류
	 */
	static classifySystemPath(pathInfo: PathInfo): {
		pathType:
			| "system"
			| "library"
			| "applications"
			| "user"
			| "homebrew"
			| "developer"
			| "volumes"
			| "other";
		isProtected: boolean;
		description: string;
	} {
		const absolutePath = pathInfo.absolute;

		if (absolutePath.startsWith("/System/")) {
			return {
				pathType: "system",
				isProtected: true,
				description: "macOS 시스템 파일",
			};
		}
		if (absolutePath.startsWith("/Library/")) {
			return {
				pathType: "library",
				isProtected: true,
				description: "시스템 라이브러리",
			};
		}
		if (absolutePath.startsWith("/Applications/")) {
			return {
				pathType: "applications",
				isProtected: false,
				description: "설치된 애플리케이션",
			};
		}
		if (absolutePath.startsWith(homedir())) {
			return {
				pathType: "user",
				isProtected: false,
				description: "사용자 디렉토리",
			};
		}
		if (
			absolutePath.startsWith("/opt/homebrew/") ||
			absolutePath.startsWith("/usr/local/")
		) {
			return {
				pathType: "homebrew",
				isProtected: false,
				description: "Homebrew 패키지",
			};
		}
		if (
			absolutePath.startsWith("/Library/Developer/") ||
			absolutePath.includes("Xcode")
		) {
			return {
				pathType: "developer",
				isProtected: false,
				description: "개발 도구",
			};
		}
		if (absolutePath.startsWith("/Volumes/")) {
			return {
				pathType: "volumes",
				isProtected: false,
				description: "마운트된 볼륨",
			};
		}

		return { pathType: "other", isProtected: false, description: "기타 경로" };
	}
}

// =================================================================
// Linux 전용 경로 처리 유틸리티
// =================================================================

export class LinuxPathUtils {
	/**
	 * 표준 디렉토리 분류 (FHS - Filesystem Hierarchy Standard)
	 */
	static classifyFHSPath(pathInfo: PathInfo): {
		category:
			| "root"
			| "bin"
			| "etc"
			| "home"
			| "lib"
			| "opt"
			| "tmp"
			| "usr"
			| "var"
			| "dev"
			| "proc"
			| "sys"
			| "other";
		isSystemCritical: boolean;
		description: string;
	} {
		const absolutePath = pathInfo.absolute;

		const fhsMap = [
			{
				pattern: /^\/bin\//,
				category: "bin" as const,
				critical: true,
				desc: "필수 바이너리",
			},
			{
				pattern: /^\/etc\//,
				category: "etc" as const,
				critical: true,
				desc: "시스템 설정",
			},
			{
				pattern: /^\/home\//,
				category: "home" as const,
				critical: false,
				desc: "사용자 홈",
			},
			{
				pattern: /^\/lib\//,
				category: "lib" as const,
				critical: true,
				desc: "필수 라이브러리",
			},
			{
				pattern: /^\/opt\//,
				category: "opt" as const,
				critical: false,
				desc: "옵션 소프트웨어",
			},
			{
				pattern: /^\/tmp\//,
				category: "tmp" as const,
				critical: false,
				desc: "임시 파일",
			},
			{
				pattern: /^\/usr\//,
				category: "usr" as const,
				critical: false,
				desc: "사용자 프로그램",
			},
			{
				pattern: /^\/var\//,
				category: "var" as const,
				critical: false,
				desc: "가변 데이터",
			},
			{
				pattern: /^\/dev\//,
				category: "dev" as const,
				critical: true,
				desc: "디바이스 파일",
			},
			{
				pattern: /^\/proc\//,
				category: "proc" as const,
				critical: true,
				desc: "프로세스 정보",
			},
			{
				pattern: /^\/sys\//,
				category: "sys" as const,
				critical: true,
				desc: "시스템 정보",
			},
		];

		for (const { pattern, category, critical, desc } of fhsMap) {
			if (pattern.test(absolutePath)) {
				return { category, isSystemCritical: critical, description: desc };
			}
		}

		if (absolutePath === "/") {
			return {
				category: "root",
				isSystemCritical: true,
				description: "루트 디렉토리",
			};
		}

		return {
			category: "other",
			isSystemCritical: false,
			description: "기타 경로",
		};
	}

	/**
	 * 권한 기반 분석 (개념적 구현)
	 */
	static analyzePermissions(pathInfo: PathInfo): {
		likelyOwner: "root" | "user" | "group" | "unknown";
		likelyPermissions: string;
		securityLevel: "high" | "medium" | "low";
	} {
		const absolutePath = pathInfo.absolute;

		// 시스템 디렉토리
		if (
			absolutePath.startsWith("/etc/") ||
			absolutePath.startsWith("/bin/") ||
			absolutePath.startsWith("/lib/")
		) {
			return {
				likelyOwner: "root",
				likelyPermissions: "644",
				securityLevel: "high",
			};
		}

		// 사용자 홈
		if (
			absolutePath.startsWith("/home/") ||
			absolutePath.startsWith(homedir())
		) {
			return {
				likelyOwner: "user",
				likelyPermissions: "755",
				securityLevel: "low",
			};
		}

		// 임시 디렉토리
		if (absolutePath.startsWith("/tmp/")) {
			return {
				likelyOwner: "user",
				likelyPermissions: "777",
				securityLevel: "low",
			};
		}

		// 로그 디렉토리
		if (absolutePath.startsWith("/var/log/")) {
			return {
				likelyOwner: "root",
				likelyPermissions: "644",
				securityLevel: "medium",
			};
		}

		return {
			likelyOwner: "unknown",
			likelyPermissions: "644",
			securityLevel: "medium",
		};
	}
}

// =================================================================
// 통합 크로스 플랫폼 유틸리티
// =================================================================

export class CrossPlatformPathUtils {
	/**
	 * 플랫폼별 경로 정규화
	 */
	static normalizePath(
		inputPath: string,
		targetPlatform?: NodeJS.Platform,
	): string {
		const platform = targetPlatform || process.platform;

		switch (platform) {
			case "win32":
				return WindowsPathUtils.expandVariables(inputPath);
			case "darwin":
				return MacOSPathUtils.expandTildePath(inputPath);
			case "linux":
			default:
				return inputPath; // Linux는 이미 POSIX 표준
		}
	}

	/**
	 * 플랫폼별 특별 경로 생성
	 */
	static createPlatformPaths(): Record<string, string[]> {
		const platform = process.platform;

		const commonPaths = [
			"./README.md",
			"./src/index.ts",
			"../external/lib.js",
			"/tmp/temp.log",
		];

		switch (platform) {
			case "win32":
				return {
					common: commonPaths,
					specific: [
						"C:\\Windows\\System32\\notepad.exe",
						"%USERPROFILE%\\Documents\\file.txt",
						"%PROGRAMFILES%\\App\\bin\\tool.exe",
						"\\\\server\\share\\data.xml",
					],
				};

			case "darwin":
				return {
					common: commonPaths,
					specific: [
						"/Applications/Xcode.app/Contents/MacOS/Xcode",
						"~/Library/Application Support/App/data.json",
						"/System/Library/Frameworks/Foundation.framework",
						"/Volumes/ExternalDrive/backup.zip",
					],
				};

			case "linux":
			default:
				return {
					common: commonPaths,
					specific: [
						"/usr/bin/node",
						"/etc/nginx/nginx.conf",
						"/home/user/.bashrc",
						"/opt/applications/service",
					],
				};
		}
	}

	/**
	 * 플랫폼별 PathInfo 확장 분석
	 */
	static analyzeExtended(pathInfo: PathInfo): any {
		const platform = process.platform;

		const baseAnalysis = {
			platform,
			pathInfo,
			timestamp: new Date().toISOString(),
		};

		switch (platform) {
			case "win32":
				return {
					...baseAnalysis,
					windows: {
						drive: WindowsPathUtils.analyzeDrive(pathInfo),
						unc: pathInfo.absolute.startsWith("\\\\")
							? WindowsPathUtils.handleUNCPath(pathInfo.absolute)
							: null,
					},
				};

			case "darwin":
				return {
					...baseAnalysis,
					macos: {
						appBundle: MacOSPathUtils.analyzeAppBundle(pathInfo),
						systemPath: MacOSPathUtils.classifySystemPath(pathInfo),
					},
				};

			case "linux":
			default:
				return {
					...baseAnalysis,
					linux: {
						fhs: LinuxPathUtils.classifyFHSPath(pathInfo),
						permissions: LinuxPathUtils.analyzePermissions(pathInfo),
					},
				};
		}
	}
}

// =================================================================
// 사용 예제
// =================================================================

export async function demonstrateCrossPlatformPaths() {
	console.log("🌍 Cross-Platform Path Handling Examples\n");

	// 1. 플랫폼별 경로 생성
	const platformPaths = CrossPlatformPathUtils.createPlatformPaths();

	console.log("📁 Platform-specific paths:");
	console.log(`Platform: ${process.platform}`);
	console.log("Common paths:", platformPaths.common);
	console.log("Platform-specific:", platformPaths.specific);
	console.log("");

	// 2. 모든 경로 분석
	const allPaths = [...platformPaths.common, ...platformPaths.specific];
	const pathInfos = createBatchPathInfo(allPaths);

	console.log("🔍 Extended analysis:");
	pathInfos.forEach((pathInfo, i) => {
		const extended = CrossPlatformPathUtils.analyzeExtended(pathInfo);
		console.log(`${i + 1}. ${pathInfo.input}`);
		console.log(`   → ${pathInfo.relative}`);

		// 플랫폼별 추가 정보 표시
		if (extended.windows) {
			console.log(
				`   Windows: Drive ${extended.windows.drive.drive}, Type: ${extended.windows.drive.driveType}`,
			);
		}
		if (extended.macos) {
			console.log(`   macOS: ${extended.macos.systemPath.description}`);
			if (extended.macos.appBundle.isAppBundle) {
				console.log(`   App Bundle: ${extended.macos.appBundle.appName}`);
			}
		}
		if (extended.linux) {
			console.log(
				`   Linux: ${extended.linux.fhs.description} (${extended.linux.fhs.category})`,
			);
		}
		console.log("");
	});

	// 3. 플랫폼별 정규화 테스트
	console.log("🔄 Path normalization examples:");
	const testPaths = [
		"~/documents/file.txt",
		"%USERPROFILE%\\file.txt",
		"./local/file.txt",
	];

	testPaths.forEach((testPath) => {
		const normalized = CrossPlatformPathUtils.normalizePath(testPath);
		if (normalized !== testPath) {
			console.log(`   "${testPath}" → "${normalized}"`);
		}
	});

	console.log("\n✅ Cross-platform path handling demonstration complete!");
}

// 모듈로 실행될 때 데모 실행
if (require.main === module) {
	demonstrateCrossPlatformPaths().catch(console.error);
}
