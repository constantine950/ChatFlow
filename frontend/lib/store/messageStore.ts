import { create } from "zustand";
import { Message } from "../api/message";

interface TypingUser {
  userId: string;
  displayName: string;
}

interface MessageState {
  messages: Record<string, Message[]>;
  typingUsers: Record<string, TypingUser[]>;

  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (
    channelId: string,
    message: Partial<Message> & { id: string },
  ) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, userId: string, displayName: string) => void;
  clearTyping: (channelId: string, userId: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: {},
  typingUsers: {},

  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [channelId]: messages },
    })),

  prependMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...messages, ...(state.messages[channelId] ?? [])],
      },
    })),

  addMessage: (channelId, message) =>
    set((state) => {
      const existing = state.messages[channelId] ?? [];
      // Prevent duplicate messages
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [channelId]: [...existing, message],
        },
      };
    }),

  updateMessage: (channelId, update) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).map((m) =>
          m.id === update.id ? { ...m, ...update } : m,
        ),
      },
    })),

  removeMessage: (channelId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] ?? []).filter(
          (m) => m.id !== messageId,
        ),
      },
    })),

  setTyping: (channelId, userId, displayName) =>
    set((state) => {
      const current = state.typingUsers[channelId] ?? [];
      const filtered = current.filter((u) => u.userId !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...filtered, { userId, displayName }],
        },
      };
    }),

  clearTyping: (channelId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: (state.typingUsers[channelId] ?? []).filter(
          (u) => u.userId !== userId,
        ),
      },
    })),
}));
