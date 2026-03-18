"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/AdminSidebar";

const ADMIN_KEY = "ra_admin_access_v1";
const PROBLEM_IMAGES_BUCKET = "problem-images";

type ProblemRow = {
  problem_id: string;
  problem_image: string;
  created_at?: string;
};

export default function AdminProblemsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [problems, setProblems] = useState<ProblemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProblemRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedUrl = useMemo(() => {
    if (!selected) return null;
    const { data } = supabase.storage
      .from(PROBLEM_IMAGES_BUCKET)
      .getPublicUrl(selected.problem_image);
    return data.publicUrl;
  }, [selected]);

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
        .from("problems")
        .select("problem_id, problem_image, created_at")
        .order("created_at", { ascending: false });

      if (e) {
        setError(e.message);
        setProblems([]);
      } else {
        setProblems((data as ProblemRow[]) ?? []);
      }
      setLoading(false);
    };

    load();
  }, [checking]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const deleteProblem = async (p: ProblemRow) => {
    const ok = window.confirm(
      `Delete this problem?\n\n${p.problem_id}\n\nThis removes the DB row and the image from storage.`
    );
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      const { error: storageErr } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .remove([p.problem_image]);
      if (storageErr) throw new Error(storageErr.message);

      const { error: dbErr } = await supabase
        .from("problems")
        .delete()
        .eq("problem_id", p.problem_id);
      if (dbErr) throw new Error(dbErr.message);

      setProblems((prev) => prev.filter((x) => x.problem_id !== p.problem_id));
      setSelected((cur) => (cur?.problem_id === p.problem_id ? null : cur));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Problems
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Browse extracted problems saved from past papers.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading problems...</p>
          ) : problems.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              No problems yet. Extract and confirm problems from Past papers.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {problems.map((p) => {
                const { data } = supabase.storage
                  .from(PROBLEM_IMAGES_BUCKET)
                  .getPublicUrl(p.problem_image);
                return (
                  <button
                    key={p.problem_id}
                    type="button"
                    onClick={() => setSelected(p)}
                    className="text-left rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    title="Click to preview"
                  >
                    <div className="aspect-[3/4] bg-zinc-800 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.publicUrl}
                        alt={p.problem_id}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-zinc-200 truncate" title={p.problem_id}>
                        {p.problem_id}
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
                  <div className="text-sm font-semibold text-zinc-100 truncate" title={selected.problem_id}>
                    {selected.problem_id}
                  </div>
                  <div className="text-xs text-zinc-500 truncate" title={selected.problem_image}>
                    {selected.problem_image}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedUrl && (
                    <a
                      href={selectedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-600 transition"
                    >
                      Open image
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteProblem(selected)}
                    disabled={isDeleting}
                    className="rounded-md bg-rose-500 px-3 py-2 text-xs font-semibold text-black hover:bg-rose-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete problem"
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
                {selectedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedUrl}
                    alt={selected.problem_id}
                    className="w-full max-h-[75vh] object-contain mx-auto"
                  />
                ) : (
                  <div className="text-sm text-zinc-400">No preview URL.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
