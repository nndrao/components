import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const presetColors = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  className
}) => {
  const [inputValue, setInputValue] = useState(color);

  const handleColorChange = useCallback((newColor: string) => {
    setInputValue(newColor);
    onChange(newColor);
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  }, [onChange]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-6 gap-1">
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            className={cn(
              "w-7 h-7 rounded border-2 transition-all",
              color === presetColor ? "border-primary" : "border-transparent"
            )}
            style={{ backgroundColor: presetColor }}
            onClick={() => handleColorChange(presetColor)}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded"
        />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          className="flex-1 font-mono text-xs"
        />
      </div>
    </div>
  );
};