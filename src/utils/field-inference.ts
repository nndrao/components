/**
 * Field Inference Utility
 * 
 * Analyzes JSON data to automatically detect field structure,
 * data types, and generate column definitions.
 */

import { DataField } from '@/types/agv1/datasource.types';

export interface InferredField extends DataField {
  children?: InferredField[];
  selected?: boolean;
  expanded?: boolean;
}

export interface FieldInferenceResult {
  fields: InferredField[];
  sampleSize: number;
  inferredAt: string;
}

/**
 * Infers the data type of a value
 */
function inferType(value: any): DataField['type'] {
  if (value === null || value === undefined) {
    return 'string'; // Default for null/undefined
  }
  
  if (Array.isArray(value)) {
    return 'array';
  }
  
  if (value instanceof Date || !isNaN(Date.parse(value))) {
    return 'date';
  }
  
  const type = typeof value;
  
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

/**
 * Creates a field path from parent path and field name
 */
function createPath(parentPath: string, fieldName: string): string {
  return parentPath ? `${parentPath}.${fieldName}` : fieldName;
}

/**
 * Analyzes a single object to extract fields
 */
function analyzeObject(
  obj: any,
  parentPath: string = '',
  parentName: string = '',
  depth: number = 0,
  maxDepth: number = 5
): InferredField[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || depth > maxDepth) {
    return [];
  }
  
  const fields: InferredField[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = createPath(parentPath, key);
    const fieldName = createPath(parentName, key);
    
    const field: InferredField = {
      name: fieldName,
      path: fieldPath,
      type: inferType(value),
      sample: value,
      selected: true, // Default to selected
      expanded: depth < 2, // Expand first two levels by default
    };
    
    // If it's an object (but not array or date), analyze nested fields
    if (field.type === 'object' && value !== null) {
      const children = analyzeObject(value, fieldPath, fieldName, depth + 1, maxDepth);
      if (children.length > 0) {
        field.children = children;
      }
    }
    
    // If it's an array, analyze the first element for structure
    if (field.type === 'array' && Array.isArray(value) && value.length > 0) {
      const firstElement = value[0];
      if (typeof firstElement === 'object' && !Array.isArray(firstElement)) {
        const children = analyzeObject(firstElement, fieldPath + '[0]', fieldName + '[]', depth + 1, maxDepth);
        if (children.length > 0) {
          field.children = children;
        }
      }
    }
    
    fields.push(field);
  }
  
  return fields;
}

/**
 * Merges field information from multiple objects
 */
function mergeFields(existingFields: InferredField[], newFields: InferredField[]): InferredField[] {
  const fieldMap = new Map<string, InferredField>();
  
  // Add existing fields to map
  for (const field of existingFields) {
    fieldMap.set(field.path || field.name, field);
  }
  
  // Merge new fields
  for (const newField of newFields) {
    const key = newField.path || newField.name;
    const existing = fieldMap.get(key);
    
    if (existing) {
      // Update nullable status if we found a non-null value
      if (existing.nullable && newField.sample !== null && newField.sample !== undefined) {
        existing.nullable = false;
      }
      
      // Keep the first non-null sample
      if ((existing.sample === null || existing.sample === undefined) && newField.sample !== null) {
        existing.sample = newField.sample;
      }
      
      // Merge children recursively
      if (existing.children && newField.children) {
        existing.children = mergeFields(existing.children, newField.children);
      } else if (!existing.children && newField.children) {
        existing.children = newField.children;
      }
    } else {
      fieldMap.set(key, { ...newField });
    }
  }
  
  return Array.from(fieldMap.values());
}

/**
 * Main function to infer fields from data array
 */
export function inferFields(
  data: any[],
  options: {
    maxDepth?: number;
    sampleSize?: number;
  } = {}
): FieldInferenceResult {
  const { maxDepth = 5, sampleSize = 10 } = options;
  
  if (!Array.isArray(data) || data.length === 0) {
    return {
      fields: [],
      sampleSize: 0,
      inferredAt: new Date().toISOString(),
    };
  }
  
  // Analyze a sample of the data
  const samplesToAnalyze = Math.min(data.length, sampleSize);
  let mergedFields: InferredField[] = [];
  
  for (let i = 0; i < samplesToAnalyze; i++) {
    const item = data[i];
    if (item && typeof item === 'object') {
      const fields = analyzeObject(item, '', '', 0, maxDepth);
      mergedFields = mergeFields(mergedFields, fields);
    }
  }
  
  // Sort fields alphabetically
  mergedFields.sort((a, b) => a.name.localeCompare(b.name));
  
  return {
    fields: mergedFields,
    sampleSize: samplesToAnalyze,
    inferredAt: new Date().toISOString(),
  };
}

/**
 * Generates AG-Grid column definitions from selected fields
 */
export function generateColumnDefs(fields: InferredField[], parentPath: string = ''): any[] {
  const columns: any[] = [];
  
  for (const field of fields) {
    if (!field.selected) continue;
    
    const columnDef: any = {
      field: field.path || field.name,
      headerName: field.label || field.name.split('.').pop() || field.name,
      sortable: true,
      filter: true,
      resizable: true,
    };
    
    // Set column type based on field type
    switch (field.type) {
      case 'number':
        columnDef.filter = 'agNumberColumnFilter';
        columnDef.cellDataType = 'number';
        break;
      case 'date':
        columnDef.filter = 'agDateColumnFilter';
        columnDef.cellDataType = 'date';
        break;
      case 'boolean':
        columnDef.cellDataType = 'boolean';
        columnDef.cellRenderer = 'agCheckboxCellRenderer';
        break;
      case 'object':
      case 'array':
        // Mark for JSON renderer restoration after deserialization
        columnDef._rendererType = 'json';
        columnDef.cellRenderer = (params: any) => {
          return JSON.stringify(params.value);
        };
        break;
    }
    
    // If field has children, create a column group
    if (field.children && field.children.length > 0) {
      const childColumns = generateColumnDefs(field.children, field.path || field.name);
      if (childColumns.length > 0) {
        columnDef.children = childColumns;
        columns.push({
          headerName: columnDef.headerName,
          children: childColumns,
        });
      } else {
        columns.push(columnDef);
      }
    } else {
      columns.push(columnDef);
    }
  }
  
  return columns;
}

/**
 * Flattens nested fields for display in a tree
 */
export function flattenFields(fields: InferredField[], level: number = 0): Array<InferredField & { level: number }> {
  const flattened: Array<InferredField & { level: number }> = [];
  
  for (const field of fields) {
    flattened.push({ ...field, level });
    
    if (field.children && field.expanded) {
      flattened.push(...flattenFields(field.children, level + 1));
    }
  }
  
  return flattened;
}

/**
 * Updates field selection state
 */
export function updateFieldSelection(
  fields: InferredField[],
  path: string,
  selected: boolean
): InferredField[] {
  return fields.map(field => {
    if (field.path === path || field.name === path) {
      return { ...field, selected };
    }
    
    if (field.children) {
      return {
        ...field,
        children: updateFieldSelection(field.children, path, selected),
      };
    }
    
    return field;
  });
}

/**
 * Updates field expansion state
 */
export function updateFieldExpansion(
  fields: InferredField[],
  path: string,
  expanded: boolean
): InferredField[] {
  return fields.map(field => {
    if (field.path === path || field.name === path) {
      return { ...field, expanded };
    }
    
    if (field.children) {
      return {
        ...field,
        children: updateFieldExpansion(field.children, path, expanded),
      };
    }
    
    return field;
  });
}