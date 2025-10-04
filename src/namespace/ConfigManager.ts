import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import type {
	CategorizedFiles,
	ConfigFile,
	NamespaceConfig,
	NamespaceList,
	NamespaceWithFiles,
} from "./types";
import { filePatternMatcher } from "./FilePatternMatcher";
import { hasScenario } from "../scenarios";

/**
 * Configuration file management for namespace-based dependency analysis
 */
export class ConfigManager {
	/**
	 * Load configuration from file
	 */
	async loadConfig(configPath: string): Promise<ConfigFile> {
		if (!existsSync(configPath)) {
			return { namespaces: {} };
		}
		const content = await readFile(configPath, "utf-8");
		return JSON.parse(content);
	}

	/**
	 * Save configuration to file
	 */
	async saveConfig(configPath: string, config: ConfigFile): Promise<void> {
		await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
	}

	/**
	 * List all available namespaces
	 */
	async listNamespaces(configPath: string): Promise<NamespaceList> {
		const config = await this.loadConfig(configPath);
		return {
			namespaces: Object.keys(config.namespaces),
			default: config.default,
		};
	}

	/**
	 * Load configuration for a specific namespace
	 */
	async loadNamespacedConfig(
		configPath: string,
		namespace: string,
	): Promise<NamespaceConfig> {
		const config = await this.loadConfig(configPath);
		if (!config.namespaces[namespace]) {
			throw new Error(`Namespace '${namespace}' not found in configuration`);
		}
		return config.namespaces[namespace];
	}

	/**
	 * Set or update namespace configuration
	 */
	async setNamespaceConfig(
		namespace: string,
		namespaceConfig: NamespaceConfig,
		configPath: string,
	): Promise<void> {
		// Validate scenarios if provided
		if (namespaceConfig.scenarios) {
			this.validateScenarios(namespaceConfig.scenarios);
		}

		const config = await this.loadConfig(configPath);
		config.namespaces[namespace] = namespaceConfig;
		await this.saveConfig(configPath, config);
	}

	/**
	 * Validate scenario IDs exist in the global registry
	 *
	 * @throws Error if any scenario ID is not found
	 */
	private validateScenarios(scenarioIds: string[]): void {
		const invalidScenarios = scenarioIds.filter((id) => !hasScenario(id));

		if (invalidScenarios.length > 0) {
			throw new Error(
				`Invalid scenario IDs: ${invalidScenarios.join(", ")}. ` +
					"Scenarios must be registered in the global registry.",
			);
		}
	}

	/**
	 * Delete a namespace
	 */
	async deleteNamespace(namespace: string, configPath: string): Promise<void> {
		const config = await this.loadConfig(configPath);
		delete config.namespaces[namespace];
		if (config.default === namespace) {
			delete config.default;
		}
		await this.saveConfig(configPath, config);
	}

	/**
	 * List files matching a namespace
	 */
	async listFiles(
		namespace: string,
		configPath: string,
		cwd: string = process.cwd(),
	): Promise<string[]> {
		const config = await this.loadNamespacedConfig(configPath, namespace);
		return filePatternMatcher.listFiles(config, cwd);
	}

	/**
	 * Get namespace with metadata and matched files
	 */
	async getNamespaceWithFiles(
		namespace: string,
		configPath: string,
		cwd: string = process.cwd(),
	): Promise<NamespaceWithFiles> {
		const config = await this.loadNamespacedConfig(configPath, namespace);
		const files = await filePatternMatcher.listFiles(config, cwd);

		return {
			namespace,
			metadata: config,
			files,
			fileCount: files.length,
		};
	}

	/**
	 * Filter files by namespace patterns
	 */
	async filterFilesByNamespace(
		files: string[],
		namespace: string,
		configPath: string,
	): Promise<string[]> {
		const config = await this.loadNamespacedConfig(configPath, namespace);
		return filePatternMatcher.filterFiles(files, config);
	}

	/**
	 * Categorize files by all namespaces
	 */
	async categorizeFilesByNamespaces(
		files: string[],
		configPath: string,
	): Promise<CategorizedFiles> {
		const configFile = await this.loadConfig(configPath);
		const result: CategorizedFiles = {};

		for (const [namespace, config] of Object.entries(configFile.namespaces)) {
			const matched = await filePatternMatcher.filterFiles(files, config);
			if (matched.length > 0) {
				result[namespace] = matched;
			}
		}

		return result;
	}
}

export const configManager = new ConfigManager();
