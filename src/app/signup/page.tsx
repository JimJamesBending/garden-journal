"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    // Create the account
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Immediately sign in after signup
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but sign-in failed. Please try logging in.");
      setLoading(false);
      return;
    }

    // Redirect: if they came from /try, go to /garden (which picks up pendingPlant from sessionStorage)
    const from = searchParams.get("from");
    const redirectTo = from === "try" ? "/garden" : "/garden";
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🌱</div>
        <h1 className="text-heading text-garden-text mb-2">
          Create Your Garden
        </h1>
        <p className="text-body text-garden-textMuted">
          It takes 10 seconds
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-body-sm text-garden-textMuted font-semibold mb-1.5"
          >
            Your name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-white border-2 border-garden-border text-body text-garden-text placeholder:text-garden-textMuted/40 focus:outline-none focus:border-garden-greenBright transition-colors"
            placeholder="Jim"
          />
        </div>

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
            minLength={6}
            autoComplete="new-password"
            className="w-full px-5 py-4 rounded-xl bg-white border-2 border-garden-border text-body text-garden-text placeholder:text-garden-textMuted/40 focus:outline-none focus:border-garden-greenBright transition-colors"
            placeholder="At least 6 characters"
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
          {loading ? "Creating your garden..." : "Create My Garden"}
        </button>
      </form>

      <p className="text-center text-body text-garden-textMuted mt-8">
        Already have an account?{" "}
        <Link href="/login" className="text-garden-greenBright font-semibold underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <Suspense fallback={
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">🌱</div>
          <p className="text-body text-garden-textMuted">Loading...</p>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
