import React, { useState } from 'react';
import {
  PropertyGrid,
  PropertySection,
  ToggleField,
  NumberField,
  SelectField,
  ActionButtonGroup
} from '@/components/ui/property-grid';
import { Layout, Zap, Settings, Filter, Database } from 'lucide-react';

interface GridSettings {
  // Appearance & Layout
  theme: string;
  density: string;
  showGridLines: boolean;
  alternateRowColors: boolean;
  
  // Performance  
  rowBuffer: number;
  disableRowVirtualisation: boolean;
  disableColumnVirtualisation: boolean;
  animateRows: boolean;
  suppressChangeDetection: boolean;
  enableValueCache: boolean;
  valueCacheNeverExpires: boolean;
  aggregateOnlyChangedColumns: boolean;
  suppressAggFuncInHeader: boolean;
  suppressRootLevelAggregation: boolean;
  
  // Behavior
  enablePagination: boolean;
  pageSize: number;
  pageSizeSelector: string;
  enableSorting: boolean;
  enableFiltering: boolean;
  enableColumnReordering: boolean;
  enableColumnResizing: boolean;
}

const defaultSettings: GridSettings = {
  // Appearance & Layout
  theme: 'dark',
  density: 'normal',
  showGridLines: true,
  alternateRowColors: true,
  
  // Performance
  rowBuffer: 10,
  disableRowVirtualisation: false,
  disableColumnVirtualisation: false,
  animateRows: true,
  suppressChangeDetection: false,
  enableValueCache: false,
  valueCacheNeverExpires: false,
  aggregateOnlyChangedColumns: false,
  suppressAggFuncInHeader: false,
  suppressRootLevelAggregation: false,
  
  // Behavior
  enablePagination: false,
  pageSize: 100,
  pageSizeSelector: '20, 50, 100, 200',
  enableSorting: true,
  enableFiltering: true,
  enableColumnReordering: true,
  enableColumnResizing: true
};

export function PropertyGridDemo() {
  const [settings, setSettings] = useState<GridSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = <K extends keyof GridSettings>(
    key: K, 
    value: GridSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Settings saved:', settings);
    setIsLoading(false);
  };

  const handleApply = async () => {
    setIsLoading(true);
    // Simulate applying settings
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Settings applied:', settings);
    setIsLoading(false);
  };

  const themeOptions = [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
    { value: 'auto', label: 'Auto (System)' }
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'comfortable', label: 'Comfortable' }
  ];

  const pageSizeOptions = [
    { value: '20, 50, 100, 200', label: '20, 50, 100, 200' },
    { value: '10, 25, 50, 100', label: '10, 25, 50, 100' },
    { value: '50, 100, 250, 500', label: '50, 100, 250, 500' }
  ];

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <PropertyGrid 
          title="Grid Options"
          className="w-full"
          actions={
            <ActionButtonGroup
              onReset={handleReset}
              onSave={handleSave}
              onApply={handleApply}
              isLoading={isLoading}
            />
          }
          onSearch={(value) => console.log('Search:', value)}
        >
          {/* Appearance & Layout */}
          <PropertySection 
            title="Appearance & Layout" 
            icon={<Layout className="h-4 w-4" />}
            defaultExpanded={true}
          >
            <SelectField
              label="Theme"
              description="Choose the visual theme for the grid"
              value={settings.theme}
              onValueChange={(value) => handleSettingChange('theme', value)}
              options={themeOptions}
            />
            
            <SelectField
              label="Density"
              description="Adjust row height and spacing"
              value={settings.density}
              onValueChange={(value) => handleSettingChange('density', value)}
              options={densityOptions}
            />
            
            <ToggleField
              label="Show Grid Lines"
              description="Display borders between cells"
              checked={settings.showGridLines}
              onCheckedChange={(checked) => handleSettingChange('showGridLines', checked)}
            />
            
            <ToggleField
              label="Alternate Row Colors"
              description="Use different background colors for odd/even rows"
              checked={settings.alternateRowColors}
              onCheckedChange={(checked) => handleSettingChange('alternateRowColors', checked)}
            />
          </PropertySection>

          {/* Performance */}
          <PropertySection 
            title="Performance" 
            icon={<Zap className="h-4 w-4" />}
            defaultExpanded={true}
          >
            <NumberField
              label="Row Buffer"
              description="Number of rows to render outside the visible area"
              value={settings.rowBuffer}
              onChange={(value) => handleSettingChange('rowBuffer', value)}
              min={0}
              max={100}
            />
            
            <ToggleField
              label="Disable Row Virtualisation"
              description="Turn off row virtualisation for better performance with small datasets"
              checked={settings.disableRowVirtualisation}
              onCheckedChange={(checked) => handleSettingChange('disableRowVirtualisation', checked)}
            />
            
            <ToggleField
              label="Disable Column Virtualisation"
              description="Turn off column virtualisation for better performance with few columns"
              checked={settings.disableColumnVirtualisation}
              onCheckedChange={(checked) => handleSettingChange('disableColumnVirtualisation', checked)}
            />
            
            <ToggleField
              label="Animate Rows"
              description="Enable smooth animations when rows are added, removed, or moved"
              checked={settings.animateRows}
              onCheckedChange={(checked) => handleSettingChange('animateRows', checked)}
            />
            
            <ToggleField
              label="Suppress Change Detection"
              description="Disable automatic change detection for better performance"
              checked={settings.suppressChangeDetection}
              onCheckedChange={(checked) => handleSettingChange('suppressChangeDetection', checked)}
            />
            
            <ToggleField
              label="Enable Value Cache"
              description="Cache cell values to improve rendering performance"
              checked={settings.enableValueCache}
              onCheckedChange={(checked) => handleSettingChange('enableValueCache', checked)}
            />
            
            <ToggleField
              label="Value Cache Never Expires"
              description="Keep cached values indefinitely (use with caution)"
              checked={settings.valueCacheNeverExpires}
              onCheckedChange={(checked) => handleSettingChange('valueCacheNeverExpires', checked)}
              disabled={!settings.enableValueCache}
            />
            
            <ToggleField
              label="Aggregate Only Changed Columns"
              description="Only recalculate aggregations for columns that have changed"
              checked={settings.aggregateOnlyChangedColumns}
              onCheckedChange={(checked) => handleSettingChange('aggregateOnlyChangedColumns', checked)}
            />
            
            <ToggleField
              label="Suppress Agg Func in Header"
              description="Hide aggregation function names in column headers"
              checked={settings.suppressAggFuncInHeader}
              onCheckedChange={(checked) => handleSettingChange('suppressAggFuncInHeader', checked)}
            />
            
            <ToggleField
              label="Suppress Root Level Aggregation"
              description="Disable aggregation calculations at the root level"
              checked={settings.suppressRootLevelAggregation}
              onCheckedChange={(checked) => handleSettingChange('suppressRootLevelAggregation', checked)}
            />
          </PropertySection>

          {/* Behavior */}
          <PropertySection 
            title="Behavior" 
            icon={<Settings className="h-4 w-4" />}
            defaultExpanded={true}
          >
            <ToggleField
              label="Enable Pagination"
              description="Split data into pages for better performance"
              checked={settings.enablePagination}
              onCheckedChange={(checked) => handleSettingChange('enablePagination', checked)}
            />
            
            <NumberField
              label="Page Size"
              description="Number of rows per page"
              value={settings.pageSize}
              onChange={(value) => handleSettingChange('pageSize', value)}
              min={10}
              max={1000}
              step={10}
              disabled={!settings.enablePagination}
            />
            
            <SelectField
              label="Page Size Selector"
              description="Available page size options for users"
              value={settings.pageSizeSelector}
              onValueChange={(value) => handleSettingChange('pageSizeSelector', value)}
              options={pageSizeOptions}
              disabled={!settings.enablePagination}
            />
            
            <ToggleField
              label="Enable Sorting"
              description="Allow users to sort columns by clicking headers"
              checked={settings.enableSorting}
              onCheckedChange={(checked) => handleSettingChange('enableSorting', checked)}
            />
            
            <ToggleField
              label="Enable Filtering"
              description="Show filter controls in column headers"
              checked={settings.enableFiltering}
              onCheckedChange={(checked) => handleSettingChange('enableFiltering', checked)}
            />
            
            <ToggleField
              label="Enable Column Reordering"
              description="Allow users to drag and drop columns to reorder them"
              checked={settings.enableColumnReordering}
              onCheckedChange={(checked) => handleSettingChange('enableColumnReordering', checked)}
            />
            
            <ToggleField
              label="Enable Column Resizing"
              description="Allow users to resize columns by dragging column borders"
              checked={settings.enableColumnResizing}
              onCheckedChange={(checked) => handleSettingChange('enableColumnResizing', checked)}
            />
          </PropertySection>
        </PropertyGrid>
      </div>
    </div>
  );
}

export default PropertyGridDemo; 