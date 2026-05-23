"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceApi } from "../../lib/api/workspace";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generate slug from name
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-"),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ws = await workspaceApi.create(name, slug);

      // Create a general channel automatically
      const { channelApi } = await import("../../lib/api/workspace");
      const ch = await channelApi.create(ws.id, "general", "General chat");

      router.push(`/${ws.slug}/${ch.id}`);
    } catch (err: any) {
      setError(err.message ?? "Could not create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Create a workspace
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            A workspace is where your team chats
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              required
              placeholder="Acme Corp"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                         px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none
                         placeholder:text-[var(--text-muted)]
                         focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)]
                         transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              URL slug
            </label>
            <div
              className="flex items-center rounded-lg border border-[var(--border)]
                            bg-[var(--bg-secondary)] px-3 py-2.5
                            focus-within:border-[var(--accent)] focus-within:ring-2
                            focus-within:ring-[var(--accent-dim)] transition-all"
            >
              <span className="text-sm text-[var(--text-muted)] mr-1">
                chatflow.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                placeholder="acme-corp"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none
                           placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          {error && (
            <p
              className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2
                          text-xs text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !name || !slug}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm
                       font-medium text-white transition-all
                       hover:bg-[var(--accent-hover)] disabled:opacity-50
                       disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Creating..." : "Create workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
