"use client";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { useAuthStore } from "../../lib/store/authStore";
import ChannelList from "./ChannelList";

export default function Sidebar() {
  const router = useRouter();
  const params = useParams();
  const { activeWorkspace, workspaces, setActiveWorkspace } =
    useWorkspaceStore();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Workspace header */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center
                          rounded-lg bg-[var(--accent)] text-xs font-semibold text-white"
          >
            {activeWorkspace?.name[0].toUpperCase()}
          </div>
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {activeWorkspace?.name}
          </span>
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">
        <ChannelList />
      </div>

      {/* User footer */}
      <div className="flex h-14 items-center gap-3 border-t border-[var(--border)] px-4">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center
                        rounded-full bg-[var(--bg-active)] text-xs font-medium
                        text-[var(--text-primary)]"
        >
          {user?.display_name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {user?.display_name}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {user?.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          title="Sign out"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
