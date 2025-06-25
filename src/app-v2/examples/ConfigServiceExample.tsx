/**
 * Config Service Example
 * 
 * Demonstrates how to use the configuration service in a React component.
 */

import React, { useState, useEffect } from 'react';
import { ConfigProvider, useConfig, useConfigList, useConfigManager } from '../contexts/config.context';
import { Config, ComponentType } from '../services/config/config.types';
import { generateConfigId, formatTimestamp } from '../utils/config.utils';

/**
 * Example component showing config service usage
 */
function ConfigExample() {
  const configService = useConfig();
  const { configs, loading, error, refresh } = useConfigList({ userId: 'demo-user' });
  const { save, update, remove, saving, deleting } = useConfigManager();
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [newConfigName, setNewConfigName] = useState('');
  
  // Create a new configuration
  const handleCreateConfig = async () => {
    if (!newConfigName.trim()) return;
    
    const newConfig: Config = {
      configId: generateConfigId('demo'),
      appId: 'demo-app',
      userId: 'demo-user',
      componentType: ComponentType.DataTable,
      name: newConfigName,
      description: 'Created from example',
      settings: {
        columns: ['id', 'name', 'status'],
        pageSize: 50,
        sortable: true
      },
      tags: ['example', 'demo'],
      createdBy: 'demo-user',
      creationTime: Date.now()
    };
    
    const success = await save(newConfig);
    if (success) {
      setNewConfigName('');
      refresh();
    }
  };
  
  // Update selected configuration
  const handleUpdateConfig = async () => {
    if (!selectedConfig) return;
    
    const success = await update(selectedConfig.configId, {
      name: `${selectedConfig.name} (Updated)`,
      settings: {
        ...selectedConfig.settings,
        updated: true,
        updatedAt: Date.now()
      }
    });
    
    if (success) {
      refresh();
      setSelectedConfig(null);
    }
  };
  
  // Delete configuration
  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    const success = await remove(configId);
    if (success) {
      refresh();
      if (selectedConfig?.configId === configId) {
        setSelectedConfig(null);
      }
    }
  };
  
  // Load full config details when selected
  const handleSelectConfig = async (config: Config) => {
    const fullConfig = await configService.get(config.configId);
    setSelectedConfig(fullConfig);
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuration Service Example</h1>
      
      {/* Create new config */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-3">Create New Configuration</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
            placeholder="Configuration name"
            className="flex-1 px-3 py-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateConfig()}
          />
          <button
            onClick={handleCreateConfig}
            disabled={saving || !newConfigName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
      
      {/* Config list */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Your Configurations</h2>
        {loading ? (
          <p className="text-gray-500">Loading configurations...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error.message}</p>
        ) : configs.length === 0 ? (
          <p className="text-gray-500">No configurations found. Create one above!</p>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => (
              <div
                key={config.configId}
                className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedConfig?.configId === config.configId ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleSelectConfig(config)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{config.name}</h3>
                    <p className="text-sm text-gray-500">
                      Type: {config.componentType} • Created: {formatTimestamp(config.creationTime)}
                    </p>
                    {config.tags && (
                      <div className="flex gap-1 mt-1">
                        {config.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConfig(config.configId);
                    }}
                    disabled={deleting}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected config details */}
      {selectedConfig && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-3">Configuration Details</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">ID:</dt>
              <dd className="text-sm font-mono">{selectedConfig.configId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Name:</dt>
              <dd>{selectedConfig.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Description:</dt>
              <dd>{selectedConfig.description || 'No description'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Settings:</dt>
              <dd>
                <pre className="text-sm bg-white p-2 rounded border">
                  {JSON.stringify(selectedConfig.settings, null, 2)}
                </pre>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated:</dt>
              <dd>
                {selectedConfig.lastUpdated
                  ? formatTimestamp(selectedConfig.lastUpdated)
                  : 'Never updated'}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpdateConfig}
              disabled={saving}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Settings'}
            </button>
            <button
              onClick={() => setSelectedConfig(null)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * App wrapper with ConfigProvider
 */
export default function ConfigServiceExample() {
  return (
    <ConfigProvider
      onReady={(service) => console.log('Config service ready:', service)}
      onError={(error) => console.error('Config service error:', error)}
    >
      <ConfigExample />
    </ConfigProvider>
  );
}