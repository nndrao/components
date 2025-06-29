/**
 * Workspace Manager
 * 
 * Handles comprehensive workspace persistence including:
 * - Component configurations
 * - Data source configurations
 * - Profiles and layouts
 */

import { useAppStore } from '../store';
import { useConfigStore } from '../stores/config.store';
import { DataSourceConfig } from '../components/datasource/types';
import { WorkspaceData } from '../types';

export interface ExtendedWorkspaceData extends WorkspaceData {
  dataSources?: DataSourceConfig[];
}

export class WorkspaceManager {
  /**
   * Save complete workspace including data sources
   */
  static async saveWorkspace(): Promise<ExtendedWorkspaceData> {
    // Get base workspace data
    const workspaceData = useAppStore.getState().saveWorkspace();
    
    // Get all data source configurations
    const configStore = useConfigStore.getState();
    const dataSourceConfigs = configStore.getConfigsByType('DataSource');
    
    // Extract DataSourceConfig from Config wrapper
    const dataSources = dataSourceConfigs.map(config => config.settings as DataSourceConfig);
    
    // Combine into extended workspace
    const extendedWorkspace: ExtendedWorkspaceData = {
      ...workspaceData,
      dataSources
    };
    
    return extendedWorkspace;
  }
  
  /**
   * Load complete workspace including data sources
   */
  static async loadWorkspace(data: ExtendedWorkspaceData): Promise<void> {
    console.log('[WorkspaceManager] Loading workspace with:', {
      components: data.components?.length || 0,
      profiles: data.profiles?.length || 0,
      dataSources: data.dataSources?.length || 0
    });
    
    const configStore = useConfigStore.getState();
    
    // Ensure config store is initialized
    if (!configStore.initialized) {
      console.log('[WorkspaceManager] Initializing config store...');
      await configStore.initialize();
    }
    
    // Clear existing data sources
    const existingDataSources = configStore.getConfigsByType('DataSource');
    if (existingDataSources.length > 0) {
      await configStore.deleteMany(existingDataSources.map(ds => ds.configId));
    }
    
    // Load base workspace data
    console.log('[WorkspaceManager] Loading base workspace data...');
    useAppStore.getState().loadWorkspace(data);
    
    // Load data sources if present
    if (data.dataSources && data.dataSources.length > 0) {
      console.log('[WorkspaceManager] Loading data sources...');
      const configs = data.dataSources.map(ds => ({
        configId: ds.id,
        appId: 'app',
        userId: 'current-user',
        componentType: 'DataSource',
        name: ds.displayName || ds.name || 'Unnamed Data Source',
        settings: ds,
        createdBy: 'current-user',
        creationTime: ds.createdAt || Date.now(),
        updatedBy: 'current-user',
        lastUpdated: ds.updatedAt || Date.now(),
      }));
      
      await configStore.saveMany(configs);
      
      // Trigger reload in DataSourceContext if it exists
      // Try multiple times to ensure the context is ready
      let attempts = 0;
      const maxAttempts = 10;
      const tryReload = () => {
        const dataSourceReload = (window as any).__dataSourceReload;
        if (dataSourceReload) {
          console.log('[WorkspaceManager] Triggering data source reload');
          dataSourceReload();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryReload, 100);
        } else {
          console.warn('[WorkspaceManager] Could not trigger data source reload - context not ready');
        }
      };
      
      // Start trying after a short delay
      setTimeout(tryReload, 50);
    }
  }
  
  /**
   * Save workspace to localStorage
   */
  static async saveToLocalStorage(key: string = 'workspace-v2'): Promise<void> {
    const workspace = await this.saveWorkspace();
    localStorage.setItem(key, JSON.stringify(workspace));
  }
  
  /**
   * Load workspace from localStorage
   */
  static async loadFromLocalStorage(key: string = 'workspace-v2'): Promise<boolean> {
    const saved = localStorage.getItem(key);
    if (!saved) {
      return false;
    }
    
    try {
      const data = JSON.parse(saved) as ExtendedWorkspaceData;
      await this.loadWorkspace(data);
      return true;
    } catch (error) {
      console.error('Failed to load workspace:', error);
      return false;
    }
  }
  
  /**
   * Clear workspace including data sources
   */
  static async clearWorkspace(): Promise<void> {
    const configStore = useConfigStore.getState();
    
    // Clear data sources
    const dataSources = configStore.getConfigsByType('DataSource');
    if (dataSources.length > 0) {
      await configStore.deleteMany(dataSources.map(ds => ds.configId));
    }
    
    // Clear app store
    useAppStore.getState().clearWorkspace();
  }
  
  /**
   * Export workspace to file
   */
  static async exportToFile(filename: string = 'workspace.json'): Promise<void> {
    const workspace = await this.saveWorkspace();
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Import workspace from file
   */
  static async importFromFile(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text) as ExtendedWorkspaceData;
    await this.loadWorkspace(data);
  }
}