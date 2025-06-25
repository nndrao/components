/**
 * STOMP Data Example
 * 
 * Example demonstrating STOMP WebSocket data source with high-frequency updates.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataSourceProvider } from '../contexts/DataSourceContext';
import { DataTable } from '../components/data-table/DataTable';
import { DataSourceButton } from '../components/datasource';
import { useDataSource } from '../contexts/DataSourceContext';
import { useAppStore } from '../store';

function StompDataExampleContent() {
  // Create a data table component
  const { addComponent, components } = useAppStore();
  const dataTableId = Array.from(components.keys())[0] || addComponent('data-table');
  
  // Data source hooks
  const {
    dataSources,
    connectionStatus,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    connectDataSource,
    disconnectDataSource,
  } = useDataSource();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>STOMP WebSocket Data Example</CardTitle>
          <CardDescription>
            High-frequency data updates with batching (10,000 msg/sec capable)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DataSourceButton
                dataSources={dataSources}
                connectionStatus={connectionStatus}
                onSave={async (config) => {
                  if (dataSources.find(ds => ds.id === config.id)) {
                    await updateDataSource(config);
                  } else {
                    await createDataSource(config);
                  }
                }}
                onDelete={(config) => deleteDataSource(config.id)}
                onConnect={(config) => connectDataSource(config.id)}
                onDisconnect={(config) => disconnectDataSource(config.id)}
              />
              <p className="text-sm text-muted-foreground">
                Configure: ws://localhost:8080, Data Type: positions, Rate: 1000
              </p>
            </div>
            
            <div className="h-[600px] border rounded">
              <DataTable id={dataTableId} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StompDataExample() {
  return (
    <DataSourceProvider>
      <StompDataExampleContent />
    </DataSourceProvider>
  );
}