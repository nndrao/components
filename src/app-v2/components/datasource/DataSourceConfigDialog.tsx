/**
 * DataSourceConfigDialog Component
 * 
 * Main dialog for configuring data sources with field inference.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Maximize2,
  Minimize2,
  Save,
  Loader2,
  AlertCircle,
  Database,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableDialog } from '../ui/DraggableDialog/DraggableDialog';
import { ConnectionConfigForm } from './ConnectionConfigForm';
import { FieldsAndColumnsPanel } from './FieldsAndColumnsPanel';
import { DataSourceStatisticsPanel } from './DataSourceStatisticsPanel';
import { 
  DataSourceConfig, 
  ConnectionFormValues, 
  ConnectionTestResult,
  FieldInfo,
  ColumnDefinition,
} from './types';
import { inferFields } from './utils/fieldInference';
import { DataProviderType } from '../../providers/data/data-provider.types';
import { generateConfigId } from '../../utils/config.utils';
import { 
  WebSocketDataProvider,
  RestDataProvider,
  StaticDataProvider,
} from '../../providers/data';

interface DataSourceConfigDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;
  
  /**
   * Close dialog callback
   */
  onClose: () => void;
  
  /**
   * Data source to edit (undefined for new)
   */
  dataSource?: DataSourceConfig;
  
  /**
   * Save callback
   */
  onSave: (dataSource: DataSourceConfig) => void;
}

export function DataSourceConfigDialog({
  open,
  onClose,
  dataSource,
  onSave,
}: DataSourceConfigDialogProps) {
  const isEditing = !!dataSource;
  const [activeTab, setActiveTab] = useState('connection');
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionValues, setConnectionValues] = useState<ConnectionFormValues>({
    type: DataProviderType.WebSocket,
    url: '',
    auth: undefined,
    headers: undefined,
    timeout: undefined,
    autoReconnect: true,
    reconnectInterval: undefined,
    settings: undefined,
  });
  
  // Field state
  const [inferredFields, setInferredFields] = useState<FieldInfo[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedFieldsList, setSelectedFieldsList] = useState<string[]>([]);
  const [columnDefs, setColumnDefsInternal] = useState<ColumnDefinition[]>([]);
  
  // Wrapper for setColumnDefs with debugging
  const setColumnDefs = useCallback((newColumnDefs: ColumnDefinition[]) => {
    setColumnDefsInternal(newColumnDefs);
  }, [columnDefs]);
  const [keyColumn, setKeyColumn] = useState('');
  
  // Testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [inferringFields, setInferringFields] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Provider ref for testing
  const testProviderRef = useRef<any>(null);

  // Reset form when dataSource prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(dataSource?.displayName || '');
      setDescription(dataSource?.description || '');
      setConnectionValues({
        type: dataSource?.type || DataProviderType.WebSocket,
        url: dataSource?.connection?.url || '',
        auth: dataSource?.connection?.auth,
        headers: dataSource?.connection?.headers,
        timeout: dataSource?.connection?.timeout,
        autoReconnect: dataSource?.connection?.autoReconnect ?? true,
        reconnectInterval: dataSource?.connection?.reconnectInterval,
        settings: dataSource?.settings,
      });
      setInferredFields(dataSource?.inferredFields || []);
      setSelectedFields(new Set(dataSource?.selectedFields || []));
      const initialColumnDefs = dataSource?.columnDefs || [];
      setColumnDefs(initialColumnDefs);
      setKeyColumn(dataSource?.keyColumn || dataSource?.settings?.keyColumn || '');
      setTestResult(null);
      setError(null);
      setActiveTab('connection');
    }
  }, [open, dataSource]);

  // Update selected fields list when set changes
  useEffect(() => {
    setSelectedFieldsList(Array.from(selectedFields));
  }, [selectedFields]);

  // Cleanup test provider on unmount
  useEffect(() => {
    return () => {
      if (testProviderRef.current) {
        testProviderRef.current.destroy();
      }
    };
  }, []);

  // Test connection
  const handleTestConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    try {
      // Create provider config
      const providerConfig = {
        id: 'test-' + Date.now(),
        name: 'Test Connection',
        type: connectionValues.type,
        connection: {
          url: connectionValues.url,
          auth: connectionValues.auth,
          headers: connectionValues.headers,
          timeout: connectionValues.timeout,
          autoReconnect: false, // Don't auto-reconnect for testing
        },
        settings: connectionValues.settings,
      };

      // Create provider based on type
      let provider;
      switch (connectionValues.type) {
        case DataProviderType.WebSocket:
          provider = new WebSocketDataProvider(providerConfig);
          break;
        case DataProviderType.REST:
        case DataProviderType.Polling:
          provider = new RestDataProvider(providerConfig);
          break;
        case DataProviderType.Static:
          provider = new StaticDataProvider({
            ...providerConfig,
            settings: {
              data: [
                { id: 1, name: 'Test Item 1', value: 100, nested: { prop: 'value1' } },
                { id: 2, name: 'Test Item 2', value: 200, nested: { prop: 'value2' } },
              ],
            },
          });
          break;
        default:
          throw new Error(`Unsupported provider type: ${connectionValues.type}`);
      }

      testProviderRef.current = provider;

      // Connect
      await provider.connect();

      return {
        success: true,
        message: 'Connection successful!',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }, [connectionValues]);

  // Infer fields from data
  const handleInferFields = useCallback(async () => {
    setInferringFields(true);
    setError(null);
    
    try {
      // First test connection
      const testResult = await handleTestConnection();
      if (!testResult.success) {
        throw new Error(testResult.error || 'Connection failed');
      }

      const provider = testProviderRef.current;
      if (!provider) {
        throw new Error('No test provider available');
      }

      // Collect data for inference
      const collectedData: any[] = [];
      const maxSamples = 100;
      let messageCount = 0;

      // Set up data handler
      const dataHandler = (data: any) => {
        if (Array.isArray(data)) {
          collectedData.push(...data);
        } else {
          collectedData.push(data);
        }
        messageCount++;
      };

      provider.on('data', dataHandler);

      // For STOMP, the trigger is sent automatically on connect
      // No manual trigger needed

      // Wait for data with timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for data')), 10000)
      );

      const waitForData = new Promise<void>((resolve) => {
        const checkData = setInterval(() => {
          if (collectedData.length >= maxSamples || 
              (messageCount > 0 && Date.now() - provider.state.metadata?.lastMessageAt > 2000)) {
            clearInterval(checkData);
            resolve();
          }
        }, 100);
      });

      await Promise.race([waitForData, timeout]);

      // Remove data handler
      provider.off('data', dataHandler);

      if (collectedData.length === 0) {
        throw new Error('No data received from source');
      }

      // Infer fields
      const fields = inferFields(collectedData);
      setInferredFields(fields);
      
      // Don't auto-select fields - let user choose
      setSelectedFields(new Set());
      
      // Switch to fields tab
      setActiveTab('fields');

      setTestResult({
        success: true,
        message: `Successfully inferred ${fields.length} fields from ${collectedData.length} samples`,
        fields,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to infer fields');
    } finally {
      setInferringFields(false);
      
      // Cleanup test provider
      if (testProviderRef.current) {
        await testProviderRef.current.disconnect();
      }
    }
  }, [connectionValues, handleTestConnection]);

  // Toggle field selection
  const handleFieldToggle = useCallback((fieldPath: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldPath)) {
        next.delete(fieldPath);
      } else {
        next.add(fieldPath);
      }
      return next;
    });
  }, []);

  // Select all fields
  const handleSelectAll = useCallback(() => {
    const allPaths = inferredFields.map(f => f.path);
    setSelectedFields(new Set(allPaths));
  }, [inferredFields]);

  // Deselect all fields
  const handleDeselectAll = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  // Save data source
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Data source name is required');
      return;
    }

    if (!connectionValues.url.trim()) {
      setError('Connection URL is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {

      const config: DataSourceConfig = {
        id: dataSource?.id || generateConfigId('datasource'),
        name: dataSource?.name || name.toLowerCase().replace(/\s+/g, '-'),
        displayName: name,
        description,
        type: connectionValues.type,
        connection: {
          url: connectionValues.url,
          auth: connectionValues.auth,
          headers: connectionValues.headers,
          timeout: connectionValues.timeout,
          autoReconnect: connectionValues.autoReconnect,
          reconnectInterval: connectionValues.reconnectInterval,
        },
        settings: connectionValues.settings,
        // Pass STOMP settings to provider
        dataType: connectionValues.settings?.dataType,
        messageRate: connectionValues.settings?.messageRate,
        batchSize: connectionValues.settings?.batchSize,
        inferredFields,
        selectedFields: Array.from(selectedFields),
        columnDefs,
        keyColumn,
        createdAt: dataSource?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };


      await onSave(config);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save data source');
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    connectionValues,
    inferredFields,
    selectedFields,
    columnDefs,
    keyColumn,
    dataSource,
    onSave,
    onClose,
  ]);

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onClose}
      title={isEditing ? `Edit Data Source${name ? ' - ' + name : ''}` : 'Create Data Source'}
      defaultSize={{ width: 1000, height: 600 }}
      maxHeight={window.innerHeight * 0.85}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tabs - Start immediately after dialog header */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tab List - Topmost element */}
          <div className="flex-shrink-0 px-3 pt-1 pb-0 bg-background border-b">
            <TabsList className="h-8">
              <TabsTrigger value="connection" className="text-xs h-7">Connection</TabsTrigger>
              <TabsTrigger value="fields" className="relative text-xs h-7">
                Fields & Columns
                {inferredFields.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                    {inferredFields.length}
                  </Badge>
                )}
              </TabsTrigger>
              {isEditing && (
                <TabsTrigger value="statistics" className="text-xs h-7">Statistics</TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab Content - Scrollable area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="connection" className="h-full m-0 border-0 p-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <ConnectionConfigForm
                    values={connectionValues}
                    onChange={setConnectionValues}
                    name={name}
                    onNameChange={setName}
                    description={description}
                    onDescriptionChange={setDescription}
                    keyColumn={keyColumn}
                    onKeyColumnChange={setKeyColumn}
                    availableFields={inferredFields.length > 0 ? inferredFields.map(f => f.path) : []}
                    onTest={handleTestConnection}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="fields" className="h-full m-0 border-0 p-0">
              <FieldsAndColumnsPanel
                inferredFields={inferredFields}
                selectedFields={selectedFields}
                columnDefs={columnDefs}
                connectionUrl={connectionValues.url}
                inferringFields={inferringFields}
                onInferFields={handleInferFields}
                onFieldToggle={handleFieldToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onColumnDefsChange={setColumnDefs}
                className="h-full"
              />
            </TabsContent>

            {isEditing && (
              <TabsContent value="statistics" className="h-full m-0 border-0 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <DataSourceStatisticsPanel dataSourceId={dataSource.id} />
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Compact Footer - Fixed at bottom */}
        <div className="flex-shrink-0 px-3 py-1.5 border-t bg-background">
          {(error || (testResult && testResult.success)) && (
            <div className="mb-2">
              {error && (
                <Alert variant="destructive" className="py-1.5">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
              {testResult && testResult.success && (
                <Alert className="py-1.5">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">{testResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving} size="sm" className="h-7 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="h-7 text-xs">
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3 w-3" />
                  {isEditing ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DraggableDialog>
  );
}