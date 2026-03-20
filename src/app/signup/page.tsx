"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, redirect straight to garden
    // Otherwise show success message
    setSuccess(true);
    setLoading(false);

    // Try to sign in immediately (works if email confirmation is off)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!loginError) {
      router.push("/garden");
      router.refresh();
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-3xl text-parchment-300 mb-4">
            Account Created
          </h1>
          <p className="text-parchment-300/70 mb-6">
            Check your email for a confirmation link, then sign in.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 rounded-lg bg-moss-700 hover:bg-moss-600 text-parchment-300 font-semibold transition-colors"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-parchment-300 mb-2">
            Garden Journal
          </h1>
          <p className="text-parchment-300/60 text-sm">
            Create your garden account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-parchment-300/80 text-sm mb-1"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-night-900 border border-moss-800 text-parchment-300 placeholder:text-parchment-300/30 focus:outline-none focus:border-moss-500 text-lg"
              placeholder="Jim"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-lg bg-night-900 border border-moss-800 text-parchment-300 placeholder:text-parchment-300/30 focus:outline-none focus:border-moss-500 text-lg"
              placeholder="At least 6 characters"
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
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-parchment-300/50 text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-moss-400 hover:text-moss-300">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
