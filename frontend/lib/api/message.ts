// lib/api/message.ts
import { api } from "./client";

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  display_name: string;
  parent_message_id?: string;
  content: string;
  edited_at?: string;
  created_at: string;
  reply_count: number;
  reactions?: ReactionSummary[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  user_ids: string[];
  mine: boolean;
}

export interface MessageListResponse {
  data: Message[];
  next_cursor: string | null;
  has_more: boolean;
}

export const messageApi = {
  list: (channelId: string, before?: string) =>
    api.get<MessageListResponse>(
      `/channels/${channelId}/messages${before ? `?before=${before}` : ""}`,
    ),
  getThread: (messageId: string) =>
    api.get<{ parent_id: string; data: Message[]; count: number }>(
      `/messages/${messageId}/thread`,
    ),
  edit: (id: string, content: string) =>
    api.patch<Message>(`/messages/${id}`, { content }),
  delete: (id: string) => api.delete(`/messages/${id}`),
  toggleReaction: (id: string, emoji: string, channel_id: string) =>
    api.post<{ message_id: string; reactions: ReactionSummary[] }>(
      `/messages/${id}/reactions`,
      { emoji, channel_id },
    ),
};
