import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import type { 
  ColumnFormat, 
  ConditionalFormat, 
  ConditionalRule,
  ComparisonOperator
} from '@/types/agv1/common.types';

interface ConditionalFormattingTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

const operators: { value: ComparisonOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'between', label: 'Between' },
  { value: 'notBetween', label: 'Not Between' },
  { value: 'empty', label: 'Is Empty' },
  { value: 'notEmpty', label: 'Is Not Empty' },
];

const formatTypes = [
  { value: 'cellStyle', label: 'Cell Style', description: 'Change colors, fonts, and borders' },
  { value: 'dataBar', label: 'Data Bar', description: 'Show value as a bar chart' },
  { value: 'colorScale', label: 'Color Scale', description: 'Apply gradient based on value' },
  { value: 'iconSet', label: 'Icon Set', description: 'Display icons based on value' },
];

const defaultRule: ConditionalRule = {
  id: Date.now().toString(),
  operator: 'equals',
  value: '',
  formatType: 'cellStyle',
  style: {
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
  },
  priority: 0,
  enabled: true,
};

export const ConditionalFormattingTab: React.FC<ConditionalFormattingTabProps> = ({
  format,
  onFormatChange,
}) => {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const rules = format.conditionalFormats || [];

  const updateConditionalFormats = (newRules: ConditionalFormat[]) => {
    onFormatChange({ conditionalFormats: newRules });
  };

  const addRule = () => {
    const newRule: ConditionalFormat = {
      ...defaultRule,
      id: Date.now().toString(),
      priority: rules.length,
    };
    updateConditionalFormats([...rules, newRule]);
    setExpandedRule(newRule.id);
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    updateConditionalFormats(
      rules.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule)
    );
  };

  const deleteRule = (ruleId: string) => {
    updateConditionalFormats(rules.filter(rule => rule.id !== ruleId));
  };

  const duplicateRule = (rule: ConditionalFormat) => {
    const newRule: ConditionalFormat = {
      ...rule,
      id: Date.now().toString(),
      priority: rules.length,
    };
    updateConditionalFormats([...rules, newRule]);
  };

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < rules.length) {
      [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
      newRules.forEach((rule, i) => rule.priority = i);
      updateConditionalFormats(newRules);
    }
  };

  const needsSecondValue = (operator: ComparisonOperator) => 
    operator === 'between' || operator === 'notBetween';

  const needsValue = (operator: ComparisonOperator) => 
    operator !== 'empty' && operator !== 'notEmpty';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Conditional Formatting Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Apply formatting to cells based on their values. Rules are evaluated in order.
        </p>
        
        <Button onClick={addRule} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add New Rule
        </Button>
      </div>

      {rules.length > 0 && (
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <Card key={rule.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                    />
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    >
                      <div className="font-medium">Rule {index + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        {rule.operator} {needsValue(rule.operator) && rule.value}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveRule(index, 'up')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                    {index < rules.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveRule(index, 'down')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateRule(rule)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedRule === rule.id && (
                <CardContent className="p-4 pt-0 space-y-4">
                  <Separator />
                  
                  <div>
                    <Label htmlFor={`operator-${rule.id}`}>Condition</Label>
                    <Select
                      value={rule.operator}
                      onValueChange={(value) => updateRule(rule.id, { operator: value as ComparisonOperator })}
                    >
                      <SelectTrigger id={`operator-${rule.id}`} className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {needsValue(rule.operator) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`value-${rule.id}`}>Value</Label>
                        <Input
                          id={`value-${rule.id}`}
                          value={rule.value}
                          onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      {needsSecondValue(rule.operator) && (
                        <div>
                          <Label htmlFor={`value2-${rule.id}`}>Second Value</Label>
                          <Input
                            id={`value2-${rule.id}`}
                            value={rule.value2 || ''}
                            onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`format-type-${rule.id}`}>Format Type</Label>
                    <Select
                      value={rule.formatType}
                      onValueChange={(value) => updateRule(rule.id, { formatType: value as 'cellStyle' | 'dataBar' | 'colorScale' | 'iconSet' })}
                    >
                      <SelectTrigger id={`format-type-${rule.id}`} className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formatTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {rule.formatType === 'cellStyle' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Style Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`bg-color-${rule.id}`}>Background Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              id={`bg-color-${rule.id}`}
                              value={rule.style?.backgroundColor || '#FFFFFF'}
                              onChange={(e) => updateRule(rule.id, { 
                                style: { ...rule.style, backgroundColor: e.target.value } 
                              })}
                              className="w-20 h-10"
                            />
                            <Input
                              type="text"
                              value={rule.style?.backgroundColor || ''}
                              onChange={(e) => updateRule(rule.id, { 
                                style: { ...rule.style, backgroundColor: e.target.value } 
                              })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`text-color-${rule.id}`}>Text Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              id={`text-color-${rule.id}`}
                              value={rule.style?.textColor || '#000000'}
                              onChange={(e) => updateRule(rule.id, { 
                                style: { ...rule.style, textColor: e.target.value } 
                              })}
                              className="w-20 h-10"
                            />
                            <Input
                              type="text"
                              value={rule.style?.textColor || ''}
                              onChange={(e) => updateRule(rule.id, { 
                                style: { ...rule.style, textColor: e.target.value } 
                              })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor={`font-weight-${rule.id}`}>Font Weight</Label>
                        <Select
                          value={rule.style?.fontWeight || 'normal'}
                          onValueChange={(value) => updateRule(rule.id, { 
                            style: { ...rule.style, fontWeight: value as 'normal' | 'bold' | '600' } 
                          })}
                        >
                          <SelectTrigger id={`font-weight-${rule.id}`} className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                            <SelectItem value="600">Semibold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {rule.formatType === 'dataBar' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Data Bar Settings</h4>
                      <div>
                        <Label htmlFor={`bar-color-${rule.id}`}>Bar Color</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            id={`bar-color-${rule.id}`}
                            value={rule.dataBar?.color || '#3B82F6'}
                            onChange={(e) => updateRule(rule.id, { 
                              dataBar: { ...rule.dataBar, color: e.target.value } 
                            })}
                            className="w-20 h-10"
                          />
                          <Input
                            type="text"
                            value={rule.dataBar?.color || ''}
                            onChange={(e) => updateRule(rule.id, { 
                              dataBar: { ...rule.dataBar, color: e.target.value } 
                            })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`show-value-${rule.id}`}>Show Value</Label>
                        <Switch
                          id={`show-value-${rule.id}`}
                          checked={rule.dataBar?.showValue ?? true}
                          onCheckedChange={(checked) => updateRule(rule.id, { 
                            dataBar: { ...rule.dataBar, showValue: checked } 
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {rule.formatType === 'colorScale' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Color Scale Settings</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Low Value</Label>
                          <Input
                            type="color"
                            value={rule.colorScale?.minColor || '#F87171'}
                            onChange={(e) => updateRule(rule.id, { 
                              colorScale: { ...rule.colorScale, minColor: e.target.value } 
                            })}
                            className="mt-1 w-full h-10"
                          />
                        </div>
                        <div>
                          <Label>Mid Value</Label>
                          <Input
                            type="color"
                            value={rule.colorScale?.midColor || '#FCD34D'}
                            onChange={(e) => updateRule(rule.id, { 
                              colorScale: { ...rule.colorScale, midColor: e.target.value } 
                            })}
                            className="mt-1 w-full h-10"
                          />
                        </div>
                        <div>
                          <Label>High Value</Label>
                          <Input
                            type="color"
                            value={rule.colorScale?.maxColor || '#4ADE80'}
                            onChange={(e) => updateRule(rule.id, { 
                              colorScale: { ...rule.colorScale, maxColor: e.target.value } 
                            })}
                            className="mt-1 w-full h-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {rules.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No conditional formatting rules defined.
          <br />
          Click "Add New Rule" to get started.
        </div>
      )}
    </div>
  );
};