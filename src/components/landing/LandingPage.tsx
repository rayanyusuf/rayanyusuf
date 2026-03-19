"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  IconArrowRight,
  IconChart,
  IconCheck,
  IconDocument,
  IconEye,
  IconGraduation,
  IconShuffle,
  IconSparkles,
  IconTimer,
  IconVideo,
} from "./icons";

const features = [
  {
    icon: IconDocument,
    title: "Real papers, not “exam-style vibes”",
    body: "These questions lived a previous life as actual PDFs that made someone sweat in an exam hall. We’re not serving worksheet cosplay.",
    accent: "from-emerald-500/20 to-teal-500/5",
  },
  {
    icon: IconTimer,
    title: "A timer that refuses to gaslight you",
    body: "Hit start, panic elegantly, hit stop. Your phone’s stopwatch is exhausted from being ignored—ours is built in and weirdly motivating.",
    accent: "from-amber-500/15 to-orange-500/5",
  },
  {
    icon: IconEye,
    title: "Answers only when you’re ready",
    body: "Finish your attempt first, then reveal the mark scheme. Spoilers are for Netflix, not for integration by parts.",
    accent: "from-sky-500/15 to-blue-500/5",
  },
  {
    icon: IconVideo,
    title: "Video walkthroughs (when we’ve got them)",
    body: "Some problems link straight to a solution video—like a warm blanket, but for your grade boundary anxiety.",
    accent: "from-rose-500/15 to-red-500/5",
  },
  {
    icon: IconShuffle,
    title: "Randomised drill roulette",
    body: "You don’t pick the question—the universe does. Okay, it’s an algorithm. Same emotional effect, fewer horoscopes.",
    accent: "from-violet-500/20 to-purple-500/5",
  },
  {
    icon: IconChart,
    title: "Honest outcomes, quietly logged",
    body: "“Got it” or “nope.” We save the time and result so you’re building a trail of evidence instead of vibes.",
    accent: "from-cyan-500/15 to-emerald-500/5",
  },
] as const;

const steps = [
  { n: "01", title: "Make a free account", body: "Email + password. No credit card, no newsletter guilt trip." },
  { n: "02", title: "Enter the drill", body: "Start the timer, work the problem like it owes you marks." },
  { n: "03", title: "Reveal, reflect, repeat", body: "Check the answer, tap how it went, grab the next paper-shaped challenge." },
] as const;

export function LandingPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030306] text-zinc-100 selection:bg-emerald-500/25 selection:text-emerald-50">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute -right-1/4 top-1/3 h-[480px] w-[480px] rounded-full bg-violet-600/[0.08] blur-[110px]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[80%] -translate-x-1/2 rounded-full bg-teal-500/[0.05] blur-[100px]" />
        <div className="landing-shimmer absolute inset-0 opacity-40" />
      </div>

      {/* Nav */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#030306]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 ring-1 ring-white/10 transition group-hover:ring-emerald-400/30">
              <IconGraduation className="h-5 w-5 text-emerald-300" />
            </span>
            <span className="hidden sm:inline">Drill Sergeant</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {!sessionReady ? (
              <span className="h-9 w-20 animate-pulse rounded-lg bg-white/5" aria-hidden />
            ) : hasAccess ? (
              <>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/tool")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
                >
                  Open tool
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?next=/tool"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth?next=/tool"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
                >
                  Start free
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-300/90">
              <IconSparkles className="h-3.5 w-3.5" />
              Early access · free · we want testers
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl sm:leading-[1.08] lg:text-6xl">
              Stop revising the{" "}
              <span className="bg-gradient-to-r from-emerald-200 via-white to-teal-200 bg-clip-text text-transparent">
                idea
              </span>{" "}
              of exams.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Real A-Level <span className="text-zinc-200">Further Maths</span> past-paper questions. A timer that doesn’t
              lie. Answers when you’re brave enough. We’re in beta, slightly smug about it, and we’d love you to try
              break things{" "}
              <span className="italic text-zinc-500">(gently, please—the database has feelings)</span>.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {sessionReady && hasAccess ? (
                <button
                  type="button"
                  onClick={() => router.push("/tool")}
                  className="landing-float group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-8 py-4 text-lg font-semibold text-zinc-950 shadow-xl shadow-emerald-500/25 transition hover:brightness-110 sm:w-auto"
                >
                  Continue practising
                  <IconArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </button>
              ) : (
                <Link
                  href="/auth?next=/tool"
                  className="landing-float group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-8 py-4 text-lg font-semibold text-zinc-950 shadow-xl shadow-emerald-500/25 transition hover:brightness-110 sm:w-auto"
                >
                  Create free account
                  <IconArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </Link>
              )}
              <Link
                href="#how-it-works"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-4 text-lg font-medium text-zinc-200 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.06] sm:w-auto"
              >
                How it works
              </Link>
            </div>
            <p className="mt-8 text-sm text-zinc-500">
              Built by a Further Maths student at{" "}
              <span className="text-zinc-400">British School Dhahran</span> — yes, the desert, yes, still doing past
              papers.
            </p>
          </div>

          {/* Hero visual strip */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Timer", sub: "mm:ss", color: "from-amber-400/30" },
              { label: "Real Q", sub: "2019 P2 Q4", color: "from-emerald-400/30" },
              { label: "Outcome", sub: "Logged", color: "from-sky-400/30" },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl border border-white/[0.08] bg-gradient-to-b ${item.color} to-transparent p-4 text-center ring-1 ring-inset ring-white/[0.04] sm:p-5`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:text-xs">{item.label}</p>
                <p className="mt-2 font-mono text-sm font-medium text-white sm:text-base">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-white/[0.06] bg-black/20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Everything you need to feel mildly stressed in a{" "}
                <span className="text-emerald-400/90">productive</span> way
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                It’s not magic. It’s past papers + discipline + one (1) sarcastic product description.
              </p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition hover:border-white/[0.12] hover:bg-white/[0.035]"
                >
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${f.accent} blur-2xl opacity-60 transition group-hover:opacity-100`}
                  />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 text-emerald-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-5 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">How it works</h2>
                <p className="mt-4 text-lg text-zinc-400">
                  Three steps. No twelve-minute onboarding video. We respect your attention span and your exam date.
                </p>
                <ul className="mt-10 space-y-8">
                  {steps.map((s) => (
                    <li key={s.n} className="flex gap-5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-transparent font-mono text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="font-semibold text-white">{s.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-8 ring-1 ring-inset ring-white/[0.04]">
                <div className="space-y-4 font-mono text-sm text-zinc-300">
                  <div className="flex items-center gap-2 text-emerald-400/90">
                    <IconCheck className="h-4 w-4 shrink-0" />
                    <span>Session started — timer running</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-zinc-500">
                    [Further Maths question image loads here]
                    <br />
                    <span className="text-zinc-600">(You’ll see the actual thing—we’re not putting LaTeX in a fake terminal.)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300/90">
                    <IconTimer className="h-4 w-4 shrink-0" />
                    <span>00:04:27 — stop when you’re done panicking</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-300/90">
                    <IconEye className="h-4 w-4 shrink-0" />
                    <span>Reveal answer → honest self-report → next question</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proof / trust */}
        <section className="border-y border-white/[0.06] bg-white/[0.02] py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <IconGraduation className="h-10 w-10 text-emerald-400/80" />
            <p className="max-w-2xl text-lg text-zinc-300">
              This isn’t a faceless edtech conglomerate. It’s a practice tool built by someone actually sitting the same
              papers you are—so the features are selfishly useful, not “engagement optimised.”
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your textbook called. It said you can hang out with us instead.
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Free account. Real questions. Help us polish this before your mocks turn into the real thing.
            </p>
            <div className="mt-10">
              {sessionReady && hasAccess ? (
                <button
                  type="button"
                  onClick={() => router.push("/tool")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-10 py-4 text-lg font-semibold text-zinc-950 shadow-xl shadow-emerald-500/20 transition hover:brightness-110"
                >
                  Back to the drill
                  <IconArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <Link
                  href="/auth?next=/tool"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 px-10 py-4 text-lg font-semibold text-zinc-950 shadow-xl shadow-emerald-500/20 transition hover:brightness-110"
                >
                  I’m in — let me sign up
                  <IconArrowRight className="h-5 w-5" />
                </Link>
              )}
            </div>
            <p className="mt-8 text-xs text-zinc-600">
              Site operators: admin tools still live at{" "}
              <Link href="/admin" className="text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline">
                /admin
              </Link>{" "}
              (password protected).
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-10 text-center text-sm text-zinc-600">
        <p>Drill Sergeant · Past paper practice, timed.</p>
      </footer>
    </div>
  );
}
