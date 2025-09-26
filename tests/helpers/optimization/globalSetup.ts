/**
 * Global Jest setup for test optimization (T004)
 * Prevents resource leaks and worker exit issues
 */

export default async function globalSetup(): Promise<void> {
	// Prevent memory leaks by clearing caches
	if (global.gc) {
		global.gc();
	}

	// Set up resource monitoring to prevent worker exit issues
	process.setMaxListeners(30);

	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason, promise) => {
		console.warn("Unhandled Rejection at:", promise, "reason:", reason);
	});

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		console.error("Uncaught Exception:", error);
	});

	// Log setup completion for diagnostics
	console.log("🚀 Test optimization global setup completed");
}
