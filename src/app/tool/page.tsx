"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const ACCESS_KEY = "ra_access_granted_v1";
const PROBLEM_IMAGES_BUCKET = "problem-images";

type Problem = {
  problem_id: string;
  image_path: string;
  image_url: string;
};

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getRandomProblem(list: Problem[], excludeId?: string): Problem {
  const pool = excludeId ? list.filter((p) => p.problem_id !== excludeId) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatProblemTitle(problemId: string): string {
  const m = problemId.match(/Further-Maths-(\d{4})-paper-(\d+)-Question-(\d+)/i);
  if (!m) return problemId;
  const year = m[1];
  const paper = m[2];
  const q = m[3];
  return `${year} Paper ${paper} Question ${q}`;
}

type Phase = "ready" | "running" | "stopped";

export default function ToolPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [problemLoadError, setProblemLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Require access password (stored in localStorage)
  useEffect(() => {
    try {
      const allowed = window.localStorage.getItem(ACCESS_KEY) === "true";
      if (!allowed) {
        router.push("/");
        return;
      }
      setCheckingAuth(false);
    } catch {
      router.push("/");
    }
  }, [router]);

  // Load problems from Supabase (problems table + storage URLs)
  useEffect(() => {
    if (checkingAuth) return;

    const load = async () => {
      setLoadingProblems(true);
      setProblemLoadError(null);
      try {
        const { data, error } = await supabase
          .from("problems")
          .select("problem_id, problem_image, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw new Error(error.message);

        const rows =
          (data as { problem_id: string; problem_image: string }[] | null) ?? [];

        const withUrls: Problem[] = [];
        for (const r of rows) {
          // Prefer signed URL (works for private buckets); fallback to public URL
          const { data: signed } = await supabase.storage
            .from(PROBLEM_IMAGES_BUCKET)
            .createSignedUrl(r.problem_image, 60 * 60);
          const url =
            signed?.signedUrl ??
            supabase.storage.from(PROBLEM_IMAGES_BUCKET).getPublicUrl(r.problem_image).data.publicUrl;
          withUrls.push({
            problem_id: r.problem_id,
            image_path: r.problem_image,
            image_url: url,
          });
        }

        setProblems(withUrls);
        if (withUrls.length > 0) {
          setProblem(getRandomProblem(withUrls));
        } else {
          setProblem(null);
        }
      } catch (e) {
        setProblem(null);
        setProblems([]);
        setProblemLoadError(e instanceof Error ? e.message : "Failed to load problems.");
      } finally {
        setLoadingProblems(false);
      }
    };

    load();
  }, [checkingAuth]);

  // Timer effect
  useEffect(() => {
    if (phase !== "running") return;

    const start = performance.now() - elapsedMs;
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 200);

    return () => window.clearInterval(id);
  }, [phase, elapsedMs]);

  const handleStart = () => {
    if (!problem || phase !== "ready") return;
    setElapsedMs(0);
    setPhase("running");
  };

  const handleStop = () => {
    if (phase !== "running") return;
    setPhase("stopped");
  };

  const handleResult = async (outcome: "solved" | "couldnt_solve") => {
    if (!problem || phase !== "stopped") return;

    setIsSaving(true);
    const durationSeconds = Math.round(elapsedMs / 1000);

    await supabase.from("attempts_simple").insert({
      problem_id: problem.problem_id,
      duration_seconds: durationSeconds,
      outcome,
    });

    const next = getRandomProblem(problems, problem.problem_id);

    setProblem(next);
    setElapsedMs(0);
    setPhase("ready");
    setIsSaving(false);
  };

  return (
    <>
      {checkingAuth ? (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-sm text-zinc-300">Checking your account...</p>
        </div>
      ) : (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <main className="w-full max-w-3xl px-4 py-10 flex flex-col items-center gap-6">
        {/* Timer above title */}
        <div className="text-4xl font-mono font-semibold">
          {formatTime(elapsedMs)}
        </div>

        {/* Subject and paper info */}
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">
            {"Further Maths"}
          </h1>
          <p className="text-lg text-zinc-300">
            {loadingProblems
              ? "Loading problems..."
              : problem
                ? formatProblemTitle(problem.problem_id)
                : "No problems yet."}
          </p>
          {problemLoadError && (
            <p className="text-sm text-rose-300">{problemLoadError}</p>
          )}
        </div>

        {/* Problem card */}
        <div className="w-full flex items-center justify-center">
          {problem && (
            <div className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={problem.image_url}
                alt={problem.problem_id}
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Controls depending on phase */}
        {phase === "ready" && (
          <button
            onClick={handleStart}
            disabled={!problem || loadingProblems}
            className="mt-4 w-full max-w-2xl rounded-full bg-emerald-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Start
          </button>
        )}

        {phase === "running" && (
          <button
            onClick={handleStop}
            className="mt-4 w-full max-w-2xl rounded-full bg-amber-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-amber-300"
          >
            Stop timer
          </button>
        )}

        {phase === "stopped" && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full max-w-2xl justify-center">
            <button
              onClick={() => handleResult("solved")}
              disabled={isSaving}
              className="flex-1 rounded-full bg-emerald-400 px-4 py-3 text-lg font-semibold text-black shadow-md hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Got It Right"}
            </button>
            <button
              onClick={() => handleResult("couldnt_solve")}
              disabled={isSaving}
              className="flex-1 rounded-full bg-amber-400 px-4 py-3 text-lg font-semibold text-black shadow-md hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Didn’t Get It"}
            </button>
          </div>
        )}
      </main>
    </div>
      )}
    </>
  );
}

