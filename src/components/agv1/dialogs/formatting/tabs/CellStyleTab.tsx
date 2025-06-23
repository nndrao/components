import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Type, Square } from 'lucide-react';
import type { ColumnFormat, ExtendedCellStyle, BorderStyle } from '@/types/agv1/common.types';

interface CellStyleTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const fontWeights = [
  { value: '300', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
];

const fontFamilies = [
  { value: 'default', label: 'Default (System)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Helvetica Neue", Helvetica, sans-serif', label: 'Helvetica' },
  { value: '"Segoe UI", Tahoma, sans-serif', label: 'Segoe UI' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Monaco, Consolas, monospace', label: 'Monaco' },
];

const borderStyles: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
];

const predefinedColors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#808080', '#A52A2A', '#008000', '#000080',
];

export const CellStyleTab: React.FC<CellStyleTabProps> = ({
  format,
  onFormatChange,
}) => {
  const [activeTab, setActiveTab] = useState('colors');

  const updateCellStyle = (updates: Partial<ExtendedCellStyle>) => {
    onFormatChange({
      cellStyle: { ...format.cellStyle, ...updates } as ExtendedCellStyle,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Typography
          </TabsTrigger>
          <TabsTrigger value="borders" className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            Borders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Background Color</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="color"
                  value={format.cellStyle?.backgroundColor || '#FFFFFF'}
                  onChange={(e) => updateCellStyle({ backgroundColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  placeholder="#FFFFFF"
                  value={format.cellStyle?.backgroundColor || ''}
                  onChange={(e) => updateCellStyle({ backgroundColor: e.target.value })}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateCellStyle({ backgroundColor: undefined })}
                >
                  Clear
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                    style={{ backgroundColor: color }}
                    onClick={() => updateCellStyle({ backgroundColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Text Color</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="color"
                  value={format.cellStyle?.textColor || '#000000'}
                  onChange={(e) => updateCellStyle({ textColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  placeholder="#000000"
                  value={format.cellStyle?.textColor || ''}
                  onChange={(e) => updateCellStyle({ textColor: e.target.value })}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateCellStyle({ textColor: undefined })}
                >
                  Clear
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                    style={{ backgroundColor: color }}
                    onClick={() => updateCellStyle({ textColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Font Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="font-family">Font Family</Label>
                <Select
                  value={format.cellStyle?.fontFamily || 'default'}
                  onValueChange={(value) => updateCellStyle({ 
                    fontFamily: value === 'default' ? undefined : value 
                  })}
                >
                  <SelectTrigger id="font-family" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="font-size">Font Size</Label>
                <div className="flex items-center gap-4 mt-1">
                  <Slider
                    id="font-size"
                    min={8}
                    max={24}
                    step={1}
                    value={[format.cellStyle?.fontSize || 14]}
                    onValueChange={([value]) => updateCellStyle({ fontSize: value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="8"
                    max="24"
                    value={format.cellStyle?.fontSize || 14}
                    onChange={(e) => updateCellStyle({ fontSize: parseInt(e.target.value) || 14 })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
              </div>

              <div>
                <Label htmlFor="font-weight">Font Weight</Label>
                <Select
                  value={format.cellStyle?.fontWeight || 'normal'}
                  onValueChange={(value) => updateCellStyle({ fontWeight: value as '300' | 'normal' | '500' | '600' | 'bold' })}
                >
                  <SelectTrigger id="font-weight" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontWeights.map((weight) => (
                      <SelectItem key={weight.value} value={weight.value}>
                        <span style={{ fontWeight: weight.value }}>{weight.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="line-height">Line Height</Label>
                <div className="flex items-center gap-4 mt-1">
                  <Slider
                    id="line-height"
                    min={1}
                    max={3}
                    step={0.1}
                    value={[format.cellStyle?.lineHeight || 1.5]}
                    onValueChange={([value]) => updateCellStyle({ lineHeight: value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    max="3"
                    step="0.1"
                    value={format.cellStyle?.lineHeight || 1.5}
                    onChange={(e) => updateCellStyle({ lineHeight: parseFloat(e.target.value) || 1.5 })}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="borders" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Border Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="border-style">Border Style</Label>
                <Select
                  value={format.cellStyle?.borderStyle || 'none'}
                  onValueChange={(value) => updateCellStyle({ borderStyle: value as BorderStyle })}
                >
                  <SelectTrigger id="border-style" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {borderStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {format.cellStyle?.borderStyle && format.cellStyle.borderStyle !== 'none' && (
                <>
                  <div>
                    <Label htmlFor="border-width">Border Width</Label>
                    <div className="flex items-center gap-4 mt-1">
                      <Slider
                        id="border-width"
                        min={1}
                        max={5}
                        step={1}
                        value={[format.cellStyle?.borderWidth || 1]}
                        onValueChange={([value]) => updateCellStyle({ borderWidth: value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={format.cellStyle?.borderWidth || 1}
                        onChange={(e) => updateCellStyle({ borderWidth: parseInt(e.target.value) || 1 })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="border-color">Border Color</Label>
                    <div className="flex items-center gap-4 mt-1">
                      <Input
                        type="color"
                        value={format.cellStyle?.borderColor || '#000000'}
                        onChange={(e) => updateCellStyle({ borderColor: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        placeholder="#000000"
                        value={format.cellStyle?.borderColor || ''}
                        onChange={(e) => updateCellStyle({ borderColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Padding</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="padding-horizontal">Horizontal Padding</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="padding-horizontal"
                    type="number"
                    min="0"
                    max="20"
                    value={format.cellStyle?.paddingHorizontal || 8}
                    onChange={(e) => updateCellStyle({ paddingHorizontal: parseInt(e.target.value) || 8 })}
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
              </div>
              <div>
                <Label htmlFor="padding-vertical">Vertical Padding</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="padding-vertical"
                    type="number"
                    min="0"
                    max="20"
                    value={format.cellStyle?.paddingVertical || 4}
                    onChange={(e) => updateCellStyle({ paddingVertical: parseInt(e.target.value) || 4 })}
                  />
                  <span className="text-sm text-muted-foreground">px</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};