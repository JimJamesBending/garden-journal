"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-night-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-parchment-300 mb-2">
            Garden Journal
          </h1>
          <p className="text-parchment-300/60 text-sm">
            Sign in to your garden
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-parchment-300/80 text-sm mb-1"
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
              className="w-full px-4 py-3 rounded-lg bg-night-900 border border-moss-800 text-parchment-300 placeholder:text-parchment-300/30 focus:outline-none focus:border-moss-500 text-lg"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-parchment-300/80 text-sm mb-1"
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
              className="w-full px-4 py-3 rounded-lg bg-night-900 border border-moss-800 text-parchment-300 placeholder:text-parchment-300/30 focus:outline-none focus:border-moss-500 text-lg"
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-moss-700 hover:bg-moss-600 text-parchment-300 font-semibold text-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-parchment-300/50 text-sm mt-6">
          No account?{" "}
          <a href="/signup" className="text-moss-400 hover:text-moss-300">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
