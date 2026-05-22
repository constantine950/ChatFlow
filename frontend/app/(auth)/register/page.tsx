"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "../../../lib/api/auth";
import { useAuthStore } from "../../../lib/store/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authApi.register(email, password, displayName);
      setAuth(res.user, res.access_token, res.refresh_token);
      router.push("/create-workspace");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm px-6">
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Join ChatFlow today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]
                         px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none
                         placeholder:text-[var(--text-muted)]
                         focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)]
                         transition-all"
            />
          </div>

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
              minLength={8}
              placeholder="Min. 8 characters"
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
