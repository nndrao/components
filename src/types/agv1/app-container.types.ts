/**
 * AppContainer Types - Core Application Container Architecture
 */

import type { ComponentProfile } from './profile.types';
import type { DataSourceConfig } from './datasource.types';

export interface ComponentInstance {
  instanceId: string;
  componentType: 'datatable' | 'chart' | 'form' | 'custom';
  title: string;
  datasourceId?: string;
  activeProfileId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastModified: Date;
}

export interface AppContainerState {
  // Component Management
  components: Map<string, ComponentInstance>;
  componentRefs: Map<string, any>; // instanceId -> component ref
  
  // DataSource Management
  datasources: Map<string, DataSourceConfig>;
  activeDatasources: Map<string, any>; // datasourceId -> active connection
  
  // Profile Management (delegated to ProfileService)
  profiles: Map<string, ComponentProfile[]>; // componentInstanceId -> profiles
  
  // Layout State
  layoutConfig: any; // Dockview layout configuration
  
  // Global Settings
  theme: 'light' | 'dark' | 'system';
  locale: string;
}

export interface AppContainerOperations {
  // Component Operations
  createComponent(type: ComponentInstance['componentType'], config?: Partial<ComponentInstance>): string;
  destroyComponent(instanceId: string): void;
  getComponent(instanceId: string): ComponentInstance | undefined;
  getAllComponents(): ComponentInstance[];
  updateComponent(instanceId: string, updates: Partial<ComponentInstance>): void;
  
  // DataSource Operations
  createDatasource(config: DataSourceConfig): string;
  updateDatasource(id: string, updates: Partial<DataSourceConfig>): void;
  deleteDatasource(id: string): void;
  getDatasource(id: string): DataSourceConfig | undefined;
  getAllDatasources(): DataSourceConfig[];
  activateDatasource(id: string): Promise<void>;
  deactivateDatasource(id: string): Promise<void>;
  
  // Profile Operations (delegated to ProfileService)
  saveComponentProfile(instanceId: string, profileName: string): void;
  loadComponentProfile(instanceId: string, profileId: string): void;
  getComponentProfiles(instanceId: string): ComponentProfile[];
  
  // Layout Operations
  saveLayout(name?: string): void;
  loadLayout(name?: string): void;
  resetLayout(): void;
  
  // Global Operations
  exportWorkspace(): string;
  importWorkspace(data: string): void;
  resetWorkspace(): void;
  saveWorkspace(): Promise<void>;
}

export interface IAppContainer extends AppContainerOperations {
  // State access
  getState(): AppContainerState;
  
  // Component ref management
  registerComponentRef(instanceId: string, ref: any): void;
  unregisterComponentRef(instanceId: string): void;
  getComponentRef(instanceId: string): any;
  
  // Event emitter for state changes
  on(event: AppContainerEvent, handler: (data: any) => void): void;
  off(event: AppContainerEvent, handler: (data: any) => void): void;
}

export type AppContainerEvent = 
  | 'component:created'
  | 'component:destroyed'
  | 'component:updated'
  | 'datasource:created'
  | 'datasource:updated'
  | 'datasource:deleted'
  | 'datasource:activated'
  | 'datasource:deactivated'
  | 'profile:saved'
  | 'profile:loaded'
  | 'layout:changed'
  | 'workspace:imported'
  | 'workspace:reset';

export interface AppContainerConfig {
  defaultLayout?: any;
  maxComponents?: number;
  autoSaveInterval?: number;
  enablePersistence?: boolean;
  storageAdapter?: 'local' | 'remote';
}