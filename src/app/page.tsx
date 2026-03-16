 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ACCESS_KEY = "ra_access_granted_v1";
const ACCESS_PASSWORD = "solver";

export default function Home() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    try {
      setHasAccess(window.localStorage.getItem(ACCESS_KEY) === "true");
    } catch {
      setHasAccess(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password === ACCESS_PASSWORD) {
      try {
        window.localStorage.setItem(ACCESS_KEY, "true");
      } catch {
        // ignore
      }
      setHasAccess(true);
      setMessage(null);
    } else {
      setMessage("Wrong password.");
    }
  };

  const handleLock = () => {
    try {
      window.localStorage.removeItem(ACCESS_KEY);
    } catch {
      // ignore
    }
    setPassword("");
    setHasAccess(false);
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
          {hasAccess ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-300">
                Access granted.
              </p>
              <Link
                href="/tool"
                className="block w-full rounded-full bg-emerald-400 px-6 py-3 text-lg font-semibold text-black shadow-lg hover:bg-emerald-300"
              >
                Go to Practice Tool
              </Link>
              <button
                onClick={handleLock}
                className="mt-2 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Lock
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-sm text-zinc-300">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-emerald-400 px-6 py-3 text-lg font-semibold text-black shadow-lg hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Unlock
                </button>

                {message && (
                  <p className="text-sm text-amber-300 text-center">{message}</p>
                )}
              </form>

              <p className="mt-4 text-xs text-zinc-500 text-center">
                Enter the password to access the practice tool.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
