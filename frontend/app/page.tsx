"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);
    setChecking(false);
  }, []);

  const features = [
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: "Real-time messaging",
      desc: "Send and receive messages instantly. Every message is delivered and persisted — nothing gets lost.",
    },
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: "Presence & typing",
      desc: "See who's online and know when someone is typing. Presence updates in real time across all devices.",
    },
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
      title: "Powerful search",
      desc: "Find any message across your workspace instantly. Results are ranked by relevance with highlighted snippets.",
    },
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      ),
      title: "Threads",
      desc: "Keep conversations focused. Reply in threads to discuss topics without cluttering the main channel.",
    },
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 13s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      ),
      title: "Reactions",
      desc: "Express yourself with emoji reactions. Counts update live for everyone in the channel.",
    },
    {
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      title: "Workspaces & channels",
      desc: "Organise your team into workspaces and channels. Public or private, you control who sees what.",
    },
  ];

  const stack = [
    { name: "Go", color: "text-teal-400" },
    { name: "Next.js 14", color: "text-blue-400" },
    { name: "PostgreSQL", color: "text-indigo-400" },
    { name: "Redis", color: "text-red-400" },
    { name: "Kafka", color: "text-amber-400" },
    { name: "WebSockets", color: "text-emerald-400" },
    { name: "TypeScript", color: "text-blue-300" },
    { name: "Docker", color: "text-sky-400" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                      border-b border-[var(--border)] bg-[var(--bg-primary)]/80
                      backdrop-blur-md px-6 py-4"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)]">
            ChatFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/constantine950/ChatFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          {!checking &&
            (isLoggedIn ? (
              <button
                onClick={() => router.push("/login")}
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm
                           font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Open App
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm
                           font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Sign in
              </Link>
            ))}
        </div>
      </nav>

      {/* Hero */}
      <section
        className="flex flex-col items-center justify-center text-center
                          px-6 pt-40 pb-24"
      >
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)]
                        bg-[var(--bg-secondary)] px-4 py-1.5 text-xs text-[var(--text-secondary)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--online)] animate-pulse" />
          Real-time · Open source · Self-hostable
        </div>

        <h1
          className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight
                       text-[var(--text-primary)] mb-6"
        >
          Team chat that
          <span className="text-[var(--accent)]"> just works</span>
        </h1>

        <p className="max-w-lg text-lg text-[var(--text-secondary)] mb-10 leading-relaxed">
          ChatFlow brings your team together with real-time messaging, threads,
          search, and presence — all in a clean, fast interface.
        </p>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium
                         text-white hover:bg-[var(--accent-hover)] transition-colors
                         shadow-lg shadow-[var(--accent)]/20"
            >
              Open ChatFlow →
            </button>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium
                           text-white hover:bg-[var(--accent-hover)] transition-colors
                           shadow-lg shadow-[var(--accent)]/20"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]
                           px-6 py-3 text-sm font-medium text-[var(--text-secondary)]
                           hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]
                           transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        {/* Stack pills */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
          {stack.map((s) => (
            <span
              key={s.name}
              className={`rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]
                          px-3 py-1 text-xs font-medium ${s.color}`}
            >
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* App preview */}
      <section className="px-6 pb-24 flex justify-center">
        <div
          className="w-full max-w-5xl rounded-2xl border border-[var(--border)]
                        bg-[var(--bg-secondary)] overflow-hidden shadow-2xl"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
            <div
              className="ml-3 flex-1 rounded-md bg-[var(--bg-tertiary)] px-3 py-1
                            text-xs text-[var(--text-muted)] text-center"
            >
              chatflow.app/my-team/general
            </div>
          </div>

          {/* Mock UI */}
          <div className="flex h-80">
            {/* Sidebar */}
            <div className="w-52 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] p-3">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="h-6 w-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white">
                  M
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  My Team
                </span>
              </div>
              <div className="mb-3 px-1">
                <div className="h-6 rounded bg-[var(--bg-tertiary)] flex items-center px-2 gap-1.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--text-muted)]"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Search...
                  </span>
                </div>
              </div>
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] px-1 mb-1">
                Channels
              </p>
              {["general", "random", "backend", "design"].map((ch, i) => (
                <div
                  key={ch}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 mb-0.5 ${i === 0 ? "bg-[var(--bg-active)]" : ""}`}
                >
                  <span className="text-[var(--text-muted)] text-xs">#</span>
                  <span
                    className={`text-xs ${i === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {ch}
                  </span>
                  {i === 2 && (
                    <span className="ml-auto text-[9px] bg-[var(--accent)] text-white rounded-full px-1">
                      3
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col">
              <div className="flex items-center border-b border-[var(--border)] px-4 py-2.5">
                <span className="text-[var(--text-muted)] text-sm mr-1">#</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  general
                </span>
                <span className="mx-2 text-[var(--border-light)]">|</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  General chat
                </span>
              </div>
              <div className="flex-1 p-4 space-y-3">
                {[
                  {
                    name: "Alice",
                    color: "bg-teal-500",
                    msg: "Hey team! Just shipped the new feature 🎉",
                    time: "9:41 AM",
                  },
                  {
                    name: "Bob",
                    color: "bg-indigo-500",
                    msg: "Looks great! The search is super fast now",
                    time: "9:42 AM",
                  },
                  {
                    name: "Alice",
                    color: "bg-teal-500",
                    msg: "Yeah — try Cmd+K to search across channels",
                    time: "9:42 AM",
                    grouped: true,
                  },
                  {
                    name: "Charlie",
                    color: "bg-violet-500",
                    msg: "Love it 👍",
                    time: "9:44 AM",
                    reaction: "👍 3",
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 ${m.grouped ? "pl-9" : ""}`}
                  >
                    {!m.grouped && (
                      <div
                        className={`h-7 w-7 flex-shrink-0 rounded-lg ${m.color} flex items-center justify-center text-[10px] font-semibold text-white`}
                      >
                        {m.name[0]}
                      </div>
                    )}
                    <div>
                      {!m.grouped && (
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {m.time}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-[var(--text-primary)]">
                        {m.msg}
                      </p>
                      {m.reaction && (
                        <span
                          className="mt-1 inline-flex items-center gap-1 rounded-full border
                                         border-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5
                                         text-[10px] text-[var(--accent)]"
                        >
                          {m.reaction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 pl-1">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1 w-1 rounded-full bg-[var(--text-muted)] animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Bob is typing...
                  </span>
                </div>
              </div>
              <div className="border-t border-[var(--border)] px-4 py-2.5">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                  Message #general
                </div>
              </div>
            </div>

            {/* Member list */}
            <div className="w-44 flex-shrink-0 border-l border-[var(--border)] p-3">
              <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Members — 4
              </p>
              <p className="text-[9px] text-[var(--text-muted)] mb-1">
                Online — 3
              </p>
              {[
                { name: "Alice", color: "bg-teal-500" },
                { name: "Bob", color: "bg-indigo-500" },
                { name: "Charlie", color: "bg-violet-500" },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-1.5 py-1">
                  <div className="relative">
                    <div
                      className={`h-5 w-5 rounded-full ${m.color} flex items-center justify-center text-[9px] font-semibold text-white`}
                    >
                      {m.name[0]}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--online)]" />
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {m.name}
                  </span>
                </div>
              ))}
              <p className="text-[9px] text-[var(--text-muted)] mt-2 mb-1">
                Offline — 1
              </p>
              <div className="flex items-center gap-1.5 py-1">
                <div className="relative">
                  <div className="h-5 w-5 rounded-full bg-gray-600 flex items-center justify-center text-[9px] font-semibold text-white">
                    D
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Dave
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Everything your team needs
          </h2>
          <p className="text-center text-[var(--text-secondary)] mb-12 text-sm">
            Built for speed, reliability, and a great user experience.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]
                           p-5 hover:border-[var(--border-light)] transition-colors"
              >
                <div
                  className="mb-3 inline-flex h-10 w-10 items-center justify-center
                                rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]"
                >
                  {f.icon}
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-[var(--text-primary)]">
                  {f.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div
          className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)]
                        bg-[var(--bg-secondary)] p-12 text-center"
        >
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
            Start chatting today
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            Create your workspace and invite your team in under a minute.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-medium
                         text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Create account
            </Link>
            <a
              href="https://github.com/constantine950/ChatFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--border)] px-6 py-3 text-sm
                         font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                         hover:bg-[var(--bg-hover)] transition-colors"
            >
              View source
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-8 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          © 2026 ChatFlow ·{" "}
          <a
            href="https://github.com/constantine950/ChatFlow"
            className="hover:text-[var(--text-secondary)] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open source
          </a>
        </p>
      </footer>
    </div>
  );
}
