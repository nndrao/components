/**
 * Central export file for all AGV1 types
 * 
 * This file re-exports all types from the agv1 subdirectory,
 * providing a single import point for the entire application.
 */

// Component interfaces
export * from './agv1/component.interfaces';

// Storage interfaces (excluding ComponentState to avoid conflict)
export type {
  User,
  SharedUser,
  PublicAccessConfig,
  Version,
  Permissions,
  Settings,
  Metadata,
  Sharing,
  ComponentConfig,
  ProfileConfig,
  IStorageAdapter,
  SearchCriteria,
  SyncStatus,
  ConflictResolution,
  HybridStorageConfig,
  StorageEventType,
  StorageEvent,
  StorageEventListener,
  IndexedDBSchema,
  MongoDBConfig,
  // Note: ComponentState is exported from component.interfaces to avoid naming conflict
} from './agv1/storage.interfaces';

// Service interfaces
export * from './agv1/service.interfaces';

// Common types
export * from './agv1/common.types';

// Data source types
export * from './agv1/datasource.types';

// Type guards and utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys];