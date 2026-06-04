"use client";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useMessageStore } from "../store/messageStore";
import { useAuthStore } from "../store/authStore";
import { useWorkspaceStore } from "../store/workspaceStore";
import { Message } from "../api/message";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

interface WSContextValue {
  joinChannel: (channelId: string) => void;
  sendMessage: (
    channelId: string,
    content: string,
    parentMessageId?: string,
  ) => void;
  sendTyping: (channelId: string) => void;
}

const WSContext = createContext<WSContextValue>({
  joinChannel: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
});

export function useWS() {
  return useContext(WSContext);
}

export function WSProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelay = useRef(1000);
  const subscribedChannels = useRef<Set<string>>(new Set());
  const isConnecting = useRef(false);

  const { addMessage, setTyping, clearTyping } = useMessageStore();

  const handleEvent = useCallback(
    (event: { type: string; payload: any }) => {
      switch (event.type) {
        case "message.new": {
          const msg = event.payload as Message;
          const existing =
            useMessageStore.getState().messages[msg.channel_id] ?? [];
          if (existing.some((m) => m.id === msg.id)) break;
          addMessage(msg.channel_id, msg);

          // Increment unread if this isn't the active channel
          const activeChannel = useWorkspaceStore.getState().activeChannel;
          if (activeChannel?.id !== msg.channel_id) {
            const current =
              useWorkspaceStore.getState().unreadCounts[msg.channel_id] ?? 0;
            useWorkspaceStore
              .getState()
              .setUnreadCount(msg.channel_id, current + 1);
          }
          break;
        }
        case "typing.indicator": {
          const { channel_id, user_id, display_name } = event.payload;
          const me = useAuthStore.getState().user;
          if (user_id === me?.id) break;
          setTyping(channel_id, user_id, display_name);
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
          const current = useWorkspaceStore.getState().onlineUsers;
          if (status === "online") {
            useWorkspaceStore
              .getState()
              .setOnlineUsers([...new Set([...current, user_id])]);
          } else {
            useWorkspaceStore
              .getState()
              .setOnlineUsers(current.filter((id) => id !== user_id));
          }
          break;
        }
      }
    },
    [addMessage, setTyping, clearTyping],
  );

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem("access_token");
    if (!token || !workspaceId) return;

    isConnecting.current = true;
    const url = `${WS_BASE}/ws?token=${token}&workspace_id=${workspaceId}`;
    console.log("ws: connecting...");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("ws: connected");
      isConnecting.current = false;
      reconnectDelay.current = 1000;
      subscribedChannels.current.forEach((channelId) => {
        ws.send(
          JSON.stringify({
            type: "channel.join",
            payload: { channel_id: channelId },
          }),
        );
      });
    };

    ws.onmessage = (e) => {
      try {
        handleEvent(JSON.parse(e.data));
      } catch {
        console.error("ws: parse error", e.data);
      }
    };

    ws.onclose = () => {
      isConnecting.current = false;
      console.log("ws: disconnected, reconnecting...");
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      isConnecting.current = false;
    };
  }, [workspaceId, handleEvent]);

  // Heartbeat
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

  const joinChannel = useCallback((channelId: string) => {
    subscribedChannels.current.add(channelId);
    const ws = wsRef.current;
    if (!ws) return;
    const send = () =>
      ws.send(
        JSON.stringify({
          type: "channel.join",
          payload: { channel_id: channelId },
        }),
      );
    if (ws.readyState === WebSocket.OPEN) send();
    else if (ws.readyState === WebSocket.CONNECTING)
      ws.addEventListener("open", send, { once: true });
  }, []);

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

  return (
    <WSContext.Provider value={{ joinChannel, sendMessage, sendTyping }}>
      {children}
    </WSContext.Provider>
  );
}
