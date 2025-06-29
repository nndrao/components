/**
 * FieldsAndColumnsPanel Component
 * 
 * Unified panel for field selection and column management.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Plus,
  Search,
  Play,
  Loader2,
  Database,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FieldSelector } from './FieldSelector';
import { ColumnEditDialog } from './ColumnEditDialog';
import { ColumnDefinition, FieldInfo } from './types';

interface FieldsAndColumnsPanelProps {
  /**
   * Inferred fields
   */
  inferredFields: FieldInfo[];
  
  /**
   * Selected field paths
   */
  selectedFields: Set<string>;
  
  /**
   * Column definitions
   */
  columnDefs: ColumnDefinition[];
  
  /**
   * Connection URL (to check if inference is possible)
   */
  connectionUrl?: string;
  
  /**
   * Is inferring fields
   */
  inferringFields: boolean;
  
  /**
   * Callback to infer fields
   */
  onInferFields: () => void;
  
  /**
   * Callback when field selection changes
   */
  onFieldToggle: (fieldPath: string) => void;
  
  /**
   * Callback to select all fields
   */
  onSelectAll: () => void;
  
  /**
   * Callback to deselect all fields
   */
  onDeselectAll: () => void;
  
  /**
   * Update column definitions
   */
  onColumnDefsChange: (columnDefs: ColumnDefinition[]) => void;
  
  /**
   * Additional class name
   */
  className?: string;
}

export function FieldsAndColumnsPanel({
  inferredFields,
  selectedFields,
  columnDefs,
  connectionUrl,
  inferringFields,
  onInferFields,
  onFieldToggle,
  onSelectAll,
  onDeselectAll,
  onColumnDefsChange,
  className,
}: FieldsAndColumnsPanelProps) {
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<Set<number>>(new Set());
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | undefined>();
  const [showColumnDialog, setShowColumnDialog] = useState(false);

  // Get all field paths for column edit dialog
  const allFieldPaths = useMemo(() => {
    const paths: string[] = [];
    const extractPaths = (fields: FieldInfo[]) => {
      fields.forEach(field => {
        paths.push(field.path);
        if (field.children) {
          extractPaths(field.children);
        }
      });
    };
    extractPaths(inferredFields);
    return paths;
  }, [inferredFields]);


  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!columnSearchTerm) return columnDefs;
    const term = columnSearchTerm.toLowerCase();
    return columnDefs.filter(col => 
      col.headerName.toLowerCase().includes(term) ||
      col.field.toLowerCase().includes(term)
    );
  }, [columnDefs, columnSearchTerm]);

  // Get field info by path
  const getFieldInfo = useCallback((path: string): FieldInfo | undefined => {
    const findField = (fields: FieldInfo[]): FieldInfo | undefined => {
      for (const field of fields) {
        if (field.path === path) return field;
        if (field.children) {
          const found = findField(field.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findField(inferredFields);
  }, [inferredFields]);

  // Create column definition from field
  const createColumnDef = useCallback((fieldPath: string): ColumnDefinition => {
    const fieldInfo = getFieldInfo(fieldPath);
    const parts = fieldPath.split('.');
    const headerName = parts[parts.length - 1]
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();

    return {
      field: fieldPath,
      headerName,
      width: 150,
      sortable: true,
      filterable: true,
      type: fieldInfo?.type,
    };
  }, [getFieldInfo]);

  // Add fields to columns
  const handleAddFieldsToColumns = useCallback(() => {
    const selectedFieldsList = Array.from(selectedFields);
    const newColumns = selectedFieldsList
      .filter(field => !columnDefs.some(col => col.field === field))
      .map(field => createColumnDef(field));
    
    
    if (newColumns.length > 0) {
      const updatedColumnDefs = [...columnDefs, ...newColumns];
      onColumnDefsChange(updatedColumnDefs);
      // Clear selection after adding
      onDeselectAll();
    }
  }, [selectedFields, columnDefs, createColumnDef, onColumnDefsChange, onDeselectAll]);

  // Remove column
  const handleRemoveColumn = useCallback((index: number) => {
    const newColumnDefs = columnDefs.filter((_, i) => i !== index);
    onColumnDefsChange(newColumnDefs);
    setSelectedColumnIndex(null);
  }, [columnDefs, onColumnDefsChange]);

  // Move column
  const handleMoveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= columnDefs.length) return;
    
    const newColumnDefs = [...columnDefs];
    const [movedColumn] = newColumnDefs.splice(fromIndex, 1);
    newColumnDefs.splice(toIndex, 0, movedColumn);
    onColumnDefsChange(newColumnDefs);
    setSelectedColumnIndex(toIndex);
  }, [columnDefs, onColumnDefsChange]);

  // Handle column save from dialog
  const handleColumnSave = useCallback((column: ColumnDefinition) => {
    if (editingColumn) {
      // Update existing column
      const index = columnDefs.findIndex(col => col.field === editingColumn.field);
      if (index >= 0) {
        const newColumnDefs = [...columnDefs];
        newColumnDefs[index] = { ...newColumnDefs[index], ...column };
        onColumnDefsChange(newColumnDefs);
      }
    } else {
      // Add new column
      onColumnDefsChange([...columnDefs, column]);
    }
    setEditingColumn(undefined);
    setShowColumnDialog(false);
  }, [columnDefs, editingColumn, onColumnDefsChange]);

  // Toggle column selection
  const handleColumnSelection = useCallback((index: number) => {
    setSelectedColumnIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Select all columns
  const handleSelectAllColumns = useCallback(() => {
    setSelectedColumnIndices(new Set(columnDefs.map((_, index) => index)));
  }, [columnDefs]);

  // Deselect all columns
  const handleDeselectAllColumns = useCallback(() => {
    setSelectedColumnIndices(new Set());
  }, []);

  // Remove selected columns back to fields
  const handleRemoveColumnsToFields = useCallback(() => {
    const indicesToRemove = Array.from(selectedColumnIndices).sort((a, b) => b - a);
    const newColumnDefs = columnDefs.filter((_, index) => !selectedColumnIndices.has(index));
    onColumnDefsChange(newColumnDefs);
    setSelectedColumnIndices(new Set());
    setSelectedColumnIndex(null);
  }, [columnDefs, selectedColumnIndices, onColumnDefsChange]);

  if (inferredFields.length === 0) {
    // Empty state - prompt to infer fields
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <Database className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">No fields inferred yet</p>
          <p className="text-sm text-muted-foreground">
            Click the button below to connect and analyze your data structure
          </p>
        </div>
        <Button
          size="lg"
          onClick={onInferFields}
          disabled={!connectionUrl || inferringFields}
        >
          {inferringFields ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inferring Fields...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Infer Fields from Data
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Three-column layout with controls in middle */}
      <div className="flex gap-2 flex-1 min-h-0 p-3">
        {/* Left Panel - Field Selector */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-medium">Available Fields</h4>
              <p className="text-[10px] text-muted-foreground">
                Select fields to use as columns
                {selectedFields.size === 0 && (
                  <span className="text-blue-500 ml-1">• Start by selecting fields</span>
                )}
              </p>
            </div>
            <Button
              onClick={onInferFields}
              disabled={inferringFields}
              size="sm"
              className="h-6 text-[11px] px-2"
            >
              {inferringFields ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Re-infer
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Re-infer
                </>
              )}
            </Button>
          </div>
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="flex-1 min-h-0 p-2">
              <FieldSelector
                fields={inferredFields}
                selectedFields={selectedFields}
                onFieldToggle={onFieldToggle}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Middle Controls */}
        <div className="flex flex-col justify-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddFieldsToColumns}
            disabled={selectedFields.size === 0}
            title="Add selected fields to columns"
            className="h-8 w-8"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRemoveColumnsToFields}
            disabled={selectedColumnIndices.size === 0}
            title="Remove selected columns"
            className="h-8 w-8"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </div>

        {/* Right Panel - Column Definitions */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="mb-1.5">
            <h4 className="text-xs font-medium">Column Definitions</h4>
            <p className="text-[10px] text-muted-foreground">
              {columnDefs.length} columns configured
              {selectedFields.size > 0 && columnDefs.length === 0 && (
                <span className="text-orange-500 ml-1">
                  • Click arrow to add selected fields
                </span>
              )}
            </p>
          </div>
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="p-2 border-b">
              <div className="space-y-1.5">
                {/* Select controls */}
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllColumns}
                    disabled={columnDefs.length === 0}
                    className="flex-1 h-6 text-[11px] px-2"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllColumns}
                    disabled={selectedColumnIndices.size === 0}
                    className="flex-1 h-6 text-[11px] px-2"
                  >
                    Clear
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search columns..."
                    value={columnSearchTerm}
                    onChange={(e) => setColumnSearchTerm(e.target.value)}
                    className="pl-7 h-6 text-xs"
                  />
                </div>
                <div className="flex gap-1.5">
                  <Button
                    className="flex-1 h-6 text-[11px]"
                    variant="outline"
                    onClick={() => {
                      setEditingColumn(undefined);
                      setShowColumnDialog(true);
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Column
                  </Button>
                  <Button
                    className="flex-1 h-6 text-[11px]"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Are you sure you want to clear all ${columnDefs.length} column definitions? This cannot be undone.`)) {
                        onColumnDefsChange([]);
                        setSelectedColumnIndices(new Set());
                        setSelectedColumnIndex(null);
                      }
                    }}
                    disabled={columnDefs.length === 0}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              {/* Column List */}
              <ScrollArea className="h-full">
                <div className="p-2 space-y-0.5">
                {filteredColumns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {columnDefs.length === 0
                      ? "No columns defined. Select fields from the left panel and click the → arrow to add them here."
                      : "No columns match your search."}
                  </div>
                ) : (
                  filteredColumns.map((column, index) => {
                    const actualIndex = columnDefs.indexOf(column);
                    return (
                      <div
                        key={`${column.field}-${index}`}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded-sm cursor-pointer group",
                          selectedColumnIndex === actualIndex
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                        onClick={() => setSelectedColumnIndex(actualIndex)}
                      >
                        <Checkbox
                          checked={selectedColumnIndices.has(actualIndex)}
                          onCheckedChange={() => handleColumnSelection(actualIndex)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3 w-3"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{column.headerName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {column.field}
                            {column.type && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                {column.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingColumn(column);
                              setShowColumnDialog(true);
                            }}
                            className="h-6 w-6"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveColumn(actualIndex, actualIndex - 1);
                            }}
                            disabled={actualIndex === 0}
                            className="h-6 w-6"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveColumn(actualIndex, actualIndex + 1);
                            }}
                            disabled={actualIndex === columnDefs.length - 1}
                            className="h-6 w-6"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveColumn(actualIndex);
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Column Edit Dialog */}
      <ColumnEditDialog
        open={showColumnDialog}
        onClose={() => {
          setShowColumnDialog(false);
          setEditingColumn(undefined);
        }}
        column={editingColumn}
        availableFields={allFieldPaths}
        onSave={handleColumnSave}
      />
    </div>
  );
}