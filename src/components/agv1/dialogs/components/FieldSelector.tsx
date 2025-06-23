/**
 * Field Selector Component
 * 
 * Displays a hierarchical tree of fields with checkboxes for selection.
 * Used in the DataSource configuration dialog for field mapping.
 */

import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Database, Hash, Calendar, ToggleLeft, Type, Code, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InferredField } from '@/utils/field-inference';
import { flattenFields, updateFieldSelection, updateFieldExpansion } from '@/utils/field-inference';

interface FieldSelectorProps {
  fields: InferredField[];
  onFieldsChange: (fields: InferredField[]) => void;
  className?: string;
  searchQuery?: string;
}

const fieldTypeIcons: Record<string, React.ComponentType<any>> = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  object: Code,
  array: List,
};

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  fields,
  onFieldsChange,
  className,
  searchQuery = ''
}) => {
  const flattenedFields = useMemo(() => flattenFields(fields), [fields]);
  
  // Filter fields based on search query
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return flattenedFields;
    
    const query = searchQuery.toLowerCase();
    return flattenedFields.filter(field => {
      const nameMatch = field.name.toLowerCase().includes(query);
      const pathMatch = field.path?.toLowerCase().includes(query) || false;
      const typeMatch = field.type.toLowerCase().includes(query);
      return nameMatch || pathMatch || typeMatch;
    });
  }, [flattenedFields, searchQuery]);
  
  const handleSelectAll = () => {
    const newFields = fields.map(field => updateAllSelection(field, true));
    onFieldsChange(newFields);
  };
  
  const handleDeselectAll = () => {
    const newFields = fields.map(field => updateAllSelection(field, false));
    onFieldsChange(newFields);
  };
  
  const updateAllSelection = (field: InferredField, selected: boolean): InferredField => {
    const updated = { ...field, selected };
    if (field.children) {
      updated.children = field.children.map(child => updateAllSelection(child, selected));
    }
    return updated;
  };
  
  const handleToggleExpand = (path: string) => {
    const newFields = updateFieldExpansion(fields, path, true);
    onFieldsChange(newFields);
  };
  
  const handleToggleCollapse = (path: string) => {
    const newFields = updateFieldExpansion(fields, path, false);
    onFieldsChange(newFields);
  };
  
  const handleToggleSelect = (path: string, selected: boolean) => {
    const newFields = updateFieldSelection(fields, path, selected);
    onFieldsChange(newFields);
  };
  
  const getFieldIcon = (type: InferredField['type']) => {
    const Icon = fieldTypeIcons[type] || Database;
    return <Icon className="h-3 w-3" />;
  };
  
  const formatSampleValue = (value: any, type: InferredField['type']): string => {
    if (value === null || value === undefined) return 'null';
    
    switch (type) {
      case 'string':
        return `"${value.length > 20 ? value.substring(0, 20) + '...' : value}"`;
      case 'number':
        return value.toString();
      case 'boolean':
        return value ? 'true' : 'false';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'array':
        return `[${Array.isArray(value) ? value.length : 0} items]`;
      case 'object':
        return '{...}';
      default:
        return String(value);
    }
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">
          {flattenedFields.filter(f => f.selected).length} / {flattenedFields.length} fields selected
          {searchQuery && ` (${filteredFields.length} matching)`}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button size="sm" variant="outline" onClick={handleDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredFields.map((field) => {
            const hasChildren = field.children && field.children.length > 0;
            const isExpanded = field.expanded;
            const fieldKey = field.path || field.name;
            
            return (
              <div
                key={fieldKey}
                className={cn(
                  "flex items-start py-1.5 px-2 hover:bg-accent/50 rounded-sm",
                  "transition-colors duration-200"
                )}
                style={{ paddingLeft: `${field.level * 20 + 8}px` }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {hasChildren && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={() => isExpanded ? handleToggleCollapse(fieldKey) : handleToggleExpand(fieldKey)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  
                  {!hasChildren && <div className="w-4" />}
                  
                  <Checkbox
                    checked={field.selected}
                    onCheckedChange={(checked) => handleToggleSelect(fieldKey, checked as boolean)}
                    className="mr-2"
                  />
                  
                  {getFieldIcon(field.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {field.name.split('.').pop() || field.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({field.type})
                      </span>
                    </div>
                    {field.sample !== undefined && (
                      <div className="text-xs text-muted-foreground truncate">
                        {formatSampleValue(field.sample, field.type)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Select fields to include in the data table. Nested objects can be expanded to access child fields.
        </p>
      </div>
    </div>
  );
};