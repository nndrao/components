/**
 * DataSourceSelector Component
 * 
 * Dropdown selector for choosing active data source.
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Settings, Play, Square } from 'lucide-react';
import { ConnectionStatus } from '../../providers/data/data-provider.types';
import { DataSourceConfig } from './types';

interface DataSourceSelectorProps {
  /**
   * Available data sources
   */
  dataSources: DataSourceConfig[];
  
  /**
   * Currently selected data source ID
   */
  value?: string;
  
  /**
   * Selection change callback
   */
  onChange: (dataSourceId: string | undefined) => void;
  
  /**
   * Connection status map
   */
  connectionStatus: Map<string, ConnectionStatus>;
  
  /**
   * Configure callback
   */
  onConfigure?: () => void;
  
  /**
   * Connect callback
   */
  onConnect?: (dataSourceId: string) => void;
  
  /**
   * Disconnect callback
   */
  onDisconnect?: (dataSourceId: string) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Show configuration button
   */
  showConfigButton?: boolean;
  
  /**
   * Component disabled
   */
  disabled?: boolean;
}

export function DataSourceSelector({
  dataSources,
  value,
  onChange,
  connectionStatus,
  onConfigure,
  onConnect,
  onDisconnect,
  placeholder = "Select data source...",
  showConfigButton = true,
  disabled = false,
}: DataSourceSelectorProps) {
  const selectedDataSource = dataSources.find(ds => ds.id === value);
  const selectedStatus = value ? connectionStatus.get(value) : undefined;
  const isConnected = selectedStatus === ConnectionStatus.Connected;

  // Group data sources by type
  const groupedDataSources = dataSources.reduce((acc, ds) => {
    const group = ds.type.charAt(0).toUpperCase() + ds.type.slice(1);
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(ds);
    return acc;
  }, {} as Record<string, DataSourceConfig[]>);

  const getStatusColor = (status?: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.Connected:
        return 'text-green-500';
      case ConnectionStatus.Connecting:
      case ConnectionStatus.Reconnecting:
        return 'text-blue-500';
      case ConnectionStatus.Error:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status?: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.Connected:
        return 'Connected';
      case ConnectionStatus.Connecting:
        return 'Connecting...';
      case ConnectionStatus.Reconnecting:
        return 'Reconnecting...';
      case ConnectionStatus.Error:
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <Database className="h-4 w-4 text-muted-foreground" />
        
        <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? undefined : v)} disabled={disabled}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            
            {Object.entries(groupedDataSources).map(([group, sources]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {sources.map((ds) => {
                  const status = connectionStatus.get(ds.id);
                  return (
                    <SelectItem key={ds.id} value={ds.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{ds.displayName}</span>
                          {ds.autoStart && (
                            <Badge variant="outline" className="text-xs">
                              Auto
                            </Badge>
                          )}
                        </div>
                        {status && status !== ConnectionStatus.Disconnected && (
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {selectedDataSource && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(selectedStatus)}>
              {getStatusText(selectedStatus)}
            </Badge>
            
            {selectedStatus === ConnectionStatus.Connected ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDisconnect?.(selectedDataSource.id)}
                disabled={disabled}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onConnect?.(selectedDataSource.id)}
                disabled={disabled || selectedStatus === ConnectionStatus.Connecting}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {showConfigButton && onConfigure && (
        <Button
          size="sm"
          variant="outline"
          onClick={onConfigure}
          disabled={disabled}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}