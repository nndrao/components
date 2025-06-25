/**
 * FieldSelector Component
 * 
 * Hierarchical field selector with search and multi-selection.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldInfo, FieldNode } from './types';
import { 
  fieldsToNodes, 
  filterFields, 
  getAllFieldPaths,
  formatSampleValue 
} from './utils/fieldInference';

interface FieldSelectorProps {
  /**
   * Inferred fields to display
   */
  fields: FieldInfo[];
  
  /**
   * Currently selected field paths
   */
  selectedFields: Set<string>;
  
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
   * Additional class name
   */
  className?: string;
}

export function FieldSelector({
  fields,
  selectedFields,
  onFieldToggle,
  onSelectAll,
  onDeselectAll,
  className,
}: FieldSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Convert fields to tree nodes
  const fieldNodes = useMemo(() => {
    return fieldsToNodes(fields);
  }, [fields]);

  // Filter fields based on search
  const filteredNodes = useMemo(() => {
    const filtered = filterFields(fieldNodes, searchTerm);
    
    // When searching, expand all matching nodes
    if (searchTerm) {
      const pathsToExpand = new Set<string>();
      
      function collectExpandedPaths(node: FieldNode) {
        if (node.children && node.children.length > 0) {
          pathsToExpand.add(node.path);
          node.children.forEach(collectExpandedPaths);
        }
      }
      
      filtered.forEach(collectExpandedPaths);
      setExpandedPaths(pathsToExpand);
    }
    
    return filtered;
  }, [fieldNodes, searchTerm]);

  // Get all available field paths
  const allFieldPaths = useMemo(() => {
    return getAllFieldPaths(fieldNodes);
  }, [fieldNodes]);

  // Toggle field expansion
  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Render a field node
  const renderFieldNode = (node: FieldNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedFields.has(node.path);

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-1.5 py-1 px-1.5 hover:bg-accent rounded-sm group",
            level > 0 && "ml-5"
          )}
        >
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(node.path)}
              className="p-0.5 hover:bg-accent-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onFieldToggle(node.path)}
            className="h-3 w-3"
          />

          {/* Field name and path */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{node.name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {node.type}
              </Badge>
              {node.nullable && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  nullable
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {node.path}
            </div>
          </div>

          {/* Sample value */}
          {node.sample !== undefined && !hasChildren && (
            <div className="text-[10px] text-muted-foreground truncate max-w-[150px] opacity-0 group-hover:opacity-100 transition-opacity">
              {formatSampleValue(node.sample, 25)}
            </div>
          )}
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderFieldNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedCount = selectedFields.size;
  const totalCount = allFieldPaths.length;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="space-y-2 pb-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedCount} of {totalCount} fields selected
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={selectedCount === totalCount}
              className="h-7 text-xs"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="h-7 text-xs"
            >
              <Square className="h-3 w-3 mr-1" />
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      {/* Field tree */}
      <ScrollArea className="flex-1 border rounded-md">
        <div className="p-2">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No fields match your search' : 'No fields available'}
            </div>
          ) : (
            filteredNodes.map(node => renderFieldNode(node))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}