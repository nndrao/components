import { ColDef } from 'ag-grid-community';
import { ColumnDefinition } from '../components/datasource/types';

/**
 * Default column definitions for when no data source is configured
 */
export const DEFAULT_COLUMNS: ColDef[] = [
  { 
    field: 'id', 
    headerName: 'ID', 
    width: 100, 
    enableCellChangeFlash: true,
    enableRowGroup: true,
    cellDataType: 'text'
  },
  { 
    field: 'name', 
    headerName: 'Name', 
    width: 200, 
    enableCellChangeFlash: true,
    enableRowGroup: true,
    cellDataType: 'text'
  },
  { 
    field: 'value', 
    headerName: 'Value', 
    width: 150, 
    enableCellChangeFlash: true,
    enableValue: true,
    aggFunc: 'sum',
    cellDataType: 'number',
    cellClass: 'text-right cell-number'
  },
  { 
    field: 'status', 
    headerName: 'Status', 
    width: 120, 
    enableCellChangeFlash: true,
    enableRowGroup: true,
    cellDataType: 'text'
  },
  { 
    field: 'date', 
    headerName: 'Date', 
    width: 150, 
    enableCellChangeFlash: true,
    enableRowGroup: true,
    cellDataType: 'dateString'
  }
];

/**
 * Default column definition applied to all columns
 */
export const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  enableCellChangeFlash: true,
  enableRowGroup: true,
  enablePivot: true,
  enableValue: true,
};

/**
 * Convert custom ColumnDefinition to AG-Grid ColDef
 */
export function convertColumnDefinition(col: ColumnDefinition): ColDef {
  const colDef: ColDef = {
    field: col.field,
    headerName: col.headerName,
    width: col.width,
    sortable: col.sortable,
    filter: col.filterable,
    enableCellChangeFlash: true,
  };

  // Apply type-specific settings
  switch (col.type) {
    case 'number':
      colDef.filter = 'agNumberColumnFilter';
      colDef.cellClass = 'text-right';
      colDef.cellDataType = 'number';
      colDef.enableValue = true;
      colDef.aggFunc = getNumberAggFunc(col.field);
      break;
      
    case 'date':
      colDef.filter = 'agDateColumnFilter';
      colDef.cellDataType = 'dateString';
      colDef.enableRowGroup = true;
      break;
      
    case 'boolean':
      colDef.cellRenderer = 'agCheckboxCellRenderer';
      colDef.cellDataType = 'boolean';
      colDef.enableRowGroup = true;
      break;
      
    default:
      if (col.filterable) {
        colDef.filter = 'agTextColumnFilter';
      }
      colDef.cellDataType = 'text';
      colDef.enableRowGroup = true;
  }

  // Add special cell classes based on field names
  const fieldLower = col.field.toLowerCase();
  if (fieldLower.includes('price') || fieldLower.includes('cost') || fieldLower.includes('value')) {
    colDef.cellClass = (colDef.cellClass || '') + ' cell-price';
  } else if (fieldLower.includes('pnl') || fieldLower.includes('profit') || fieldLower.includes('loss')) {
    colDef.cellClass = (colDef.cellClass || '') + ' cell-pnl';
  } else if (fieldLower.includes('count') || fieldLower.includes('quantity') || fieldLower.includes('qty')) {
    colDef.cellClass = (colDef.cellClass || '') + ' cell-number';
  } else if (col.type === 'number') {
    colDef.cellClass = (colDef.cellClass || '') + ' cell-number';
  }

  // Enable grouping for ID and identifier fields
  if (fieldLower.includes('id') || fieldLower.includes('symbol') || fieldLower.includes('cusip')) {
    colDef.enableRowGroup = true;
    colDef.rowGroup = false; // Don't group by default
  }

  return colDef;
}

/**
 * Get appropriate aggregation function for number fields
 */
function getNumberAggFunc(field: string): string {
  const fieldLower = field.toLowerCase();
  
  if (fieldLower.includes('price') || fieldLower.includes('cost')) {
    return 'avg';
  } else if (fieldLower.includes('count') || fieldLower.includes('quantity') || fieldLower.includes('qty')) {
    return 'sum';
  } else if (fieldLower.includes('pnl') || fieldLower.includes('profit') || fieldLower.includes('loss')) {
    return 'sum';
  }
  
  return 'sum'; // Default for numbers
}

/**
 * Convert array of ColumnDefinitions to ColDefs
 */
export function convertColumnDefinitions(columnDefs: ColumnDefinition[]): ColDef[] {
  return columnDefs.map(convertColumnDefinition);
}