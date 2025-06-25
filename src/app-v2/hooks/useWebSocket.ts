import { useEffect, useState, useRef, useCallback } from 'react';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(url: string | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (!url) return;
    
    const { onConnect, onMessage, onError, onDisconnect, reconnect, reconnectInterval } = options;
    
    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        
        ws.onopen = () => {
          setIsConnected(true);
          onConnect?.();
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        };
        
        ws.onerror = (error) => {
          onError?.(error);
        };
        
        ws.onclose = () => {
          setIsConnected(false);
          onDisconnect?.();
          
          // Reconnect if enabled
          if (reconnect) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectInterval || 5000);
          }
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };
    
    connect();
    
    // Cleanup
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, options]);
  
  const sendMessage = useCallback((data: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);
  
  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}