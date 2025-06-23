import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface FilterTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

export const FilterTab: React.FC<FilterTabProps> = ({ format, onFormatChange }) => {
  const updateFilterOptions = (updates: any) => {
    onFormatChange({
      filterOptions: {
        ...format.filterOptions,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Type */}
      <div>
        <h3 className="text-sm font-semibold mb-4">FILTER TYPE</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <RadioGroup
            value={format.filterOptions?.filterType || 'text'}
            onValueChange={(value) => updateFilterOptions({ filterType: value })}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="text" id="text-filter" className="mt-1" />
                <div>
                  <Label htmlFor="text-filter" className="text-sm font-medium cursor-pointer">
                    Text Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Standard text filtering with contains, equals, starts with, etc.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="number" id="number-filter" className="mt-1" />
                <div>
                  <Label htmlFor="number-filter" className="text-sm font-medium cursor-pointer">
                    Number Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Numeric comparisons with equals, greater than, less than, range
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="date" id="date-filter" className="mt-1" />
                <div>
                  <Label htmlFor="date-filter" className="text-sm font-medium cursor-pointer">
                    Date Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Date range selection with calendar picker
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="set" id="set-filter" className="mt-1" />
                <div>
                  <Label htmlFor="set-filter" className="text-sm font-medium cursor-pointer">
                    Set Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Checkbox list of unique values
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="custom" id="custom-filter" className="mt-1" />
                <div>
                  <Label htmlFor="custom-filter" className="text-sm font-medium cursor-pointer">
                    Custom Filter
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use a custom filter component
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
      
      {/* Filter Options */}
      <div>
        <h3 className="text-sm font-semibold mb-4">FILTER OPTIONS</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={format.filterOptions?.caseSensitive || false}
              onCheckedChange={(checked) => updateFilterOptions({ caseSensitive: checked })}
            />
            <Label htmlFor="case-sensitive" className="text-sm">
              Case sensitive
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-blanks"
              checked={format.filterOptions?.showBlanks !== false}
              onCheckedChange={(checked) => updateFilterOptions({ showBlanks: checked })}
            />
            <Label htmlFor="show-blanks" className="text-sm">
              Show blank values
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="apply-button"
              checked={format.filterOptions?.applyButton || false}
              onCheckedChange={(checked) => updateFilterOptions({ applyButton: checked })}
            />
            <Label htmlFor="apply-button" className="text-sm">
              Show Apply button (manual filter mode)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="clear-button"
              checked={format.filterOptions?.clearButton !== false}
              onCheckedChange={(checked) => updateFilterOptions({ clearButton: checked })}
            />
            <Label htmlFor="clear-button" className="text-sm">
              Show Clear button
            </Label>
          </div>
        </div>
      </div>
      
      {/* Quick Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-4">QUICK FILTER</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-quick-filter"
              checked={format.filterOptions?.enableQuickFilter || false}
              onCheckedChange={(checked) => updateFilterOptions({ enableQuickFilter: checked })}
            />
            <Label htmlFor="enable-quick-filter" className="text-sm">
              Include in quick filter search
            </Label>
          </div>
          
          {format.filterOptions?.enableQuickFilter && (
            <div>
              <Label htmlFor="quick-filter-parser" className="text-xs">
                Quick filter parser
              </Label>
              <Select
                value={format.filterOptions?.quickFilterParser || 'default'}
                onValueChange={(value) => updateFilterOptions({ quickFilterParser: value })}
              >
                <SelectTrigger id="quick-filter-parser" className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (text)</SelectItem>
                  <SelectItem value="number">Number parser</SelectItem>
                  <SelectItem value="date">Date parser</SelectItem>
                  <SelectItem value="custom">Custom parser</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      
      {/* Default Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-4">DEFAULT FILTER</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-default-filter"
              checked={format.filterOptions?.defaultFilter !== undefined}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateFilterOptions({ defaultFilter: { operator: 'contains', value: '' } });
                } else {
                  updateFilterOptions({ defaultFilter: undefined });
                }
              }}
            />
            <Label htmlFor="has-default-filter" className="text-sm">
              Apply default filter on load
            </Label>
          </div>
          
          {format.filterOptions?.defaultFilter && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="default-operator" className="text-xs">Operator</Label>
                <Select
                  value={format.filterOptions.defaultFilter.operator || 'contains'}
                  onValueChange={(value) => updateFilterOptions({
                    defaultFilter: {
                      ...format.filterOptions?.defaultFilter,
                      operator: value,
                    },
                  })}
                >
                  <SelectTrigger id="default-operator" className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="notEquals">Not equals</SelectItem>
                    <SelectItem value="startsWith">Starts with</SelectItem>
                    <SelectItem value="endsWith">Ends with</SelectItem>
                    <SelectItem value="blank">Is blank</SelectItem>
                    <SelectItem value="notBlank">Is not blank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="default-value" className="text-xs">Value</Label>
                <Input
                  id="default-value"
                  value={format.filterOptions.defaultFilter.value || ''}
                  onChange={(e) => updateFilterOptions({
                    defaultFilter: {
                      ...format.filterOptions?.defaultFilter,
                      value: e.target.value,
                    },
                  })}
                  className="h-8 mt-1"
                  placeholder="Filter value"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};