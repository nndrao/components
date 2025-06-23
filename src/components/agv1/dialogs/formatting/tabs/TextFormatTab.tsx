import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import type { ColumnFormat, TextAlignment, TextTransform } from '@/types/agv1/common.types';

interface TextFormatTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const alignmentOptions: { value: TextAlignment; label: string; icon: React.ReactNode }[] = [
  { value: 'left', label: 'Left', icon: <AlignLeft className="h-4 w-4" /> },
  { value: 'center', label: 'Center', icon: <AlignCenter className="h-4 w-4" /> },
  { value: 'right', label: 'Right', icon: <AlignRight className="h-4 w-4" /> },
  { value: 'justify', label: 'Justify', icon: <AlignJustify className="h-4 w-4" /> },
];

const textTransforms: { value: TextTransform | 'none'; label: string; example: string }[] = [
  { value: 'none', label: 'None', example: 'Sample Text' },
  { value: 'uppercase', label: 'Uppercase', example: 'SAMPLE TEXT' },
  { value: 'lowercase', label: 'Lowercase', example: 'sample text' },
  { value: 'capitalize', label: 'Capitalize', example: 'Sample Text' },
];

const overflowOptions = [
  { value: 'clip', label: 'Clip', description: 'Cut off text that doesn\'t fit' },
  { value: 'ellipsis', label: 'Ellipsis', description: 'Show "..." for overflow text' },
  { value: 'visible', label: 'Visible', description: 'Allow text to overflow the cell' },
];

export const TextFormatTab: React.FC<TextFormatTabProps> = ({
  format,
  onFormatChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Text Alignment</h3>
        <RadioGroup
          value={format.textAlignment || 'left'}
          onValueChange={(value) => onFormatChange({ textAlignment: value as TextAlignment })}
        >
          <div className="grid grid-cols-2 gap-4">
            {alignmentOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem value={option.value} id={`align-${option.value}`} />
                <Label 
                  htmlFor={`align-${option.value}`} 
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {option.icon}
                  <span>{option.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Text Wrapping</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="word-wrap">Word Wrap</Label>
              <p className="text-sm text-muted-foreground">
                Wrap long text to multiple lines within the cell
              </p>
            </div>
            <Switch
              id="word-wrap"
              checked={format.wordWrap ?? false}
              onCheckedChange={(checked) => onFormatChange({ wordWrap: checked })}
            />
          </div>

          <div>
            <Label htmlFor="overflow">Text Overflow</Label>
            <Select
              value={format.textOverflow || 'ellipsis'}
              onValueChange={(value) => onFormatChange({ textOverflow: value as 'clip' | 'ellipsis' | 'visible' })}
            >
              <SelectTrigger id="overflow" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {overflowOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4">Text Transform</h3>
        <RadioGroup
          value={format.textTransform || 'none'}
          onValueChange={(value) => onFormatChange({ 
            textTransform: value === 'none' ? undefined : value as TextTransform 
          })}
        >
          <div className="grid gap-3">
            {textTransforms.map((transform) => (
              <div key={transform.value} className="flex items-center space-x-3">
                <RadioGroupItem value={transform.value} id={`transform-${transform.value}`} />
                <Label 
                  htmlFor={`transform-${transform.value}`} 
                  className="flex items-center justify-between flex-1 cursor-pointer"
                >
                  <span>{transform.label}</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {transform.example}
                  </span>
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
            <div className="space-y-1">
              <Label htmlFor="trim-whitespace">Trim Whitespace</Label>
              <p className="text-sm text-muted-foreground">
                Remove leading and trailing spaces from text
              </p>
            </div>
            <Switch
              id="trim-whitespace"
              checked={format.trimWhitespace ?? false}
              onCheckedChange={(checked) => onFormatChange({ trimWhitespace: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="preserve-linebreaks">Preserve Line Breaks</Label>
              <p className="text-sm text-muted-foreground">
                Keep line breaks when displaying multi-line text
              </p>
            </div>
            <Switch
              id="preserve-linebreaks"
              checked={format.preserveLineBreaks ?? false}
              onCheckedChange={(checked) => onFormatChange({ preserveLineBreaks: checked })}
            />
          </div>

          <div>
            <Label htmlFor="max-lines">Maximum Lines</Label>
            <Select
              value={format.maxLines?.toString() || 'unlimited'}
              onValueChange={(value) => onFormatChange({ 
                maxLines: value === 'unlimited' ? undefined : parseInt(value) 
              })}
            >
              <SelectTrigger id="max-lines" className="mt-1 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Unlimited</SelectItem>
                <SelectItem value="1">1 line</SelectItem>
                <SelectItem value="2">2 lines</SelectItem>
                <SelectItem value="3">3 lines</SelectItem>
                <SelectItem value="4">4 lines</SelectItem>
                <SelectItem value="5">5 lines</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Limit the number of lines displayed (requires word wrap)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};