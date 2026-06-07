"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { workspaceApi, channelApi } from "../../lib/api/workspace";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { useAuthStore } from "../../lib/store/authStore";
import { WSProvider, useWS } from "../../lib/hooks/WSContext";
import Sidebar from "../../components/layout/Sidebar";
import { ToastContainer } from "../../components/ui/Toast";

// Inner layout — has access to WSContext
function WorkspaceInner({ children }: { children: React.ReactNode }) {
  const { connected } = useWS();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Reconnecting banner */}
        {!connected && (
          <div
            className="flex items-center justify-center gap-2 bg-yellow-500/10
                          border-b border-yellow-500/20 py-1.5 text-xs text-yellow-400"
          >
            <div
              className="h-3 w-3 animate-spin rounded-full border-2
                            border-yellow-400/30 border-t-yellow-400"
            />
            Reconnecting to server...
          </div>
        )}
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const slug = params?.workspace as string;

  const [ready, setReady] = useState(false);
  const { setWorkspaces, setActiveWorkspace, activeWorkspace, setChannels } =
    useWorkspaceStore();

  // Step 1 — rehydrate auth from localStorage
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");
    if (!token || !refresh) {
      router.replace("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      useAuthStore.getState().setAuth(
        {
          id: payload.sub,
          email: payload.email,
          display_name: payload.display_name,
          avatar_url: null,
        },
        token,
        refresh,
      );
    } catch {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, []);

  // Step 2 — load workspaces
  useEffect(() => {
    if (!ready) return;
    workspaceApi
      .list()
      .then(({ data }) => {
        setWorkspaces(data);
        const ws = data.find((w) => w.slug === slug);
        if (ws) setActiveWorkspace(ws);
      })
      .catch(() => router.replace("/login"));
  }, [ready, slug]);

  // Step 3 — load channels
  useEffect(() => {
    if (!activeWorkspace) return;
    channelApi.list(activeWorkspace.id).then(({ data }) => setChannels(data));
  }, [activeWorkspace?.id]);

  if (!ready || !activeWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2
                        border-[var(--border)] border-t-[var(--accent)]"
        />
      </div>
    );
  }

  return (
    <WSProvider workspaceId={activeWorkspace.id}>
      <WorkspaceInner>{children}</WorkspaceInner>
    </WSProvider>
  );
}
