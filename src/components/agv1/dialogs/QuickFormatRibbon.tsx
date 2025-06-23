import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from '@/components/ui/color-picker';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Palette,
  Type,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  MoreHorizontal,
  X,
  GripHorizontal,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface QuickFormatRibbonProps {
  visible: boolean;
  onClose: () => void;
  onApply: (format: Partial<ColumnFormat>) => void;
  initialFormat?: ColumnFormat;
  position?: { x: number; y: number };
  columnName?: string;
}

const formatButtons = [
  { 
    id: 'number', 
    icon: Hash, 
    tooltip: 'Number Format',
    format: { dataType: 'number' as const }
  },
  { 
    id: 'currency', 
    icon: DollarSign, 
    tooltip: 'Currency Format',
    format: { dataType: 'currency' as const }
  },
  { 
    id: 'percentage', 
    icon: Percent, 
    tooltip: 'Percentage Format',
    format: { dataType: 'percentage' as const }
  },
  { 
    id: 'date', 
    icon: Calendar, 
    tooltip: 'Date Format',
    format: { dataType: 'date' as const }
  },
];

export const QuickFormatRibbon: React.FC<QuickFormatRibbonProps> = ({
  visible,
  onClose,
  onApply,
  initialFormat,
  position = { x: 100, y: 100 },
  columnName
}) => {
  const [localFormat, setLocalFormat] = useState<Partial<ColumnFormat>>(initialFormat || {});
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  useEffect(() => {
    if (initialFormat) {
      setLocalFormat(initialFormat);
    }
  }, [initialFormat]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      const rect = ribbonRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setCurrentPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const updateFormat = useCallback((updates: Partial<ColumnFormat>) => {
    const newFormat = { ...localFormat, ...updates };
    setLocalFormat(newFormat);
    onApply(newFormat);
  }, [localFormat, onApply]);

  const handleFontStyleToggle = useCallback((values: string[]) => {
    updateFormat({
      cellStyle: {
        ...localFormat.cellStyle,
        fontWeight: values.includes('bold') ? 'bold' : 'normal',
        fontStyle: values.includes('italic') ? 'italic' : 'normal',
        font: {
          ...localFormat.cellStyle?.font,
          fontWeight: values.includes('bold') ? 'bold' : 'normal',
          fontStyle: values.includes('italic') ? 'italic' : 'normal',
        }
      }
    });
  }, [localFormat, updateFormat]);

  const handleAlignmentChange = useCallback((value: string) => {
    if (!value) return;
    updateFormat({
      textAlignment: value as any,
      cellStyle: {
        ...localFormat.cellStyle,
        alignment: {
          ...localFormat.cellStyle?.alignment,
          horizontal: value as any
        }
      }
    });
  }, [localFormat, updateFormat]);

  const handleTextColorChange = useCallback((color: string) => {
    updateFormat({
      cellStyle: {
        ...localFormat.cellStyle,
        textColor: color,
        font: {
          ...localFormat.cellStyle?.font,
          color
        }
      }
    });
  }, [localFormat, updateFormat]);

  const handleBackgroundColorChange = useCallback((color: string) => {
    updateFormat({
      cellStyle: {
        ...localFormat.cellStyle,
        backgroundColor: color
      }
    });
  }, [localFormat, updateFormat]);

  const handleFormatTypeClick = useCallback((format: any) => {
    updateFormat(format);
  }, [updateFormat]);

  if (!visible) return null;

  const fontStyles = [];
  if (localFormat.cellStyle?.fontWeight === 'bold' || localFormat.cellStyle?.font?.fontWeight === 'bold') {
    fontStyles.push('bold');
  }
  if (localFormat.cellStyle?.fontStyle === 'italic' || localFormat.cellStyle?.font?.fontStyle === 'italic') {
    fontStyles.push('italic');
  }

  return (
    <div
      ref={ribbonRef}
      className={cn(
        "fixed bg-background border rounded-lg shadow-lg z-50 select-none",
        isDragging && "cursor-move",
        isMinimized ? "w-auto" : "w-[480px]"
      )}
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div data-drag-handle className="cursor-move">
            <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">
            Quick Format {columnName && `- ${columnName}`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Type */}
            <div className="flex items-center gap-1">
              {formatButtons.map((btn) => (
                <Button
                  key={btn.id}
                  variant={localFormat.dataType === btn.format.dataType ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleFormatTypeClick(btn.format)}
                  title={btn.tooltip}
                >
                  <btn.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Font Styles */}
            <ToggleGroup
              type="multiple"
              value={fontStyles}
              onValueChange={handleFontStyleToggle}
              className="gap-1"
            >
              <ToggleGroupItem value="bold" size="sm" className="h-8 w-8 p-0">
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" size="sm" className="h-8 w-8 p-0">
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" size="sm" className="h-8 w-8 p-0" disabled>
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="h-6" />

            {/* Alignment */}
            <ToggleGroup
              type="single"
              value={localFormat.textAlignment || localFormat.cellStyle?.alignment?.horizontal || 'left'}
              onValueChange={handleAlignmentChange}
              className="gap-1"
            >
              <ToggleGroupItem value="left" size="sm" className="h-8 w-8 p-0">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" size="sm" className="h-8 w-8 p-0">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" size="sm" className="h-8 w-8 p-0">
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="h-6" />

            {/* Colors */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <Type 
                    className="h-4 w-4" 
                    style={{ 
                      color: localFormat.cellStyle?.textColor || localFormat.cellStyle?.font?.color 
                    }} 
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Text Color</p>
                  <ColorPicker
                    color={localFormat.cellStyle?.textColor || localFormat.cellStyle?.font?.color || '#000000'}
                    onChange={handleTextColorChange}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <div 
                    className="h-4 w-4 rounded border"
                    style={{ backgroundColor: localFormat.cellStyle?.backgroundColor || 'transparent' }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Background Color</p>
                  <ColorPicker
                    color={localFormat.cellStyle?.backgroundColor || '#ffffff'}
                    onChange={handleBackgroundColorChange}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Separator orientation="vertical" className="h-6" />

            {/* More Options */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 gap-1"
              onClick={() => {
                // Open full formatting dialog
                onClose();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </Button>
          </div>

          {/* Format Preview */}
          <div className="mt-3 p-3 border rounded-md bg-muted/20">
            <div className="text-xs text-muted-foreground mb-1">Preview</div>
            <div 
              className="text-sm"
              style={{
                fontWeight: localFormat.cellStyle?.fontWeight || localFormat.cellStyle?.font?.fontWeight,
                fontStyle: localFormat.cellStyle?.fontStyle || localFormat.cellStyle?.font?.fontStyle,
                textAlign: localFormat.textAlignment || localFormat.cellStyle?.alignment?.horizontal,
                color: localFormat.cellStyle?.textColor || localFormat.cellStyle?.font?.color,
                backgroundColor: localFormat.cellStyle?.backgroundColor,
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              {localFormat.dataType === 'currency' && '$1,234.56'}
              {localFormat.dataType === 'percentage' && '85.5%'}
              {localFormat.dataType === 'number' && '1,234.56'}
              {localFormat.dataType === 'date' && '2024-01-15'}
              {!localFormat.dataType && 'Sample Text'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};