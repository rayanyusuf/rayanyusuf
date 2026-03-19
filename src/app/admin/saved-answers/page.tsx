"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/AdminSidebar";

const ADMIN_KEY = "ra_admin_access_v1";
const PROBLEM_IMAGES_BUCKET = "problem-images";

type AnswerRow = {
  answer_id: string;
  answer_image: string;
  created_at?: string;
};

function formatAnswerTitle(answerId: string): string {
  const m = answerId.match(/Further-Maths-(\d{4})-paper-(\d+)-Question-(\d+)/i);
  if (!m) return answerId;
  return `${m[1]} Paper ${m[2]} Q${m[3]} (answer)`;
}

async function resolveImageUrl(storagePath: string): Promise<string> {
  const { data: signed, error } = await supabase.storage
    .from(PROBLEM_IMAGES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (!error && signed?.signedUrl) return signed.signedUrl;
  return supabase.storage.from(PROBLEM_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export default function AdminSavedAnswersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnswerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ADMIN_KEY) !== "true") {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    } catch {
      router.replace("/admin");
    }
  }, [router]);

  useEffect(() => {
    if (checking) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: e } = await supabase
        .from("answers")
        .select("answer_id, answer_image, created_at")
        .order("created_at", { ascending: false });

      if (e) {
        setError(e.message);
        setAnswers([]);
        setPreviewUrls({});
      } else {
        const list = (data as AnswerRow[]) ?? [];
        setAnswers(list);
        const entries = await Promise.all(
          list.map(async (r) => [r.answer_id, await resolveImageUrl(r.answer_image)] as const)
        );
        setPreviewUrls(Object.fromEntries(entries));
      }
      setLoading(false);
    };

    load();
  }, [checking]);

  useEffect(() => {
    if (!selected) {
      setModalUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const url = await resolveImageUrl(selected.answer_image);
      if (!cancelled) setModalUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const deleteAnswer = async (a: AnswerRow) => {
    const ok = window.confirm(
      `Delete this saved answer?\n\n${a.answer_id}\n\nThis removes the DB row and the image from storage.`
    );
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      const { error: storageErr } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .remove([a.answer_image]);
      if (storageErr) throw new Error(storageErr.message);

      const { error: dbErr } = await supabase.from("answers").delete().eq("answer_id", a.answer_id);
      if (dbErr) throw new Error(dbErr.message);

      setAnswers((prev) => prev.filter((x) => x.answer_id !== a.answer_id));
      setPreviewUrls((prev) => {
        const next = { ...prev };
        delete next[a.answer_id];
        return next;
      });
      setSelected((cur) => (cur?.answer_id === a.answer_id ? null : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOpenUrl = useMemo(() => {
    if (!selected) return null;
    return modalUrl;
  }, [selected, modalUrl]);

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Answers</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Everything you confirm in the Solution Key tab appears here after cropping.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading answers...</p>
          ) : answers.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              No answers yet. Use the <span className="text-zinc-300">Solution Key</span> tab to crop and
              confirm.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {answers.map((a) => {
                const thumb = previewUrls[a.answer_id];
                return (
                  <button
                    key={a.answer_id}
                    type="button"
                    onClick={() => setSelected(a)}
                    className="text-left rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-600 transition focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                    title="Click to preview"
                  >
                    <div className="aspect-[3/4] bg-zinc-800 relative">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={a.answer_id}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 p-2">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-zinc-200 truncate" title={a.answer_id}>
                        {formatAnswerTitle(a.answer_id)}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5" title={a.answer_id}>
                        {a.answer_id}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950/95 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 truncate" title={selected.answer_id}>
                    {formatAnswerTitle(selected.answer_id)}
                  </div>
                  <div className="text-xs text-zinc-500 truncate" title={selected.answer_image}>
                    {selected.answer_image}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedOpenUrl && (
                    <a
                      href={selectedOpenUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-600 transition"
                    >
                      Open image
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteAnswer(selected)}
                    disabled={isDeleting}
                    className="rounded-md bg-rose-500 px-3 py-2 text-xs font-semibold text-black hover:bg-rose-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete answer"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-md bg-zinc-200 px-3 py-2 text-xs font-semibold text-black hover:bg-white transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="p-4 bg-black">
                {selectedOpenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedOpenUrl}
                    alt={selected.answer_id}
                    className="w-full max-h-[75vh] object-contain mx-auto"
                  />
                ) : (
                  <div className="text-sm text-zinc-400">Loading preview…</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
