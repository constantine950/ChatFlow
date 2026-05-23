"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { workspaceApi, channelApi } from "../../lib/api/workspace";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { useWebSocket } from "../../lib/hooks/useWebSocket";
import Sidebar from "../../components/layout/Sidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const slug = params?.workspace as string;
  const channelId = params?.channel as string;

  const { setWorkspaces, setActiveWorkspace, activeWorkspace, setChannels } =
    useWorkspaceStore();
  const { joinChannel } = useWebSocket(activeWorkspace?.id ?? null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    workspaceApi
      .list()
      .then(({ data }) => {
        setWorkspaces(data);
        const ws = data.find((w) => w.slug === slug);
        if (ws) setActiveWorkspace(ws);
      })
      .catch(() => router.replace("/login"));
  }, [slug]);

  useEffect(() => {
    if (!activeWorkspace) return;
    channelApi.list(activeWorkspace.id).then(({ data }) => setChannels(data));
  }, [activeWorkspace?.id]);

  // Join the WS channel room whenever the active channel changes
  useEffect(() => {
    if (channelId) joinChannel(channelId);
  }, [channelId, joinChannel]);

  if (!activeWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
