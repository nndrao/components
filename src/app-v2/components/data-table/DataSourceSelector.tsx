import React from 'react';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { useDataSource } from '../../contexts/DataSourceContext';
import { ConnectionStatus } from '../../providers/data/data-provider.types';
import { cn } from '@/lib/utils';

interface DataTableDataSourceSelectorProps {
  /**
   * Current data source ID
   */
  value: string | null;
  
  /**
   * Callback when data source changes
   */
  onChange: (dataSourceId: string | null) => void;
  
  /**
   * Additional class name
   */
  className?: string;
}

export function DataSourceSelector({ value, onChange, className }: DataTableDataSourceSelectorProps) {
  const { 
    dataSources, 
    connectionStatus, 
    connectDataSource,
  } = useDataSource();

  // Get status badge variant and text
  const getStatusBadge = (dataSourceId: string) => {
    const status = connectionStatus.get(dataSourceId) || ConnectionStatus.Disconnected;
    
    switch (status) {
      case ConnectionStatus.Connected:
        return <Badge variant="default" className="ml-2 bg-green-500">Connected</Badge>;
      case ConnectionStatus.Connecting:
        return <Badge variant="secondary" className="ml-2">Connecting...</Badge>;
      case ConnectionStatus.Reconnecting:
        return <Badge variant="secondary" className="ml-2">Reconnecting...</Badge>;
      case ConnectionStatus.Error:
        return <Badge variant="destructive" className="ml-2">Error</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">Disconnected</Badge>;
    }
  };

  const handleValueChange = async (newValue: string) => {
    if (newValue === '__none__') {
      // Clear data source to use sample data
      onChange(null);
    } else {
      onChange(newValue);
      // Auto-connect if not connected
      const status = connectionStatus.get(newValue) || ConnectionStatus.Disconnected;
      if (status === ConnectionStatus.Disconnected || status === ConnectionStatus.Error) {
        await connectDataSource(newValue);
      }
    }
  };

  const currentValue = value || '__none__';

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className={cn("h-7 w-[200px]", className)}>
        <Database className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select data source">
          {currentValue === '__none__' ? 'Sample Data' : 
            dataSources.find(ds => ds.id === value)?.displayName || 'Select data source'
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <div className="flex items-center">
            <span>None (Sample Data)</span>
          </div>
        </SelectItem>
        
        {dataSources.length > 0 && (
          <>
            <SelectSeparator />
            {dataSources.map(dataSource => {
              const status = connectionStatus.get(dataSource.id) || ConnectionStatus.Disconnected;
              return (
                <SelectItem key={dataSource.id} value={dataSource.id}>
                  <div className="flex items-center">
                    <span className="mr-2">{dataSource.displayName}</span>
                    {status === ConnectionStatus.Connected && (
                      <Badge variant="default" className="bg-green-500 text-xs">Connected</Badge>
                    )}
                    {status === ConnectionStatus.Connecting && (
                      <Badge variant="secondary" className="text-xs">Connecting</Badge>
                    )}
                    {status === ConnectionStatus.Error && (
                      <Badge variant="destructive" className="text-xs">Error</Badge>
                    )}
                    {status === ConnectionStatus.Disconnected && (
                      <Badge variant="outline" className="text-xs">Offline</Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </>
        )}
        
        {dataSources.length === 0 && (
          <div className="text-sm text-muted-foreground px-2 py-1.5">
            No data sources configured
          </div>
        )}
      </SelectContent>
    </Select>
  );
}