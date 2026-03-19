"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

type Props = {
  nextPath: string;
  initialError?: string;
};

export function AuthForm({ nextPath, initialError }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "We couldn’t confirm your email. Try signing in again or request a new link."
      : null
  );

  const safeNext = nextPath.startsWith("/") ? nextPath : "/tool";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setStatus("idle");
      setError("Enter email and password.");
      return;
    }

    try {
      if (mode === "signup") {
        const origin = window.location.origin;
        const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.push(safeNext);
          router.refresh();
          return;
        }
        setMessage(
          "Check your email to confirm your account, then sign in. If confirmation is disabled in Supabase, you can sign in now."
        );
        setMode("signin");
        return;
      }

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
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Use your email to access the practice tool.
      </p>

      <div className="mt-6 flex rounded-lg bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage(null);
            setError(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
            setError(null);
          }}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="auth-email" className="sr-only">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-12 rounded-md bg-zinc-200 text-black px-4 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="sr-only">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full h-12 rounded-md bg-zinc-200 text-black px-4 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full h-12 rounded-md bg-emerald-400 hover:bg-emerald-300 transition font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? "Please wait..."
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald-200">{message}</p>}

      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/" className="text-zinc-300 hover:text-white underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
