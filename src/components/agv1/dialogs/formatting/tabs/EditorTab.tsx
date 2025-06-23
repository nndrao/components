import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface EditorTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

export const EditorTab: React.FC<EditorTabProps> = ({ format, onFormatChange }) => {
  const updateEditorOptions = (updates: any) => {
    onFormatChange({
      editorOptions: {
        ...format.editorOptions,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Editor Type */}
      <div>
        <h3 className="text-sm font-semibold mb-4">EDITOR TYPE</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <RadioGroup
            value={format.editorOptions?.editorType || 'text'}
            onValueChange={(value) => updateEditorOptions({ editorType: value })}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="text" id="text-editor" className="mt-1" />
                <div>
                  <Label htmlFor="text-editor" className="text-sm font-medium cursor-pointer">
                    Text Editor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Simple text input for editing cell values
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="number" id="number-editor" className="mt-1" />
                <div>
                  <Label htmlFor="number-editor" className="text-sm font-medium cursor-pointer">
                    Number Editor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Numeric input with validation and formatting
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="select" id="select-editor" className="mt-1" />
                <div>
                  <Label htmlFor="select-editor" className="text-sm font-medium cursor-pointer">
                    Select Editor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Dropdown selection from predefined values
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="date" id="date-editor" className="mt-1" />
                <div>
                  <Label htmlFor="date-editor" className="text-sm font-medium cursor-pointer">
                    Date Editor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Calendar picker for date selection
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="richtext" id="richtext-editor" className="mt-1" />
                <div>
                  <Label htmlFor="richtext-editor" className="text-sm font-medium cursor-pointer">
                    Rich Text Editor
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Full text editor with formatting options
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="none" id="no-editor" className="mt-1" />
                <div>
                  <Label htmlFor="no-editor" className="text-sm font-medium cursor-pointer">
                    Read Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Disable editing for this column
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
      
      {/* Editor Options */}
      {format.editorOptions?.editorType !== 'none' && (
        <div>
          <h3 className="text-sm font-semibold mb-4">EDITOR OPTIONS</h3>
          <div className="space-y-4 p-4 border rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-on-click"
                checked={format.editorOptions?.editOnClick !== false}
                onCheckedChange={(checked) => updateEditorOptions({ editOnClick: checked })}
              />
              <Label htmlFor="edit-on-click" className="text-sm">
                Edit on single click
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-on-focus"
                checked={format.editorOptions?.selectAllOnFocus || false}
                onCheckedChange={(checked) => updateEditorOptions({ selectAllOnFocus: checked })}
              />
              <Label htmlFor="select-all-on-focus" className="text-sm">
                Select all text on focus
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stop-editing-on-enter"
                checked={format.editorOptions?.stopEditingOnEnter !== false}
                onCheckedChange={(checked) => updateEditorOptions({ stopEditingOnEnter: checked })}
              />
              <Label htmlFor="stop-editing-on-enter" className="text-sm">
                Stop editing when Enter is pressed
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-formatter"
                checked={format.editorOptions?.useFormatter || false}
                onCheckedChange={(checked) => updateEditorOptions({ useFormatter: checked })}
              />
              <Label htmlFor="use-formatter" className="text-sm">
                Use column formatter in editor
              </Label>
            </div>
          </div>
        </div>
      )}
      
      {/* Select Editor Options */}
      {format.editorOptions?.editorType === 'select' && (
        <div>
          <h3 className="text-sm font-semibold mb-4">SELECT OPTIONS</h3>
          <div className="space-y-4 p-4 border rounded-md">
            <div>
              <Label htmlFor="select-values" className="text-xs">
                Available Options (one per line)
              </Label>
              <Textarea
                id="select-values"
                value={format.editorOptions?.selectOptions?.join('\n') || ''}
                onChange={(e) => updateEditorOptions({
                  selectOptions: e.target.value.split('\n').filter(v => v.trim()),
                })}
                className="mt-1 font-mono text-sm"
                rows={6}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow-custom-value"
                checked={format.editorOptions?.allowCustomValue || false}
                onCheckedChange={(checked) => updateEditorOptions({ allowCustomValue: checked })}
              />
              <Label htmlFor="allow-custom-value" className="text-sm">
                Allow custom values
              </Label>
            </div>
          </div>
        </div>
      )}
      
      {/* Number Editor Options */}
      {format.editorOptions?.editorType === 'number' && (
        <div>
          <h3 className="text-sm font-semibold mb-4">NUMBER VALIDATION</h3>
          <div className="space-y-4 p-4 border rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-value" className="text-xs">Minimum Value</Label>
                <input
                  id="min-value"
                  type="number"
                  value={format.editorOptions?.min || ''}
                  onChange={(e) => updateEditorOptions({ min: e.target.value ? Number(e.target.value) : undefined })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="No limit"
                />
              </div>
              
              <div>
                <Label htmlFor="max-value" className="text-xs">Maximum Value</Label>
                <input
                  id="max-value"
                  type="number"
                  value={format.editorOptions?.max || ''}
                  onChange={(e) => updateEditorOptions({ max: e.target.value ? Number(e.target.value) : undefined })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="No limit"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="step" className="text-xs">Step Value</Label>
              <input
                id="step"
                type="number"
                value={format.editorOptions?.step || 1}
                onChange={(e) => updateEditorOptions({ step: Number(e.target.value) || 1 })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Validation Rules */}
      <div>
        <h3 className="text-sm font-semibold mb-4">VALIDATION</h3>
        <div className="space-y-4 p-4 border rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={format.editorOptions?.required || false}
              onCheckedChange={(checked) => updateEditorOptions({ required: checked })}
            />
            <Label htmlFor="required" className="text-sm">
              Required field
            </Label>
          </div>
          
          <div>
            <Label htmlFor="pattern" className="text-xs">Pattern (RegEx)</Label>
            <input
              id="pattern"
              type="text"
              value={format.editorOptions?.pattern || ''}
              onChange={(e) => updateEditorOptions({ pattern: e.target.value })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono mt-1"
              placeholder="e.g. ^[A-Z]{2}-\\d{4}$"
            />
          </div>
          
          <div>
            <Label htmlFor="error-message" className="text-xs">Custom Error Message</Label>
            <input
              id="error-message"
              type="text"
              value={format.editorOptions?.errorMessage || ''}
              onChange={(e) => updateEditorOptions({ errorMessage: e.target.value })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              placeholder="Value must match pattern XX-0000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};