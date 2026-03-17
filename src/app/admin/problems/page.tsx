"use client";

import { useEffect, useState } from "react";
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
                  <div
                    key={p.problem_id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-zinc-600 transition"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
