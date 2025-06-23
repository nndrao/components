import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Save, Download, Upload, Star, Trash2,
  DollarSign, Calendar, Hash, Percent, FileText,
  BarChart3, TrendingUp, AlertCircle
} from 'lucide-react';
import type { ColumnFormat } from '@/types/agv1/common.types';

interface TemplatesTabProps {
  format: ColumnFormat;
  onFormatChange: (updates: Partial<ColumnFormat>) => void;
}

interface FormatTemplate {
  id: string;
  name: string;
  description: string;
  category: 'number' | 'currency' | 'date' | 'text' | 'custom';
  icon: React.ReactNode;
  format: Partial<ColumnFormat>;
  isBuiltIn: boolean;
  isFavorite?: boolean;
}

const builtInTemplates: FormatTemplate[] = [
  {
    id: 'currency-usd',
    name: 'US Currency',
    description: 'Format as US dollars with 2 decimal places',
    category: 'currency',
    icon: <DollarSign className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      dataType: 'currency',
      currencyFormat: {
        currency: 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      textAlignment: 'right',
    },
  },
  {
    id: 'percentage',
    name: 'Percentage',
    description: 'Display as percentage with 2 decimal places',
    category: 'number',
    icon: <Percent className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      dataType: 'percentage',
      numberFormat: {
        type: 'percentage',
        decimals: 2,
        thousandsSeparator: true,
        negativeFormat: 'minus',
      },
      textAlignment: 'right',
    },
  },
  {
    id: 'date-short',
    name: 'Short Date',
    description: 'MM/DD/YYYY format',
    category: 'date',
    icon: <Calendar className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      dataType: 'date',
      dateFormat: {
        format: 'MM/dd/yyyy',
        timezone: 'local',
      },
      textAlignment: 'left',
    },
  },
  {
    id: 'number-thousands',
    name: 'Number with Commas',
    description: 'Display numbers with thousand separators',
    category: 'number',
    icon: <Hash className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      dataType: 'number',
      numberFormat: {
        type: 'number',
        decimals: 0,
        thousandsSeparator: true,
        negativeFormat: 'minus',
      },
      textAlignment: 'right',
    },
  },
  {
    id: 'status-traffic',
    name: 'Status Traffic Light',
    description: 'Show status with colored indicators',
    category: 'custom',
    icon: <AlertCircle className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      statusIndicator: {
        type: 'trafficLight',
      },
      trafficLight: {
        shape: 'circle',
        size: 20,
        colors: {
          red: '#EF4444',
          yellow: '#EAB308',
          green: '#10B981',
        },
      },
    },
  },
  {
    id: 'progress-bar',
    name: 'Progress Bar',
    description: 'Display values as progress bars',
    category: 'custom',
    icon: <BarChart3 className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      statusIndicator: {
        type: 'progressBar',
      },
      progressBar: {
        style: 'default',
        height: 8,
        showPercentage: true,
        animated: false,
      },
    },
  },
  {
    id: 'trend-arrows',
    name: 'Trend Arrows',
    description: 'Show trend with up/down arrows',
    category: 'custom',
    icon: <TrendingUp className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      statusIndicator: {
        type: 'icon',
        iconSet: 'trend',
        showText: true,
        position: 'left',
      },
    },
  },
  {
    id: 'text-wrap',
    name: 'Wrapped Text',
    description: 'Multi-line text with word wrapping',
    category: 'text',
    icon: <FileText className="h-4 w-4" />,
    isBuiltIn: true,
    format: {
      dataType: 'string',
      wordWrap: true,
      textAlignment: 'left',
      maxLines: 3,
    },
  },
];

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  format,
  onFormatChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customTemplates, setCustomTemplates] = useState<FormatTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const allTemplates = [...builtInTemplates, ...customTemplates];
  
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           template.category === selectedCategory ||
                           (selectedCategory === 'favorites' && template.isFavorite);
    return matchesSearch && matchesCategory;
  });

  const applyTemplate = (template: FormatTemplate) => {
    onFormatChange(template.format);
  };

  const saveAsTemplate = () => {
    if (!templateName) return;

    const newTemplate: FormatTemplate = {
      id: Date.now().toString(),
      name: templateName,
      description: templateDescription,
      category: format.dataType === 'currency' ? 'currency' :
               format.dataType === 'date' || format.dataType === 'datetime' ? 'date' :
               format.dataType === 'number' || format.dataType === 'percentage' ? 'number' :
               format.dataType === 'string' ? 'text' : 'custom',
      icon: <Save className="h-4 w-4" />,
      format: { ...format },
      isBuiltIn: false,
    };

    setCustomTemplates([...customTemplates, newTemplate]);
    setSavingTemplate(false);
    setTemplateName('');
    setTemplateDescription('');
  };

  const deleteTemplate = (templateId: string) => {
    setCustomTemplates(customTemplates.filter(t => t.id !== templateId));
  };

  const toggleFavorite = (templateId: string) => {
    const template = allTemplates.find(t => t.id === templateId);
    if (template && !template.isBuiltIn) {
      setCustomTemplates(customTemplates.map(t => 
        t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
      ));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Format Templates</h3>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setSavingTemplate(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Current
          </Button>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="number">Number</TabsTrigger>
            <TabsTrigger value="currency">Currency</TabsTrigger>
            <TabsTrigger value="date">Date</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-3">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded bg-muted">
                            {template.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {template.name}
                              {template.isBuiltIn && (
                                <Badge variant="secondary" className="text-xs">
                                  Built-in
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          {!template.isBuiltIn && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(template.id);
                                }}
                              >
                                <Star className={`h-4 w-4 ${template.isFavorite ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTemplate(template.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {savingTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Save as Template</CardTitle>
            <CardDescription>
              Save your current format settings as a reusable template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Financial Report Currency"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                placeholder="Describe what this template is for..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSavingTemplate(false);
                  setTemplateName('');
                  setTemplateDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveAsTemplate}
                disabled={!templateName}
              >
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Templates
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Templates
        </Button>
      </div>
    </div>
  );
};