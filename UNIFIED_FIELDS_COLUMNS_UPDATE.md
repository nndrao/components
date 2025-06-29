# Unified Fields and Columns Update

## Summary
Consolidated the Fields and Columns tabs into a single unified "Fields & Columns" tab with enhanced functionality including Key Column configuration, searchable column list, and popup dialogs for column management.

## Changes Made

### 1. Created ColumnEditDialog Component
- Modal dialog for adding/editing column definitions
- Supports field selection from dropdown or manual entry
- Only allows editing headerName and type for existing columns
- Auto-generates header names from field paths

### 2. Created FieldsAndColumnsPanel Component
- Unified panel combining field selection and column management
- Two-panel layout:
  - Left: Field selector with existing functionality
  - Right: Enhanced column list with search and edit capabilities
- Top section includes Key Column selector and Re-infer Fields button

### 3. Added Key Column Configuration
- Added to ConnectionConfigForm in WebSocket settings
- Stored in `settings.keyColumn`
- Dropdown populated with all inferred fields
- Used by DataTable for AG-Grid's getRowId function

### 4. Updated DataTable Component
```typescript
getRowId={(params) => {
  if (activeDataSource?.keyColumn) {
    return params.data[activeDataSource.keyColumn];
  }
  return params.data.positionId || params.data.id || params.data._id;
}}
```

### 5. Enhanced Column Management
- **Search**: Filter columns by header name or field path
- **Add Column**: Button to manually add columns via popup
- **Edit Column**: Click column to edit headerName and type
- **Reorder**: Up/down arrows to change column order
- **Remove**: Delete button for each column

## UI Structure
```
Fields & Columns Tab
├── Key Column Selector (dropdown)
├── Re-infer Fields Button
└── Two-Panel Layout
    ├── Left Panel: Field Selector
    │   ├── Search fields
    │   ├── Hierarchical field tree
    │   ├── Select/deselect all
    │   └── Add Selected to Columns button
    └── Right Panel: Column Definitions
        ├── Search columns input
        ├── Add Column button
        └── Column list (searchable, editable)
            ├── Header name
            ├── Field path
            ├── Type badge
            └── Action buttons (edit, move, delete)
```

## Benefits

1. **Simplified UI**: One tab instead of two for related functionality
2. **Key Column Support**: Essential for proper row updates in AG-Grid
3. **Better Column Management**: 
   - Search functionality for large column lists
   - Edit columns without removing and re-adding
   - Manual column addition for computed fields
4. **Improved UX**: 
   - Hover effects show available actions
   - Visual feedback for selected items
   - Clear empty states with guidance

## STOMP Configuration Summary
Combined with previous STOMP updates, users can now:
- Configure listener topics and trigger messages
- Set key columns for row identification
- Manage columns with full editing capabilities
- Send both plain text and JSON triggers