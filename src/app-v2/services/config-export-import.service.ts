import { Config } from './config/config.types';
import { useConfigStore } from '@/app-v2/stores/config.store';

export interface ExportData {
  version: string;
  exportDate: string;
  configs: {
    workspaces: Config[];
    components: Config[];
    profiles: Config[];
    dataSources: Config[];
    templates: Config[];
    other: Config[];
  };
  settings: Record<string, unknown>;
}

export interface ImportOptions {
  overwrite?: boolean;
  selectedTypes?: string[];
  includeSettings?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    workspaces: number;
    components: number;
    profiles: number;
    dataSources: number;
    templates: number;
    other: number;
    settings: boolean;
  };
  errors: string[];
}

class ConfigExportImportService {
  private readonly APP_VERSION = '2.0.0';

  async exportAll(): Promise<ExportData> {
    try {
      // Get all configurations
      const allConfigs = Array.from(useConfigStore.getState().configs.values());
      
      // Categorize configurations by type
      const categorized = this.categorizeConfigs(allConfigs);
      
      // Get application settings
      const settings = this.exportSettings();
      
      const exportData: ExportData = {
        version: this.APP_VERSION,
        exportDate: new Date().toISOString(),
        configs: categorized,
        settings
      };
      
      return exportData;
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportByType(types: string[]): Promise<ExportData> {
    try {
      const allConfigs = Array.from(useConfigStore.getState().configs.values());
      const filteredConfigs = allConfigs.filter((config: Config) => types.includes(config.componentType));
      
      const categorized = this.categorizeConfigs(filteredConfigs);
      const settings = this.exportSettings();
      
      return {
        version: this.APP_VERSION,
        exportDate: new Date().toISOString(),
        configs: categorized,
        settings
      };
    } catch (error) {
      console.error('Export by type failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportWorkspace(workspaceId: string): Promise<ExportData> {
    try {
      const workspace = useConfigStore.getState().getConfig(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Get all components belonging to this workspace
      const components = useConfigStore.getState().getConfigsByParent(workspaceId);
      
      // Get all profiles for these components
      const profiles: Config[] = [];
      for (const component of components) {
        const componentProfiles = useConfigStore.getState().getConfigsByOwner(component.configId);
        profiles.push(...componentProfiles);
      }

      // Get data sources for this workspace
      const dataSources = Array.from(useConfigStore.getState().configs.values()).filter(
        (config: Config) => config.componentType === 'DataSource' && config.parentId === workspaceId
      );

      const allConfigs = [workspace, ...components, ...profiles, ...dataSources];
      const categorized = this.categorizeConfigs(allConfigs);
      
      return {
        version: this.APP_VERSION,
        exportDate: new Date().toISOString(),
        configs: categorized,
        settings: {} // Don't export global settings for workspace export
      };
    } catch (error) {
      console.error('Export workspace failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importData(data: ExportData, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: {
        workspaces: 0,
        components: 0,
        profiles: 0,
        dataSources: 0,
        templates: 0,
        other: 0,
        settings: false
      },
      errors: []
    };

    try {
      // Validate export data
      this.validateExportData(data);

      // Import configurations
      const configTypes: (keyof ExportData['configs'])[] = [
        'workspaces', 'components', 'profiles', 'dataSources', 'templates', 'other'
      ];

      for (const type of configTypes) {
        if (data.configs[type] && data.configs[type].length > 0) {
          const configs = data.configs[type];
          
          for (const config of configs) {
            try {
              // Skip if type filtering is enabled and this type is not selected
              if (options.selectedTypes && !options.selectedTypes.includes(config.componentType)) {
                continue;
              }

              if (options.overwrite) {
                await useConfigStore.getState().updateConfig(config.configId, config);
              } else {
                // Check if config already exists
                const existing = useConfigStore.getState().getConfig(config.configId);
                if (!existing) {
                  await useConfigStore.getState().saveConfig(config);
                } else {
                  // Generate new ID for duplicate
                  const newConfig = {
                    ...config,
                    configId: `${config.configId}_imported_${Date.now()}`,
                    name: `${config.name} (Imported)`
                  };
                  await useConfigStore.getState().saveConfig(newConfig);
                }
              }
              
              result.imported[type as keyof typeof result.imported]++;
            } catch (error) {
              result.errors.push(`Failed to import ${config.componentType} "${config.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
              result.success = false;
            }
          }
        }
      }

      // Import settings if requested
      if (options.includeSettings !== false && data.settings) {
        try {
          this.importSettings(data.settings);
          result.imported.settings = true;
        } catch (error) {
          result.errors.push(`Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.success = false;
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  async downloadExport(data: ExportData, filename?: string): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `app-config-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private categorizeConfigs(configs: Config[]): ExportData['configs'] {
    const categorized: ExportData['configs'] = {
      workspaces: [],
      components: [],
      profiles: [],
      dataSources: [],
      templates: [],
      other: []
    };

    for (const config of configs) {
      if (config.componentType === 'Workspace') {
        categorized.workspaces.push(config);
      } else if (config.componentType === 'DataSource') {
        categorized.dataSources.push(config);
      } else if (config.componentType.includes('.Profile')) {
        categorized.profiles.push(config);
      } else if (config.isTemplate) {
        categorized.templates.push(config);
      } else if (['DataTable', 'Chart', 'Filter', 'Layout'].includes(config.componentType)) {
        categorized.components.push(config);
      } else {
        categorized.other.push(config);
      }
    }

    return categorized;
  }

  private exportSettings(): Record<string, unknown> {
    const settings: Record<string, unknown> = {};
    
    // Get settings from localStorage
    const appSettings = localStorage.getItem('app-settings-v2');
    if (appSettings) {
      settings.appSettings = JSON.parse(appSettings);
    }

    // Get other relevant localStorage items
    const localStorageKeys = [
      'theme',
      'sidebar-collapsed',
      'preferred-language'
    ];

    for (const key of localStorageKeys) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        settings[key] = value;
      }
    }

    return settings;
  }

  private importSettings(settings: Record<string, unknown>): void {
    // Import app settings
    if (settings.appSettings) {
      localStorage.setItem('app-settings-v2', JSON.stringify(settings.appSettings));
    }

    // Import other settings
    const excludeKeys = ['appSettings'];
    for (const [key, value] of Object.entries(settings)) {
      if (!excludeKeys.includes(key)) {
        localStorage.setItem(key, String(value));
      }
    }
  }

  private validateExportData(data: unknown): asserts data is ExportData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid export data: must be an object');
    }

    const exportData = data as any;
    if (!exportData.version || !exportData.exportDate || !exportData.configs) {
      throw new Error('Invalid export data: missing required fields');
    }

    if (!exportData.configs || typeof exportData.configs !== 'object') {
      throw new Error('Invalid export data: configs must be an object');
    }

    const requiredConfigTypes = ['workspaces', 'components', 'profiles', 'dataSources', 'templates', 'other'];
    for (const type of requiredConfigTypes) {
      if (!Array.isArray(exportData.configs[type])) {
        throw new Error(`Invalid export data: configs.${type} must be an array`);
      }
    }
  }
}

export const configExportImportService = new ConfigExportImportService();