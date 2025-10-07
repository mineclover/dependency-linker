"use strict";
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (
					!desc ||
					("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
				) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, "default", { enumerable: true, value: v });
			}
		: function (o, v) {
				o["default"] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o)
						if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== "default") __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const TEST_DB_PATH = "test-dependency-linker.db";
const TEST_PROJECT_ROOT = path.join(__dirname, "../fixtures/test-project");
(0, globals_1.describe)("실제 작동하는 CLI 명령어 테스트", () => {
	(0, globals_1.beforeAll)(async () => {
		if (!fs.existsSync(TEST_PROJECT_ROOT)) {
			fs.mkdirSync(TEST_PROJECT_ROOT, { recursive: true });
		}
	});
	(0, globals_1.afterAll)(async () => {
		if (fs.existsSync(TEST_DB_PATH)) {
			fs.unlinkSync(TEST_DB_PATH);
		}
		if (fs.existsSync(TEST_PROJECT_ROOT)) {
			fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
		}
	});
	(0, globals_1.describe)("analyze 명령어", () => {
		(0, globals_1.it)(
			"TypeScript 파일 분석이 정상적으로 작동해야 함",
			async () => {
				const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
				const testContent = `
/**
 * User Service
 * @semantic-tags: service-layer, auth-domain, public-api
 */
export class UserService {
  async authenticateUser(email: string, password: string): Promise<User | null> {
    return null;
  }
}
`;
				fs.writeFileSync(testFile, testContent);
				const { stdout, stderr } = await execAsync(
					`npm run cli -- analyze --pattern "${testFile}"`,
				);
				(0, globals_1.expect)(stdout).toContain("Analysis completed");
			},
			30000,
		);
	});
	(0, globals_1.describe)("rdf 명령어", () => {
		(0, globals_1.it)(
			"RDF 주소 생성이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("RDF 주소 생성:");
			},
			30000,
		);
		(0, globals_1.it)(
			"RDF 주소 검색이 정상적으로 작동해야 함",
			async () => {
				await execAsync(
					`npm run cli -- rdf --create --project "test-project" --file "src/UserService.ts" --type "class" --symbol "UserService"`,
				);
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf --query "UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("UserService");
			},
			30000,
		);
	});
	(0, globals_1.describe)("rdf-file 명령어", () => {
		(0, globals_1.it)(
			"파일 위치 정보 반환이 정상적으로 작동해야 함",
			async () => {
				const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
				const testContent = `export class UserService {}`;
				fs.writeFileSync(testFile, testContent);
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf-file --location "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("RDF 주소:");
				(0, globals_1.expect)(stdout).toContain("파일 경로:");
			},
			30000,
		);
		(0, globals_1.it)(
			"파일 경로 반환이 정상적으로 작동해야 함",
			async () => {
				const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
				const testContent = `export class UserService {}`;
				fs.writeFileSync(testFile, testContent);
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf-file --path "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("파일 경로:");
			},
			30000,
		);
		(0, globals_1.it)(
			"파일 존재 여부 확인이 정상적으로 작동해야 함",
			async () => {
				const testFile = path.join(TEST_PROJECT_ROOT, "UserService.ts");
				const testContent = `export class UserService {}`;
				fs.writeFileSync(testFile, testContent);
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf-file --exists "test-project/${path.relative(process.cwd(), testFile)}#class:UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("파일 존재 여부:");
			},
			30000,
		);
		(0, globals_1.it)(
			"RDF 주소 유효성 검증이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf-file --validate "test-project/src/UserService.ts#class:UserService"`,
				);
				(0, globals_1.expect)(stdout).toContain("RDF 주소 유효성:");
			},
			30000,
		);
	});
	(0, globals_1.describe)("CLI 도움말 명령어", () => {
		(0, globals_1.it)(
			"메인 도움말이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(`npm run cli -- --help`);
				(0, globals_1.expect)(stdout).toContain(
					"Advanced dependency analysis tool",
				);
				(0, globals_1.expect)(stdout).toContain("Commands:");
			},
			10000,
		);
		(0, globals_1.it)(
			"analyze 도움말이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(
					`npm run cli -- analyze --help`,
				);
				(0, globals_1.expect)(stdout).toContain(
					"Analyze files for dependencies",
				);
				(0, globals_1.expect)(stdout).toContain("Options:");
			},
			10000,
		);
		(0, globals_1.it)(
			"rdf 도움말이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(`npm run cli -- rdf --help`);
				(0, globals_1.expect)(stdout).toContain("RDF operations");
				(0, globals_1.expect)(stdout).toContain("Options:");
			},
			10000,
		);
		(0, globals_1.it)(
			"rdf-file 도움말이 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(
					`npm run cli -- rdf-file --help`,
				);
				(0, globals_1.expect)(stdout).toContain(
					"RDF 주소 기반 파일 위치 반환 및 파일 열기",
				);
				(0, globals_1.expect)(stdout).toContain("Options:");
			},
			10000,
		);
	});
	(0, globals_1.describe)("CLI 버전 명령어", () => {
		(0, globals_1.it)(
			"버전 정보가 정상적으로 작동해야 함",
			async () => {
				const { stdout, stderr } = await execAsync(`npm run cli -- --version`);
				(0, globals_1.expect)(stdout).toContain("2.1.0");
			},
			10000,
		);
	});
});
//# sourceMappingURL=cli-working-commands.test.js.map
