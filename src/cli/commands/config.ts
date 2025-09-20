#!/usr/bin/env node

/**
 * Configuration Management CLI Command
 * Allows users to manage integration configuration presets and settings
 */

import { CLIAdapter } from "../CLIAdapter";
import { IntegrationConfigManager } from "../../config/IntegrationConfig";

interface ConfigOptions {
	action: "list" | "show" | "validate" | "create" | "delete";
	preset?: string;
	name?: string;
	description?: string;
	detailLevel?: "minimal" | "standard" | "comprehensive";
	optimizationMode?: "speed" | "balanced" | "accuracy";
	format?: "text" | "json";
	help?: boolean;
}

function parseArgs(args: string[]): ConfigOptions {
	const options: ConfigOptions = {
		action: "list",
		format: "text"
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "list":
			case "show":
			case "validate":
			case "create":
			case "delete":
				options.action = arg;
				break;
			case "--preset":
				options.preset = args[++i];
				break;
			case "--name":
				options.name = args[++i];
				break;
			case "--description":
				options.description = args[++i];
				break;
			case "--detail-level":
				options.detailLevel = args[++i] as any;
				break;
			case "--optimization-mode":
				options.optimizationMode = args[++i] as any;
				break;
			case "--format":
				options.format = args[++i] as any;
				break;
			case "--help":
			case "-h":
				options.help = true;
				break;
		}
	}

	return options;
}

function showHelp(): string {
	return `
Configuration Management Tool

USAGE:
  config <action> [OPTIONS]

ACTIONS:
  list                      List all available presets
  show --preset <name>      Show details of a specific preset
  validate --preset <name>  Validate a preset configuration
  create --name <name>      Create a custom preset (interactive)
  delete --name <name>      Delete a custom preset

OPTIONS:
  --preset <name>           Preset name to operate on
  --name <name>             Name for new custom preset
  --description <text>      Description for new preset
  --detail-level <level>    Detail level: minimal, standard, comprehensive
  --optimization-mode <mode> Optimization mode: speed, balanced, accuracy
  --format <format>         Output format: text, json (default: text)
  -h, --help               Show this help message

EXAMPLES:
  config list
  config show --preset fast
  config validate --preset comprehensive
  config create --name "my-preset" --description "Custom fast analysis"
  config list --format json

BUILT-IN PRESETS:
  fast          - Fast processing with minimal detail
  balanced      - Balanced performance and detail (default)
  comprehensive - Maximum detail with all views
  lightweight   - Minimal memory usage
  debug         - Maximum detail for debugging

`.trim();
}

async function main() {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.help) {
		console.log(showHelp());
		process.exit(0);
	}

	const configManager = new IntegrationConfigManager();
	const cliAdapter = new CLIAdapter();

	try {
		switch (options.action) {
			case "list":
				console.log(cliAdapter.listPresets(options.format));
				break;

			case "show":
				if (!options.preset) {
					console.error("Error: --preset is required for show action");
					process.exit(1);
				}
				try {
					const preset = configManager.getPresets()[options.preset];
					if (!preset) {
						console.error(`Error: Preset '${options.preset}' not found`);
						process.exit(1);
					}

					if (options.format === "json") {
						console.log(JSON.stringify(preset, null, 2));
					} else {
						console.log(`Preset: ${preset.name.toUpperCase()}`);
						console.log(`Description: ${preset.description}`);
						console.log(`Detail Level: ${preset.config.detailLevel}`);
						console.log(`Optimization Mode: ${preset.config.optimizationMode}`);
						console.log(`Enabled Views: ${preset.config.enabledViews.join(", ")}`);
						console.log(`Size Limits:`);
						console.log(`  Max String Length: ${preset.config.sizeLimits.maxStringLength}`);
						console.log(`  Max Array Length: ${preset.config.sizeLimits.maxArrayLength}`);
						console.log(`  Max Depth: ${preset.config.sizeLimits.maxDepth}`);
						console.log(`Performance:`);
						console.log(`  Max Concurrency: ${preset.optimization.maxConcurrency}`);
						console.log(`  Batch Size: ${preset.optimization.batchSize}`);
						console.log(`  Lazy Loading: ${preset.optimization.enableLazyLoading}`);
						console.log(`  View Caching: ${preset.optimization.enableViewCaching}`);
					}
				} catch (error) {
					console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
					process.exit(1);
				}
				break;

			case "validate":
				if (!options.preset) {
					console.error("Error: --preset is required for validate action");
					process.exit(1);
				}
				try {
					const config = configManager.getPresetConfig(options.preset);
					const validation = configManager.validateConfig(config);

					if (options.format === "json") {
						console.log(JSON.stringify(validation, null, 2));
					} else {
						console.log(`Validation Results for '${options.preset}':`);
						console.log(`Valid: ${validation.isValid ? "✓" : "✗"}`);

						if (validation.errors.length > 0) {
							console.log(`Errors:`);
							validation.errors.forEach(error => console.log(`  - ${error}`));
						}

						if (validation.warnings.length > 0) {
							console.log(`Warnings:`);
							validation.warnings.forEach(warning => console.log(`  - ${warning}`));
						}

						if (validation.isValid && validation.warnings.length === 0) {
							console.log("Configuration is valid with no warnings.");
						}
					}
				} catch (error) {
					console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
					process.exit(1);
				}
				break;

			case "create":
				console.log("Custom preset creation is not yet implemented.");
				console.log("You can create presets programmatically using the IntegrationConfigManager API.");
				break;

			case "delete":
				console.log("Custom preset deletion is not yet implemented.");
				console.log("Custom presets can be managed programmatically using the IntegrationConfigManager API.");
				break;

			default:
				console.error(`Error: Unknown action '${options.action}'`);
				console.log("\nUse --help for usage information.");
				process.exit(1);
		}
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch(error => {
		console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	});
}