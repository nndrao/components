# DataTable Snapshot Implementation

## Overview
Implemented a snapshot-first data loading pattern for DataTables. When a DataTable selects a data source, it now:

1. **Waits for the initial snapshot** before displaying any data
2. **Shows a loading state** while waiting for the snapshot
3. **Only processes real-time updates** after the snapshot is received

## Technical Implementation

### 1. WebSocketDataProvider Changes
- Added `snapshotBuffer` to collect data until snapshot is complete
- Detects "Success: Starting live updates" message to mark snapshot completion
- Emits a `snapshot` event with all buffered data
- Only processes real-time updates after snapshot is complete

### 2. useDataSourceSubscription Hook
- Added state tracking: `loading`, `snapshotReceived`, `error`
- Listens for both `snapshot` and `data` events
- Ignores real-time `data` events until snapshot is received
- Provides loading state to components

### 3. DataTable Component
- Shows loading overlay while waiting for snapshot
- Displays status badge in toolbar (Loading → Live)
- Only renders data after snapshot is received

## Data Flow

```
1. User selects data source
   ↓
2. DataTable shows "Waiting for snapshot..." overlay
   ↓
3. WebSocket connects and sends trigger
   ↓
4. Server sends snapshot data in batches
   ↓
5. WebSocketDataProvider buffers all snapshot data
   ↓
6. Server sends "Success: Starting live updates"
   ↓
7. WebSocketDataProvider emits 'snapshot' event with all data
   ↓
8. DataTable receives snapshot and displays data
   ↓
9. Real-time updates are now processed normally
```

## Visual Indicators

1. **Loading Overlay**: Semi-transparent overlay with spinner and "Waiting for snapshot data..." message
2. **Status Badge**: Shows current state in toolbar
   - 🔄 "Waiting for snapshot..." (with spinner)
   - ✅ "Live" (after snapshot received)

## Benefits

1. **Data Consistency**: Users always see the complete initial state before updates
2. **Clear Loading State**: Users know when data is being loaded
3. **Performance**: Snapshot is delivered as one batch, reducing initial render cycles
4. **Reliability**: Real-time updates won't be processed out of order

## Testing

To test the implementation:

1. Select a data source in a DataTable
2. Observe the loading overlay appears
3. Wait for snapshot to complete (overlay disappears)
4. Verify the status badge shows "Live"
5. Confirm real-time updates are working

The snapshot pattern ensures data integrity and provides a better user experience when connecting to high-frequency data sources.