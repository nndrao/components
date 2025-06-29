/**
 * Field Inference Utilities
 * 
 * Utilities for inferring field structure from data.
 */

import { FieldInfo, FieldNode } from '../types';

/**
 * Infer fields from data array
 */
export function inferFields(data: any[]): FieldInfo[] {
  if (!data || data.length === 0) {
    return [];
  }

  const fieldMap: Map<string, FieldInfo> = new Map();
  
  // Sample up to 100 rows for type inference
  const sampleSize = Math.min(data.length, 100);
  const samples = data.slice(0, sampleSize);

  // Process each sample
  samples.forEach((row) => {
    processObject(row, '', fieldMap);
  });

  // Convert map to array and sort by path
  const fields = Array.from(fieldMap.values());
  return sortFields(fields);
}

/**
 * Process an object recursively to extract fields
 */
function processObject(
  obj: any,
  prefix: string,
  fieldMap: Map<string, FieldInfo>,
  depth: number = 0
): void {
  if (depth > 10) return; // Prevent infinite recursion

  if (!obj || typeof obj !== 'object') return;

  Object.keys(obj).forEach((key) => {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    // Get or create field info
    let fieldInfo = fieldMap.get(fieldPath);
    if (!fieldInfo) {
      fieldInfo = {
        path: fieldPath,
        type: inferType(value),
        nullable: value === null || value === undefined,
        sample: value,
      };
      fieldMap.set(fieldPath, fieldInfo);
    }

    // Update nullable status
    if (value === null || value === undefined) {
      fieldInfo.nullable = true;
    }

    // Update type if we have a more specific type
    const currentType = inferType(value);
    if (fieldInfo.type === 'null' && currentType !== 'null') {
      fieldInfo.type = currentType;
      fieldInfo.sample = value;
    }

    // Process nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if (!fieldInfo.children) {
        fieldInfo.children = [];
      }
      processObject(value, fieldPath, fieldMap, depth + 1);
    }

    // Process arrays
    if (Array.isArray(value) && value.length > 0) {
      // Infer array item type from first non-null item
      const firstItem = value.find(item => item !== null && item !== undefined);
      if (firstItem && typeof firstItem === 'object') {
        if (!fieldInfo.children) {
          fieldInfo.children = [];
        }
        processObject(firstItem, `${fieldPath}[]`, fieldMap, depth + 1);
      }
    }
  });
}

/**
 * Infer type from value
 */
function inferType(value: any): FieldInfo['type'] {
  if (value === null || value === undefined) return 'null';
  
  if (typeof value === 'string') {
    // Check if it's a date string
    if (isDateString(value)) {
      return 'date';
    }
    return 'string';
  }
  
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'object';
  
  return 'string';
}

/**
 * Check if a string is a date
 */
function isDateString(value: string): boolean {
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,  // ISO 8601
    /^\d{2}\/\d{2}\/\d{4}$/,                  // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,                    // DD-MM-YYYY
  ];
  
  if (datePatterns.some(pattern => pattern.test(value))) {
    const parsed = Date.parse(value);
    return !isNaN(parsed);
  }
  
  return false;
}

/**
 * Sort fields by path
 */
function sortFields(fields: FieldInfo[]): FieldInfo[] {
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Convert FieldInfo to FieldNode for tree display
 */
export function fieldsToNodes(fields: FieldInfo[]): FieldNode[] {
  const nodeMap: Map<string, FieldNode> = new Map();
  const rootNodes: FieldNode[] = [];

  // Create all nodes first
  fields.forEach(field => {
    const parts = field.path.split('.');
    const name = parts[parts.length - 1];
    const isArrayItem = name.endsWith('[]');
    const displayName = isArrayItem ? name.slice(0, -2) + ' (array item)' : name;
    
    const node: FieldNode = {
      path: field.path,
      name: displayName,
      type: field.type,
      nullable: field.nullable,
      sample: field.sample,
      depth: parts.length - 1,
      children: [],
    };
    
    nodeMap.set(field.path, node);
  });

  // Build tree structure
  fields.forEach(field => {
    const node = nodeMap.get(field.path)!;
    const parts = field.path.split('.');
    
    if (parts.length === 1) {
      // Root level field
      rootNodes.push(node);
    } else {
      // Find parent
      const parentPath = parts.slice(0, -1).join('.');
      const parentNode = nodeMap.get(parentPath);
      
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
      } else {
        // Parent doesn't exist, this is a root node
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
}

/**
 * Filter fields based on search term
 */
export function filterFields(fields: FieldNode[], searchTerm: string): FieldNode[] {
  if (!searchTerm) return fields;
  
  const term = searchTerm.toLowerCase();
  
  function filterNode(node: FieldNode): FieldNode | null {
    const matches = node.path.toLowerCase().includes(term) ||
                   node.name.toLowerCase().includes(term);
    
    if (node.children) {
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter(Boolean) as FieldNode[];
      
      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          isExpanded: true, // Auto-expand when searching
        };
      }
    }
    
    return matches ? node : null;
  }
  
  return fields
    .map(field => filterNode(field))
    .filter(Boolean) as FieldNode[];
}

/**
 * Get all field paths from nodes
 */
export function getAllFieldPaths(nodes: FieldNode[]): string[] {
  const paths: string[] = [];
  
  function collectPaths(node: FieldNode) {
    paths.push(node.path);
    if (node.children) {
      node.children.forEach(collectPaths);
    }
  }
  
  nodes.forEach(collectPaths);
  return paths;
}

/**
 * Format sample value for display
 */
export function formatSampleValue(value: any, maxLength: number = 50): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (typeof value === 'string') {
    return value.length > maxLength 
      ? `"${value.substring(0, maxLength)}..."` 
      : `"${value}"`;
  }
  
  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value);
      return json.length > maxLength 
        ? json.substring(0, maxLength) + '...' 
        : json;
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
}