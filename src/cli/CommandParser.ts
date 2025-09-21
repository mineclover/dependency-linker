/**
 * Command Line Parser
 * Parses command line arguments for the analyze-file CLI
 */

import type { OutputFormat } from "../models/FileAnalysisRequest";

export interface CliOptions {
	file?: string;
	format: OutputFormat;
	includeSources: boolean;
	parseTimeout: number;
	useIntegrated: boolean;
	optimizeOutput: boolean;
	preset?: string;
	detailLevel?: "minimal" | "standard" | "comprehensive";
	optimizationMode?: "speed" | "balanced" | "accuracy";
	enabledViews?: string[];
	maxStringLength?: number;
	maxArrayLength?: number;
	maxDepth?: number;
	help: boolean;
	version: boolean;
}

export interface CliError {
	message: string;
	exitCode: number;
}

export class CommandParser {
	private defaultOptions: CliOptions = {
		format: "json",
		includeSources: false,
		parseTimeout: 5000,
		useIntegrated: false,
		optimizeOutput: false,
		help: false,
		version: false,
	};

	private readonly validFormats: OutputFormat[] = [
		"json",
		"text",
		"compact",
		"summary",
		"csv",
		"deps-only",
		"table",
		"tree",
		"minimal",
		"report",
	];

	/**
	 * Parses command line arguments
	 * @param args Command line arguments (typically process.argv.slice(2))
	 * @returns Parsed options or error
	 */
	parse(args: string[]): { options?: CliOptions; error?: CliError } {
		const options: CliOptions = { ...this.defaultOptions };

		try {
			for (let i = 0; i < args.length; i++) {
				const arg = args[i];

				switch (arg) {
					case "--file":
					case "-f":
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --file requires a value",
									exitCode: 1,
								},
							};
						}
						options.file = args[++i];
						break;

					case "--format": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --format requires a value",
									exitCode: 1,
								},
							};
						}
						const format = args[++i] as OutputFormat;
						if (!this.validFormats.includes(format)) {
							return {
								error: {
									message: `Format must be one of: ${this.validFormats.join(", ")}`,
									exitCode: 1,
								},
							};
						}
						options.format = format;
						break;
					}

					case "--include-sources":
						options.includeSources = true;
						break;

					case "--use-integrated":
						options.useIntegrated = true;
						break;

					case "--optimize-output":
						options.optimizeOutput = true;
						break;

					case "--preset": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --preset requires a value",
									exitCode: 1,
								},
							};
						}
						options.preset = args[++i];
						break;
					}

					case "--detail-level": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --detail-level requires a value",
									exitCode: 1,
								},
							};
						}
						const level = args[++i] as "minimal" | "standard" | "comprehensive";
						if (!["minimal", "standard", "comprehensive"].includes(level)) {
							return {
								error: {
									message:
										"Detail level must be one of: minimal, standard, comprehensive",
									exitCode: 1,
								},
							};
						}
						options.detailLevel = level;
						break;
					}

					case "--optimization-mode": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --optimization-mode requires a value",
									exitCode: 1,
								},
							};
						}
						const mode = args[++i] as "speed" | "balanced" | "accuracy";
						if (!["speed", "balanced", "accuracy"].includes(mode)) {
							return {
								error: {
									message:
										"Optimization mode must be one of: speed, balanced, accuracy",
									exitCode: 1,
								},
							};
						}
						options.optimizationMode = mode;
						break;
					}

					case "--enabled-views": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --enabled-views requires a value",
									exitCode: 1,
								},
							};
						}
						const views = args[++i].split(",").map((v) => v.trim());
						const validViews = ["summary", "table", "tree", "csv", "minimal"];
						for (const view of views) {
							if (!validViews.includes(view)) {
								return {
									error: {
										message: `Invalid view: ${view}. Valid views: ${validViews.join(", ")}`,
										exitCode: 1,
									},
								};
							}
						}
						options.enabledViews = views;
						break;
					}

					case "--max-string-length": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --max-string-length requires a value",
									exitCode: 1,
								},
							};
						}
						const length = parseInt(args[++i], 10);
						if (Number.isNaN(length) || length <= 0) {
							return {
								error: {
									message: "Max string length must be a positive number",
									exitCode: 1,
								},
							};
						}
						options.maxStringLength = length;
						break;
					}

					case "--max-array-length": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --max-array-length requires a value",
									exitCode: 1,
								},
							};
						}
						const length = parseInt(args[++i], 10);
						if (Number.isNaN(length) || length <= 0) {
							return {
								error: {
									message: "Max array length must be a positive number",
									exitCode: 1,
								},
							};
						}
						options.maxArrayLength = length;
						break;
					}

					case "--max-depth": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --max-depth requires a value",
									exitCode: 1,
								},
							};
						}
						const depth = parseInt(args[++i], 10);
						if (Number.isNaN(depth) || depth <= 0) {
							return {
								error: {
									message: "Max depth must be a positive number",
									exitCode: 1,
								},
							};
						}
						options.maxDepth = depth;
						break;
					}

					case "--parse-timeout": {
						if (i + 1 >= args.length) {
							return {
								error: {
									message: "Option --parse-timeout requires a value",
									exitCode: 1,
								},
							};
						}
						const timeout = parseInt(args[++i], 10);
						if (Number.isNaN(timeout) || timeout <= 0) {
							return {
								error: {
									message: "Parse timeout must be a positive number",
									exitCode: 1,
								},
							};
						}
						options.parseTimeout = timeout;
						break;
					}

					case "--help":
					case "-h":
						options.help = true;
						break;

					case "--version":
					case "-v":
						options.version = true;
						break;

					default:
						if (arg.startsWith("-")) {
							return {
								error: {
									message: `Unknown option: ${arg}`,
									exitCode: 1,
								},
							};
						}
						// If it doesn't start with -, treat it as a file argument
						if (!options.file) {
							options.file = arg;
						} else {
							return {
								error: {
									message: `Unexpected argument: ${arg}`,
									exitCode: 1,
								},
							};
						}
						break;
				}
			}

			// Validate required options
			if (!options.help && !options.version && !options.file) {
				return {
					error: {
						message:
							"File path is required. Use --file <path> or provide file as argument.",
						exitCode: 1,
					},
				};
			}

			return { options };
		} catch (error) {
			return {
				error: {
					message: `Failed to parse arguments: ${error instanceof Error ? error.message : String(error)}`,
					exitCode: 1,
				},
			};
		}
	}

	/**
	 * Generates help text for the CLI
	 * @returns Help text string
	 */
	getHelpText(): string {
		return `
TypeScript File Analyzer

USAGE:
  analyze-file [OPTIONS] <file>
  analyze-file --file <file> [OPTIONS]

ARGUMENTS:
  <file>                    File to analyze (.ts, .tsx, .js, .jsx, .go, .java)

OPTIONS:
  -f, --file <path>         File to analyze
      --format <format>     Output format: json, text, compact, summary, csv, deps-only, table, tree, minimal, report (default: json)
      --include-sources     Include source location information
      --use-integrated      Use enhanced integrated analysis (recommended)
      --optimize-output     Optimize output for better performance
      --parse-timeout <ms>  Maximum parsing time in milliseconds (default: 5000)
  -h, --help               Show this help message
  -v, --version            Show version information

CONFIGURATION OPTIONS (for --use-integrated):
      --preset <name>              Use predefined configuration preset: fast, balanced, comprehensive, lightweight, debug
      --detail-level <level>       Analysis detail level: minimal, standard, comprehensive (default: standard)
      --optimization-mode <mode>   Processing mode: speed, balanced, accuracy (default: balanced)
      --enabled-views <views>      Comma-separated list of views: summary,table,tree,csv,minimal
      --max-string-length <num>    Maximum string length in output (default: 1000)
      --max-array-length <num>     Maximum array length in output (default: 100)
      --max-depth <num>            Maximum nesting depth in output (default: 10)

EXAMPLES:
  analyze-file src/component.tsx
  analyze-file --file src/utils.ts --format text
  analyze-file --file src/api.ts --include-sources --format json
  analyze-file --file src/components.tsx --format summary --use-integrated
  analyze-file --file src/index.ts --format csv --optimize-output
  analyze-file --file src/types.ts --format deps-only
  analyze-file src/large-file.ts --parse-timeout 10000
  analyze-file --file main.go --format tree --use-integrated
  analyze-file --file App.java --format minimal --optimize-output

CONFIGURATION EXAMPLES:
  analyze-file --file src/app.ts --use-integrated --preset fast
  analyze-file --file src/app.ts --use-integrated --detail-level comprehensive --optimization-mode accuracy
  analyze-file --file src/app.ts --use-integrated --enabled-views summary,table --max-string-length 500
  analyze-file --file src/app.ts --use-integrated --preset debug --max-depth 20

OUTPUT FORMATS:
  json        - Full JSON output with all details (default)
  text        - Human-readable detailed format
  compact     - Minified JSON without formatting
  summary     - Single line summary with key metrics
  csv         - CSV format for spreadsheet analysis
  deps-only   - Dependencies only (external packages)
  table       - Formatted table view of dependencies
  tree        - Tree structure visualization
  minimal     - Compact one-line format for batch processing
  report      - Comprehensive analysis report with recommendations

ENHANCED FEATURES:
  --use-integrated        Enables advanced analysis with insights and recommendations
  --optimize-output       Reduces output size for better performance with large files
`.trim();
	}

	/**
	 * Gets version information
	 * @returns Version string
	 */
	getVersionText(): string {
		return "tree-sitter-analyzer v1.0.0";
	}

	/**
	 * Validates parsed options for consistency
	 * @param options Parsed options to validate
	 * @returns Validation result
	 */
	validateOptions(options: CliOptions): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (options.file) {
			if (
				typeof options.file !== "string" ||
				options.file.trim().length === 0
			) {
				errors.push("File path cannot be empty");
			} else if (
				!options.file.endsWith(".ts") &&
				!options.file.endsWith(".tsx")
			) {
				errors.push("File must have .ts or .tsx extension");
			}
		}

		if (options.parseTimeout <= 0 || options.parseTimeout > 60000) {
			errors.push("Parse timeout must be between 1 and 60000 milliseconds");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Converts CLI options to FileAnalysisRequest options
	 * @param cliOptions CLI options
	 * @returns Analysis options
	 */
	toAnalysisOptions(cliOptions: CliOptions): {
		format: OutputFormat;
		includeSources: boolean;
		parseTimeout: number;
	} {
		return {
			format: cliOptions.format,
			includeSources: cliOptions.includeSources,
			parseTimeout: cliOptions.parseTimeout,
		};
	}

	/**
	 * Creates a formatted error message for CLI errors
	 * @param error CLI error
	 * @returns Formatted error message
	 */
	formatError(error: CliError): string {
		return `Error: ${error.message}\n\nUse --help for usage information.`;
	}

	/**
	 * Parses environment variables for default options
	 * @returns Partial CLI options from environment
	 */
	parseEnvironment(): Partial<CliOptions> {
		const env = process.env;
		const envOptions: Partial<CliOptions> = {};

		if (
			env.ANALYZE_FORMAT &&
			this.validFormats.includes(env.ANALYZE_FORMAT as OutputFormat)
		) {
			envOptions.format = env.ANALYZE_FORMAT as OutputFormat;
		}

		if (env.ANALYZE_INCLUDE_SOURCES === "true") {
			envOptions.includeSources = true;
		}

		if (env.ANALYZE_TIMEOUT) {
			const timeout = parseInt(env.ANALYZE_TIMEOUT, 10);
			if (!Number.isNaN(timeout) && timeout > 0 && timeout <= 60000) {
				envOptions.parseTimeout = timeout;
			}
		}

		return envOptions;
	}

	/**
	 * Merges environment options with CLI options
	 * @param cliOptions CLI options
	 * @returns Merged options with environment defaults
	 */
	mergeWithEnvironment(cliOptions: CliOptions): CliOptions {
		const envOptions = this.parseEnvironment();

		return {
			...this.defaultOptions,
			...envOptions,
			...cliOptions,
		};
	}
}
