# Snapshot End Token Implementation

## Overview
Implemented a configurable snapshot end token feature that allows users to specify a token that indicates the end of snapshot data when receiving messages from a WebSocket data source.

## Changes Made

### 1. Types Update
- Added `snapshotEndToken?: string` field to `ConnectionFormValues` interface in `src/app-v2/components/datasource/types.ts`
- This field stores the user-configured token that marks the end of snapshot data

### 2. UI Component Update
- Added a new input field in `ConnectionConfigForm.tsx` for users to enter the snapshot end token
- Located in the WebSocket settings section
- Includes help text: "Token at the start of a message that indicates the end of snapshot data"
- Example placeholder: "e.g., END_SNAPSHOT"

### 3. WebSocket Data Provider Update
- Modified `WebSocketDataProvider.ts` to check for the configured snapshot end token first
- When a message starts with the configured token, it:
  - Emits the buffered snapshot data
  - Marks the snapshot as complete
  - Starts processing real-time updates
- Falls back to existing detection methods if no token is configured

## How It Works

1. **Configuration**: Users can enter a snapshot end token in the Data Source configuration dialog under WebSocket settings
2. **Detection**: When WebSocketDataProvider receives a message, it first checks if the message starts with the configured token
3. **Snapshot Completion**: If the token is detected:
   - All buffered data is emitted as a single snapshot event
   - The provider switches to real-time update mode
   - Subsequent messages are processed as real-time updates

## Usage Example

1. Create a WebSocket data source
2. In the configuration dialog, enter a snapshot end token (e.g., "END_SNAPSHOT")
3. Configure your server to send this token as a separate message after all snapshot data
4. The DataTable will wait for the complete snapshot before displaying data

## Benefits

- **Flexibility**: Users can configure any token that their server sends
- **Reliability**: More reliable than heuristic-based detection
- **Simplicity**: Easy to implement on both client and server sides
- **Backward Compatibility**: Existing detection methods still work if no token is configured

## Technical Implementation

The implementation follows the existing pattern of snapshot detection but prioritizes the configured token:

```typescript
// Check for configured snapshot end token first
const snapshotEndToken = this.config.settings?.snapshotEndToken;
if (snapshotEndToken && body.startsWith(snapshotEndToken)) {
  // Emit snapshot and mark as complete
}
```

This ensures that the snapshot-first loading pattern works correctly with user-defined tokens.