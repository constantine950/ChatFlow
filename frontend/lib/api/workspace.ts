import { api } from "./client";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  topic: string | null;
  is_private: boolean;
  is_dm: boolean;
  created_by: string;
  created_at: string;
}

export const workspaceApi = {
  list: () => api.get<{ data: Workspace[] }>("/workspaces"),
  get: (id: string) => api.get<Workspace>(`/workspaces/${id}`),
  create: (name: string, slug: string) =>
    api.post<Workspace>("/workspaces", { name, slug }),
  getPresence: (id: string) =>
    api.get<{ online: string[]; count: number }>(`/workspaces/${id}/presence`),
  search: (id: string, q: string) =>
    api.get<{ results: SearchResult[]; count: number }>(
      `/workspaces/${id}/search?q=${encodeURIComponent(q)}`,
    ),
};

export interface SearchResult {
  message_id: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  display_name: string;
  snippet: string;
  rank: number;
  created_at: string;
}

export const channelApi = {
  list: (workspaceId: string) =>
    api.get<{ data: Channel[] }>(`/workspaces/${workspaceId}/channels`),
  get: (id: string) => api.get<Channel>(`/channels/${id}`),
  create: (workspaceId: string, name: string, topic?: string) =>
    api.post<Channel>(`/workspaces/${workspaceId}/channels`, { name, topic }),
  join: (id: string) => api.post(`/channels/${id}/members`, {}),
  leave: (id: string) => api.delete(`/channels/${id}/members`),
};
