/**
 * DataSourceExample
 * 
 * Example demonstrating the data source configuration UI.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Send } from 'lucide-react';
import { DataSourceProvider, useDataSource } from '../contexts/DataSourceContext';
import { 
  DataSourceButton, 
  DataSourceSelector,
  DataSourceConfig,
} from '../components/datasource';
import { ConnectionStatus } from '../providers/data/data-provider.types';

function DataSourceExampleContent() {
  const {
    dataSources,
    activeDataSourceId,
    connectionStatus,
    data,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    connectDataSource,
    disconnectDataSource,
    setActiveDataSource,
    sendTrigger,
  } = useDataSource();

  const [triggerInput, setTriggerInput] = useState('{"action": "getData"}');
  const [sendingTrigger, setSendingTrigger] = useState(false);

  // Handle save from dialog
  const handleSave = async (dataSource: DataSourceConfig) => {
    if (dataSources.find(ds => ds.id === dataSource.id)) {
      await updateDataSource(dataSource);
    } else {
      await createDataSource(dataSource);
    }
  };

  // Handle connect
  const handleConnect = async (dataSource: DataSourceConfig) => {
    await connectDataSource(dataSource.id);
  };

  // Handle disconnect
  const handleDisconnect = async (dataSource: DataSourceConfig) => {
    await disconnectDataSource(dataSource.id);
  };

  // Handle send trigger
  const handleSendTrigger = async () => {
    if (!activeDataSourceId) return;
    
    setSendingTrigger(true);
    try {
      // Try to parse as JSON first
      try {
        const jsonTrigger = JSON.parse(triggerInput);
        await sendTrigger(jsonTrigger);
      } catch {
        // Send as plain string
        await sendTrigger(triggerInput);
      }
    } catch (error) {
      console.error('Failed to send trigger:', error);
    } finally {
      setSendingTrigger(false);
    }
  };

  const activeDataSource = dataSources.find(ds => ds.id === activeDataSourceId);
  const activeStatus = activeDataSourceId ? connectionStatus.get(activeDataSourceId) : undefined;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Data Source Configuration Example</h1>
        <p className="text-muted-foreground">
          Demonstrates the data source UI with field inference and configuration.
        </p>
      </div>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source Management</CardTitle>
          <CardDescription>
            Configure and manage your data sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <DataSourceButton
              dataSources={dataSources}
              connectionStatus={connectionStatus}
              onSave={handleSave}
              onDelete={(dataSource) => deleteDataSource(dataSource.id)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
            
            <div className="flex-1">
              <DataSourceSelector
                dataSources={dataSources}
                value={activeDataSourceId}
                onChange={setActiveDataSource}
                connectionStatus={connectionStatus}
                onConnect={connectDataSource}
                onDisconnect={disconnectDataSource}
              />
            </div>
          </div>

          {activeDataSource && (
            <Alert>
              <AlertDescription>
                Active: <strong>{activeDataSource.displayName}</strong> - 
                Type: {activeDataSource.type} - 
                Fields: {activeDataSource.inferredFields?.length || 0}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      {activeDataSource && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {activeDataSource.displayName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeDataSource.connection.url}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {activeStatus === ConnectionStatus.Connected ? (
                  <>
                    <Badge variant="default" className="bg-green-500">
                      Connected
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disconnectDataSource(activeDataSource.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="outline">
                      Disconnected
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => connectDataSource(activeDataSource.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trigger Section */}
      {activeDataSource && activeStatus === ConnectionStatus.Connected && (
        <Card>
          <CardHeader>
            <CardTitle>Send Trigger</CardTitle>
            <CardDescription>
              Send a message to the data source (supports both JSON and plain text)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="trigger" className="text-sm font-medium">
                Trigger Message
              </label>
              <textarea
                id="trigger"
                className="w-full mt-1 p-2 border rounded-md font-mono text-sm"
                rows={4}
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                placeholder='Enter JSON object or plain text'
              />
            </div>
            
            <Button
              onClick={handleSendTrigger}
              disabled={sendingTrigger}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingTrigger ? 'Sending...' : 'Send Trigger'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Received Data</CardTitle>
            <CardDescription>
              Latest {Math.min(data.length, 10)} of {data.length} items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-md overflow-auto max-h-96 text-xs">
              {JSON.stringify(data.slice(-10), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Column Definitions */}
      {activeDataSource && activeDataSource.columnDefs && activeDataSource.columnDefs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Definitions</CardTitle>
            <CardDescription>
              Configured columns for data table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeDataSource.columnDefs.map((col, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{col.headerName}</p>
                    <p className="text-sm text-muted-foreground">{col.field}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {col.sortable && <Badge variant="outline">Sortable</Badge>}
                    {col.filterable && <Badge variant="outline">Filterable</Badge>}
                    <Badge variant="secondary">Width: {col.width}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DataSourceExample() {
  return (
    <DataSourceProvider>
      <DataSourceExampleContent />
    </DataSourceProvider>
  );
}