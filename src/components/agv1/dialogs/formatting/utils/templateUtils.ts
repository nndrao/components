import type { ColumnFormat } from '@/types/agv1/common.types';

export interface FormatTemplate {
  id: string;
  name: string;
  description: string;
  category: 'number' | 'currency' | 'date' | 'text' | 'custom';
  format: Partial<ColumnFormat>;
  isBuiltIn: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
}

const STORAGE_KEY = 'agv1-format-templates';

export function saveTemplate(template: FormatTemplate): void {
  const templates = getCustomTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = {
      ...template,
      updatedAt: new Date(),
    };
  } else {
    templates.push({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function getCustomTemplates(): FormatTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom templates:', error);
  }
  return [];
}

export function deleteTemplate(templateId: string): void {
  const templates = getCustomTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function exportTemplates(templates: FormatTemplate[]): string {
  return JSON.stringify(templates, null, 2);
}

export function importTemplates(jsonString: string): FormatTemplate[] {
  try {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) {
      throw new Error('Invalid template format');
    }
    
    // Validate and clean imported templates
    return imported.map(template => ({
      ...template,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isBuiltIn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    throw new Error('Failed to import templates: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export function createTemplateFromFormat(
  format: ColumnFormat,
  name: string,
  description: string
): FormatTemplate {
  const category = getTemplateCategory(format);
  
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name,
    description,
    category,
    format: { ...format },
    isBuiltIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: generateTags(format),
  };
}

function getTemplateCategory(format: ColumnFormat): FormatTemplate['category'] {
  if (format.dataType === 'currency') return 'currency';
  if (format.dataType === 'date' || format.dataType === 'datetime') return 'date';
  if (format.dataType === 'number' || format.dataType === 'percentage') return 'number';
  if (format.dataType === 'string') return 'text';
  return 'custom';
}

function generateTags(format: ColumnFormat): string[] {
  const tags: string[] = [];
  
  if (format.dataType) {
    tags.push(format.dataType);
  }
  
  if (format.numberFormat?.type) {
    tags.push(format.numberFormat.type);
  }
  
  if (format.statusIndicator?.type && format.statusIndicator.type !== 'none') {
    tags.push('indicator', format.statusIndicator.type);
  }
  
  if (format.conditionalFormats && format.conditionalFormats.length > 0) {
    tags.push('conditional');
  }
  
  if (format.wordWrap) {
    tags.push('wrapped');
  }
  
  return tags;
}

export function searchTemplates(
  templates: FormatTemplate[],
  query: string
): FormatTemplate[] {
  const lowerQuery = query.toLowerCase();
  
  return templates.filter(template => {
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  });
}

export function groupTemplatesByCategory(
  templates: FormatTemplate[]
): Record<FormatTemplate['category'], FormatTemplate[]> {
  return templates.reduce((groups, template) => {
    const category = template.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {} as Record<FormatTemplate['category'], FormatTemplate[]>);
}