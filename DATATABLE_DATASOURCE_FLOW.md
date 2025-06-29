# DataTable and DataSource Integration Flow

## Overview
The DataTable component integrates with DataSource through the DataSourceContext, which manages data providers and real-time data streaming.

## Key Components

### 1. DataSourceContext (`/contexts/DataSourceContext.tsx`)
- Manages all data sources and their connections
- Provides real-time data through the `data` state
- Handles data provider lifecycle (connect/disconnect)
- Implements batching for high-frequency updates (60ms intervals)

### 2. DataTable Component (`/components/data-table/DataTable.tsx`)
- Consumes data from DataSourceContext
- Uses AG-Grid for rendering
- Supports real-time updates with performance optimizations

## Integration Flow

```
┌─────────────────────┐
│   DataSource UI     │
│  (Configuration)    │
└──────────┬──────────┘
           │ Configure & Save
           ▼
┌─────────────────────┐
│ DataSourceContext   │
│ - dataSources[]     │
│ - activeDataSourceId│
│ - data[]            │
└──────────┬──────────┘
           │ 
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│ DataProviderManager │────▶│ WebSocketDataProvider│
│                     │     │ (STOMP Protocol)     │
└─────────────────────┘     └──────────┬───────────┘
                                       │ Real-time data
                                       ▼
                            ┌──────────────────────┐
                            │   Data Batching      │
                            │   (60ms intervals)   │
                            └──────────┬───────────┘
                                       │
                                       ▼
┌─────────────────────┐     ┌──────────────────────┐
│     DataTable       │◀────│  DataSourceContext   │
│   - Uses data[]     │     │  - Provides data     │
│   - Uses columnDefs │     │  - Connection status │
└─────────────────────┘     └──────────────────────┘
```

## How DataTable Uses DataSource

### 1. **Data Source Selection** (Lines 74-75, 111-128)
```typescript
const { data, activeDataSourceId, dataSources, setActiveDataSource } = useDataSource();

// Auto-activate saved data source
useEffect(() => {
  if (!activeDataSourceId && component?.config.dataSourceId) {
    setActiveDataSource(component.config.dataSourceId);
  }
}, [component?.config.dataSourceId, activeDataSourceId, setActiveDataSource]);
```

### 2. **Column Definitions** (Lines 131-132)
```typescript
const activeDataSource = dataSources.find(ds => ds.id === activeDataSourceId);
const columns = activeDataSource?.columnDefs || component?.config.columns || defaultColumns;
```
- Uses column definitions from the active data source
- Falls back to component config or default columns

### 3. **Real-time Data** (Lines 135-141)
```typescript
const rowData = activeDataSourceId ? data : [/* sample data */];
```
- When a data source is active, uses real-time `data` from context
- Otherwise shows sample data

### 4. **Row Identification** (Lines 226-231)
```typescript
getRowId={(params) => {
  if (activeDataSource?.keyColumn) {
    return params.data[activeDataSource.keyColumn];
  }
  return params.data.positionId || params.data.id || params.data._id;
}}
```
- Uses the configured `keyColumn` from data source for row updates
- Falls back to common ID fields

### 5. **Performance Optimizations** (Lines 222-224)
```typescript
asyncTransactionWaitMillis={60}
suppressScrollOnNewData={true}
```
- Matches the 60ms batching interval in DataSourceContext
- Prevents scroll jumping during high-frequency updates

## Data Flow Example

1. **User configures WebSocket data source**:
   - URL: `ws://localhost:8080/ws`
   - Listener Topic: `/topic/positions`
   - Key Column: `positionId`
   - Selected fields become column definitions

2. **DataSourceContext**:
   - Creates WebSocketDataProvider (STOMP)
   - Connects to WebSocket server
   - Subscribes to `/topic/positions`
   - Receives real-time messages

3. **Data Batching**:
   - Messages accumulate in `batchBuffer`
   - Every 60ms, buffer is flushed to `data` state
   - Prevents excessive re-renders

4. **DataTable Updates**:
   - Receives new `data` array from context
   - AG-Grid uses `getRowId` with `positionId` field
   - Updates specific rows efficiently
   - No scroll jumping due to `suppressScrollOnNewData`

## Key Features

1. **High-frequency Update Support**:
   - Can handle 10,000+ messages/second
   - Batching prevents UI freezing
   - AG-Grid optimizations for smooth rendering

2. **Flexible Configuration**:
   - Column definitions from data source
   - Key column for row identification
   - Automatic field inference from data

3. **State Persistence**:
   - Active data source saved in component config
   - Profile system saves grid state separately
   - Survives page refreshes

4. **Multiple Data Tables**:
   - Each DataTable can have different data source
   - Shared data sources update all connected tables
   - Independent column configurations