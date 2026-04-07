import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(userId, token) {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  // Track whether this hook instance is still mounted so cleanup prevents reconnect
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!userId || !token) return;

    const ws = new WebSocket(`ws://localhost:8000/api/ws/${userId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // reset backoff on successful connect
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      // Reconnect with exponential backoff, capped at 30s
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        connect();
      }, reconnectDelayRef.current);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, so just close to trigger reconnect
      ws.close();
    };
  }, [userId, token]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { lastMessage, sendMessage, isConnected };
}
