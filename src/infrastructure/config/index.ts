/**
 * Configuration Infrastructure - Index
 * 설정 인프라스트럭처 계층의 통합 export
 */

export { ConfigManager, loadConfig, saveConfig } from './configManager.js';

// 레거시 호환성을 위한 통합 export
export {
  ConfigManager
} from './configManager.js';