import React, { useState, useCallback, useEffect } from 'react';
import { DraggableDialog } from '@/components/ui-components/draggable-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MoreVertical, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Edit,
  Wifi,
  WifiOff,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
  ChevronsLeft,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  DataSourceConfig, 
  DataSourceType,
  WebSocketDataSourceConfig
} from '@/types/agv1/datasource.types';
import { inferFields, type InferredField } from '@/utils/field-inference';
import { useToast } from '@/hooks/use-toast';

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasources: DataSourceConfig[];
  activeDatasources?: string[];
  onCreateDatasource: (config: DataSourceConfig) => string;
  onUpdateDatasource: (id: string, updates: Partial<DataSourceConfig>) => void;
  onDeleteDatasource: (id: string) => void;
  onActivateDatasource?: (id: string) => Promise<void>;
  onDeactivateDatasource?: (id: string) => Promise<void>;
  onTestConnection?: (config: DataSourceConfig) => Promise<{ success: boolean; message: string }>;
  onInferFields?: (config: DataSourceConfig) => Promise<any[]>;
}

// Utility to collect only leaf field paths
function collectLeafFieldPaths(fields: InferredField[]): Set<string> {
  const leafPaths = new Set<string>();
  const collect = (fields: InferredField[]) => {
    fields.forEach(f => {
      if (!f.children || f.children.length === 0) {
        leafPaths.add(f.path || f.name);
      } else if (f.children) {
        collect(f.children);
      }
    });
  };
  collect(fields);
  return leafPaths;
}

export function DataSourceDialog({
  open,
  onOpenChange,
  datasources,
  activeDatasources = [],
  onCreateDatasource,
  onUpdateDatasource,
  onDeleteDatasource,
  onActivateDatasource,
  onDeactivateDatasource,
  onTestConnection,
  onInferFields
}: DataSourceDialogProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedDatasource, setSelectedDatasource] = useState<DataSourceConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Form state
  const [formData, setFormData] = useState<Partial<DataSourceConfig>>({
    name: '',
    type: 'websocket',
    autoConnect: true,
    config: {
      url: 'http://localhost:8080',
      protocol: 'stomp',
      topic: '/snapshot/positions',
      requestMessage: '/snapshot/positions/5000/50',
      snapshotEndToken: 'Success',
      keyColumn: 'positionId',
      messageRate: 1000
    }
  });
  
  // Fields state
  const [inferredFields, setInferredFields] = useState<InferredField[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<Set<number>>(new Set());
  
  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setView('list');
      setSelectedDatasource(null);
      setIsCreating(false);
      setActiveTab('connection');
      setInferredFields([]);
      setSelectedFields(new Set());
      setExpandedFields(new Set());
      setFieldSearchQuery('');
    }
  }, [open]);
  
  const handleCreate = useCallback(() => {
    setView('edit');
    setIsCreating(true);
    setSelectedDatasource(null);
    setFormData({
      name: '',
      type: 'websocket',
      autoConnect: true,
      config: {
        url: 'http://localhost:8080',
        protocol: 'stomp',
        topic: '/snapshot/positions',
        requestMessage: '/snapshot/positions/5000/50',
        snapshotEndToken: 'Success',
        keyColumn: 'positionId',
        messageRate: 1000
      }
    });
    
    // Add some sample fields for demonstration
    const sampleFields: InferredField[] = [
      {
        name: 'positionId',
        type: 'string',
        path: 'positionId'
      },
      {
        name: 'instrument',
        type: 'object',
        path: 'instrument',
        children: [
          { name: 'symbol', type: 'string', path: 'instrument.symbol' },
          { name: 'currency', type: 'string', path: 'instrument.currency' },
          { name: 'type', type: 'string', path: 'instrument.type' }
        ]
      },
      {
        name: 'quantity',
        type: 'number',
        path: 'quantity'
      },
      {
        name: 'price',
        type: 'number',
        path: 'price'
      },
      {
        name: 'value',
        type: 'number',
        path: 'value'
      },
      {
        name: 'analytics',
        type: 'object',
        path: 'analytics',
        children: [
          { name: 'pnl', type: 'number', path: 'analytics.pnl' },
          { name: 'exposure', type: 'number', path: 'analytics.exposure' },
          { name: 'risk', type: 'object', path: 'analytics.risk', children: [
            { name: 'beta', type: 'number', path: 'analytics.risk.beta' },
            { name: 'var', type: 'number', path: 'analytics.risk.var' }
          ]}
        ]
      },
      {
        name: 'timestamp',
        type: 'date',
        path: 'timestamp'
      }
    ];
    
    setInferredFields(sampleFields);
    
    // Select all leaf fields by default
    const leafFields = new Set<string>();
    const collectLeafFields = (fields: InferredField[]) => {
      fields.forEach(f => {
        if (!f.children || f.children.length === 0) {
          leafFields.add(f.path || f.name);
        } else if (f.children) {
          collectLeafFields(f.children);
        }
      });
    };
    collectLeafFields(sampleFields);
    setSelectedFields(leafFields);
  }, []);
  
  const handleEdit = useCallback((ds: DataSourceConfig) => {
    // Prevent editing dummy datasources
    if (ds.type === 'dummy') {
      toast({
        title: "Cannot Edit",
        description: "Dummy datasources are read-only and cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    
    setView('edit');
    setIsCreating(false);
    setSelectedDatasource(ds);
    setFormData(ds);
    // Load fields if available
    if (ds.type === 'websocket') {
      const wsConfig = ds.config as WebSocketDataSourceConfig;
      if (wsConfig.fields) {
        setInferredFields(wsConfig.fields as InferredField[]);
        setSelectedFields(collectLeafFieldPaths(wsConfig.fields as InferredField[]));
      }
    }
  }, []);
  
  const handleSave = useCallback(() => {
    if (!formData.name || !formData.type) return;
    
    try {
      const config = {
        ...formData,
        config: {
          ...formData.config,
          fields: inferredFields
        }
      } as DataSourceConfig;
      
      if (isCreating) {
        const id = onCreateDatasource(config);
        toast({
          title: "Success",
          description: `Data source "${config.name}" created successfully.`,
          variant: "default",
        });
        handleEdit({ ...config, id });
      } else if (selectedDatasource) {
        onUpdateDatasource(selectedDatasource.id, config);
        toast({
          title: "Success",
          description: `Data source "${config.name}" updated successfully.`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save data source",
        variant: "destructive",
      });
    }
  }, [formData, inferredFields, isCreating, selectedDatasource, onCreateDatasource, onUpdateDatasource, handleEdit, toast]);
  
  const handleDelete = useCallback((ds: DataSourceConfig) => {
    // Prevent deleting dummy datasources
    if (ds.type === 'dummy') {
      toast({
        title: "Cannot Delete",
        description: "Dummy datasources are built-in and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Delete datasource "${ds.name}"?`)) {
      try {
        onDeleteDatasource(ds.id);
        toast({
          title: "Success",
          description: `Data source "${ds.name}" deleted successfully.`,
          variant: "default",
        });
        if (selectedDatasource?.id === ds.id) {
          setView('list');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete data source",
          variant: "destructive",
        });
      }
    }
  }, [selectedDatasource, onDeleteDatasource, toast]);
  
  const handleTestConnection = useCallback(async () => {
    if (!onTestConnection || !formData) return;
    
    setTestingConnection(true);
    try {
      const result = await onTestConnection(formData as DataSourceConfig);
      setConnectionStatus(result.success ? 'connected' : 'error');
      
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  }, [formData, onTestConnection, toast]);
  
  const handleInferFields = useCallback(async () => {
    if (!onInferFields || !formData) return;
    try {
      const data = await onInferFields(formData as DataSourceConfig);
      const result = inferFields(data);
      setInferredFields(result.fields);
      setSelectedFields(collectLeafFieldPaths(result.fields));
      toast({
        title: "Success",
        description: `Found ${result.fields.length} fields in the data source.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to infer fields:', error);
      toast({
        title: "Error",
        description: "Failed to infer fields. Please check your connection settings.",
        variant: "destructive",
      });
    }
  }, [formData, onInferFields, toast]);

  const handleActivate = useCallback(async (ds: DataSourceConfig) => {
    if (!onActivateDatasource) return;
    
    try {
      await onActivateDatasource(ds.id);
      toast({
        title: "Success",
        description: `Data source "${ds.name}" activated successfully.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate data source",
        variant: "destructive",
      });
    }
  }, [onActivateDatasource, toast]);

  const handleDeactivate = useCallback(async (ds: DataSourceConfig) => {
    if (!onDeactivateDatasource) return;
    
    try {
      await onDeactivateDatasource(ds.id);
      toast({
        title: "Success",
        description: `Data source "${ds.name}" deactivated successfully.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate data source",
        variant: "destructive",
      });
    }
  }, [onDeactivateDatasource, toast]);
  
  // Helper functions for moving fields to columns
  const moveFieldsToColumns = useCallback((fieldPaths: string[]) => {
    const newColumns = [...(formData.config?.columnDefs || [])];
    
    fieldPaths.forEach(fieldPath => {
      // Check if column already exists
      if (!newColumns.find((col: any) => col.field === fieldPath)) {
        // Find the field info
        const findField = (fields: InferredField[], path: string): InferredField | null => {
          for (const field of fields) {
            if (field.path === path) return field;
            if (field.children) {
              const found = findField(field.children, path);
              if (found) return found;
            }
          }
          return null;
        };
        
        const fieldInfo = findField(inferredFields, fieldPath);
        if (fieldInfo && (!fieldInfo.children || fieldInfo.children.length === 0)) {
          newColumns.push({
            field: fieldPath,
            headerName: fieldInfo.name,
            type: fieldInfo.type === 'number' ? 'numericColumn' : 'textColumn'
          });
        }
      }
    });
    
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        columnDefs: newColumns
      }
    });
  }, [formData, inferredFields]);
  
  const removeColumnsToFields = useCallback((columnFields: string[]) => {
    const newColumns = (formData.config?.columnDefs || []).filter(
      (col: any) => !columnFields.includes(col.field)
    );
    
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        columnDefs: newColumns
      }
    });
  }, [formData]);

  const toggleFieldExpanded = (fieldPath: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldPath)) {
      newExpanded.delete(fieldPath);
    } else {
      newExpanded.add(fieldPath);
    }
    setExpandedFields(newExpanded);
  };
  
  const toggleFieldSelected = (fieldPath: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldPath)) {
      newSelected.delete(fieldPath);
    } else {
      newSelected.add(fieldPath);
    }
    setSelectedFields(newSelected);
  };
  
  const renderFieldTree = (fields: InferredField[], level = 0) => {
    return fields
      .filter(field => 
        !fieldSearchQuery || 
        field.name.toLowerCase().includes(fieldSearchQuery.toLowerCase())
      )
      .map((field) => {
        const fieldPath = field.path || field.name;
        const hasChildren = field.children && field.children.length > 0;
        const isExpanded = expandedFields.has(fieldPath);
        const isSelected = selectedFields.has(fieldPath);
        
        return (
          <div key={fieldPath}>
            <div 
              className={cn(
                "flex items-center gap-3 h-8 px-2 hover:bg-accent rounded-sm cursor-pointer",
                level > 0 && "ml-6"
              )}
              onClick={() => toggleFieldSelected(fieldPath)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFieldExpanded(fieldPath);
                  }}
                  className="p-0.5"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              {!hasChildren && <div className="w-5" />}
              
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleFieldSelected(fieldPath)}
                onClick={(e) => e.stopPropagation()}
              />
              
              <Badge variant="secondary" className="h-5 px-2 text-xs font-normal">
                {field.type}
              </Badge>
              
              <span className="text-sm flex-1">{field.name}</span>
            </div>
            
            {hasChildren && isExpanded && field.children && (
              <div>{renderFieldTree(field.children, level + 1)}</div>
            )}
          </div>
        );
      });
  };
  
  const getSelectedColumns = () => {
    // Return the actual column definitions from formData
    return (formData.config?.columnDefs || []).map((col: any) => ({
      field: col.field,
      header: col.headerName || col.field,
      type: col.type || 'textColumn',
      path: col.field,
      headerName: col.headerName
    }));
  };
  
  if (view === 'list') {
    return (
      <DraggableDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Datasources"
        width={850}
        height={500}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <p className="text-sm text-muted-foreground">
              Manage your data connections and configurations
            </p>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Datasource
            </Button>
          </div>
            
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasources.map((ds) => (
                  <TableRow key={ds.id}>
                    <TableCell>
                      <ChevronRight className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ds.type === 'dummy' ? (
                          <Database className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        {ds.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ds.autoConnect && <span className="text-xs">Auto-start</span>}
                        <Badge variant="secondary">{ds.type.toUpperCase()}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {activeDatasources.includes(ds.id) ? (
                        <Badge variant="default" className="gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>Jun 22, 2025</TableCell>
                    <TableCell>Jun 22, 2025</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {activeDatasources.includes(ds.id) ? (
                            <DropdownMenuItem 
                              onClick={() => handleDeactivate(ds)}
                              disabled={ds.type === 'dummy'}
                            >
                              <WifiOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleActivate(ds)}
                              disabled={ds.type === 'dummy'}
                            >
                              <Wifi className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => {
                              toast({
                                title: "Info",
                                description: "Refresh functionality coming soon.",
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEdit(ds)}
                            disabled={ds.type === 'dummy'}
                            className={ds.type === 'dummy' ? 'opacity-50' : ''}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit {ds.type === 'dummy' && '(Read-only)'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (ds.type === 'dummy') {
                                toast({
                                  title: "Cannot Duplicate",
                                  description: "Dummy datasources cannot be duplicated.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              try {
                                const newConfig = {
                                  ...ds,
                                  id: `${ds.id}-copy-${Date.now()}`,
                                  name: `${ds.name} (Copy)`
                                };
                                onCreateDatasource(newConfig);
                                toast({
                                  title: "Success",
                                  description: `Data source "${newConfig.name}" created successfully.`,
                                  variant: "default",
                                });
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to duplicate data source",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={ds.type === 'dummy'}
                            className={ds.type === 'dummy' ? 'opacity-50' : ''}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate {ds.type === 'dummy' && '(Not allowed)'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(ds)}
                            disabled={ds.type === 'dummy'}
                            className={ds.type === 'dummy' ? 'opacity-50' : 'text-red-600'}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete {ds.type === 'dummy' && '(Built-in)'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DraggableDialog>
    );
  }
  
  // Edit view
  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${isCreating ? 'New' : 'Edit'} ${
        formData.type === 'websocket' ? 'WebSocket' : 
        formData.type === 'dummy' ? 'Dummy' : 
        formData.type?.toUpperCase() || 'Data'
      } Datasource`}
      width={800}
      height={600}
    >
      <div className="flex flex-col h-full bg-background min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 w-full rounded-none border-b h-12 shrink-0">
            <TabsTrigger value="connection" className="rounded-none data-[state=active]:shadow-none data-[state=active]:bg-background">
              Connection
            </TabsTrigger>
            <TabsTrigger value="fields-columns" className="rounded-none data-[state=active]:shadow-none data-[state=active]:bg-background">
              Fields & Columns
              {(inferredFields.length > 0 || getSelectedColumns().length > 0) && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {inferredFields.length}/{getSelectedColumns().length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="statistics" className="rounded-none data-[state=active]:shadow-none data-[state=active]:bg-background">
              Statistics
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden min-h-0">
            <TabsContent value="connection" className="h-full m-0 p-6 overflow-y-auto">
              <div className="space-y-4 max-w-2xl">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="positions.DS"
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="url">WebSocket URL *</Label>
                  <Input
                    id="url"
                    value={(formData.config as WebSocketDataSourceConfig)?.url || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, url: e.target.value }
                    })}
                    placeholder="http://localhost:8080"
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="topic">Listener Topic *</Label>
                  <Input
                    id="topic"
                    value={(formData.config as WebSocketDataSourceConfig)?.topic || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, topic: e.target.value }
                    })}
                    placeholder="/snapshot/positions"
                    className="mt-1.5"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="request">Request Message</Label>
                    <Input
                      id="request"
                      value={(formData.config as WebSocketDataSourceConfig)?.requestMessage || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, requestMessage: e.target.value }
                      })}
                      placeholder="/snapshot/positions/5000/50"
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="token">Snapshot End Token</Label>
                    <Input
                      id="token"
                      value={(formData.config as WebSocketDataSourceConfig)?.snapshotEndToken || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, snapshotEndToken: e.target.value }
                      })}
                      placeholder="Success"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="key">Key Column</Label>
                    <Input
                      id="key"
                      value={(formData.config as WebSocketDataSourceConfig)?.keyColumn || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, keyColumn: e.target.value }
                      })}
                      placeholder="positionId"
                      className="mt-1.5"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="rate">Message Rate (msg/s)</Label>
                    <Input
                      id="rate"
                      type="number"
                      value={(formData.config as WebSocketDataSourceConfig)?.messageRate || 1000}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, messageRate: parseInt(e.target.value) || 1000 }
                      })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="autostart"
                    checked={formData.autoConnect}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoConnect: !!checked })}
                  />
                  <Label htmlFor="autostart" className="font-normal cursor-pointer">
                    Auto-start on application load
                  </Label>
                </div>
                
                <div className="pt-2">
                  <Button onClick={handleTestConnection} disabled={testingConnection}>
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {connectionStatus === 'connected' && (
                    <span className="text-sm text-green-600 ml-3">
                      ✓ Connected successfully
                    </span>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fields-columns" className="h-full m-0 p-6 overflow-hidden">
              <div className="flex gap-4 h-full">
                {/* Left side - Inferred Fields */}
                <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      {inferredFields.length > 0 && (
                        <Checkbox
                          checked={selectedFields.size === collectLeafFieldPaths(inferredFields).size && selectedFields.size > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Select all leaf fields
                              setSelectedFields(collectLeafFieldPaths(inferredFields));
                            } else {
                              // Deselect all
                              setSelectedFields(new Set());
                            }
                          }}
                          title="Select/Deselect all fields"
                        />
                      )}
                      <span className="font-medium">Inferred Fields</span>
                      <Badge variant="secondary">{inferredFields.length}</Badge>
                    </div>
                    <Button onClick={handleInferFields} variant="outline" size="sm">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Infer
                    </Button>
                  </div>
                  
                  {inferredFields.length > 0 && (
                    <div className="px-4 py-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search fields..."
                          value={fieldSearchQuery}
                          onChange={(e) => setFieldSearchQuery(e.target.value)}
                          className="pl-9 h-8"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {inferredFields.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          Click "Infer" to detect fields
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {renderFieldTree(inferredFields)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Middle - Action Buttons */}
                <div className="flex flex-col justify-center gap-2 px-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const selected = Array.from(selectedFields);
                      moveFieldsToColumns(selected);
                      setSelectedFields(new Set());
                    }}
                    disabled={selectedFields.size === 0}
                    title="Move selected fields to columns"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const allLeafPaths = Array.from(collectLeafFieldPaths(inferredFields));
                      moveFieldsToColumns(allLeafPaths);
                      setSelectedFields(new Set());
                    }}
                    disabled={inferredFields.length === 0}
                    title="Move all fields to columns"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                  <div className="h-4" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const selectedColumns = getSelectedColumns()
                        .filter((_: any, idx: number) => selectedColumnIndices.has(idx))
                        .map((col: any) => col.field);
                      removeColumnsToFields(selectedColumns);
                      setSelectedColumnIndices(new Set());
                    }}
                    disabled={selectedColumnIndices.size === 0}
                    title="Remove selected columns"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          columnDefs: []
                        }
                      });
                      setSelectedColumnIndices(new Set());
                    }}
                    disabled={!formData.config?.columnDefs || formData.config.columnDefs.length === 0}
                    title="Remove all columns"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Right side - Column Definitions */}
                <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      {getSelectedColumns().length > 0 && (
                        <Checkbox
                          checked={selectedColumnIndices.size === getSelectedColumns().length && selectedColumnIndices.size > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              // Select all columns
                              const allIndices = new Set<number>();
                              getSelectedColumns().forEach((_: any, i: number) => allIndices.add(i));
                              setSelectedColumnIndices(allIndices);
                            } else {
                              // Deselect all
                              setSelectedColumnIndices(new Set());
                            }
                          }}
                          title="Select/Deselect all columns"
                        />
                      )}
                      <span className="font-medium">Column Definitions</span>
                      <Badge variant="secondary">{getSelectedColumns().length}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Field name</TableHead>
                      <TableHead>Header name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSelectedColumns().map((col: any, idx: number) => (
                      <TableRow 
                        key={idx}
                        className={cn(
                          "cursor-pointer",
                          selectedColumnIndices.has(idx) && "bg-muted/50"
                        )}
                        onClick={() => {
                          const newSelected = new Set(selectedColumnIndices);
                          if (newSelected.has(idx)) {
                            newSelected.delete(idx);
                          } else {
                            newSelected.add(idx);
                          }
                          setSelectedColumnIndices(newSelected);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={selectedColumnIndices.has(idx)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedColumnIndices);
                                if (checked) {
                                  newSelected.add(idx);
                                } else {
                                  newSelected.delete(idx);
                                }
                                setSelectedColumnIndices(newSelected);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <div className="font-medium">{col.field}</div>
                              <div className="text-xs text-muted-foreground">{col.path || col.field}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={col.header} 
                            onChange={(e) => {
                              const newColumns = [...(formData.config?.columnDefs || [])];
                              newColumns[idx] = { ...col, headerName: e.target.value };
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  columnDefs: newColumns
                                }
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-7"
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={col.type || 'textColumn'}
                            onValueChange={(value) => {
                              const newColumns = [...(formData.config?.columnDefs || [])];
                              newColumns[idx] = { ...col, type: value };
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  columnDefs: newColumns
                                }
                              });
                            }}
                          >
                            <SelectTrigger className="h-7 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="textColumn">Text</SelectItem>
                              <SelectItem value="numericColumn">Number</SelectItem>
                              <SelectItem value="dateColumn">Date</SelectItem>
                              <SelectItem value="booleanColumn">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newColumns = (formData.config?.columnDefs || []).filter((_: any, i: number) => i !== idx);
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  columnDefs: newColumns
                                }
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getSelectedColumns().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="text-muted-foreground">
                            <div>
                              <ArrowLeft className="h-8 w-8 mx-auto mb-3 opacity-50" />
                              <h3 className="font-medium mb-2">No Column Definitions</h3>
                              <p className="text-sm">
                                Select fields from the left and click the arrow buttons to add columns.
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
            </TabsContent>
            
            <TabsContent value="statistics" className="h-full m-0 p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Connection Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Wifi className="h-4 w-4" />
                        Connection Status
                      </div>
                      <div className="text-2xl font-semibold text-green-600">Connected</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Total Connections</div>
                      <div className="text-2xl font-semibold">1</div>
                      <div className="text-sm text-muted-foreground">Disconnections: 0</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Data Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Snapshot Rows</div>
                      <div className="text-2xl font-semibold">20,000</div>
                      <div className="text-sm text-muted-foreground">Duration: 706s</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Update Rows</div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-sm text-muted-foreground">Real-time updates</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Component Usage</h3>
                  <div className="text-lg">1 components connected</div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setView('list')}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isCreating ? 'Create' : 'Update'} Datasource
          </Button>
        </div>
      </div>
    </DraggableDialog>
  );
}