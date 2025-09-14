#!/usr/bin/env node

/**
 * TypeScript Dependency Linker CLI
 * Main entry point for the command-line interface
 */

import { AnalysisResultUtils } from "../models/AnalysisResult";
import { CLIAdapter } from "./CLIAdapter";
import { CommandParser } from "./CommandParser";
import { BatchCommand } from "./commands/BatchCommand";
import { DiagnosticCommand } from "./commands/DiagnosticCommand";

export class TypeScriptDependencyLinkerCLI {
	private cliAdapter: CLIAdapter;
	private commandParser: CommandParser;
	private batchCommand: BatchCommand;
	private diagnosticCommand: DiagnosticCommand;

	constructor() {
		this.cliAdapter = new CLIAdapter();
		this.commandParser = new CommandParser();
		this.batchCommand = new BatchCommand();
		this.diagnosticCommand = new DiagnosticCommand();
	}

	/**
	 * Main CLI execution method
	 */
	async run(args: string[]): Promise<number> {
		try {
			// Parse command and subcommand
			const [command, ...commandArgs] = args;

			if (!command || command === "--help" || command === "-h") {
				this.showHelp();
				return 0;
			}

			if (command === "--version" || command === "-v") {
				this.showVersion();
				return 0;
			}

			// Route to appropriate command handler
			switch (command) {
				case "analyze":
					return await this.handleAnalyze(commandArgs);
				case "batch":
					return await this.handleBatch(commandArgs);
				case "health":
					return await this.handleHealth(commandArgs);
				case "benchmark":
					return await this.handleBenchmark(commandArgs);
				case "diagnose":
					return await this.handleDiagnose(commandArgs);
				case "stats":
					return await this.handleStats(commandArgs);
				default:
					console.error(`Unknown command: ${command}`);
					console.error("Use 'tsdl --help' for usage information.");
					return 1;
			}
		} catch (error) {
			console.error(
				"Fatal error:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		} finally {
			this.cliAdapter.dispose();
			this.batchCommand.dispose();
			this.diagnosticCommand.dispose();
		}
	}

	/**
	 * Handle file analysis command
	 */
	private async handleAnalyze(args: string[]): Promise<number> {
		const parseResult = this.commandParser.parse(["--file", ...args]);

		if (parseResult.error) {
			console.error(this.commandParser.formatError(parseResult.error));
			return parseResult.error.exitCode;
		}

		const options = parseResult.options!;

		if (!options.file) {
			console.error("File path is required for analyze command");
			console.error("Usage: tsdl analyze <file> [options]");
			return 1;
		}

		try {
			// Convert to CLI options
			const cliOptions = {
				file: options.file,
				format: options.format,
				includeSources: options.includeSources,
				parseTimeout: options.parseTimeout,
			};

			// Validate options
			const validation = await this.cliAdapter.validateOptions(cliOptions);
			if (!validation.isValid) {
				console.error("Validation failed:");
				validation.errors.forEach((error) => console.error(`  - ${error}`));
				return 1;
			}

			// Perform analysis
			const result = await this.cliAdapter.analyzeFile(cliOptions);

			// Output result
			const header = this.cliAdapter.getFormatHeader(options.format);
			if (header) {
				console.log(header);
			}

			const output = this.cliAdapter.formatResult(result, options.format);
			console.log(output);

			return AnalysisResultUtils.isSuccessful(result) ? 0 : 1;
		} catch (error) {
			console.error(
				"Analysis failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Handle batch analysis command
	 */
	private async handleBatch(args: string[]): Promise<number> {
		// Parse batch-specific arguments
		const parser = this.parseBatchArgs(args);
		if (parser.error) {
			console.error(`Batch error: ${parser.error}`);
			return 1;
		}

		const {
			pattern,
			format,
			outputFile,
			maxFiles,
			verbose,
			includeTests,
			excludePatterns,
		} = parser.options;

		try {
			const batchOptions = {
				pattern,
				format,
				outputFile,
				maxFiles,
				verbose: verbose || false,
				includeTests: includeTests || false,
				excludePatterns,
			};

			const result = await this.batchCommand.execute(batchOptions);

			if (result.success) {
				const output = this.batchCommand.formatResult(result, format);
				console.log(output);
				return 0;
			} else {
				console.error("Batch analysis failed:");
				result.errors.forEach((error) => {
					console.error(`  ${error.file}: ${error.error}`);
				});
				return 1;
			}
		} catch (error) {
			console.error(
				"Batch analysis failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Handle health check command
	 */
	private async handleHealth(args: string[]): Promise<number> {
		const format = this.extractFormat(args) || "text";
		const includeBenchmark = args.includes("--benchmark");
		const outputFile = this.extractOutputFile(args);

		try {
			const options = {
				format,
				includeSystem: true,
				includeBenchmark,
				outputFile,
			};

			const result = await this.diagnosticCommand.runDiagnostics(options);
			const output = this.diagnosticCommand.formatResult(result, format);
			console.log(output);
			return 0;
		} catch (error) {
			console.error(
				"Health check failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Handle benchmark command
	 */
	private async handleBenchmark(args: string[]): Promise<number> {
		const format = this.extractFormat(args) || "text";

		try {
			const benchmarkResult = await this.cliAdapter.runBenchmark(format);
			console.log(benchmarkResult);
			return 0;
		} catch (error) {
			console.error(
				"Benchmark failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Handle diagnostics command
	 */
	private async handleDiagnose(args: string[]): Promise<number> {
		const format = this.extractFormat(args) || "text";
		const file = this.extractFile(args);
		const outputFile = this.extractOutputFile(args);

		try {
			const options = {
				format,
				includeSystem: true,
				includeBenchmark: false,
				outputFile,
			};

			if (file) {
				const result = await this.diagnosticCommand.diagnoseFile(file, options);
				const output = this.diagnosticCommand.formatResult(result, format);
				console.log(output);
			} else {
				const result = await this.diagnosticCommand.runDiagnostics(options);
				const output = this.diagnosticCommand.formatResult(result, format);
				console.log(output);
			}
			return 0;
		} catch (error) {
			console.error(
				"Diagnosis failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Handle statistics command
	 */
	private async handleStats(args: string[]): Promise<number> {
		const format = this.extractFormat(args) || "text";

		try {
			const stats = this.cliAdapter.getErrorStatistics(format);
			console.log(stats);
			return 0;
		} catch (error) {
			console.error(
				"Statistics failed:",
				error instanceof Error ? error.message : String(error),
			);
			return 1;
		}
	}

	/**
	 * Parse batch command arguments
	 */
	private parseBatchArgs(args: string[]): { options?: any; error?: string } {
		const options = {
			pattern: "**/*.ts",
			format: "json",
			outputFile: undefined as string | undefined,
			maxFiles: 100,
			verbose: false,
			includeTests: false,
			excludePatterns: [] as string[],
		};

		try {
			for (let i = 0; i < args.length; i++) {
				const arg = args[i];
				switch (arg) {
					case "--pattern":
						if (i + 1 >= args.length) {
							return { error: "Option --pattern requires a value" };
						}
						options.pattern = args[++i];
						break;
					case "--format":
						if (i + 1 >= args.length) {
							return { error: "Option --format requires a value" };
						}
						options.format = args[++i];
						break;
					case "--output":
					case "-o":
						if (i + 1 >= args.length) {
							return { error: "Option --output requires a value" };
						}
						options.outputFile = args[++i];
						break;
					case "--max-files": {
						if (i + 1 >= args.length) {
							return { error: "Option --max-files requires a value" };
						}
						const maxFiles = parseInt(args[++i], 10);
						if (isNaN(maxFiles) || maxFiles <= 0) {
							return { error: "Max files must be a positive number" };
						}
						options.maxFiles = maxFiles;
						break;
					}
					case "--verbose":
					case "-v":
						options.verbose = true;
						break;
					case "--include-tests":
						options.includeTests = true;
						break;
					case "--exclude":
						if (i + 1 >= args.length) {
							return { error: "Option --exclude requires a value" };
						}
						options.excludePatterns.push(args[++i]);
						break;
					default:
						if (arg.startsWith("-")) {
							return { error: `Unknown option: ${arg}` };
						}
						break;
				}
			}
			return { options };
		} catch (error) {
			return { error: `Failed to parse arguments: ${error}` };
		}
	}

	/**
	 * Extract format from arguments
	 */
	private extractFormat(args: string[]): string | undefined {
		const formatIndex = args.indexOf("--format");
		if (formatIndex !== -1 && formatIndex + 1 < args.length) {
			return args[formatIndex + 1];
		}
		return undefined;
	}

	/**
	 * Extract file from arguments
	 */
	private extractFile(args: string[]): string | undefined {
		const fileIndex = args.indexOf("--file");
		if (fileIndex !== -1 && fileIndex + 1 < args.length) {
			return args[fileIndex + 1];
		}
		// Also check for positional file argument
		const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));
		return nonOptionArgs.length > 0 ? nonOptionArgs[0] : undefined;
	}

	/**
	 * Extract output file from arguments
	 */
	private extractOutputFile(args: string[]): string | undefined {
		const outputIndex = args.indexOf("--output");
		if (outputIndex !== -1 && outputIndex + 1 < args.length) {
			return args[outputIndex + 1];
		}
		const oIndex = args.indexOf("-o");
		if (oIndex !== -1 && oIndex + 1 < args.length) {
			return args[oIndex + 1];
		}
		return undefined;
	}

	/**
	 * Show help information
	 */
	private showHelp(): void {
		console.log(`
TypeScript Dependency Linker CLI

USAGE:
  tsdl <command> [options]

COMMANDS:
  analyze <file>    Analyze a single TypeScript file
  batch             Run batch analysis on multiple files
  health            Check system health and configuration
  benchmark         Run performance benchmarks
  diagnose [file]   Run diagnostics (optionally for a specific file)
  stats             Show error statistics

GLOBAL OPTIONS:
  -h, --help        Show this help message
  -v, --version     Show version information

ANALYZE OPTIONS:
  --format <fmt>    Output format: json, text, compact, summary, table, csv, deps-only
  --include-sources Include source location information
  --parse-timeout   Maximum parsing time in milliseconds

BATCH OPTIONS:
  --pattern <glob>  File pattern to match (default: **/*.ts)
  --format <fmt>    Output format (default: json)
  --output <file>   Output file (optional)
  --max-files <n>   Maximum number of files to process

EXAMPLES:
  tsdl analyze src/component.tsx --format text
  tsdl batch --pattern "src/**/*.ts" --format csv --output results.csv
  tsdl health --format json
  tsdl benchmark
  tsdl diagnose src/problematic-file.ts
  tsdl stats --format json

For detailed help on a specific command, use:
  tsdl <command> --help
`);
	}

	/**
	 * Show version information
	 */
	private showVersion(): void {
		const packageJson = require("../../package.json");
		console.log(`TypeScript Dependency Linker v${packageJson.version}`);
	}
}

// Main execution when called directly
if (require.main === module) {
	const cli = new TypeScriptDependencyLinkerCLI();
	cli
		.run(process.argv.slice(2))
		.then((exitCode) => {
			process.exit(exitCode);
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}

export default TypeScriptDependencyLinkerCLI;
