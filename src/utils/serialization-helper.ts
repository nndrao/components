/**
 * Helper functions for serializing/deserializing data for storage
 */

/**
 * Removes functions and other non-serializable data from an object
 */
export function cleanForSerialization(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'function') {
    return undefined; // Remove functions
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForSerialization(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const cleanedValue = cleanForSerialization(obj[key]);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Restores column definitions with their functions after deserialization
 */
export function restoreColumnDefs(columnDefs: any[]): any[] {
  return columnDefs.map(col => {
    const restored = { ...col };
    
    // Restore cell renderers based on type
    if (col.cellDataType === 'boolean' && !col.cellRenderer) {
      restored.cellRenderer = 'agCheckboxCellRenderer';
    }
    
    // Restore custom renderers for object/array types
    if (col._rendererType === 'json' && !col.cellRenderer) {
      restored.cellRenderer = (params: any) => {
        return JSON.stringify(params.value);
      };
    }
    
    // Restore number formatter if it was removed
    if (col._formatterType === 'number' && !col.valueFormatter) {
      restored.valueFormatter = (params: any) => {
        return params.value ? params.value.toLocaleString() : "";
      };
    }
    
    // Recursively restore children
    if (col.children) {
      restored.children = restoreColumnDefs(col.children);
    }
    
    return restored;
  });
}

/**
 * Prepares column definitions for serialization by replacing functions with metadata
 */
export function prepareColumnDefsForStorage(columnDefs: any[]): any[] {
  return columnDefs.map(col => {
    const prepared = { ...col };
    
    // Remove functions and mark their types for restoration
    if (typeof col.cellRenderer === 'function') {
      delete prepared.cellRenderer;
      // Mark object/array types for JSON renderer restoration
      if (col.cellDataType === 'object' || col.cellDataType === 'array') {
        prepared._rendererType = 'json';
      }
    } else if (col.cellRenderer === 'agCheckboxCellRenderer') {
      // Keep string renderers as they are serializable
    }
    
    if (typeof col.valueFormatter === 'function') {
      delete prepared.valueFormatter;
      // Mark number types for formatter restoration
      if (col.cellDataType === 'number') {
        prepared._formatterType = 'number';
      }
    }
    
    // Recursively prepare children
    if (col.children) {
      prepared.children = prepareColumnDefsForStorage(col.children);
    }
    
    return prepared;
  });
}