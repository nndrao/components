import React, { useState, useCallback } from 'react';
import { ColDef } from 'ag-grid-community';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, EyeOff, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColumnVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColDef[];
  onApply: (columns: ColDef[]) => void;
}

interface ColumnState {
  field: string;
  headerName: string;
  visible: boolean;
  locked: boolean;
}

export const ColumnVisibilityDialog: React.FC<ColumnVisibilityDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onApply,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [columnStates, setColumnStates] = useState<ColumnState[]>(() =>
    columns.map(col => ({
      field: col.field || '',
      headerName: col.headerName || col.field || '',
      visible: col.hide !== true,
      locked: col.lockVisible === true,
    }))
  );

  const filteredColumns = columnStates.filter(col =>
    col.headerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    col.field.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleCount = columnStates.filter(col => col.visible).length;
  const totalCount = columnStates.length;

  const handleToggleColumn = useCallback((field: string) => {
    setColumnStates(prev =>
      prev.map(col =>
        col.field === field && !col.locked
          ? { ...col, visible: !col.visible }
          : col
      )
    );
  }, []);

  const handleToggleAll = useCallback((visible: boolean) => {
    setColumnStates(prev =>
      prev.map(col =>
        col.locked ? col : { ...col, visible }
      )
    );
  }, []);

  const handleApply = useCallback(() => {
    const updatedColumns = columns.map(col => {
      const state = columnStates.find(s => s.field === col.field);
      return {
        ...col,
        hide: state ? !state.visible : col.hide,
      };
    });
    onApply(updatedColumns);
    onOpenChange(false);
  }, [columns, columnStates, onApply, onOpenChange]);

  const handleReset = useCallback(() => {
    setColumnStates(
      columns.map(col => ({
        field: col.field || '',
        headerName: col.headerName || col.field || '',
        visible: col.hide !== true,
        locked: col.lockVisible === true,
      }))
    );
  }, [columns]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Column Visibility</DialogTitle>
          <DialogDescription>
            Choose which columns to show in the table
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {visibleCount} / {totalCount} visible
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(true)}
              >
                Show All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(false)}
              >
                Hide All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-4 space-y-2">
              {filteredColumns.map((column) => (
                <div
                  key={column.field}
                  className={cn(
                    "flex items-center space-x-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors",
                    column.locked && "opacity-60"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  
                  <Checkbox
                    id={column.field}
                    checked={column.visible}
                    onCheckedChange={() => handleToggleColumn(column.field)}
                    disabled={column.locked}
                  />
                  
                  <Label
                    htmlFor={column.field}
                    className="flex-1 cursor-pointer flex items-center gap-2"
                  >
                    <span>{column.headerName}</span>
                    {column.field !== column.headerName && (
                      <span className="text-xs text-muted-foreground">
                        ({column.field})
                      </span>
                    )}
                  </Label>
                  
                  {column.visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  {column.locked && (
                    <Badge variant="outline" className="text-xs">
                      Locked
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};