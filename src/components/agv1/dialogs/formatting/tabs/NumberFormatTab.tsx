import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { ColumnFormat, ExtendedNumberFormat, ExtendedCurrencyFormat } from '@/types/agv1/common.types';

interface NumberFormatTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const negativeFormats = [
  { value: 'minus', label: '-1,234.56', example: -1234.56 },
  { value: 'parentheses', label: '(1,234.56)', example: -1234.56 },
  { value: 'red', label: '1,234.56', example: -1234.56, className: 'text-red-600' },
  { value: 'redParentheses', label: '(1,234.56)', example: -1234.56, className: 'text-red-600' },
];

const percentageDisplays = [
  { value: 'decimal', label: 'Decimal (0.15 → 15%)' },
  { value: 'whole', label: 'Whole Number (15 → 15%)' },
];

export const NumberFormatTab: React.FC<NumberFormatTabProps> = ({
  format,
  onFormatChange,
}) => {
  const updateNumberFormat = (updates: Partial<ExtendedNumberFormat>) => {
    onFormatChange({
      numberFormat: { ...format.numberFormat, ...updates } as ExtendedNumberFormat,
    });
  };

  const updateCurrencyFormat = (updates: Partial<ExtendedCurrencyFormat>) => {
    onFormatChange({
      currencyFormat: { ...format.currencyFormat, ...updates } as ExtendedCurrencyFormat,
    });
  };

  const isPercentage = format.dataType === 'percentage' || format.numberFormat?.type === 'percentage';
  const isCurrency = format.dataType === 'currency';

  return (
    <div className="space-y-6">
      {!isCurrency && !isPercentage && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Number Format</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="decimal-places">Decimal Places</Label>
                <Input
                  id="decimal-places"
                  type="number"
                  min="0"
                  max="10"
                  value={format.numberFormat?.decimals ?? 2}
                  onChange={(e) => updateNumberFormat({ decimals: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="thousands-separator">Use Thousands Separator</Label>
                <Switch
                  id="thousands-separator"
                  checked={format.numberFormat?.thousandsSeparator ?? true}
                  onCheckedChange={(checked) => updateNumberFormat({ thousandsSeparator: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {isCurrency && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Currency Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={format.currencyFormat?.currency || 'USD'}
                  onValueChange={(value) => updateCurrencyFormat({ currency: value })}
                >
                  <SelectTrigger id="currency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono w-8">{curr.symbol}</span>
                          <span>{curr.code} - {curr.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency-display">Display Style</Label>
                <Select
                  value={format.currencyFormat?.currencyDisplay || 'symbol'}
                  onValueChange={(value) => updateCurrencyFormat({ currencyDisplay: value as 'symbol' | 'code' | 'name' })}
                >
                  <SelectTrigger id="currency-display" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="symbol">Symbol ($100)</SelectItem>
                    <SelectItem value="code">Code (USD 100)</SelectItem>
                    <SelectItem value="name">Name (100 US dollars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-decimals">Min Decimal Places</Label>
                  <Input
                    id="min-decimals"
                    type="number"
                    min="0"
                    max="10"
                    value={format.currencyFormat?.minimumFractionDigits ?? 2}
                    onChange={(e) => updateCurrencyFormat({ minimumFractionDigits: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="max-decimals">Max Decimal Places</Label>
                  <Input
                    id="max-decimals"
                    type="number"
                    min="0"
                    max="10"
                    value={format.currencyFormat?.maximumFractionDigits ?? 2}
                    onChange={(e) => updateCurrencyFormat({ maximumFractionDigits: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {isPercentage && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Percentage Settings</h3>
            <div className="space-y-4">
              <div>
                <Label>Input Format</Label>
                <RadioGroup
                  value={format.numberFormat?.percentageMode || 'decimal'}
                  onValueChange={(value) => updateNumberFormat({ percentageMode: value as 'decimal' | 'whole' })}
                  className="mt-2"
                >
                  {percentageDisplays.map((display) => (
                    <div key={display.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={display.value} id={display.value} />
                      <Label htmlFor={display.value} className="font-normal">
                        {display.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="percentage-decimals">Decimal Places</Label>
                <Input
                  id="percentage-decimals"
                  type="number"
                  min="0"
                  max="10"
                  value={format.numberFormat?.decimals ?? 2}
                  onChange={(e) => updateNumberFormat({ decimals: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-32"
                />
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Negative Number Format</h3>
        <RadioGroup
          value={format.numberFormat?.negativeFormat || 'minus'}
          onValueChange={(value) => updateNumberFormat({ negativeFormat: value as 'minus' | 'parentheses' | 'red' | 'redParentheses' })}
        >
          <div className="grid gap-3">
            {negativeFormats.map((neg) => (
              <div key={neg.value} className="flex items-center space-x-3">
                <RadioGroupItem value={neg.value} id={`neg-${neg.value}`} />
                <Label 
                  htmlFor={`neg-${neg.value}`} 
                  className={`font-mono ${neg.className || ''}`}
                >
                  {neg.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Advanced Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-zero">Show Zero Values</Label>
              <p className="text-sm text-muted-foreground">Display zeros instead of blank cells</p>
            </div>
            <Switch
              id="show-zero"
              checked={format.numberFormat?.showZero ?? true}
              onCheckedChange={(checked) => updateNumberFormat({ showZero: checked })}
            />
          </div>

          <div>
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              placeholder="e.g., $"
              value={format.numberFormat?.prefix || ''}
              onChange={(e) => updateNumberFormat({ prefix: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="suffix">Suffix</Label>
            <Input
              id="suffix"
              placeholder="e.g., USD"
              value={format.numberFormat?.suffix || ''}
              onChange={(e) => updateNumberFormat({ suffix: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};