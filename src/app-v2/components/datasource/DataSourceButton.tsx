/**
 * DataSourceButton Component
 * 
 * Button to open data source configuration.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { DataSourceList } from './DataSourceList';
import { DataSourceConfigDialog } from './DataSourceConfigDialog';
import { DataSourceConfig } from './types';
import { ConnectionStatus } from '../../providers/data/data-provider.types';
import { DraggableDialog } from '../ui/DraggableDialog/DraggableDialog';

interface DataSourceButtonProps {
  /**
   * Button text
   */
  text?: string;
  
  /**
   * Button variant
   */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Custom children (e.g., icon)
   */
  children?: React.ReactNode;
  
  /**
   * Data sources
   */
  dataSources: DataSourceConfig[];
  
  /**
   * Connection status map
   */
  connectionStatus: Map<string, ConnectionStatus>;
  
  /**
   * Save data source callback
   */
  onSave: (dataSource: DataSourceConfig) => void;
  
  /**
   * Delete data source callback
   */
  onDelete: (dataSource: DataSourceConfig) => void;
  
  /**
   * Connect callback
   */
  onConnect: (dataSource: DataSourceConfig) => void;
  
  /**
   * Disconnect callback
   */
  onDisconnect: (dataSource: DataSourceConfig) => void;
}

export function DataSourceButton({
  text = "Configure Data Sources",
  variant = "outline",
  size = "sm",
  dataSources,
  connectionStatus,
  onSave,
  onDelete,
  onConnect,
  onDisconnect,
  children,
}: DataSourceButtonProps) {
  const [showList, setShowList] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSourceConfig | undefined>();

  // Handle create new
  const handleCreate = () => {
    setEditingDataSource(undefined);
    setShowConfig(true);
  };

  // Handle edit
  const handleEdit = (dataSource: DataSourceConfig) => {
    console.log('[DataSourceButton] Editing data source:', dataSource);
    setEditingDataSource(dataSource);
    setShowConfig(true);
  };

  // Handle duplicate
  const handleDuplicate = (dataSource: DataSourceConfig) => {
    const duplicated: DataSourceConfig = {
      ...dataSource,
      id: '',
      displayName: `${dataSource.displayName} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditingDataSource(duplicated);
    setShowConfig(true);
  };

  // Handle save
  const handleSave = (dataSource: DataSourceConfig) => {
    onSave(dataSource);
    setShowConfig(false);
    setEditingDataSource(undefined);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowList(true)}
      >
        {children || (
          <>
            <Settings className="h-4 w-4 mr-2" />
            {text}
          </>
        )}
      </Button>

      {/* Data Source List Dialog */}
      <DraggableDialog
        open={showList}
        onOpenChange={setShowList}
        title="Data Sources"
        defaultSize={{ width: 1000, height: 700 }}
      >
        <div className="p-6 h-full overflow-auto">
          <DataSourceList
            dataSources={dataSources}
            connectionStatus={connectionStatus}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={onDelete}
            onDuplicate={handleDuplicate}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        </div>
      </DraggableDialog>

      {/* Data Source Config Dialog */}
      <DataSourceConfigDialog
        open={showConfig}
        onClose={() => {
          setShowConfig(false);
          setEditingDataSource(undefined);
        }}
        dataSource={editingDataSource}
        onSave={handleSave}
      />
    </>
  );
}