import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface FormatTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const formatTemplates = [
  { value: 'number', label: 'Number', icon: '123' },
  { value: 'currency', label: 'Currency', icon: '$' },
  { value: 'percentage', label: 'Percentage', icon: '%' },
  { value: 'date', label: 'Date/Time', icon: '📅' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'boolean', label: 'Boolean', icon: '✓' },
  { value: 'status', label: 'Status', icon: '🚦' },
  { value: 'progress', label: 'Progress', icon: '▓' },
  { value: 'rating', label: 'Rating', icon: '⭐' },
  { value: 'traffic-light', label: 'Traffic Light', icon: '🚦' },
];

export const FormatTab: React.FC<FormatTabProps> = ({ format, onFormatChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(
    format.numberFormat?.type || format.dataType || 'number'
  );

  const updateNumberFormat = (updates: any) => {
    onFormatChange({
      numberFormat: {
        ...format.numberFormat,
        ...updates,
      },
    });
  };

  const updateCurrencyFormat = (updates: any) => {
    onFormatChange({
      currencyFormat: {
        ...format.currencyFormat,
        ...updates,
      },
    });
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value as any);
    onFormatChange({
      dataType: value as any,
      displayFormat: value === 'currency' || value === 'percentage' ? 'custom' : 'text',
    });
  };

  const renderFormatOptions = () => {
    switch (selectedTemplate) {
      case 'currency':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">CURRENCY OPTIONS</h3>
            <div className="space-y-4 p-4 border rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency-symbol" className="text-xs">Symbol</Label>
                  <Select
                    value={format.currencyFormat?.symbol || '$'}
                    onValueChange={(value) => updateCurrencyFormat({ symbol: value })}
                  >
                    <SelectTrigger id="currency-symbol" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$">$ (Dollar)</SelectItem>
                      <SelectItem value="€">€ (Euro)</SelectItem>
                      <SelectItem value="£">£ (Pound)</SelectItem>
                      <SelectItem value="¥">¥ (Yen)</SelectItem>
                      <SelectItem value="₹">₹ (Rupee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="symbol-position" className="text-xs">Position</Label>
                  <Select
                    value={format.currencyFormat?.position || 'before'}
                    onValueChange={(value) => updateCurrencyFormat({ position: value as any })}
                  >
                    <SelectTrigger id="symbol-position" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Before</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="decimals" className="text-xs">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    min="0"
                    max="10"
                    value={format.currencyFormat?.decimals || 2}
                    onChange={(e) => updateCurrencyFormat({ decimals: parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
                
                <div className="flex items-end">
                  <Checkbox
                    id="thousands-separator"
                    checked={format.currencyFormat?.thousandsSeparator !== false}
                    onCheckedChange={(checked) => updateCurrencyFormat({ thousandsSeparator: checked })}
                  />
                  <Label htmlFor="thousands-separator" className="ml-2 text-xs">
                    Separator
                  </Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="negative-format" className="text-xs">Negative</Label>
                <Select
                  value={format.currencyFormat?.negativeFormat || 'red-parentheses'}
                  onValueChange={(value) => updateCurrencyFormat({ negativeFormat: value })}
                >
                  <SelectTrigger id="negative-format" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red-parentheses">Red with ()</SelectItem>
                    <SelectItem value="minus">Minus sign</SelectItem>
                    <SelectItem value="red-minus">Red with minus</SelectItem>
                    <SelectItem value="parentheses">Parentheses only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
        
      case 'percentage':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">PERCENTAGE OPTIONS</h3>
            <div className="space-y-4 p-4 border rounded-md">
              <div>
                <Label htmlFor="decimals" className="text-xs">Decimals</Label>
                <Input
                  id="decimals"
                  type="number"
                  min="0"
                  max="10"
                  value={format.numberFormat?.decimals || 2}
                  onChange={(e) => updateNumberFormat({ decimals: parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="multiply-100"
                  checked={format.numberFormat?.multiplyBy100 !== false}
                  onCheckedChange={(checked) => updateNumberFormat({ multiplyBy100: checked })}
                />
                <Label htmlFor="multiply-100" className="text-xs">
                  Multiply by 100 (0.5 → 50%)
                </Label>
              </div>
            </div>
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">DATE/TIME OPTIONS</h3>
            <div className="space-y-4 p-4 border rounded-md">
              <div>
                <Label htmlFor="date-format" className="text-xs">Format</Label>
                <Select
                  value={format.dateFormat?.format || 'MM/DD/YYYY'}
                  onValueChange={(value) => onFormatChange({
                    dateFormat: { ...format.dateFormat, format: value }
                  })}
                >
                  <SelectTrigger id="date-format" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MMM DD, YYYY">MMM DD, YYYY</SelectItem>
                    <SelectItem value="relative">Relative (2 days ago)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-time"
                  checked={format.dateFormat?.includeTime || false}
                  onCheckedChange={(checked) => onFormatChange({
                    dateFormat: { ...format.dateFormat, includeTime: checked === true }
                  })}
                />
                <Label htmlFor="include-time" className="text-xs">
                  Include time
                </Label>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">NUMBER OPTIONS</h3>
            <div className="space-y-4 p-4 border rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="decimals" className="text-xs">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    min="0"
                    max="10"
                    value={format.numberFormat?.decimals || 0}
                    onChange={(e) => updateNumberFormat({ decimals: parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
                
                <div className="flex items-end">
                  <Checkbox
                    id="thousands-separator"
                    checked={format.numberFormat?.thousandsSeparator || false}
                    onCheckedChange={(checked) => updateNumberFormat({ thousandsSeparator: checked })}
                  />
                  <Label htmlFor="thousands-separator" className="ml-2 text-xs">
                    Thousands separator
                  </Label>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Template Selection */}
      <div>
        <h3 className="text-sm font-semibold mb-4">FORMAT TEMPLATE</h3>
        <div className="p-4 border rounded-md">
          <div className="mb-4">
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatTemplates.map(template => (
                  <SelectItem key={template.value} value={template.value}>
                    <span className="mr-2">{template.icon}</span>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <RadioGroup value={selectedTemplate} onValueChange={handleTemplateChange}>
            <div className="grid grid-cols-3 gap-4">
              {formatTemplates.map(template => (
                <div key={template.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={template.value} id={template.value} />
                  <Label htmlFor={template.value} className="text-sm cursor-pointer">
                    {template.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
      
      {/* Format-specific options */}
      {renderFormatOptions()}
      
      {/* Excel Format String */}
      <div>
        <h3 className="text-sm font-semibold mb-4">EXCEL FORMAT STRING</h3>
        <div className="p-4 border rounded-md">
          <Input
            value={format.excelFormat || getExcelFormatString(format)}
            onChange={(e) => onFormatChange({ excelFormat: e.target.value })}
            className="font-mono text-sm"
            placeholder="Enter custom Excel format string"
          />
        </div>
      </div>
      
      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold mb-4">PREVIEW</h3>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2 text-left text-sm font-medium">Input Value</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Formatted Output</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">1234.5</td>
                <td className="px-4 py-2">{formatValue(1234.5, format)}</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-2 font-mono text-sm">-500</td>
                <td className="px-4 py-2">{formatValue(-500, format)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-sm">0</td>
                <td className="px-4 py-2">{formatValue(0, format)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getExcelFormatString(format: ColumnFormat): string {
  if (format.currencyFormat) {
    const { symbol, decimals, thousandsSeparator, negativeFormat } = format.currencyFormat;
    const decimalPart = (decimals ?? 0) > 0 ? '.' + '0'.repeat(decimals ?? 0) : '';
    const separator = thousandsSeparator ? '#,##' : '';
    const base = `${symbol}${separator}0${decimalPart}`;
    
    switch (negativeFormat) {
      case 'redParentheses':
        return `${base};[Red](${base})`;
      case 'red':
        return `${base};[Red]-${base}`;
      case 'parentheses':
        return `${base};(${base})`;
      default:
        return `${base};-${base}`;
    }
  }
  
  return '#,##0.00';
}

function formatValue(value: number, format: ColumnFormat): string {
  if (format.currencyFormat) {
    const { symbol, decimals, thousandsSeparator, position } = format.currencyFormat;
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals || 2,
      maximumFractionDigits: decimals || 2,
      useGrouping: thousandsSeparator !== false,
    });
    
    return position === 'after' ? `${formatted}${symbol}` : `${symbol}${formatted}`;
  }
  
  if (format.dataType === 'percentage') {
    const val = format.numberFormat?.multiplyBy100 !== false ? value * 100 : value;
    return `${val.toFixed(format.numberFormat?.decimals || 2)}%`;
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: format.numberFormat?.decimals || 0,
    maximumFractionDigits: format.numberFormat?.decimals || 0,
    useGrouping: format.numberFormat?.thousandsSeparator || false,
  });
}