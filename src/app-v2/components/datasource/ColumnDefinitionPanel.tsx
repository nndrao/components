/**
 * ColumnDefinitionPanel Component
 * 
 * Panel for managing column definitions from selected fields.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnDefinition, FieldInfo } from './types';

interface ColumnDefinitionPanelProps {
  /**
   * Available fields
   */
  fields: FieldInfo[];
  
  /**
   * Selected field paths
   */
  selectedFields: string[];
  
  /**
   * Column definitions
   */
  columnDefs: ColumnDefinition[];
  
  /**
   * Update column definitions
   */
  onColumnDefsChange: (columnDefs: ColumnDefinition[]) => void;
  
  /**
   * Update selected fields
   */
  onSelectedFieldsChange: (fields: string[]) => void;
  
  /**
   * Additional class name
   */
  className?: string;
}

export function ColumnDefinitionPanel({
  fields,
  selectedFields,
  columnDefs,
  onColumnDefsChange,
  onSelectedFieldsChange,
  className,
}: ColumnDefinitionPanelProps) {
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);

  // Get field info by path
  const getFieldInfo = useCallback((path: string): FieldInfo | undefined => {
    return fields.find(f => f.path === path);
  }, [fields]);

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
  const handleAddFields = useCallback((fieldPaths: string[]) => {
    const newColumnDefs = [
      ...columnDefs,
      ...fieldPaths.map(path => createColumnDef(path)),
    ];
    onColumnDefsChange(newColumnDefs);
    
    // Remove from selected fields
    const remainingFields = selectedFields.filter(f => !fieldPaths.includes(f));
    onSelectedFieldsChange(remainingFields);
  }, [columnDefs, selectedFields, createColumnDef, onColumnDefsChange, onSelectedFieldsChange]);

  // Remove column
  const handleRemoveColumn = useCallback((index: number) => {
    const removedColumn = columnDefs[index];
    const newColumnDefs = columnDefs.filter((_, i) => i !== index);
    onColumnDefsChange(newColumnDefs);
    
    // Add back to selected fields
    onSelectedFieldsChange([...selectedFields, removedColumn.field]);
    setSelectedColumnIndex(null);
  }, [columnDefs, selectedFields, onColumnDefsChange, onSelectedFieldsChange]);

  // Move column
  const handleMoveColumn = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= columnDefs.length) return;
    
    const newColumnDefs = [...columnDefs];
    const [movedColumn] = newColumnDefs.splice(fromIndex, 1);
    newColumnDefs.splice(toIndex, 0, movedColumn);
    onColumnDefsChange(newColumnDefs);
    setSelectedColumnIndex(toIndex);
  }, [columnDefs, onColumnDefsChange]);

  // Update column property
  const handleUpdateColumn = useCallback(<K extends keyof ColumnDefinition>(
    index: number,
    field: K,
    value: ColumnDefinition[K]
  ) => {
    const newColumnDefs = [...columnDefs];
    newColumnDefs[index] = { ...newColumnDefs[index], [field]: value };
    onColumnDefsChange(newColumnDefs);
  }, [columnDefs, onColumnDefsChange]);

  const selectedColumn = selectedColumnIndex !== null ? columnDefs[selectedColumnIndex] : null;

  return (
    <div className={cn("grid grid-cols-2 gap-4 h-full", className)}>
      {/* Left Panel - Available Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Available Fields</CardTitle>
          <CardDescription>
            {selectedFields.length} fields selected
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-1">
              {selectedFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fields selected. Go to the Fields tab to select fields.
                </div>
              ) : (
                selectedFields.map(fieldPath => {
                  const fieldInfo = getFieldInfo(fieldPath);
                  return (
                    <div
                      key={fieldPath}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{fieldPath}</div>
                        {fieldInfo && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {fieldInfo.type}
                            </Badge>
                            {fieldInfo.nullable && (
                              <Badge variant="secondary" className="text-xs">
                                nullable
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddFields([fieldPath])}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {selectedFields.length > 0 && (
            <div className="p-4 border-t">
              <Button
                className="w-full"
                onClick={() => handleAddFields(selectedFields)}
              >
                Add All Fields
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel - Column Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Column Definitions</CardTitle>
          <CardDescription>
            {columnDefs.length} columns configured
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-1">
              {columnDefs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No columns defined. Add fields from the left panel.
                </div>
              ) : (
                columnDefs.map((column, index) => (
                  <div
                    key={`${column.field}-${index}`}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-sm cursor-pointer",
                      selectedColumnIndex === index
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setSelectedColumnIndex(index)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{column.headerName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {column.field}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveColumn(index, index - 1);
                        }}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveColumn(index, index + 1);
                        }}
                        disabled={index === columnDefs.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveColumn(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Column Settings */}
          {selectedColumn && (
            <div className="p-4 border-t space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                Column Settings
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="header-name" className="text-sm">
                    Header Name
                  </Label>
                  <Input
                    id="header-name"
                    value={selectedColumn.headerName}
                    onChange={(e) =>
                      handleUpdateColumn(selectedColumnIndex!, 'headerName', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="column-width" className="text-sm">
                    Width
                  </Label>
                  <Input
                    id="column-width"
                    type="number"
                    value={selectedColumn.width || 150}
                    onChange={(e) =>
                      handleUpdateColumn(selectedColumnIndex!, 'width', parseInt(e.target.value))
                    }
                    min={50}
                    max={500}
                    step={10}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sortable" className="text-sm">
                    Sortable
                  </Label>
                  <Switch
                    id="sortable"
                    checked={selectedColumn.sortable ?? true}
                    onCheckedChange={(checked) =>
                      handleUpdateColumn(selectedColumnIndex!, 'sortable', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="filterable" className="text-sm">
                    Filterable
                  </Label>
                  <Switch
                    id="filterable"
                    checked={selectedColumn.filterable ?? true}
                    onCheckedChange={(checked) =>
                      handleUpdateColumn(selectedColumnIndex!, 'filterable', checked)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}