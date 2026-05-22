"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "../../../lib/api/auth";
import { useAuthStore } from "../../../lib/store/authStore";
import { workspaceApi } from "../../../lib/api/workspace";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      setAuth(res.user, res.access_token, res.refresh_token);

      // Redirect to first workspace
      const { data } = await workspaceApi.list();
      if (data.length === 0) {
        router.push("/create-workspace");
      } else {
        router.push(`/${data[0].slug}`);
      }
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16v12H4z" rx="2" stroke="white" strokeWidth="1.5" />
              <path
                d="M8 20l4-4 4 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Sign in to ChatFlow
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                         px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none
                         placeholder:text-[var(--text-muted)]
                         focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)]
                         transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                         px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none
                         placeholder:text-[var(--text-muted)]
                         focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)]
                         transition-all"
            />
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
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm
                       font-medium text-white transition-all
                       hover:bg-[var(--accent-hover)] disabled:opacity-50
                       disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          No account?{" "}
          <Link
            href="/register"
            className="text-[var(--accent)] hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
