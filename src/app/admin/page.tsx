"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_KEY = "ra_admin_access_v1";
const ADMIN_PASSWORD = "yusuf";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ADMIN_KEY) === "true") {
        router.replace("/admin/dashboard");
      }
    } catch {
      // ignore
    }
  }, [router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== ADMIN_PASSWORD) {
      setError("Wrong password.");
      return;
    }

    try {
      window.localStorage.setItem(ADMIN_KEY, "true");
    } catch {
      // ignore
    }

    router.replace("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <main className="w-full max-w-xl">
        <h1 className="text-center text-4xl font-semibold tracking-tight">
          Admin
        </h1>

        <form onSubmit={onSubmit} className="mt-10 flex items-center gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="flex-1 h-12 rounded-md bg-zinc-200 text-black px-4 outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
          />
          <button
            type="submit"
            className="h-12 w-24 rounded-md bg-amber-400 hover:bg-amber-300 transition font-semibold text-black"
            aria-label="Sign in"
          >
            Sign in
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-amber-300">{error}</p>
        )}
      </main>
    </div>
  );
}

