 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthMode = "signup" | "login";

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? null);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          data.user
            ? "Account created. You are now signed in."
            : "Check your email to confirm your account."
        );
        setUserEmail(data.user?.email ?? null);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Signed in successfully.");
        setUserEmail(data.user?.email ?? null);
      }
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <main className="w-full max-w-4xl px-4 py-12 flex flex-col gap-10">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Hey! I&apos;m Rayan Yusuf
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-300">
            I&apos;m doing my A-levels and I&apos;ve built a tool that learns
            which areas you&apos;re weak in and gives you targeted problems so
            you can ace your A-levels in Math, Physics, Chemistry and Further
            Maths.
          </p>
        </section>

        {/* Auth card */}
        <section className="mx-auto w-full max-w-xl rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-2xl">
          {userEmail ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-300">
                Signed in as <span className="font-semibold">{userEmail}</span>
              </p>
              <Link
                href="/tool"
                className="block w-full rounded-full bg-emerald-400 px-6 py-3 text-lg font-semibold text-black shadow-lg hover:bg-emerald-300"
              >
                Go to Practice Tool
              </Link>
              <button
                onClick={handleSignOut}
                className="mt-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-4 mb-4 text-sm">
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`px-3 py-1 rounded-full ${
                    authMode === "signup"
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`px-3 py-1 rounded-full ${
                    authMode === "login"
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-sm text-zinc-300">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <label className="text-sm text-zinc-300">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Use at least 6 characters.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-emerald-400 px-6 py-3 text-lg font-semibold text-black shadow-lg hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Please wait..."
                    : authMode === "signup"
                    ? "Create account & start"
                    : "Log in & start"}
                </button>

                {message && (
                  <p className="text-sm text-amber-300 text-center">{message}</p>
                )}
              </form>

              <p className="mt-4 text-xs text-zinc-500 text-center">
                You need an account to access the practice tool.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
