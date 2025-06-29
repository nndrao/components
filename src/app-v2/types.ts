/**
 * Clean type definitions for the v2 architecture
 * No complex hierarchies, just simple types
 */

import { ColDef, ColumnState, FilterModel } from 'ag-grid-community';
import { ComponentType } from './services/config/config.types';

export { ComponentType };

export interface DataTableConfig {
  columns?: ColDef[];
  datasourceUrl?: string;
  dataSourceId?: string;
  columnState?: ColumnState[];
  filterModel?: FilterModel;
}

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  title: string;
  // Component-specific configuration
  config: DataTableConfig;
}

export interface ProfileConfig {
  columnState?: ColumnState[];
  filterModel?: FilterModel;
  // Add more component-specific state as needed
}

export interface Profile {
  id: string;
  name: string;
  config: ProfileConfig;
  createdAt: number;
  updatedAt?: number;
}

export interface WorkspaceData {
  version: string;
  components: [string, ComponentConfig][];
  profiles: [string, Profile[]][];
  activeProfiles: [string, string][];
  layout: unknown; // Dockview state - using unknown since dockview types are complex
}

export interface WebSocketConfig {
  url: string;
  topic?: string;
  reconnect?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}