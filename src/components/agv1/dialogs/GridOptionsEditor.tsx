import React, { useState, useCallback } from 'react';
import { DraggableDialog } from '@/components/ui-components/draggable-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableConfig } from '@/types/agv1/component.interfaces';

interface GridOptionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DataTableConfig;
  onApply: (config: DataTableConfig) => void;
  onCancel?: () => void;
}

interface CategoryItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  subcategories?: {
    id: string;
    label: string;
  }[];
}

const categories: CategoryItem[] = [
  {
    id: 'display',
    label: 'Display',
    subcategories: [
      { id: 'general', label: 'General' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'typography', label: 'Typography' },
    ],
  },
  {
    id: 'interaction',
    label: 'Interaction',
    subcategories: [
      { id: 'selection', label: 'Selection' },
      { id: 'editing', label: 'Editing' },
      { id: 'navigation', label: 'Navigation' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    subcategories: [
      { id: 'rendering', label: 'Rendering' },
      { id: 'scrolling', label: 'Scrolling' },
      { id: 'virtualization', label: 'Virtualization' },
    ],
  },
  {
    id: 'export',
    label: 'Export',
    subcategories: [
      { id: 'formats', label: 'Formats' },
      { id: 'options', label: 'Options' },
    ],
  },
];

export const GridOptionsEditor: React.FC<GridOptionsEditorProps> = ({
  open,
  onOpenChange,
  config,
  onApply,
  onCancel,
}) => {
  const [localConfig, setLocalConfig] = useState<DataTableConfig>({ ...config });
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['display']);
  const [selectedCategory, setSelectedCategory] = useState('display-general');

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const updateConfig = useCallback((updates: Partial<DataTableConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const updateGridOptions = useCallback((updates: any) => {
    setLocalConfig(prev => ({
      ...prev,
      gridOptions: {
        ...prev.gridOptions,
        ...updates,
      },
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(localConfig);
    onOpenChange(false);
  }, [localConfig, onApply, onOpenChange]);

  const handleCancel = useCallback(() => {
    setLocalConfig({ ...config });
    onCancel?.();
    onOpenChange(false);
  }, [config, onCancel, onOpenChange]);

  const handleReset = useCallback(() => {
    // Reset to default values
    const defaultConfig: Partial<DataTableConfig> = {
      rowHeight: 32,
      headerHeight: 40,
      theme: 'quartz',
      enableSorting: true,
      enableFiltering: true,
      rowSelection: 'single',
    };
    setLocalConfig(prev => ({ ...prev, ...defaultConfig }));
  }, []);

  const renderContent = () => {
    const [category, subcategory] = selectedCategory.split('-');

    if (category === 'display' && subcategory === 'general') {
      return (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold">DISPLAY SETTINGS</h3>
          
          {/* Theme Selection */}
          <div>
            <Label className="text-xs mb-2">Theme</Label>
            <RadioGroup
              value={localConfig.theme}
              onValueChange={(value) => updateConfig({ theme: value as any })}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quartz" id="theme-light" />
                  <Label htmlFor="theme-light" className="cursor-pointer">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark" className="cursor-pointer">Dark</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alpine" id="theme-auto" />
                  <Label htmlFor="theme-auto" className="cursor-pointer">Auto (System)</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* Density */}
          <div>
            <Label className="text-xs mb-2">Density</Label>
            <RadioGroup
              value={localConfig.gridOptions?.density || 'normal'}
              onValueChange={(value) => updateGridOptions({ density: value })}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="density-compact" />
                  <Label htmlFor="density-compact" className="cursor-pointer">Compact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="density-normal" />
                  <Label htmlFor="density-normal" className="cursor-pointer">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="comfortable" id="density-comfortable" />
                  <Label htmlFor="density-comfortable" className="cursor-pointer">Comfortable</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* Size Controls */}
          <div className="space-y-4 p-4 border rounded-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Row Height</Label>
                <span className="text-xs font-mono">{localConfig.rowHeight}px</span>
              </div>
              <Slider
                value={[localConfig.rowHeight]}
                onValueChange={([value]) => updateConfig({ rowHeight: value })}
                min={20}
                max={60}
                step={1}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Header Height</Label>
                <span className="text-xs font-mono">{localConfig.headerHeight}px</span>
              </div>
              <Slider
                value={[localConfig.headerHeight]}
                onValueChange={([value]) => updateConfig({ headerHeight: value })}
                min={30}
                max={80}
                step={1}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Font Size</Label>
                <span className="text-xs font-mono">{localConfig.gridOptions?.fontSize || 13}px</span>
              </div>
              <Slider
                value={[localConfig.gridOptions?.fontSize || 13]}
                onValueChange={([value]) => updateGridOptions({ fontSize: value })}
                min={10}
                max={20}
                step={1}
              />
            </div>
          </div>
          
          {/* Display Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-row-numbers"
                checked={localConfig.gridOptions?.showRowNumbers || false}
                onCheckedChange={(checked) => updateGridOptions({ showRowNumbers: checked })}
              />
              <Label htmlFor="show-row-numbers" className="text-sm cursor-pointer">
                Show Row Numbers
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="alternating-colors"
                checked={localConfig.gridOptions?.alternatingRowColors !== false}
                onCheckedChange={(checked) => updateGridOptions({ alternatingRowColors: checked })}
              />
              <Label htmlFor="alternating-colors" className="text-sm cursor-pointer">
                Alternating Row Colors
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-grid-lines"
                checked={localConfig.gridOptions?.showGridLines !== 'none'}
                onCheckedChange={(checked) => updateGridOptions({ 
                  showGridLines: checked ? 'both' : 'none' 
                })}
              />
              <Label htmlFor="show-grid-lines" className="text-sm cursor-pointer">
                Show Grid Lines
              </Label>
            </div>
          </div>
          
          {/* Grid Lines Style */}
          {localConfig.gridOptions?.showGridLines !== 'none' && (
            <div>
              <Label className="text-xs mb-2">Grid Lines</Label>
              <RadioGroup
                value={localConfig.gridOptions?.showGridLines || 'both'}
                onValueChange={(value) => updateGridOptions({ showGridLines: value })}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="lines-none" />
                    <Label htmlFor="lines-none" className="cursor-pointer text-xs">None</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="horizontal" id="lines-horizontal" />
                    <Label htmlFor="lines-horizontal" className="cursor-pointer text-xs">Horizontal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vertical" id="lines-vertical" />
                    <Label htmlFor="lines-vertical" className="cursor-pointer text-xs">Vertical</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="lines-both" />
                    <Label htmlFor="lines-both" className="cursor-pointer text-xs">Both</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Preview */}
          <div>
            <h4 className="text-xs font-semibold mb-2">PREVIEW</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr 
                    className="bg-muted"
                    style={{ height: `${localConfig.headerHeight}px` }}
                  >
                    {localConfig.gridOptions?.showRowNumbers && (
                      <th className="w-12 text-center border-r">#</th>
                    )}
                    <th className="px-4 text-left">Column A</th>
                    <th className="px-4 text-left">Column B</th>
                    <th className="px-4 text-left">Column C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    style={{ height: `${localConfig.rowHeight}px` }}
                    className={cn(
                      localConfig.gridOptions?.showGridLines === 'horizontal' || 
                      localConfig.gridOptions?.showGridLines === 'both' ? 'border-b' : ''
                    )}
                  >
                    {localConfig.gridOptions?.showRowNumbers && (
                      <td className="w-12 text-center text-muted-foreground border-r">1</td>
                    )}
                    <td className="px-4">Sample Data</td>
                    <td className="px-4">Value 123</td>
                    <td className="px-4">Active</td>
                  </tr>
                  <tr 
                    style={{ height: `${localConfig.rowHeight}px` }}
                    className={cn(
                      localConfig.gridOptions?.alternatingRowColors && 'bg-muted/30',
                      localConfig.gridOptions?.showGridLines === 'horizontal' || 
                      localConfig.gridOptions?.showGridLines === 'both' ? 'border-b' : ''
                    )}
                  >
                    {localConfig.gridOptions?.showRowNumbers && (
                      <td className="w-12 text-center text-muted-foreground border-r">2</td>
                    )}
                    <td className="px-4">Test Row</td>
                    <td className="px-4">Value 456</td>
                    <td className="px-4">Inactive</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (category === 'interaction' && subcategory === 'selection') {
      return (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold">SELECTION SETTINGS</h3>
          
          <div>
            <Label className="text-xs mb-2">Row Selection Mode</Label>
            <RadioGroup
              value={String(localConfig.rowSelection)}
              onValueChange={(value) => updateConfig({ 
                rowSelection: value === 'false' ? false : value as any 
              })}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="selection-none" />
                  <Label htmlFor="selection-none" className="cursor-pointer">None</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="selection-single" />
                  <Label htmlFor="selection-single" className="cursor-pointer">Single Row</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="selection-multiple" />
                  <Label htmlFor="selection-multiple" className="cursor-pointer">Multiple Rows</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="checkbox-selection"
                checked={localConfig.gridOptions?.checkboxSelection || false}
                onCheckedChange={(checked) => updateGridOptions({ checkboxSelection: checked })}
              />
              <Label htmlFor="checkbox-selection" className="text-sm cursor-pointer">
                Show Selection Checkboxes
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="header-checkbox"
                checked={localConfig.gridOptions?.headerCheckboxSelection || false}
                onCheckedChange={(checked) => updateGridOptions({ headerCheckboxSelection: checked })}
              />
              <Label htmlFor="header-checkbox" className="text-sm cursor-pointer">
                Show Header Checkbox (Select All)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="suppress-row-click"
                checked={localConfig.gridOptions?.suppressRowClickSelection || false}
                onCheckedChange={(checked) => updateGridOptions({ suppressRowClickSelection: checked })}
              />
              <Label htmlFor="suppress-row-click" className="text-sm cursor-pointer">
                Suppress Row Click Selection
              </Label>
            </div>
          </div>
        </div>
      );
    }

    if (category === 'export') {
      return (
        <div className="space-y-6">
          <h3 className="text-sm font-semibold">EXPORT SETTINGS</h3>
          
          <div>
            <Label htmlFor="default-format" className="text-xs mb-2">Default Export Format</Label>
            <Select
              value={localConfig.exportSettings?.defaultFormat || 'csv'}
              onValueChange={(value) => updateConfig({
                exportSettings: {
                  defaultFormat: value as any,
                  includeHeaders: localConfig.exportSettings?.includeHeaders ?? true,
                  fileName: localConfig.exportSettings?.fileName ?? 'data-export',
                },
              })}
            >
              <SelectTrigger id="default-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-headers"
                checked={localConfig.exportSettings?.includeHeaders !== false}
                onCheckedChange={(checked) => updateConfig({
                  exportSettings: {
                    defaultFormat: localConfig.exportSettings?.defaultFormat ?? 'csv',
                    includeHeaders: checked === true,
                    fileName: localConfig.exportSettings?.fileName ?? 'data-export',
                  },
                })}
              />
              <Label htmlFor="include-headers" className="text-sm cursor-pointer">
                Include Column Headers
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="export-all-columns"
                checked={localConfig.gridOptions?.exportAllColumns || false}
                onCheckedChange={(checked) => updateGridOptions({ exportAllColumns: checked })}
              />
              <Label htmlFor="export-all-columns" className="text-sm cursor-pointer">
                Export All Columns (including hidden)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="export-selected-only"
                checked={localConfig.gridOptions?.exportSelectedRowsOnly || false}
                onCheckedChange={(checked) => updateGridOptions({ exportSelectedRowsOnly: checked })}
              />
              <Label htmlFor="export-selected-only" className="text-sm cursor-pointer">
                Export Selected Rows Only
              </Label>
            </div>
          </div>
        </div>
      );
    }

    return <div className="text-sm text-muted-foreground">Select a category to configure settings</div>;
  };

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Grid Settings"
      width={600}
      height={500}
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-48 border-r bg-muted/30 flex-shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  CATEGORIES
                </h3>
                {categories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-accent rounded"
                    >
                      <span className="flex items-center gap-2">
                        {expandedCategories.includes(category.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {category.label}
                      </span>
                    </button>
                    
                    {expandedCategories.includes(category.id) && category.subcategories && (
                      <div className="ml-3">
                        {category.subcategories.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedCategory(`${category.id}-${sub.id}`)}
                            className={cn(
                              "flex items-center w-full px-2 py-1 text-xs hover:bg-accent rounded",
                              selectedCategory === `${category.id}-${sub.id}` && "bg-accent"
                            )}
                          >
                            <span className="ml-3">• {sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t mt-auto">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </DraggableDialog>
  );
};