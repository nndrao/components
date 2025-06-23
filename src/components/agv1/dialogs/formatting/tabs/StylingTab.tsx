import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface StylingTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

export const StylingTab: React.FC<StylingTabProps> = ({ format, onFormatChange }) => {
  const updateCellStyle = (updates: Partial<ColumnFormat['cellStyle']>) => {
    onFormatChange({
      cellStyle: {
        ...format.cellStyle,
        ...updates,
      },
    });
  };

  const updateBorder = (side: string, updates: any) => {
    onFormatChange({
      cellStyle: {
        ...format.cellStyle,
        borders: {
          ...format.cellStyle?.borders,
          [side]: {
            ...format.cellStyle?.borders?.[side],
            ...updates,
          },
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Cell Styling Section */}
      <div>
        <h3 className="text-sm font-semibold mb-4">CELL STYLING</h3>
        
        {/* Colors */}
        <div className="space-y-4 p-4 border rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="text-color" className="text-xs">Text Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="text-color"
                  type="text"
                  value={format.cellStyle?.textColor || '#000000'}
                  onChange={(e) => updateCellStyle({ textColor: e.target.value })}
                  className="h-8"
                />
                <Button size="sm" variant="outline" className="w-8 h-8 p-0">
                  <Palette className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="bg-color" className="text-xs">Background</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="bg-color"
                  type="text"
                  value={format.cellStyle?.backgroundColor || '#FFFFFF'}
                  onChange={(e) => updateCellStyle({ backgroundColor: e.target.value })}
                  className="h-8"
                />
                <Button size="sm" variant="outline" className="w-8 h-8 p-0">
                  <Palette className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Font Settings */}
        <div className="space-y-4 p-4 border rounded-md mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="font-family" className="text-xs">Font</Label>
                <Select
                  value={format.cellStyle?.fontFamily || 'default'}
                  onValueChange={(value) => updateCellStyle({ fontFamily: value })}
                >
                  <SelectTrigger id="font-family" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="arial">Arial</SelectItem>
                    <SelectItem value="helvetica">Helvetica</SelectItem>
                    <SelectItem value="times">Times New Roman</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="font-size" className="text-xs">Size</Label>
                <Select
                  value={String(format.cellStyle?.fontSize || 13)}
                  onValueChange={(value) => updateCellStyle({ fontSize: parseInt(value) })}
                >
                  <SelectTrigger id="font-size" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 11, 12, 13, 14, 16, 18, 20, 24].map(size => (
                      <SelectItem key={size} value={String(size)}>{size}px</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="font-weight" className="text-xs">Weight</Label>
              <Select
                value={format.cellStyle?.fontWeight || 'normal'}
                onValueChange={(value) => updateCellStyle({ fontWeight: value as any })}
              >
                <SelectTrigger id="font-weight" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="lighter">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="font-style" className="text-xs">Style</Label>
              <Select
                value={format.cellStyle?.fontStyle || 'normal'}
                onValueChange={(value) => updateCellStyle({ fontStyle: value as any })}
              >
                <SelectTrigger id="font-style" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Borders Section */}
      <div>
        <div className="space-y-4 p-4 border rounded-md">
          <h4 className="text-sm font-medium">Borders</h4>
          {['top', 'right', 'bottom', 'left'].map((side) => (
            <div key={side} className="grid grid-cols-4 gap-2 items-center">
              <Label className="text-xs capitalize">{side}</Label>
              <Select
                value={format.cellStyle?.borders?.[side]?.style || 'none'}
                onValueChange={(value) => updateBorder(side, { style: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="text"
                placeholder="1px"
                value={format.cellStyle?.borders?.[side]?.width || '1px'}
                onChange={(e) => updateBorder(side, { width: e.target.value })}
                className="h-8"
              />
              
              <div className="flex gap-1">
                <Input
                  type="text"
                  value={format.cellStyle?.borders?.[side]?.color || '#E2E8F0'}
                  onChange={(e) => updateBorder(side, { color: e.target.value })}
                  className="h-8"
                />
                <Button size="sm" variant="outline" className="w-8 h-8 p-0">
                  <Palette className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Padding & Alignment Section */}
      <div>
        <div className="space-y-4 p-4 border rounded-md">
          <h4 className="text-sm font-medium">Padding & Alignment</h4>
          
          {/* Padding */}
          <div className="grid grid-cols-4 gap-2">
            <Label className="text-xs col-span-4">Padding</Label>
            {['top', 'right', 'bottom', 'left'].map((side) => (
              <Input
                key={side}
                type="text"
                placeholder="8px"
                value={
                  typeof format.cellStyle?.padding === 'object' && format.cellStyle?.padding 
                    ? (format.cellStyle.padding as any)[side] || '8px'
                    : '8px'
                }
                onChange={(e) => onFormatChange({
                  cellStyle: {
                    ...format.cellStyle,
                    padding: {
                      ...format.cellStyle?.padding,
                      [side]: e.target.value,
                    },
                  },
                })}
                className="h-8"
              />
            ))}
          </div>
          
          {/* Alignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">H-Align</Label>
              <ToggleGroup
                type="single"
                value={format.textAlignment || 'left'}
                onValueChange={(value) => value && onFormatChange({ textAlignment: value as any })}
                className="mt-1"
              >
                <ToggleGroupItem value="left" size="sm">
                  <AlignLeft className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" size="sm">
                  <AlignCenter className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" size="sm">
                  <AlignRight className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="justify" size="sm">
                  <AlignJustify className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <Label className="text-xs">V-Align</Label>
              <ToggleGroup
                type="single"
                value={format.cellStyle?.verticalAlign || 'middle'}
                onValueChange={(value) => value && updateCellStyle({ verticalAlign: value as any })}
                className="mt-1"
              >
                <ToggleGroupItem value="top" size="sm">▲</ToggleGroupItem>
                <ToggleGroupItem value="middle" size="sm">■</ToggleGroupItem>
                <ToggleGroupItem value="bottom" size="sm">▼</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview Section */}
      <div>
        <h3 className="text-sm font-semibold mb-4">PREVIEW</h3>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-4 py-2 text-left text-sm font-medium">Product Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b">Widget Pro</td>
                <td 
                  className="px-4 py-2 border-b"
                  style={{
                    color: format.cellStyle?.textColor,
                    backgroundColor: format.cellStyle?.backgroundColor,
                    fontSize: `${format.cellStyle?.fontSize || 13}px`,
                    fontWeight: format.cellStyle?.fontWeight,
                    fontStyle: format.cellStyle?.fontStyle,
                    fontFamily: format.cellStyle?.fontFamily,
                    textAlign: format.textAlignment as any,
                    padding: Object.values(format.cellStyle?.padding || {}).join(' '),
                  }}
                >
                  $99.99
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">Gadget Plus</td>
                <td 
                  className="px-4 py-2"
                  style={{
                    color: format.cellStyle?.textColor,
                    backgroundColor: format.cellStyle?.backgroundColor,
                    fontSize: `${format.cellStyle?.fontSize || 13}px`,
                    fontWeight: format.cellStyle?.fontWeight,
                    fontStyle: format.cellStyle?.fontStyle,
                    fontFamily: format.cellStyle?.fontFamily,
                    textAlign: format.textAlignment as any,
                    padding: Object.values(format.cellStyle?.padding || {}).join(' '),
                  }}
                >
                  $149.99
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};