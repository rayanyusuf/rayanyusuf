"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setHasAccess(!!session);
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasAccess(!!session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

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

    let emailSent = false;
    try {
      const notifyRes = await fetch("/api/leads/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const notifyJson = (await notifyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      emailSent = notifyRes.ok && notifyJson.ok === true;
      if (!emailSent && notifyJson.error) {
        // eslint-disable-next-line no-console
        console.warn("[lead] confirmation email failed:", notifyJson.error);
      }
    } catch {
      // Lead is saved; email is best-effort
    }

    setLeadStatus("saved");
    setLeadMessage(
      emailSent
        ? "You're in. Check your inbox for a message from Rayan."
        : "You're on the list. We couldn't send a confirmation email—your signup is saved. If you're the site owner, set RESEND_FROM_EMAIL to an address on a domain you've verified in Resend."
    );
    setEmail("");
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

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {!sessionReady ? (
                    <span className="text-sm text-zinc-500">Loading...</span>
                  ) : hasAccess ? (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push("/tool")}
                        className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 transition"
                      >
                        Open tool
                      </button>
                      <button
                        type="button"
                        onClick={signOut}
                        className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth?next=/tool"
                      className="inline-flex items-center justify-center rounded-md bg-zinc-200 px-4 py-2 text-sm font-semibold text-black hover:bg-white transition"
                    >
                      Sign in or create account
                    </Link>
                  )}
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  The practice tool requires a free account. Site admins still use the password at{" "}
                  <Link href="/admin" className="text-zinc-400 underline-offset-2 hover:underline">
                    /admin
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
