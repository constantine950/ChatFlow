// lib/hooks/useWebSocket.ts
"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useMessageStore } from "../store/messageStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { Message } from "../api/message";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export function useWebSocket(workspaceId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelay = useRef(1000);

  const { accessToken, user } = useAuthStore();
  const { addMessage, setTyping, clearTyping } = useMessageStore();
  const { setOnlineUsers, onlineUsers } = useWorkspaceStore();

  const connect = useCallback(() => {
    if (!accessToken || !workspaceId) return;

    const url = `${WS_BASE}/ws?token=${accessToken}&workspace_id=${workspaceId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("ws: connected");
      reconnectDelay.current = 1000; // reset backoff on successful connect
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        handleEvent(event);
      } catch {
        console.error("ws: failed to parse event", e.data);
      }
    };

    ws.onclose = () => {
      console.log("ws: disconnected, reconnecting...");
      // Exponential backoff — cap at 30s
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = (err) => {
      console.error("ws: error", err);
    };
  }, [accessToken, workspaceId]);

  const handleEvent = useCallback(
    (event: { type: string; payload: any }) => {
      switch (event.type) {
        case "message.new": {
          const msg = event.payload as Message;
          addMessage(msg.channel_id, msg);
          break;
        }

        case "message.updated": {
          // will be handled in Day 16 message list
          break;
        }

        case "typing.indicator": {
          const { channel_id, user_id, display_name } = event.payload;
          // Don't show your own typing indicator
          if (user_id === user?.id) break;
          setTyping(channel_id, user_id, display_name);
          // Auto-clear after 4s in case stop event is missed
          setTimeout(() => clearTyping(channel_id, user_id), 4000);
          break;
        }

        case "typing.stop": {
          const { channel_id, user_id } = event.payload;
          clearTyping(channel_id, user_id);
          break;
        }

        case "presence.update": {
          const { user_id, status } = event.payload;
          if (status === "online") {
            setOnlineUsers([...new Set([...onlineUsers, user_id])]);
          } else {
            setOnlineUsers(onlineUsers.filter((id) => id !== user_id));
          }
          break;
        }

        default:
          break;
      }
    },
    [addMessage, setTyping, clearTyping, setOnlineUsers, onlineUsers, user],
  );

  // Subscribe to a channel
  const joinChannel = useCallback((channelId: string) => {
    const ws = wsRef.current;
    if (!ws) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "channel.join",
          payload: { channel_id: channelId },
        }),
      );
    } else if (ws.readyState === WebSocket.CONNECTING) {
      // Wait for connection then send
      ws.addEventListener(
        "open",
        () => {
          ws.send(
            JSON.stringify({
              type: "channel.join",
              payload: { channel_id: channelId },
            }),
          );
        },
        { once: true },
      );
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(
    (channelId: string, content: string, parentMessageId?: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "message.send",
          payload: {
            channel_id: channelId,
            content,
            parent_message_id: parentMessageId,
          },
        }),
      );
    },
    [],
  );

  const sendTyping = useCallback((channelId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: "typing.start",
        payload: { channel_id: channelId },
      }),
    );
  }, []);

  // Heartbeat every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "presence.heartbeat", payload: {} }),
        );
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { joinChannel, sendMessage, sendTyping, ws: wsRef };
}
