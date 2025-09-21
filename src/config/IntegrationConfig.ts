/**
 * Integration Configuration Manager
 * Centralized configuration management for data integration
 */

import type { DataIntegrationConfig } from "../models/IntegratedData";
import type { OptimizationStrategy } from "../services/optimization/PerformanceOptimizer";

export interface IntegrationPreset {
	name: string;
	description: string;
	config: DataIntegrationConfig;
	optimization: OptimizationStrategy;
}

export interface IntegrationSettings {
	defaultPreset: string;
	customPresets: Record<string, IntegrationPreset>;
	globalDefaults: DataIntegrationConfig;
	performanceDefaults: OptimizationStrategy;
	outputDefaults: {
		preferredFormat: string;
		fallbackFormat: string;
		maxOutputSize: number;
		truncateStrings: boolean;
	};
}

export class IntegrationConfigManager {
	private settings: IntegrationSettings;

	constructor(customSettings?: Partial<IntegrationSettings>) {
		this.settings = {
			...this.getDefaultSettings(),
			...customSettings,
		};
	}

	/**
	 * Get predefined configuration presets
	 */
	getPresets(): Record<string, IntegrationPreset> {
		return {
			...this.getBuiltinPresets(),
			...this.settings.customPresets,
		};
	}

	/**
	 * Get configuration for a specific preset
	 */
	getPresetConfig(presetName: string): DataIntegrationConfig {
		const preset = this.getPresets()[presetName];
		if (!preset) {
			throw new Error(`Unknown preset: ${presetName}`);
		}
		return preset.config;
	}

	/**
	 * Get optimization strategy for a specific preset
	 */
	getPresetOptimization(presetName: string): OptimizationStrategy {
		const preset = this.getPresets()[presetName];
		if (!preset) {
			throw new Error(`Unknown preset: ${presetName}`);
		}
		return preset.optimization;
	}

	/**
	 * Create a custom preset
	 */
	createCustomPreset(
		name: string,
		description: string,
		config: DataIntegrationConfig,
		optimization?: OptimizationStrategy,
	): void {
		this.settings.customPresets[name] = {
			name,
			description,
			config,
			optimization: optimization || this.settings.performanceDefaults,
		};
	}

	/**
	 * Get configuration for CLI options
	 */
	getConfigForCLI(options: {
		preset?: string;
		format?: string;
		detailLevel?: "minimal" | "standard" | "comprehensive";
		optimizationMode?: "speed" | "balanced" | "accuracy";
		enabledViews?: string[];
		maxStringLength?: number;
		maxArrayLength?: number;
		maxDepth?: number;
	}): DataIntegrationConfig {
		let baseConfig: DataIntegrationConfig;

		// Start with preset or default
		if (options.preset) {
			baseConfig = this.getPresetConfig(options.preset);
		} else {
			baseConfig = this.settings.globalDefaults;
		}

		// Override with CLI options
		const config: DataIntegrationConfig = {
			...baseConfig,
			...(options.detailLevel && { detailLevel: options.detailLevel }),
			...(options.optimizationMode && {
				optimizationMode: options.optimizationMode,
			}),
			...(options.enabledViews && {
				enabledViews: options.enabledViews as any,
			}),
			sizeLimits: {
				...baseConfig.sizeLimits,
				...(options.maxStringLength && {
					maxStringLength: options.maxStringLength,
				}),
				...(options.maxArrayLength && {
					maxArrayLength: options.maxArrayLength,
				}),
				...(options.maxDepth && { maxDepth: options.maxDepth }),
			},
		};

		return config;
	}

	/**
	 * Validate configuration
	 */
	validateConfig(config: DataIntegrationConfig): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate enabled views
		if (!config.enabledViews || config.enabledViews.length === 0) {
			errors.push("At least one view must be enabled");
		}

		const validViews = ["summary", "table", "tree", "csv", "minimal"];
		for (const view of config.enabledViews) {
			if (!validViews.includes(view)) {
				errors.push(
					`Invalid view: ${view}. Valid views: ${validViews.join(", ")}`,
				);
			}
		}

		// Validate detail level
		const validDetailLevels = ["minimal", "standard", "comprehensive"];
		if (!validDetailLevels.includes(config.detailLevel)) {
			errors.push(
				`Invalid detail level: ${config.detailLevel}. Valid levels: ${validDetailLevels.join(", ")}`,
			);
		}

		// Validate optimization mode
		const validOptimizationModes = ["speed", "balanced", "accuracy"];
		if (!validOptimizationModes.includes(config.optimizationMode)) {
			errors.push(
				`Invalid optimization mode: ${config.optimizationMode}. Valid modes: ${validOptimizationModes.join(", ")}`,
			);
		}

		// Validate size limits
		if (config.sizeLimits.maxStringLength <= 0) {
			errors.push("maxStringLength must be positive");
		}
		if (config.sizeLimits.maxArrayLength <= 0) {
			errors.push("maxArrayLength must be positive");
		}
		if (config.sizeLimits.maxDepth <= 0) {
			errors.push("maxDepth must be positive");
		}

		// Performance warnings
		if (config.sizeLimits.maxStringLength > 10000) {
			warnings.push("Very large maxStringLength may impact performance");
		}
		if (config.sizeLimits.maxArrayLength > 1000) {
			warnings.push("Very large maxArrayLength may impact performance");
		}
		if (
			config.enabledViews.length > 3 &&
			config.detailLevel === "comprehensive"
		) {
			warnings.push("Many views with comprehensive detail level may be slow");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Get default settings
	 */
	private getDefaultSettings(): IntegrationSettings {
		return {
			defaultPreset: "balanced",
			customPresets: {},
			globalDefaults: {
				enabledViews: ["summary", "table", "tree", "csv", "minimal"],
				detailLevel: "standard",
				optimizationMode: "balanced",
				sizeLimits: {
					maxStringLength: 1000,
					maxArrayLength: 100,
					maxDepth: 10,
				},
			},
			performanceDefaults: {
				enableLazyLoading: true,
				enableViewCaching: true,
				enableDataCompression: false,
				enableMemoryPooling: true,
				maxConcurrency: 4,
				batchSize: 10,
			},
			outputDefaults: {
				preferredFormat: "report",
				fallbackFormat: "json",
				maxOutputSize: 1024 * 1024, // 1MB
				truncateStrings: true,
			},
		};
	}

	/**
	 * Get built-in presets
	 */
	private getBuiltinPresets(): Record<string, IntegrationPreset> {
		return {
			fast: {
				name: "fast",
				description: "Fast processing with minimal detail for quick analysis",
				config: {
					enabledViews: ["summary", "minimal"],
					detailLevel: "minimal",
					optimizationMode: "speed",
					sizeLimits: {
						maxStringLength: 500,
						maxArrayLength: 50,
						maxDepth: 5,
					},
				},
				optimization: {
					enableLazyLoading: true,
					enableViewCaching: true,
					enableDataCompression: false,
					enableMemoryPooling: false,
					maxConcurrency: 8,
					batchSize: 20,
				},
			},
			balanced: {
				name: "balanced",
				description: "Balanced performance and detail for general use",
				config: {
					enabledViews: ["summary", "table", "tree", "csv", "minimal"],
					detailLevel: "standard",
					optimizationMode: "balanced",
					sizeLimits: {
						maxStringLength: 1000,
						maxArrayLength: 100,
						maxDepth: 10,
					},
				},
				optimization: {
					enableLazyLoading: true,
					enableViewCaching: true,
					enableDataCompression: false,
					enableMemoryPooling: true,
					maxConcurrency: 4,
					batchSize: 10,
				},
			},
			comprehensive: {
				name: "comprehensive",
				description: "Maximum detail with all views for thorough analysis",
				config: {
					enabledViews: ["summary", "table", "tree", "csv", "minimal"],
					detailLevel: "comprehensive",
					optimizationMode: "accuracy",
					sizeLimits: {
						maxStringLength: 2000,
						maxArrayLength: 200,
						maxDepth: 15,
					},
				},
				optimization: {
					enableLazyLoading: false,
					enableViewCaching: false,
					enableDataCompression: false,
					enableMemoryPooling: true,
					maxConcurrency: 2,
					batchSize: 5,
				},
			},
			lightweight: {
				name: "lightweight",
				description:
					"Minimal memory usage for resource-constrained environments",
				config: {
					enabledViews: ["summary"],
					detailLevel: "minimal",
					optimizationMode: "speed",
					sizeLimits: {
						maxStringLength: 200,
						maxArrayLength: 20,
						maxDepth: 3,
					},
				},
				optimization: {
					enableLazyLoading: true,
					enableViewCaching: false,
					enableDataCompression: true,
					enableMemoryPooling: true,
					maxConcurrency: 2,
					batchSize: 5,
				},
			},
			debug: {
				name: "debug",
				description:
					"Maximum detail and all views for debugging and development",
				config: {
					enabledViews: ["summary", "table", "tree", "csv", "minimal"],
					detailLevel: "comprehensive",
					optimizationMode: "accuracy",
					sizeLimits: {
						maxStringLength: 5000,
						maxArrayLength: 500,
						maxDepth: 20,
					},
				},
				optimization: {
					enableLazyLoading: false,
					enableViewCaching: false,
					enableDataCompression: false,
					enableMemoryPooling: false,
					maxConcurrency: 1,
					batchSize: 1,
				},
			},
		};
	}

	/**
	 * Load configuration from file or environment
	 */
	static async loadFromFile(
		configPath?: string,
	): Promise<IntegrationConfigManager> {
		// Implementation for loading from file would go here
		// For now, return default configuration
		return new IntegrationConfigManager();
	}

	/**
	 * Save current configuration to file
	 */
	async saveToFile(configPath: string): Promise<void> {
		// Implementation for saving to file would go here
		console.log(`Configuration would be saved to: ${configPath}`);
	}

	/**
	 * Get current settings
	 */
	getSettings(): IntegrationSettings {
		return { ...this.settings };
	}

	/**
	 * Update settings
	 */
	updateSettings(updates: Partial<IntegrationSettings>): void {
		this.settings = { ...this.settings, ...updates };
	}
}
