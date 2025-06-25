/**
 * ColumnEditDialog Component
 * 
 * Dialog for adding or editing column definitions.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnDefinition } from './types';

interface ColumnEditDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;
  
  /**
   * Close dialog callback
   */
  onClose: () => void;
  
  /**
   * Column to edit (undefined for new column)
   */
  column?: ColumnDefinition;
  
  /**
   * Available field paths
   */
  availableFields: string[];
  
  /**
   * Save callback
   */
  onSave: (column: ColumnDefinition) => void;
}

export function ColumnEditDialog({
  open,
  onClose,
  column,
  availableFields,
  onSave,
}: ColumnEditDialogProps) {
  const isEditing = !!column;
  const [fieldPath, setFieldPath] = useState(column?.field || '');
  const [headerName, setHeaderName] = useState(column?.headerName || '');
  const [columnType, setColumnType] = useState(column?.type || 'string');
  const [fieldComboOpen, setFieldComboOpen] = useState(false);
  const [manualField, setManualField] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFieldPath(column?.field || '');
      setHeaderName(column?.headerName || '');
      setColumnType(column?.type || 'string');
      setManualField(!column && availableFields.length === 0);
    }
  }, [open, column, availableFields]);

  // Auto-generate header name from field path
  useEffect(() => {
    if (!isEditing && fieldPath && !headerName) {
      const parts = fieldPath.split('.');
      const generated = parts[parts.length - 1]
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
      setHeaderName(generated);
    }
  }, [fieldPath, headerName, isEditing]);

  const handleSave = () => {
    if (!fieldPath || !headerName) return;

    const columnDef: ColumnDefinition = {
      field: fieldPath,
      headerName,
      type: columnType,
      width: column?.width || 150,
      sortable: column?.sortable ?? true,
      filterable: column?.filterable ?? true,
    };

    onSave(columnDef);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Column' : 'Add Column'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Edit the column header name and type.'
              : 'Configure a new column for the data table.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Field Path - disabled when editing */}
          <div className="space-y-2">
            <Label htmlFor="field-path">Field Path</Label>
            {isEditing ? (
              <Input
                id="field-path"
                value={fieldPath}
                disabled
                className="bg-muted"
              />
            ) : (
              <>
                {availableFields.length > 0 && !manualField ? (
                  <Popover open={fieldComboOpen} onOpenChange={setFieldComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={fieldComboOpen}
                        className="w-full justify-between"
                      >
                        {fieldPath || "Select a field..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search fields..." />
                        <CommandEmpty>
                          <div className="p-2 text-sm">
                            No field found.
                            <Button
                              variant="link"
                              className="ml-1 p-0 h-auto"
                              onClick={() => {
                                setManualField(true);
                                setFieldComboOpen(false);
                              }}
                            >
                              Enter manually
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {availableFields.map((field) => (
                            <CommandItem
                              key={field}
                              value={field}
                              onSelect={(currentValue) => {
                                setFieldPath(currentValue);
                                setFieldComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  fieldPath === field ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {field}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    id="field-path"
                    value={fieldPath}
                    onChange={(e) => setFieldPath(e.target.value)}
                    placeholder="e.g., user.profile.name"
                  />
                )}
                {!isEditing && availableFields.length > 0 && manualField && (
                  <Button
                    variant="link"
                    className="text-xs p-0 h-auto"
                    onClick={() => setManualField(false)}
                  >
                    Select from available fields
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Header Name */}
          <div className="space-y-2">
            <Label htmlFor="header-name">Header Name</Label>
            <Input
              id="header-name"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              placeholder="e.g., User Name"
            />
          </div>

          {/* Column Type */}
          <div className="space-y-2">
            <Label htmlFor="column-type">Column Type</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger id="column-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="object">Object</SelectItem>
                <SelectItem value="array">Array</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!fieldPath || !headerName}
          >
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}