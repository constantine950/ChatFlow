"use client";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { useAuthStore } from "../../lib/store/authStore";
import ChannelList from "./ChannelList";

export default function Sidebar() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceStore();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  // Pick a consistent color based on display name
  const colors = [
    "bg-indigo-500",
    "bg-violet-500",
    "bg-blue-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-orange-500",
  ];
  const colorIndex = user?.display_name
    ? user.display_name.charCodeAt(0) % colors.length
    : 0;
  const avatarColor = colors[colorIndex];

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Workspace header */}
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center
                          rounded-lg bg-[var(--accent)] text-xs font-bold text-white"
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
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                        rounded-full ${avatarColor} text-xs font-semibold text-white`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {user?.display_name ?? "..."}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {user?.email ?? ""}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
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
