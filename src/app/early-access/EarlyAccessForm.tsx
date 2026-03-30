"use client";

import { useState } from "react";
import Link from "next/link";
import { buildEarlyAccessWhatsAppUrl } from "@/lib/whatsappEarlyAccess";

type Props = {
  whatsappE164Digits: string;
};

export function EarlyAccessForm({ whatsappE164Digits }: Props) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [school, setSchool] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const configured = whatsappE164Digits.length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setFormError("WhatsApp number is not configured.");
      return;
    }
    const n = name.trim();
    const s = school.trim();
    if (!n || !dateOfBirth || !s) {
      setFormError("Fill in all fields.");
      return;
    }
    setFormError(null);
    const url = buildEarlyAccessWhatsAppUrl(whatsappE164Digits, {
      name: n,
      dateOfBirth,
      school: s,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      <header className="border-b border-white/[0.06] bg-[#050508]/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white">
            ← Back
          </Link>
          <span className="font-semibold text-white">PastPaperLab</span>
          <span className="w-10" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Get early access</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Send a quick WhatsApp with your details. We’ll get back to you from there.
        </p>

        {!configured && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Early access form is not wired up yet (set <code className="text-amber-100">WHATSAPP_NUMBER</code> in
            .env.local).
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="ea-name" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Name
            </label>
            <input
              id="ea-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 text-white outline-none ring-emerald-500/40 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="ea-dob" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Date of birth
            </label>
            <input
              id="ea-dob"
              name="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 text-white outline-none ring-emerald-500/40 focus:ring-2 [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="ea-school" className="mb-1.5 block text-sm font-medium text-zinc-300">
              School
            </label>
            <input
              id="ea-school"
              name="school"
              autoComplete="organization"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 text-white outline-none ring-emerald-500/40 focus:ring-2"
            />
          </div>
          {formError && <p className="text-sm text-amber-400">{formError}</p>}
          <button
            type="submit"
            disabled={!configured}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-zinc-950 transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request access on WhatsApp
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Opens WhatsApp with your message ready to send (you can edit before sending).
        </p>
      </main>
    </div>
  );
}
