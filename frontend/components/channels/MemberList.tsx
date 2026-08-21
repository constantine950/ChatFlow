"use client";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { workspaceApi } from "../../lib/api/workspace";
import OnlineDot from "../presence/OnlineDot";

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

interface UserResult {
  id: string;
  email: string;
  display_name: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

const colors = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-orange-500",
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={
        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full " +
        color +
        " text-xs font-semibold text-white"
      }
    >
      {initials}
    </div>
  );
}

export default function MemberList() {
  const { activeWorkspace, onlineUsers } = useWorkspaceStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  // Load members
  useEffect(() => {
    if (!activeWorkspace) return;
    fetchMembers();
  }, [activeWorkspace?.id]);

  function fetchMembers() {
    if (!activeWorkspace) return;
    authFetch("/workspaces/" + activeWorkspace.id + "/members")
      .then((r) => r.json())
      .then((res) => setMembers(res.data ?? []));
  }

  // Refresh online presence every 30s
  useEffect(() => {
    if (!activeWorkspace) return;
    const refresh = () =>
      workspaceApi
        .getPresence(activeWorkspace.id)
        .then(({ online }) =>
          useWorkspaceStore.getState().setOnlineUsers(online),
        );
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [activeWorkspace?.id]);

  // Copy invite link
  function copyInviteLink() {
    if (!activeWorkspace) return;
    const link = window.location.origin + "/join/" + activeWorkspace.id;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Search users by name or email
  async function searchUsers(q: string) {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await authFetch("/users/search?q=" + encodeURIComponent(q));
      const data = await res.json();
      // Filter out users already in the workspace
      const memberIds = new Set(members.map((m) => m.user_id));
      setSearchResults(
        (data.data ?? []).filter((u: UserResult) => !memberIds.has(u.id)),
      );
    } catch {
      setSearchResults([]);
    }
  }

  // Add user to workspace
  async function addToWorkspace(user: UserResult) {
    if (!activeWorkspace) return;
    setAdding(user.id);
    try {
      await authFetch("/workspaces/" + activeWorkspace.id + "/members", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id }),
      });
      fetchMembers();
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      // ignore
    } finally {
      setAdding(null);
    }
  }

  const online = members.filter((m) => onlineUsers.includes(m.user_id));
  const offline = members.filter((m) => !onlineUsers.includes(m.user_id));

  function MemberRow({ member }: { member: Member }) {
    return (
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">
        <div className="relative flex-shrink-0">
          <Avatar name={member.display_name} />
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineDot online={onlineUsers.includes(member.user_id)} />
          </div>
        </div>
        <span className="flex-1 truncate text-sm text-[var(--text-secondary)]">
          {member.display_name}
        </span>
        {member.role === "OWNER" && (
          <span className="text-[10px] text-[var(--text-muted)]">owner</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-56 flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Members -- {members.length}
        </p>
        <button
          onClick={copyInviteLink}
          title={copied ? "Copied!" : "Copy invite link"}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--online)]"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          )}
        </button>
      </div>

      {/* Add people search */}
      <div className="border-b border-[var(--border)] px-2 py-2">
        <input
          value={searchQuery}
          onChange={(e) => searchUsers(e.target.value)}
          placeholder="Add people..."
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-tertiary)]
                     px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none
                     placeholder:text-[var(--text-muted)]
                     focus:border-[var(--accent)] transition-colors"
        />

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-lg">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => addToWorkspace(u)}
                disabled={adding === u.id}
                className="flex w-full items-center gap-2 px-2.5 py-2 hover:bg-[var(--bg-hover)] transition-colors text-left disabled:opacity-50"
              >
                <div
                  className={
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white " +
                    colors[u.display_name.charCodeAt(0) % colors.length]
                  }
                >
                  {u.display_name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {u.display_name}
                  </p>
                  <p className="truncate text-[10px] text-[var(--text-muted)]">
                    {u.email}
                  </p>
                </div>
                {adding === u.id ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[var(--accent)] flex-shrink-0"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && (
          <p className="mt-1.5 text-center text-[10px] text-[var(--text-muted)]">
            No users found
          </p>
        )}
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {online.length > 0 && (
          <>
            <p className="mb-1 px-2 text-[11px] font-medium text-[var(--text-muted)]">
              Online -- {online.length}
            </p>
            {online.map((m) => (
              <MemberRow key={m.user_id} member={m} />
            ))}
          </>
        )}

        {offline.length > 0 && (
          <>
            <p className="mb-1 mt-3 px-2 text-[11px] font-medium text-[var(--text-muted)]">
              Offline -- {offline.length}
            </p>
            {offline.map((m) => (
              <MemberRow key={m.user_id} member={m} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
