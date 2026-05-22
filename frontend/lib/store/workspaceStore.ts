// lib/store/workspaceStore.ts
import { create } from "zustand";
import { Workspace, Channel } from "../api/workspace";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  channels: Channel[];
  activeChannel: Channel | null;
  onlineUsers: string[];

  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addChannel: (channel: Channel) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  channels: [],
  activeChannel: null,
  onlineUsers: [],

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  setChannels: (channels) => set({ channels }),
  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  addChannel: (channel) =>
    set((state) => ({ channels: [...state.channels, channel] })),
}));
