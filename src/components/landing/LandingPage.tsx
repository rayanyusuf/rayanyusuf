"use client";

import Link from "next/link";
import { IconArrowRight, IconGraduation } from "./icons";

const points = [
  "Random past paper questions.",
  "Timer on while you work.",
  "Real mark scheme when you’re ready.",
  "You say if you got it right. We log it.",
  "Over time, drills follow what you still need.",
] as const;

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050508] text-zinc-100 selection:bg-emerald-500/20">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[min(100%,800px)] -translate-x-1/2 rounded-full bg-emerald-600/[0.06] blur-[100px]" />
      </div>

      <header className="relative z-20 border-b border-white/[0.06] bg-[#050508]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <IconGraduation className="h-4 w-4 text-emerald-400" />
            </span>
            TaskTutor
          </Link>
          <Link
            href="/early-access"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Get early access
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className="text-center text-[1.65rem] font-semibold leading-snug tracking-tight text-white sm:text-4xl sm:leading-tight">
          Aiming for a Russell Group university?
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-zinc-300 sm:text-lg">
          You don’t control the admissions officer. You control one thing:{" "}
          <span className="text-emerald-400">getting hard problems right, faster.</span>
        </p>

        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-zinc-400 sm:text-lg">
          That’s what this trains. Past papers, a clock, real answers, an honest log.
        </p>

        <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-6 sm:px-6">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 sm:text-left">
            How it works
          </p>
          <ul className="space-y-3">
            {points.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-snug text-zinc-300 sm:text-base">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-sm text-zinc-500">
          Made by someone doing the same A Level papers at British School Dhahran.
        </p>

        <div className="mt-12 flex justify-center">
          <Link
            href="/early-access"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-8 py-3.5 text-base font-semibold text-zinc-950 hover:bg-emerald-300"
          >
            Get early access
            <IconArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          Operators:{" "}
          <Link href="/admin" className="text-zinc-500 underline-offset-2 hover:underline">
            /admin
          </Link>
        </p>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-xs text-zinc-600">
        TaskTutor · timed past-paper reps
      </footer>
    </div>
  );
}
