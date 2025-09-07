
/**
 * Helper utilities for testing
 */

export class TestHelper {
  static generateId() {
    return 'helper-' + Date.now();
  }
  
  static formatMessage(msg) {
    return `[HELPER] ${msg}`;
  }
}
