import { getDB, DB_NAME, STORE_NAME } from './config/config.db';

export interface CompleteExportData {
  version: string;
  exportDate: string;
  indexedDB: {
    [databaseName: string]: {
      [storeName: string]: unknown[];
    };
  };
  localStorage: Record<string, string>;
  metadata: {
    totalConfigs: number;
    totalLocalStorageKeys: number;
    databases: string[];
    exportedBy?: string;
  };
}

export interface CompleteImportOptions {
  overwrite?: boolean;
  includeIndexedDB?: boolean;
  includeLocalStorage?: boolean;
  localStorageKeysToExclude?: string[];
  clearBeforeImport?: boolean;
}

export interface CompleteImportResult {
  success: boolean;
  imported: {
    indexedDBRecords: number;
    localStorageKeys: number;
  };
  errors: string[];
  warnings: string[];
}

class CompleteExportImportService {
  private readonly APP_VERSION = '2.0.0';
  
  // Keys that should not be exported/imported
  private readonly EXCLUDED_LOCALSTORAGE_KEYS = [
    'debug',
    'loglevel',
    '__vite',
  ];

  async exportComplete(): Promise<CompleteExportData> {
    try {
      const exportData: CompleteExportData = {
        version: this.APP_VERSION,
        exportDate: new Date().toISOString(),
        indexedDB: {},
        localStorage: {},
        metadata: {
          totalConfigs: 0,
          totalLocalStorageKeys: 0,
          databases: [],
          exportedBy: localStorage.getItem('userId') || undefined,
        },
      };

      // Export IndexedDB data
      await this.exportIndexedDB(exportData);
      
      // Export localStorage data
      this.exportLocalStorage(exportData);

      return exportData;
    } catch (error) {
      console.error('Complete export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async exportIndexedDB(exportData: CompleteExportData): Promise<void> {
    // Export ConfigDB
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allConfigs = await store.getAll();
      
      exportData.indexedDB[DB_NAME] = {
        [STORE_NAME]: allConfigs,
      };
      
      exportData.metadata.totalConfigs = allConfigs.length;
      exportData.metadata.databases.push(DB_NAME);
    } catch (error) {
      console.error('Failed to export IndexedDB:', error);
      throw error;
    }
  }

  private exportLocalStorage(exportData: CompleteExportData): void {
    const localStorage = window.localStorage;
    let keyCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !this.isExcludedKey(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          exportData.localStorage[key] = value;
          keyCount++;
        }
      }
    }

    exportData.metadata.totalLocalStorageKeys = keyCount;
  }

  private isExcludedKey(key: string): boolean {
    return this.EXCLUDED_LOCALSTORAGE_KEYS.some(excluded => 
      key.includes(excluded) || key.startsWith('__')
    );
  }

  async importComplete(
    data: CompleteExportData, 
    options: CompleteImportOptions = {}
  ): Promise<CompleteImportResult> {
    const result: CompleteImportResult = {
      success: true,
      imported: {
        indexedDBRecords: 0,
        localStorageKeys: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      // Validate export data
      this.validateCompleteExportData(data);

      // Clear existing data if requested
      if (options.clearBeforeImport) {
        await this.clearAllData();
      }

      // Import IndexedDB data
      if (options.includeIndexedDB !== false) {
        await this.importIndexedDB(data, options, result);
      }

      // Import localStorage data
      if (options.includeLocalStorage !== false) {
        this.importLocalStorage(data, options, result);
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  private async importIndexedDB(
    data: CompleteExportData,
    options: CompleteImportOptions,
    result: CompleteImportResult
  ): Promise<void> {
    for (const [dbName, stores] of Object.entries(data.indexedDB)) {
      if (dbName === DB_NAME) {
        try {
          const db = await getDB();
          
          for (const [storeName, records] of Object.entries(stores)) {
            if (storeName === STORE_NAME && Array.isArray(records)) {
              const tx = db.transaction([STORE_NAME], 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              
              for (const record of records) {
                try {
                  if (options.overwrite) {
                    await store.put(record);
                  } else {
                    // Check if record exists
                    const existing = await store.get(record.configId);
                    if (!existing) {
                      await store.add(record);
                    } else {
                      // Create new record with modified ID
                      const newRecord = {
                        ...record,
                        configId: `${record.configId}_imported_${Date.now()}`,
                        name: `${record.name} (Imported)`,
                      };
                      await store.add(newRecord);
                      result.warnings.push(`Renamed duplicate config: ${record.name}`);
                    }
                  }
                  result.imported.indexedDBRecords++;
                } catch (error) {
                  result.errors.push(
                    `Failed to import config "${record.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
                  );
                }
              }
              
              await tx.done;
            }
          }
        } catch (error) {
          result.errors.push(
            `Failed to import IndexedDB data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  private importLocalStorage(
    data: CompleteExportData,
    options: CompleteImportOptions,
    result: CompleteImportResult
  ): void {
    const excludedKeys = options.localStorageKeysToExclude || [];
    
    for (const [key, value] of Object.entries(data.localStorage)) {
      if (!this.isExcludedKey(key) && !excludedKeys.includes(key)) {
        try {
          if (options.overwrite || !localStorage.getItem(key)) {
            localStorage.setItem(key, value);
            result.imported.localStorageKeys++;
          } else {
            result.warnings.push(`Skipped existing localStorage key: ${key}`);
          }
        } catch (error) {
          result.errors.push(
            `Failed to import localStorage key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  private async clearAllData(): Promise<void> {
    // Clear IndexedDB
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await store.clear();
      await tx.done;
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }

    // Clear localStorage (except excluded keys)
    const keysToKeep: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isExcludedKey(key)) {
        keysToKeep.push(key);
      }
    }
    
    const valuesToKeep: Record<string, string> = {};
    keysToKeep.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        valuesToKeep[key] = value;
      }
    });
    
    localStorage.clear();
    
    // Restore excluded keys
    Object.entries(valuesToKeep).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }

  async downloadCompleteExport(data: CompleteExportData, filename?: string): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `complete-app-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private validateCompleteExportData(data: any): asserts data is CompleteExportData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid export data: must be an object');
    }

    const exportData = data as any;
    if (!exportData.version || !exportData.exportDate) {
      throw new Error('Invalid export data: missing version or exportDate');
    }

    if (!exportData.indexedDB || typeof exportData.indexedDB !== 'object') {
      throw new Error('Invalid export data: indexedDB must be an object');
    }

    if (!exportData.localStorage || typeof exportData.localStorage !== 'object') {
      throw new Error('Invalid export data: localStorage must be an object');
    }

    if (!exportData.metadata || typeof exportData.metadata !== 'object') {
      throw new Error('Invalid export data: metadata must be an object');
    }
  }

  // Get statistics about current data
  async getDataStatistics(): Promise<{
    indexedDB: { [dbName: string]: { [storeName: string]: number } };
    localStorage: { totalKeys: number; totalSize: number };
  }> {
    const stats: {
      indexedDB: { [dbName: string]: { [storeName: string]: number } };
      localStorage: { totalKeys: number; totalSize: number };
    } = {
      indexedDB: {},
      localStorage: { totalKeys: 0, totalSize: 0 },
    };

    // Get IndexedDB stats
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const count = await store.count();
      
      stats.indexedDB[DB_NAME] = {
        [STORE_NAME]: count,
      };
    } catch (error) {
      console.error('Failed to get IndexedDB stats:', error);
    }

    // Get localStorage stats
    let totalSize = 0;
    let keyCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !this.isExcludedKey(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          totalSize += key.length + value.length;
          keyCount++;
        }
      }
    }
    
    stats.localStorage.totalKeys = keyCount;
    stats.localStorage.totalSize = totalSize;

    return stats;
  }
}

export const completeExportImportService = new CompleteExportImportService();