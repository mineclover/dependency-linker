#!/usr/bin/env node
/**
 * Diagnostic CLI Tool for TypeScript File Analyzer
 * Comprehensive diagnostic and debugging commands
 */

const { CLIAdapter } = require("../dist/cli/CLIAdapter");
const path = require("path");
const fs = require("fs");

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		showHelp();
		return;
	}

	const command = args[0];
	const options = parseOptions(args.slice(1));

	const adapter = new CLIAdapter();

	try {
		switch (command) {
			case "health":
				await runHealthCheck(adapter, options);
				break;

			case "diagnose":
				await runDiagnostics(adapter, options);
				break;

			case "analyze-file":
				await analyzeFile(adapter, options);
				break;

			case "benchmark":
				await runBenchmark(adapter, options);
				break;

			case "errors":
				await showErrorStatistics(adapter, options);
				break;

			case "debug-report":
				await generateDebugReport(adapter, options);
				break;

			case "clear":
				await clearDiagnosticData(adapter);
				break;

			case "debug":
				await toggleDebugMode(adapter, options);
				break;

			default:
				console.error(`Unknown command: ${command}`);
				showHelp();
				process.exit(1);
		}
	} catch (error) {
		console.error("Diagnostic tool error:", error.message);
		if (options.verbose) {
			console.error(error.stack);
		}
		process.exit(1);
	} finally {
		adapter.dispose();
	}
}

function showHelp() {
	console.log(`
TypeScript File Analyzer - Diagnostic CLI Tool

USAGE:
  npm run diagnostic <command> [options]

COMMANDS:
  health              Run system health check
  diagnose            Run comprehensive diagnostics
  analyze-file <file> Diagnose specific file analysis
  benchmark           Run performance benchmarks
  errors              Show error statistics
  debug-report        Generate debug report
  clear               Clear all diagnostic data
  debug <on|off>      Enable/disable debug mode

OPTIONS:
  --format <format>   Output format: text, json (default: text)
  --verbose           Show verbose output including stack traces
  --help              Show this help message

EXAMPLES:
  npm run diagnostic health
  npm run diagnostic diagnose --format json
  npm run diagnostic analyze-file src/index.ts
  npm run diagnostic benchmark --format text
  npm run diagnostic errors --format json
  npm run diagnostic debug on
  npm run diagnostic clear
`);
}

function parseOptions(args) {
	const options = {
		format: "text",
		verbose: false,
		file: null,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--format" && i + 1 < args.length) {
			options.format = args[i + 1];
			i++;
		} else if (arg === "--verbose") {
			options.verbose = true;
		} else if (arg === "--help") {
			showHelp();
			process.exit(0);
		} else if (!arg.startsWith("--")) {
			options.file = arg;
		}
	}

	return options;
}

async function runHealthCheck(adapter, options) {
	console.log("Running system health check...\n");
	const result = await adapter.runHealthCheck(options.format);
	console.log(result);
}

async function runDiagnostics(adapter, options) {
	console.log("Running comprehensive diagnostics...\n");
	const result = await adapter.runDiagnostics(options.format);
	console.log(result);
}

async function analyzeFile(adapter, options) {
	if (!options.file) {
		console.error("Error: File path is required for analyze-file command");
		console.error("Usage: npm run diagnostic analyze-file <file-path>");
		process.exit(1);
	}

	const filePath = path.resolve(options.file);

	if (!fs.existsSync(filePath)) {
		console.error(`Error: File not found: ${filePath}`);
		process.exit(1);
	}

	console.log(`Analyzing file: ${filePath}\n`);
	const result = await adapter.diagnoseFile(filePath, options.format);
	console.log(result);
}

async function runBenchmark(adapter, options) {
	console.log("Running performance benchmarks...\n");
	const result = await adapter.runBenchmark(options.format);
	console.log(result);
}

async function showErrorStatistics(adapter, options) {
	console.log("Retrieving error statistics...\n");
	const result = adapter.getErrorStatistics(options.format);
	console.log(result);
}

async function generateDebugReport(adapter, options) {
	console.log("Generating debug report...\n");
	const result = adapter.generateDebugReport();
	console.log(result);
}

async function clearDiagnosticData(adapter) {
	console.log("Clearing all diagnostic data...");
	adapter.clearDiagnosticData();
	console.log("Diagnostic data cleared successfully.");
}

async function toggleDebugMode(adapter, options) {
	const mode = options.file; // Reusing file option for mode parameter

	if (!mode || !["on", "off"].includes(mode.toLowerCase())) {
		console.error('Error: Debug mode must be "on" or "off"');
		console.error("Usage: npm run diagnostic debug <on|off>");
		process.exit(1);
	}

	if (mode.toLowerCase() === "on") {
		adapter.enableDebugMode();
		console.log("Debug mode enabled.");
	} else {
		adapter.disableDebugMode();
		console.log("Debug mode disabled.");
	}
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

// Run the main function
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
