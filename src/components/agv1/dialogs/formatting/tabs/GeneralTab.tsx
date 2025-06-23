import React from 'react';
import { ColDef } from 'ag-grid-community';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { ColumnFormat, DataType } from '@/types/agv1/common.types';

interface GeneralTabProps {
  columnDef: ColDef;
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const dataTypes: { value: DataType; label: string; description: string }[] = [
  { value: 'string', label: 'Text', description: 'General text data' },
  { value: 'number', label: 'Number', description: 'Numeric values with formatting options' },
  { value: 'currency', label: 'Currency', description: 'Monetary values with currency symbol' },
  { value: 'percentage', label: 'Percentage', description: 'Values displayed as percentages' },
  { value: 'date', label: 'Date', description: 'Date values with custom formats' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time values' },
  { value: 'boolean', label: 'Boolean', description: 'True/False values' },
  { value: 'custom', label: 'Custom', description: 'Custom format with template' },
];

const displayFormats = [
  { value: 'text', label: 'Plain Text' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'link', label: 'Hyperlink' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
];

export const GeneralTab: React.FC<GeneralTabProps> = ({
  columnDef,
  format,
  onFormatChange,
}) => {
  const handleDataTypeChange = (dataType: DataType) => {
    onFormatChange({ dataType });
    
    // Set appropriate defaults based on data type
    switch (dataType) {
      case 'number':
        onFormatChange({
          dataType,
          numberFormat: {
            type: 'number',
            decimals: 2,
            thousandsSeparator: true,
            negativeFormat: 'parentheses',
          },
        });
        break;
      case 'currency':
        onFormatChange({
          dataType,
          currencyFormat: {
            currency: 'USD',
            currencyDisplay: 'symbol',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        });
        break;
      case 'percentage':
        onFormatChange({
          dataType,
          numberFormat: {
            type: 'percentage',
            decimals: 2,
            thousandsSeparator: true,
            negativeFormat: 'minus',
          },
        });
        break;
      case 'date':
      case 'datetime':
        onFormatChange({
          dataType,
          dateFormat: {
            format: dataType === 'date' ? 'MM/dd/yyyy' : 'MM/dd/yyyy HH:mm:ss',
            timezone: 'local',
          },
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Column Information</h3>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                value={columnDef.field || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="header-name">Header Name</Label>
              <Input
                id="header-name"
                value={columnDef.headerName || columnDef.field || ''}
                disabled
                className="mt-1"
              />
            </div>
          </div>
          
          {columnDef.headerTooltip && (
            <div>
              <Label htmlFor="tooltip">Tooltip</Label>
              <Input
                id="tooltip"
                value={columnDef.headerTooltip}
                disabled
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Data Type</h3>
        <RadioGroup
          value={format.dataType || 'string'}
          onValueChange={(value) => handleDataTypeChange(value as DataType)}
        >
          <div className="grid gap-3">
            {dataTypes.map((type) => (
              <div key={type.value} className="flex items-start space-x-3">
                <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Display Format</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-format">Format Type</Label>
            <Select
              value={format.displayFormat || 'text'}
              onValueChange={(value) => onFormatChange({ displayFormat: value as 'text' | 'html' | 'markdown' | 'link' | 'email' | 'phone' | 'custom' })}
            >
              <SelectTrigger id="display-format" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayFormats.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {format.displayFormat === 'link' && (
            <div>
              <Label htmlFor="link-target">Link Target</Label>
              <Select
                value={format.linkTarget || '_blank'}
                onValueChange={(value) => onFormatChange({ linkTarget: value as '_blank' | '_self' | '_parent' | '_top' })}
              >
                <SelectTrigger id="link-target" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_blank">New Window</SelectItem>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_parent">Parent Frame</SelectItem>
                  <SelectItem value="_top">Full Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {format.displayFormat === 'custom' && (
            <div>
              <Label htmlFor="custom-template">Custom Template</Label>
              <Input
                id="custom-template"
                placeholder="e.g., ${value} units"
                value={format.customTemplate || ''}
                onChange={(e) => onFormatChange({ customTemplate: e.target.value })}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use ${'{value}'} to reference the cell value
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};