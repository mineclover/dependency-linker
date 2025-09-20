/**
 * Global Jest teardown for test optimization
 * Ensures proper cleanup and prevents resource leaks
 */

export default async function globalTeardown(): Promise<void> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Clear any remaining timers
  const clearAllTimers = () => {
    // Clear all timers to prevent hanging
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i <= highestTimeoutId; i++) {
      clearTimeout(i);
    }
  };

  clearAllTimers();

  // Reset process listeners
  process.removeAllListeners();

  // Small delay to ensure cleanup completes
  await new Promise(resolve => setTimeout(resolve, 100));

  // Log teardown completion for diagnostics
  console.log('🧹 Test optimization global teardown completed');
}