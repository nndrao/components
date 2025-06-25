# STOMP Configuration Update

## Summary
Added configurable STOMP listener topics and trigger messages to the WebSocket data provider, allowing users to specify custom STOMP endpoints and message formats.

## Changes Made

### 1. Updated Type Definitions (`types.ts`)
- Added `listenerTopic` - STOMP topic to subscribe for receiving messages
- Added `triggerDestination` - STOMP destination for sending trigger messages  
- Added `triggerMessage` - The actual trigger content
- Added `triggerFormat` - Specify 'text' or 'json' format

### 2. Enhanced Connection Configuration Form
Added new input fields for WebSocket connections:
- **Listener Topic**: Configure subscription topics (e.g., `/topic/positions`, `/queue/trades`)
- **Trigger Destination**: Configure where to send triggers (e.g., `/app/trigger`, `/snapshot/request`)
- **Trigger Format**: Choose between Plain Text or JSON
- **Trigger Message**: Enter the actual trigger message with JSON validation

### 3. Updated WebSocketDataProvider
- Uses configured `listenerTopic` instead of hardcoded `/snapshot/${dataType}`
- Uses configured `triggerDestination` and `triggerMessage`
- Supports both plain text and JSON trigger formats
- Falls back to legacy format if new settings not provided
- Adds proper content-type header for JSON messages

## Usage Examples

### Plain Text Trigger
```
Listener Topic: /topic/market-data
Trigger Destination: /app/subscribe
Trigger Format: Plain Text
Trigger Message: START_FEED
```

### JSON Trigger
```
Listener Topic: /queue/positions
Trigger Destination: /app/subscribe
Trigger Format: JSON
Trigger Message: {
  "action": "subscribe",
  "symbols": ["AAPL", "GOOGL"],
  "dataType": "realtime"
}
```

## Benefits
1. **Flexibility**: Support any STOMP messaging pattern
2. **Compatibility**: Works with different STOMP server implementations
3. **Control**: Full control over subscription and trigger messages
4. **Validation**: Real-time JSON validation for trigger messages
5. **Backward Compatible**: Falls back to legacy format if not configured