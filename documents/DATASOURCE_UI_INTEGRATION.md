# Data Source UI Integration Guide

## Overview

The new data source UI system provides a comprehensive interface for configuring data providers with automatic field inference, hierarchical field selection, and column definition management. This guide explains how to integrate these components into your existing implementation.

## Key Components

### 1. DataSourceConfigDialog
The main configuration dialog with tabs for:
- **Connection**: Provider type, URL, authentication, and advanced settings
- **Fields**: Inferred fields with hierarchical tree view and search
- **Columns**: Column definition management with drag-and-drop
- **Statistics**: Real-time connection and data metrics

### 2. Field Inference System
- Click "Infer Fields from Data" to analyze data structure
- Supports nested objects and arrays
- Shows fields in dot notation (e.g., `user.profile.name`)
- Searchable field list with expand/collapse
- Checkbox selection for each field

### 3. Data Provider Integration
Supports both plain string and JSON triggers:
```typescript
// Plain string
await provider.send("GET_DATA");

// JSON object
await provider.send({
  type: "query",
  action: "getData",
  params: { limit: 100 }
});
```

## Integration Steps

### Step 1: Add Data Source Context

Wrap your app with the DataSourceProvider:

```tsx
import { DataSourceProvider } from '@/app-v2/contexts/DataSourceContext';

function App() {
  return (
    <DataSourceProvider>
      {/* Your app content */}
    </DataSourceProvider>
  );
}
```

### Step 2: Add Data Source Management UI

Use the DataSourceButton for configuration access:

```tsx
import { DataSourceButton } from '@/app-v2/components/datasource';

function Toolbar() {
  const { dataSources, connectionStatus, ... } = useDataSource();
  
  return (
    <DataSourceButton
      dataSources={dataSources}
      connectionStatus={connectionStatus}
      onSave={handleSave}
      onDelete={handleDelete}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
}
```

### Step 3: Add Data Source Selector

For toolbar integration:

```tsx
import { DataSourceSelector } from '@/app-v2/components/datasource';

function DataTableToolbar() {
  const { 
    dataSources, 
    activeDataSourceId, 
    setActiveDataSource,
    connectionStatus 
  } = useDataSource();
  
  return (
    <DataSourceSelector
      dataSources={dataSources}
      value={activeDataSourceId}
      onChange={setActiveDataSource}
      connectionStatus={connectionStatus}
    />
  );
}
```

### Step 4: Use Data in Components

Access real-time data from active data source:

```tsx
function DataTable() {
  const { data, activeDataSourceId } = useDataSource();
  const activeDataSource = dataSources.find(ds => ds.id === activeDataSourceId);
  
  // Use column definitions from data source
  const columnDefs = activeDataSource?.columnDefs || [];
  
  return (
    <AgGridReact
      rowData={data}
      columnDefs={columnDefs}
      // ... other props
    />
  );
}
```

## Field Inference Workflow

1. **Configure Connection**: Set up provider type, URL, and authentication
2. **Click "Infer Fields"**: System connects and analyzes data structure
3. **Select Fields**: Use checkboxes to select fields from hierarchical tree
4. **Configure Columns**: Selected fields appear in column panel for customization
5. **Save Configuration**: Stores field mappings and column definitions

## Provider Types Supported

- **WebSocket**: Real-time bidirectional communication
- **REST**: HTTP-based with optional polling
- **SSE**: Server-sent events
- **Static**: Mock data for development

## Advanced Features

### Custom Transforms

Configure data transforms in the Connection tab:

```javascript
// Input Transform
return data.map(item => ({
  ...item,
  timestamp: new Date(item.time).toISOString()
}));

// Output Transform  
return {
  action: data.type,
  payload: data
};
```

### Authentication Options

- Bearer Token
- API Key
- Basic Auth
- Custom headers

### Auto-reconnection

Configure reconnection behavior:
- Auto-reconnect on disconnect
- Configurable retry intervals
- Maximum retry attempts

## Migration from Old System

If migrating from the old datasource implementation:

1. **Field Mapping**: The new system's field inference matches the old field inference logic
2. **Column Definitions**: Compatible with AG-Grid column definitions
3. **WebSocket**: Uses the same WebSocket data provider internally
4. **Storage**: Configurations saved to ConfigStore with Profile system

## Example Implementation

See `/src/app-v2/examples/DataSourceExample.tsx` for a complete working example.

## Key Differences from Original

1. **Modular Architecture**: Separate components for each concern
2. **Type Safety**: Full TypeScript support with proper types
3. **Provider Abstraction**: Not limited to STOMP/WebSocket
4. **Profile Integration**: Uses new Profile system for persistence
5. **Improved UX**: Better field selection and column management

## Troubleshooting

### Fields Not Inferring
- Check connection URL and authentication
- Verify data is being received (check console)
- Ensure trigger message is correct format

### Connection Issues
- Check browser console for WebSocket errors
- Verify CORS settings for REST endpoints
- Test with Static provider first

### Column Definitions Not Applying
- Ensure fields are selected in Fields tab
- Check field paths match data structure
- Verify column configuration in Columns tab