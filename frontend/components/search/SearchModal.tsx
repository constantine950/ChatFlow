"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWorkspaceStore } from "../../lib/store/workspaceStore";
import { workspaceApi, SearchResult } from "../../lib/api/workspace";
import { relativeTime } from "../../lib/utils/time";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const params = useParams();
  const { activeWorkspace } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      if (!activeWorkspace) return;
      setLoading(true);
      try {
        const res = await workspaceApi.search(activeWorkspace.id, query);
        setResults(res.results);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, activeWorkspace]);

  function jumpTo(result: SearchResult) {
    if (activeWorkspace) {
      router.push(`/${activeWorkspace.slug}/${result.channel_id}`);
    }
    onClose();
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter" && results[selected]) {
      jumpTo(results[selected]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-xl border border-[var(--border)]
                   bg-[var(--bg-secondary)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-muted)] flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none
                       placeholder:text-[var(--text-muted)]"
          />
          {loading && (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2
                            border-[var(--border)] border-t-[var(--accent)]"
            />
          )}
          <kbd
            className="text-[11px] text-[var(--text-muted)] rounded border
                          border-[var(--border)] px-1.5 py-0.5"
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mb-3 opacity-40"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p className="text-sm">No results for "{query}"</p>
            </div>
          )}

          {results.length === 0 && query.length < 2 && (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              Type at least 2 characters to search
            </div>
          )}

          {results.map((result, i) => (
            <button
              key={result.message_id}
              onClick={() => jumpTo(result)}
              className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors
                          border-b border-[var(--border)] last:border-0
                          ${
                            i === selected
                              ? "bg-[var(--bg-active)]"
                              : "hover:bg-[var(--bg-hover)]"
                          }`}
            >
              {/* Meta */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--accent)]">
                  #{result.channel_name}
                </span>
                <span className="text-xs text-[var(--text-muted)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {result.display_name}
                </span>
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                  {relativeTime(result.created_at)}
                </span>
              </div>

              {/* Snippet with highlighted match */}
              <p
                className="text-sm text-[var(--text-primary)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span>
                <kbd className="rounded border border-[var(--border)] px-1">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="rounded border border-[var(--border)] px-1">
                  ↵
                </kbd>{" "}
                jump to
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
