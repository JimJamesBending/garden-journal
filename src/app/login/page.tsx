"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/garden");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-heading text-garden-text mb-2">
            Welcome Back
          </h1>
          <p className="text-body text-garden-textMuted">
            Sign in to your garden
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-body-sm text-garden-textMuted font-semibold mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-5 py-4 rounded-xl bg-white border-2 border-garden-border text-body text-garden-text placeholder:text-garden-textMuted/40 focus:outline-none focus:border-garden-greenBright transition-colors"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-body-sm text-garden-textMuted font-semibold mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-5 py-4 rounded-xl bg-white border-2 border-garden-border text-body text-garden-text placeholder:text-garden-textMuted/40 focus:outline-none focus:border-garden-greenBright transition-colors"
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="text-garden-red text-body-sm text-center font-semibold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-garden-greenBright hover:bg-garden-green text-white text-button transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-body text-garden-textMuted mt-8">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-garden-greenBright font-semibold underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
