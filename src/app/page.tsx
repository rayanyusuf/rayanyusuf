 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ACCESS_KEY = "ra_access_granted_v1";

export default function Home() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [email, setEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  const [loginOpen, setLoginOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "error">("idle");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHasAccess(window.localStorage.getItem(ACCESS_KEY) === "true");
    } catch {
      setHasAccess(false);
    }
  }, []);

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus("saving");
    setLeadMessage(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLeadStatus("error");
      setLeadMessage("Please enter a valid email.");
      return;
    }
    const { error } = await supabase.from("leads").insert({ email: trimmed });
    if (error) {
      const msg = error.message.toLowerCase().includes("duplicate")
        ? "You're already on the list."
        : error.message;
      setLeadStatus("error");
      setLeadMessage(msg);
      return;
    }
    setLeadStatus("saved");
    setLeadMessage("You're in. We'll email you when new features land.");
    setEmail("");
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginStatus("loading");
    setLoginMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json?.error ?? `Login failed (${res.status}).`);
      if (!json.ok) {
        setLoginStatus("error");
        setLoginMessage("Wrong password.");
        return;
      }
      try {
        window.localStorage.setItem(ACCESS_KEY, "true");
      } catch {
        // ignore
      }
      setHasAccess(true);
      setLoginOpen(false);
      setPassword("");
      setLoginStatus("idle");
      router.push("/tool");
    } catch (err) {
      setLoginStatus("error");
      setLoginMessage(err instanceof Error ? err.message : "Login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="min-h-screen flex items-center justify-center px-4">
        <main className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="text-sm text-zinc-400 tracking-wide uppercase">
                A-level practice, but smarter
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">
                Ace your A-levels
              </h1>
              <p className="mt-5 text-lg text-zinc-300 max-w-xl">
                A practice system that serves real past-paper questions, times your solves,
                tracks accuracy, and helps you focus on the topics that will move your grade.
              </p>
              <div className="mt-6 space-y-3 text-zinc-300">
                <p>
                  - Past-paper problems across Maths and Further Maths (more subjects coming).
                </p>
                <p>
                  - Admin workflow: upload papers → convert to pages → AI crop → save problems.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 shadow-2xl">
                <form onSubmit={submitLead} className="space-y-3">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full h-12 rounded-md bg-zinc-200 text-black px-4 outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <button
                    type="submit"
                    disabled={leadStatus === "saving"}
                    className="w-full h-12 rounded-md bg-emerald-200 hover:bg-emerald-150 transition font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {leadStatus === "saving" ? "Saving..." : "Get Access"}
                  </button>
                  {leadMessage && (
                    <p className={`text-sm ${leadStatus === "error" ? "text-amber-300" : "text-emerald-200"}`}>
                      {leadMessage}
                    </p>
                  )}
                </form>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginOpen(true);
                      setLoginMessage(null);
                      setLoginStatus("idle");
                    }}
                    className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-semibold text-black hover:bg-white transition"
                  >
                    Login
                  </button>
                  {hasAccess ? (
                    <button
                      type="button"
                      onClick={() => router.push("/tool")}
                      className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 transition"
                    >
                      Open tool
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Admins use the same login for /admin.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {loginOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLoginOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/95 p-6">
            <h2 className="text-xl font-semibold">Login</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter the password to access the tool (and admin).
            </p>
            <form onSubmit={doLogin} className="mt-5 space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-12 rounded-md bg-zinc-200 text-black px-4 outline-none focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
              <button
                type="submit"
                disabled={loginStatus === "loading"}
                className="w-full h-12 rounded-md bg-emerald-400 hover:bg-emerald-300 transition font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginStatus === "loading" ? "Checking..." : "Login"}
              </button>
              {loginMessage && <p className="text-sm text-amber-300">{loginMessage}</p>}
            </form>
            <button
              type="button"
              onClick={() => setLoginOpen(false)}
              className="mt-4 w-full rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
