/**
 * Configuration Service Exports
 * 
 * Central export point for all configuration-related modules.
 */

// Types
export * from './config.types';

// Database
export { 
  initDB, 
  getDB, 
  closeDB, 
  deleteDatabase,
  dbUtils,
  DB_NAME,
  DB_VERSION,
  STORE_NAME
} from './config.db';

// Service
export { 
  ConfigServiceImpl,
  createConfigService 
} from './config.service';

// Re-export commonly used types for convenience
export type {
  Config,
  ConfigFilter,
  ConfigService,
  ConfigEvent,
  ConfigEventType,
  ConfigValidationResult
} from './config.types';