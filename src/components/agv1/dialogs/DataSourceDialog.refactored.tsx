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
  Database,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  DataSourceConfig, 
  DataSourceType,
  WebSocketDataSourceConfig
} from '@/types/agv1/datasource.types';
import { inferFields, type InferredField } from '@/utils/field-inference';
import { useToast } from '@/hooks/use-toast';

// Enterprise Form Components
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b pb-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

interface FieldGroupProps {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

const FieldGroup: React.FC<FieldGroupProps> = ({
  columns = 1,
  children,
  className
}) => {
  return (
    <div 
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  required,
  help,
  error,
  children,
  className
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {help && !error && (
        <p className="text-xs text-muted-foreground">{help}</p>
      )}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Status indicator component
interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'error' | 'loading';
  message?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
  const statusConfig = {
    connected: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Connected'
    },
    disconnected: {
      icon: AlertCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/20',
      label: 'Disconnected'
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Error'
    },
    loading: {
      icon: RefreshCw,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      label: 'Connecting...'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
      config.bgColor
    )}>
      <Icon className={cn("h-4 w-4", config.color, status === 'loading' && 'animate-spin')} />
      <span className={cn("font-medium", config.color)}>
        {message || config.label}
      </span>
    </div>
  );
};

// Enhanced column edit popup with better styling
interface ColumnEditPopupProps {
  column: any;
  index: number;
  onSave: (index: number, updates: { headerName: string; type: string }) => void;
  onClose: () => void;
}

const ColumnEditPopup: React.FC<ColumnEditPopupProps> = ({ 
  column, 
  index, 
  onSave, 
  onClose 
}) => {
  const [headerName, setHeaderName] = useState(column.header);
  const [type, setType] = useState(column.type || 'textColumn');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 bg-background border rounded-xl shadow-xl w-full max-w-md">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Edit Column</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the column display properties
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <Field label="Field Name" help="This cannot be changed">
            <Input value={column.field} disabled />
          </Field>
          
          <Field label="Header Name" required>
            <Input 
              value={headerName} 
              onChange={(e) => setHeaderName(e.target.value)}
              placeholder="Enter column header..."
            />
          </Field>
          
          <Field label="Column Type" required>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="textColumn">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text
                  </div>
                </SelectItem>
                <SelectItem value="numericColumn">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Number
                  </div>
                </SelectItem>
                <SelectItem value="dateColumn">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </div>
                </SelectItem>
                <SelectItem value="booleanColumn">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4" />
                    Boolean
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            onSave(index, { headerName, type });
            onClose();
          }}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

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
  const [editingColumn, setEditingColumn] = useState<{ index: number; column: any } | null>(null);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  
  // Sample data for new datasources
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
      setColumnSearchQuery('');
      setShowAddColumn(false);
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
    
    setInferredFields(sampleFields);
    
    // Select all leaf fields by default
    const leafFields = collectLeafFieldPaths(sampleFields);
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
          // Create a capitalized header name from the field name
          const headerName = fieldInfo.name
            .split(/(?=[A-Z])/)
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          newColumns.push({
            field: fieldPath,
            headerName: headerName,
            type: fieldInfo.type === 'number' ? 'numericColumn' : 
                  fieldInfo.type === 'boolean' ? 'booleanColumn' :
                  fieldInfo.type === 'date' ? 'dateColumn' : 'textColumn'
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
                "flex items-center gap-3 min-h-[36px] px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors",
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
              
              {getTypeIcon(field.type || 'string')}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{field.name}</div>
                {field.path && field.path !== field.name && (
                  <div className="text-xs text-muted-foreground truncate">{field.path}</div>
                )}
              </div>
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
      header: col.headerName || col.field.split(/(?=[A-Z])/).map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      type: col.type || 'textColumn',
      path: col.field,
      headerName: col.headerName
    }));
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
      case 'numericColumn':
        return <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case 'date':
      case 'dateColumn':
        return <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case 'boolean':
      case 'booleanColumn':
        return <ToggleLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      default:
        return <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }
  };
  
  if (view === 'list') {
    return (
      <DraggableDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Data Sources"
        width={900}
        height={600}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Manage Data Sources</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure and monitor your data connections
                </p>
              </div>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Data Source
              </Button>
            </div>
          </div>
            
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                  <TableRow key={ds.id} className="group">
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ds.type === 'dummy' ? (
                          <Database className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Wifi className="h-4 w-4 text-primary" />
                        )}
                        <span>{ds.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-normal">
                          {ds.type.toUpperCase()}
                        </Badge>
                        {ds.autoConnect && (
                          <Badge variant="secondary" className="text-xs">
                            Auto-start
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {activeDatasources.includes(ds.id) ? (
                        <Badge className="gap-1.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">Jun 22, 2025</TableCell>
                    <TableCell className="text-muted-foreground">Jun 22, 2025</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {ds.type === 'dummy' ? 'View Details' : 'Edit'}
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
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(ds)}
                            disabled={ds.type === 'dummy'}
                            className={cn(
                              ds.type !== 'dummy' && "text-destructive focus:text-destructive"
                            )}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
  
  // Edit view with enhanced styling
  return (
    <>
      <DraggableDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`${isCreating ? 'New' : 'Edit'} ${
          formData.type === 'websocket' ? 'WebSocket' : 
          formData.type === 'dummy' ? 'Dummy' : 
          formData.type?.toUpperCase() || 'Data'
        } Data Source`}
        width={900}
        height={700}
      >
        <div className="flex flex-col h-full bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b">
              <TabsList className="h-12 p-0 bg-transparent rounded-none w-full justify-start">
                <TabsTrigger 
                  value="connection" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Connection
                </TabsTrigger>
                <TabsTrigger 
                  value="fields-columns" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <span>Fields & Columns</span>
                  {(inferredFields.length > 0 || getSelectedColumns().length > 0) && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {inferredFields.length}/{getSelectedColumns().length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="statistics" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Statistics
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="connection" className="h-full m-0 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <FormSection 
                    title="Basic Configuration"
                    description="Define the primary settings for your data source"
                  >
                    <FieldGroup columns={2}>
                      <Field 
                        label="Data Source Name" 
                        required
                        help="A unique identifier for this data source"
                      >
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Production WebSocket"
                        />
                      </Field>
                      
                      <Field label="Connection Type" required>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value) => setFormData({ ...formData, type: value as DataSourceType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="websocket">WebSocket</SelectItem>
                            <SelectItem value="rest">REST API</SelectItem>
                            <SelectItem value="dummy">Dummy (Test)</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                    
                    <Field label="Auto-connect on startup">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="autostart"
                          checked={formData.autoConnect}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoConnect: !!checked })}
                        />
                        <Label htmlFor="autostart" className="font-normal cursor-pointer">
                          Automatically establish connection when application starts
                        </Label>
                      </div>
                    </Field>
                  </FormSection>
                  
                  <FormSection 
                    title="Connection Details"
                    description="Configure the connection parameters"
                  >
                    <Field 
                      label="WebSocket URL" 
                      required
                      help="The WebSocket endpoint URL"
                    >
                      <Input
                        value={(formData.config as WebSocketDataSourceConfig)?.url || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: { ...formData.config, url: e.target.value }
                        })}
                        placeholder="ws://localhost:8080/socket"
                      />
                    </Field>
                    
                    <FieldGroup columns={2}>
                      <Field 
                        label="Listener Topic" 
                        required
                        help="Topic to subscribe for updates"
                      >
                        <Input
                          value={(formData.config as WebSocketDataSourceConfig)?.topic || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, topic: e.target.value }
                          })}
                          placeholder="/topic/updates"
                        />
                      </Field>
                      
                      <Field 
                        label="Request Message"
                        help="Initial message to request data"
                      >
                        <Input
                          value={(formData.config as WebSocketDataSourceConfig)?.requestMessage || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, requestMessage: e.target.value }
                          })}
                          placeholder="/app/subscribe"
                        />
                      </Field>
                    </FieldGroup>
                    
                    <FieldGroup columns={3}>
                      <Field 
                        label="Snapshot End Token"
                        help="Token indicating snapshot completion"
                      >
                        <Input
                          value={(formData.config as WebSocketDataSourceConfig)?.snapshotEndToken || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, snapshotEndToken: e.target.value }
                          })}
                          placeholder="END_OF_SNAPSHOT"
                        />
                      </Field>
                      
                      <Field 
                        label="Key Column"
                        help="Unique identifier field"
                      >
                        <Input
                          value={(formData.config as WebSocketDataSourceConfig)?.keyColumn || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, keyColumn: e.target.value }
                          })}
                          placeholder="id"
                        />
                      </Field>
                      
                      <Field 
                        label="Message Rate"
                        help="Messages per second"
                      >
                        <Input
                          type="number"
                          value={(formData.config as WebSocketDataSourceConfig)?.messageRate || 1000}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, messageRate: parseInt(e.target.value) || 1000 }
                          })}
                        />
                      </Field>
                    </FieldGroup>
                  </FormSection>
                  
                  <FormSection title="Connection Test">
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={handleTestConnection} 
                        disabled={testingConnection}
                        variant="outline"
                      >
                        {testingConnection ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                      
                      {connectionStatus !== 'disconnected' && (
                        <StatusIndicator 
                          status={testingConnection ? 'loading' : connectionStatus} 
                        />
                      )}
                    </div>
                  </FormSection>
                </div>
              </TabsContent>
              
              <TabsContent value="fields-columns" className="h-full m-0 p-6 overflow-hidden">
                <div className="flex gap-6 h-full">
                  {/* Left panel - Available Fields */}
                  <div className="flex-1 flex flex-col bg-muted/10 border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-background">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {inferredFields.length > 0 && (
                            <Checkbox
                              checked={selectedFields.size === collectLeafFieldPaths(inferredFields).size && selectedFields.size > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFields(collectLeafFieldPaths(inferredFields));
                                } else {
                                  setSelectedFields(new Set());
                                }
                              }}
                              title="Select/Deselect all fields"
                            />
                          )}
                          <span className="font-medium">Available Fields</span>
                          <Badge variant="secondary">{inferredFields.length}</Badge>
                        </div>
                        <Button onClick={handleInferFields} variant="outline" size="sm">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Infer Fields
                        </Button>
                      </div>
                    </div>
                    
                    {inferredFields.length > 0 && (
                      <div className="px-4 py-3 border-b bg-background">
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
                    
                    <div className="flex-1 overflow-y-auto p-3">
                      {inferredFields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                          <div className="rounded-full bg-muted p-3 mb-4">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="font-medium mb-2">No Fields Detected</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Click "Infer Fields" to automatically detect available fields from your data source
                          </p>
                          <Button onClick={handleInferFields} variant="outline" size="sm">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Infer Fields
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {renderFieldTree(inferredFields)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Middle - Transfer buttons */}
                  <div className="flex flex-col justify-center gap-2">
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
                  
                  {/* Right panel - Column Definitions */}
                  <div className="flex-1 flex flex-col bg-muted/10 border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-background">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSelectedColumns().length > 0 && (
                            <Checkbox
                              checked={selectedColumnIndices.size === getSelectedColumns().length && selectedColumnIndices.size > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allIndices = new Set<number>();
                                  getSelectedColumns().forEach((_: any, i: number) => allIndices.add(i));
                                  setSelectedColumnIndices(allIndices);
                                } else {
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
                    </div>
                    
                    {getSelectedColumns().length > 0 && (
                      <div className="px-4 py-3 border-b bg-background">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search columns..."
                            value={columnSearchQuery}
                            onChange={(e) => setColumnSearchQuery(e.target.value)}
                            className="pl-9 h-8"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 overflow-y-auto p-3">
                      {getSelectedColumns().length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                          <div className="rounded-full bg-muted p-3 mb-4">
                            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="font-medium mb-2">No Columns Defined</h3>
                          <p className="text-sm text-muted-foreground">
                            Select fields from the left panel and use the arrow buttons to create column definitions
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {getSelectedColumns()
                            .filter((col: any) => 
                              !columnSearchQuery || 
                              col.field.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
                              col.header.toLowerCase().includes(columnSearchQuery.toLowerCase())
                            )
                            .map((col: any, idx: number) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "flex items-center gap-3 min-h-[36px] px-3 py-2 hover:bg-accent rounded-md cursor-pointer transition-colors",
                                  selectedColumnIndices.has(idx) && "bg-accent"
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
                                
                                {getTypeIcon(col.type)}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{col.header}</div>
                                  <div className="text-xs text-muted-foreground truncate">{col.field}</div>
                                </div>
                                
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingColumn({ index: idx, column: col });
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="statistics" className="h-full m-0 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                  <FormSection title="Connection Statistics">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Wifi className="h-4 w-4" />
                            Connection Status
                          </div>
                          <StatusIndicator status="connected" message="Active Connection" />
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Uptime</div>
                          <div className="text-2xl font-semibold">2h 34m 12s</div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Total Connections</div>
                          <div className="text-2xl font-semibold">3</div>
                          <div className="text-sm text-muted-foreground">2 reconnections</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Last Activity</div>
                          <div className="text-sm">2 minutes ago</div>
                        </div>
                      </div>
                    </div>
                  </FormSection>
                  
                  <FormSection title="Data Statistics">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-3xl font-bold text-primary">20,456</div>
                        <div className="text-sm text-muted-foreground mt-1">Total Records</div>
                      </div>
                      
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">1,234</div>
                        <div className="text-sm text-muted-foreground mt-1">Updates/sec</div>
                      </div>
                      
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <div className="text-3xl font-bold text-orange-600">0.23ms</div>
                        <div className="text-sm text-muted-foreground mt-1">Avg Latency</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Snapshot Progress</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </FormSection>
                  
                  <FormSection 
                    title="Usage Information"
                    description="Components and services using this data source"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-medium">Trading Dashboard</div>
                            <div className="text-sm text-muted-foreground">Active for 2 hours</div>
                          </div>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Analytics Service</div>
                            <div className="text-sm text-muted-foreground">Disconnected</div>
                          </div>
                        </div>
                        <Badge variant="outline">Inactive</Badge>
                      </div>
                    </div>
                  </FormSection>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="border-t px-6 py-4 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Changes will be applied immediately</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setView('list')}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {isCreating ? 'Create' : 'Save'} Data Source
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DraggableDialog>
      
      {editingColumn && (
        <ColumnEditPopup
          column={editingColumn.column}
          index={editingColumn.index}
          onSave={(index, updates) => {
            const newColumns = [...(formData.config?.columnDefs || [])];
            newColumns[index] = { 
              ...newColumns[index], 
              headerName: updates.headerName,
              type: updates.type
            };
            setFormData({
              ...formData,
              config: {
                ...formData.config,
                columnDefs: newColumns
              }
            });
          }}
          onClose={() => setEditingColumn(null)}
        />
      )}
    </>
  );
}