import React, { useState, useCallback } from 'react';
import { DraggableDialog } from '@/components/ui-components/draggable-dialog';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Columns,
  Save,
  Copy,
  Trash2,
  Download,
  Upload,
  Share2,
  MoreVertical,
  Plus,
  Search,
  Filter,
  Palette,
  Type,
  Hash,
  Calendar,
  DollarSign,
  Percent,
  ToggleLeft,
  Link,
  Mail,
  Phone,
  Star,
  Layout,
  Settings,
  ChevronRight,
  Eye,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColDef } from 'ag-grid-community';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface ColumnTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  columns: Array<{
    field: string;
    headerName: string;
    colDef: Partial<ColDef>;
    format?: ColumnFormat;
  }>;
  tags?: string[];
  isBuiltIn?: boolean;
  isShared?: boolean;
  createdBy?: string;
  created: string;
  lastModified: string;
  usageCount?: number;
}

interface ColumnTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (template: ColumnTemplate) => void;
  onSaveTemplate?: (template: Omit<ColumnTemplate, 'id' | 'created' | 'lastModified'>) => Promise<ColumnTemplate>;
  onDeleteTemplate?: (id: string) => Promise<void>;
  onExportTemplate?: (template: ColumnTemplate) => Promise<Blob>;
  onImportTemplate?: (file: File) => Promise<ColumnTemplate>;
  currentColumns?: ColDef[];
}

const templateCategories = [
  { id: 'all', label: 'All Templates', icon: Layout },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: Hash },
  { id: 'contact', label: 'Contact', icon: Mail },
  { id: 'custom', label: 'Custom', icon: Settings },
  { id: 'shared', label: 'Shared', icon: Share2 },
];

// Mock templates for demo
const mockTemplates: ColumnTemplate[] = [
  {
    id: 't1',
    name: 'Financial Trading',
    description: 'Standard columns for trading data with price formatting',
    category: 'financial',
    isBuiltIn: true,
    columns: [
      {
        field: 'symbol',
        headerName: 'Symbol',
        colDef: { width: 100, pinned: 'left' },
      },
      {
        field: 'price',
        headerName: 'Price',
        colDef: { width: 120 },
        format: {
          dataType: 'currency',
          currencyFormat: {
            symbol: '$',
            symbolPosition: 'before',
            decimals: 2,
            thousandsSeparator: true,
          },
        },
      },
      {
        field: 'change',
        headerName: 'Change',
        colDef: { width: 100 },
        format: {
          dataType: 'percentage',
          numberFormat: {
            decimals: 2,
            showZero: true,
          },
          cellStyle: {
            textColor: '{{value}} > 0 ? "#10b981" : "#ef4444"',
          },
        },
      },
      {
        field: 'volume',
        headerName: 'Volume',
        colDef: { width: 120 },
        format: {
          dataType: 'number',
          numberFormat: {
            thousandsSeparator: true,
            decimals: 0,
          },
        },
      },
      {
        field: 'time',
        headerName: 'Time',
        colDef: { width: 100 },
        format: {
          dataType: 'datetime',
          dateFormat: {
            preset: 'time',
          },
        },
      },
    ],
    tags: ['trading', 'finance', 'realtime'],
    created: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    usageCount: 156,
  },
  {
    id: 't2',
    name: 'Contact List',
    description: 'Contact information with email and phone formatting',
    category: 'contact',
    isBuiltIn: true,
    columns: [
      {
        field: 'name',
        headerName: 'Name',
        colDef: { width: 200 },
      },
      {
        field: 'email',
        headerName: 'Email',
        colDef: { width: 250 },
        format: {
          displayFormat: 'email',
          cellStyle: {
            textColor: '#0066cc',
          },
        },
      },
      {
        field: 'phone',
        headerName: 'Phone',
        colDef: { width: 150 },
        format: {
          displayFormat: 'phone',
        },
      },
      {
        field: 'company',
        headerName: 'Company',
        colDef: { width: 200 },
      },
      {
        field: 'status',
        headerName: 'Status',
        colDef: { width: 120 },
        format: {
          statusIndicator: {
            type: 'icon',
            showText: true,
            position: 'left',
          },
        },
      },
    ],
    tags: ['contacts', 'crm'],
    created: '2024-01-05T00:00:00Z',
    lastModified: '2024-01-05T00:00:00Z',
    usageCount: 89,
  },
];

export const ColumnTemplateManager: React.FC<ColumnTemplateManagerProps> = ({
  open,
  onOpenChange,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onExportTemplate,
  onImportTemplate,
  currentColumns,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState<ColumnTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<ColumnTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ColumnTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<ColumnTemplate>>({
    name: '',
    description: '',
    category: 'custom',
    columns: [],
  });

  const filteredTemplates = templates.filter(template => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'shared') return template.isShared;
    return template.category === selectedCategory;
  });

  const handleTemplateSelect = useCallback((template: ColumnTemplate) => {
    setSelectedTemplate(template);
  }, []);

  const handleTemplateApply = useCallback(() => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate);
      onOpenChange(false);
    }
  }, [selectedTemplate, onApplyTemplate, onOpenChange]);

  const handleTemplateDuplicate = useCallback(async (template: ColumnTemplate) => {
    const newTemplate: ColumnTemplate = {
      ...template,
      id: `t${Date.now()}`,
      name: `${template.name} (Copy)`,
      isBuiltIn: false,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      usageCount: 0,
    };
    
    if (onSaveTemplate) {
      const saved = await onSaveTemplate(newTemplate);
      setTemplates([...templates, saved]);
    } else {
      setTemplates([...templates, newTemplate]);
    }
  }, [templates, onSaveTemplate]);

  const handleTemplateDelete = useCallback(async () => {
    if (!templateToDelete) return;
    
    if (onDeleteTemplate) {
      await onDeleteTemplate(templateToDelete.id);
    }
    
    setTemplates(templates.filter(t => t.id !== templateToDelete.id));
    setShowDeleteDialog(false);
    setTemplateToDelete(null);
    
    if (selectedTemplate?.id === templateToDelete.id) {
      setSelectedTemplate(null);
    }
  }, [templateToDelete, templates, selectedTemplate, onDeleteTemplate]);

  const handleTemplateExport = useCallback(async (template: ColumnTemplate) => {
    if (onExportTemplate) {
      const blob = await onExportTemplate(template);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-template.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [onExportTemplate]);

  const handleCreateFromCurrent = useCallback(() => {
    if (!currentColumns) return;
    
    setNewTemplate({
      name: 'New Template',
      description: '',
      category: 'custom',
      columns: currentColumns.map(col => ({
        field: col.field || '',
        headerName: col.headerName || col.field || '',
        colDef: {
          width: col.width,
          pinned: col.pinned,
          sortable: col.sortable,
          filter: col.filter,
          resizable: col.resizable,
        },
      })),
    });
    setShowCreateDialog(true);
  }, [currentColumns]);

  const renderTemplateList = () => (
    <div className="space-y-2">
      {filteredTemplates.map((template) => (
        <div
          key={template.id}
          className={cn(
            "p-3 rounded-lg border cursor-pointer transition-colors",
            selectedTemplate?.id === template.id
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
          onClick={() => handleTemplateSelect(template)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{template.name}</h4>
                {template.isBuiltIn && (
                  <Badge variant="secondary" className="text-xs">
                    Built-in
                  </Badge>
                )}
                {template.isShared && (
                  <Badge variant="outline" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {template.description}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-xs text-muted-foreground">
                  {template.columns.length} columns
                </div>
                {template.usageCount !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    Used {template.usageCount} times
                  </div>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateApply();
                  }}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Apply Template
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateDuplicate(template);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateExport(template);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                {!template.isBuiltIn && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToDelete(template);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
      
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No templates found</p>
        </div>
      )}
    </div>
  );

  const renderTemplatePreview = () => {
    if (!selectedTemplate) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Select a template to preview</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
          {selectedTemplate.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">COLUMNS ({selectedTemplate.columns.length})</h4>
          <div className="space-y-2">
            {selectedTemplate.columns.map((column, index) => (
              <div
                key={`${column.field}-${index}`}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{column.headerName}</span>
                    <span className="text-xs text-muted-foreground">({column.field})</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    {column.colDef.width && (
                      <span className="text-xs text-muted-foreground">
                        Width: {column.colDef.width}px
                      </span>
                    )}
                    {column.colDef.pinned && (
                      <Badge variant="outline" className="text-xs">
                        Pinned {column.colDef.pinned}
                      </Badge>
                    )}
                    {column.format?.dataType && (
                      <Badge variant="secondary" className="text-xs">
                        {column.format.dataType}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {column.format && (
                  <div className="flex items-center gap-1">
                    {column.format.dataType === 'currency' && <DollarSign className="h-4 w-4 text-muted-foreground" />}
                    {column.format.dataType === 'percentage' && <Percent className="h-4 w-4 text-muted-foreground" />}
                    {column.format.dataType === 'date' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                    {column.format.displayFormat === 'email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {column.format.displayFormat === 'phone' && <Phone className="h-4 w-4 text-muted-foreground" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => selectedTemplate && handleTemplateDuplicate(selectedTemplate)}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            onClick={handleTemplateApply}
            className="flex-1"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Apply Template
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <DraggableDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Column Template Manager"
        width={900}
        height={600}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="p-2">
              {templateCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedCategory === category.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <category.icon className="h-4 w-4" />
                  {category.label}
                </button>
              ))}
            </div>

            {/* Template List */}
            <ScrollArea className="flex-1 px-4 pb-4">
              {renderTemplateList()}
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t space-y-2">
              <Button
                className="w-full"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
              {currentColumns && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={handleCreateFromCurrent}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Current
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <ScrollArea className="h-full">
              {renderTemplatePreview()}
            </ScrollArea>
          </div>
        </div>
      </DraggableDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTemplateDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};