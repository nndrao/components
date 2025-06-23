import React, { useState, useCallback } from 'react';
import { ColDef } from 'ag-grid-community';
import { DraggableDialog } from '@/components/ui-components/draggable-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnFormat } from '@/types/agv1/common.types';

// Import tab components
import { StylingTab } from './tabs/StylingTab';
import { FormatTab } from './tabs/FormatTab';
import { GeneralTab } from './tabs/GeneralTab';
import { FilterTab } from './tabs/FilterTab';
import { EditorTab } from './tabs/EditorTab';

interface ColumnFormattingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColDef[];
  selectedColumns?: string[];
  currentFormats?: Record<string, ColumnFormat>;
  onApply: (formats: Record<string, ColumnFormat>) => void;
  onApplyAll?: (format: ColumnFormat) => void;
  onCancel?: () => void;
}

const defaultFormat: ColumnFormat = {
  dataType: 'string',
  displayFormat: 'text',
  textAlignment: 'left',
  cellStyle: {
    backgroundColor: undefined,
    textColor: undefined,
    fontWeight: 'normal',
    fontSize: 13,
  },
  wordWrap: false,
};

export const ColumnFormattingDialogV2: React.FC<ColumnFormattingDialogProps> = ({
  open,
  onOpenChange,
  columns,
  selectedColumns: initialSelected = [],
  currentFormats = {},
  onApply,
  onApplyAll,
  onCancel,
}) => {
  const [selectedCols, setSelectedCols] = useState<string[]>(
    initialSelected.length > 0 ? initialSelected : columns.slice(0, 1).map(c => c.field || '')
  );
  const [formats, setFormats] = useState<Record<string, ColumnFormat>>(currentFormats);
  const [activeTab, setActiveTab] = useState('styling');
  const [searchQuery, setSearchQuery] = useState('');

  // Get current format for selected columns
  const currentFormat = selectedCols.length > 0 
    ? formats[selectedCols[0]] || defaultFormat 
    : defaultFormat;

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedCols(columns.map(col => col.field || ''));
    } else {
      setSelectedCols([]);
    }
  }, [columns]);

  const handleToggleColumn = useCallback((field: string) => {
    setSelectedCols(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  }, []);

  const handleApply = useCallback(() => {
    // Apply format to selected columns
    const updatedFormats = { ...formats };
    selectedCols.forEach(col => {
      updatedFormats[col] = currentFormat;
    });
    onApply(updatedFormats);
    onOpenChange(false);
  }, [formats, selectedCols, currentFormat, onApply, onOpenChange]);

  const handleApplyAll = useCallback(() => {
    if (onApplyAll) {
      onApplyAll(currentFormat);
    } else {
      // Apply to all columns
      const allFormats: Record<string, ColumnFormat> = {};
      columns.forEach(col => {
        if (col.field) {
          allFormats[col.field] = currentFormat;
        }
      });
      onApply(allFormats);
    }
    onOpenChange(false);
  }, [currentFormat, columns, onApply, onApplyAll, onOpenChange]);

  const handleCancel = useCallback(() => {
    setFormats(currentFormats);
    onCancel?.();
    onOpenChange(false);
  }, [currentFormats, onCancel, onOpenChange]);

  const updateFormat = useCallback((updates: Partial<ColumnFormat>) => {
    const newFormat = { ...currentFormat, ...updates };
    setFormats(prev => {
      const updated = { ...prev };
      selectedCols.forEach(col => {
        updated[col] = newFormat;
      });
      return updated;
    });
  }, [currentFormat, selectedCols]);

  const filteredColumns = columns.filter(col => 
    (col.field?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (col.headerName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Column Formatting"
      width={900}
      height={650}
      minWidth={700}
      minHeight={500}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex flex-1 min-h-0">
          {/* Column Selector Panel */}
          <div className="w-64 border-r flex flex-col bg-muted/30 min-h-0">
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-sm mb-3">COLUMNS</h3>
              <div className="flex items-center gap-2 mb-3">
                <Checkbox 
                  checked={selectedCols.length === columns.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">Select All</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredColumns.map((col) => {
                  const field = col.field || '';
                  const isSelected = selectedCols.includes(field);
                  return (
                    <div
                      key={field}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleToggleColumn(field)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleToggleColumn(field)}
                      />
                      <span className="text-sm truncate">
                        {col.headerName || field}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                {selectedCols.length} selected
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b flex-shrink-0">
                <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0 px-4">
                  <TabsTrigger 
                    value="styling" 
                    className="rounded-t-md data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Styling
                  </TabsTrigger>
                  <TabsTrigger 
                    value="format" 
                    className="rounded-t-md data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Format
                  </TabsTrigger>
                  <TabsTrigger 
                    value="general" 
                    className="rounded-t-md data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    General
                  </TabsTrigger>
                  <TabsTrigger 
                    value="filter" 
                    className="rounded-t-md data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Filter
                  </TabsTrigger>
                  <TabsTrigger 
                    value="editor" 
                    className="rounded-t-md data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Editor
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 min-h-0 relative">
                <TabsContent value="styling" className="absolute inset-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <StylingTab
                        format={currentFormat}
                        onFormatChange={updateFormat}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="format" className="absolute inset-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <FormatTab
                        format={currentFormat}
                        onFormatChange={updateFormat}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="general" className="absolute inset-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <GeneralTab
                        columnDef={columns.find(c => c.field === selectedCols[0]) || {} as any}
                        format={currentFormat}
                        onFormatChange={updateFormat}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="filter" className="absolute inset-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <FilterTab
                        format={currentFormat}
                        onFormatChange={updateFormat}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="editor" className="absolute inset-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      <EditorTab
                        format={currentFormat}
                        onFormatChange={updateFormat}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/30 flex-shrink-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
          <Button onClick={handleApplyAll} variant="secondary">
            Apply All
          </Button>
        </div>
      </div>
    </DraggableDialog>
  );
};