"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  nextPath: string;
  initialError?: string;
};

export function SignInForm({ nextPath, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "Could not confirm your email. Try signing in again or use the link from your inbox."
      : null
  );

  const safeNext = nextPath.startsWith("/") ? nextPath : "/tool";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setStatus("idle");
      setError("Enter email and password.");
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(safeNext);
      router.refresh();
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/95 p-8 shadow-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-400">PastPaperLab account (for testing).</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="h-12 w-full rounded-md bg-zinc-200 px-4 text-black outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-12 w-full rounded-md bg-zinc-200 px-4 text-black outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-12 w-full rounded-md bg-emerald-400 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Please wait…" : "Sign in"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
      <p className="mt-6 text-center text-sm text-zinc-500">
        Need an account?{" "}
        <Link href={`/register?next=${encodeURIComponent(safeNext)}`} className="text-emerald-400 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
