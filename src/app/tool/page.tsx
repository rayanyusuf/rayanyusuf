"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
const PROBLEM_IMAGES_BUCKET = "problem-images";

type Problem = {
  problem_id: string;
  image_path: string;
  image_url: string;
  solution_video_url: string | null;
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

/** Match `answers.answer_id` to `problems.problem_id` (exact + legacy naming). */
function candidateAnswerIds(problemId: string): string[] {
  const out = new Set<string>();
  const t = problemId.trim();
  out.add(t);
  const m = t.match(/^Further-Maths-(\d{4})-paper-(\d+)-Question-(\d+)$/i);
  if (m) {
    const y = m[1]!;
    const p = m[2]!;
    const q = m[3]!;
    out.add(`Further-Maths-${y}-paper-${p}-Question-${q}`);
    out.add(`Further-Maths-${y}-Answers-${p}-Question-${q}`);
  }
  return [...out];
}

type Phase = "ready" | "running" | "stopped";

export default function ToolPage() {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [problemLoadError, setProblemLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  type AttemptRow = { problem_id: string; outcome: string; created_at?: string };
  const [attemptedList, setAttemptedList] = useState<AttemptRow[]>([]);
  /** User tapped "Show Answer" (loads answer into main card). */
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [answerImageUrl, setAnswerImageUrl] = useState<string | null>(null);
  const [answerNotice, setAnswerNotice] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        router.replace("/auth?next=/tool");
        return;
      }
      setUserEmail(session.user?.email ?? null);
      setUserId(session.user?.id ?? null);
      setCheckingAuth(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.replace("/");
  };

  useEffect(() => {
    if (checkingAuth) return;

    const load = async () => {
      setLoadingProblems(true);
      setProblemLoadError(null);
      try {
        const { data, error } = await supabase
          .from("problems")
          .select("problem_id, problem_image, solution_video_url, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw new Error(error.message);

        const rows =
          (data as { problem_id: string; problem_image: string; solution_video_url: string | null }[] | null) ?? [];

        const withUrls: Problem[] = [];
        for (const r of rows) {
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
            solution_video_url: r.solution_video_url ?? null,
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

  // Load this user's attempted problems for the sidebar
  useEffect(() => {
    if (!userId) return;
    const loadAttempts = async () => {
      const { data, error } = await supabase
        .from("attempts_simple")
        .select("problem_id, outcome, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error) setAttemptedList((data as AttemptRow[]) ?? []);
    };
    loadAttempts();
  }, [userId]);

  // Refetch attempted list after saving an attempt (so new attempt appears in sidebar)
  const refreshAttemptedList = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("attempts_simple")
      .select("problem_id, outcome, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setAttemptedList((data as AttemptRow[]) ?? []);
  };

  useEffect(() => {
    if (phase !== "running") return;

    const start = performance.now() - elapsedMs;
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 200);

    return () => window.clearInterval(id);
  }, [phase, elapsedMs]);

  const resetAnswerState = () => {
    setAnswerRevealed(false);
    setAnswerImageUrl(null);
    setAnswerNotice(null);
    setAnswerLoading(false);
  };

  const handleStart = () => {
    if (!problem || phase !== "ready") return;
    setElapsedMs(0);
    resetAnswerState();
    setPhase("running");
  };

  const handleStop = () => {
    if (phase !== "running") return;
    resetAnswerState();
    setPhase("stopped");
  };

  useEffect(() => {
    if (phase !== "stopped") return;
    const t = window.setTimeout(() => {
      actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleShowAnswer = async () => {
    if (!problem || phase !== "stopped") return;
    setAnswerLoading(true);
    setAnswerNotice(null);
    setAnswerImageUrl(null);
    try {
      const ids = candidateAnswerIds(problem.problem_id);
      const { data, error } = await supabase
        .from("answers")
        .select("answer_image")
        .in("answer_id", ids)
        .limit(5);

      if (error) throw new Error(error.message);
      const row = data?.[0] as { answer_image: string } | undefined;
      if (!row?.answer_image) {
        setAnswerNotice("No answer on file for this question yet.");
        setAnswerRevealed(true);
        return;
      }

      const { data: signed } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .createSignedUrl(row.answer_image, 60 * 60);
      const url =
        signed?.signedUrl ??
        supabase.storage.from(PROBLEM_IMAGES_BUCKET).getPublicUrl(row.answer_image).data.publicUrl;
      setAnswerImageUrl(url);
      setAnswerRevealed(true);
    } catch (e) {
      setAnswerNotice(e instanceof Error ? e.message : "Could not load answer.");
      setAnswerRevealed(true);
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleResult = async (outcome: "solved" | "couldnt_solve") => {
    if (!problem || phase !== "stopped" || !answerRevealed || !userId) return;

    setIsSaving(true);
    const durationSeconds = Math.round(elapsedMs / 1000);

    await supabase.from("attempts_simple").insert({
      problem_id: problem.problem_id,
      duration_seconds: durationSeconds,
      outcome,
      user_id: userId,
    });

    await refreshAttemptedList();

    const next = getRandomProblem(problems, problem.problem_id);

    setProblem(next);
    setElapsedMs(0);
    resetAnswerState();
    setPhase("ready");
    setIsSaving(false);
  };

  const showAnswerInCard =
    phase === "stopped" && answerRevealed && answerImageUrl !== null;
  const cardImageSrc = showAnswerInCard ? answerImageUrl! : problem?.image_url ?? "";
  const cardAlt = showAnswerInCard ? "Answer" : problem?.problem_id ?? "";

  return (
    <>
      {checkingAuth ? (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-sm text-zinc-300">Checking your account...</p>
        </div>
      ) : (
        <div className="min-h-screen bg-black text-white flex">
          {/* Left sidebar: email + logout */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80">
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Logged in as</p>
              <p className="mt-1 truncate text-sm text-zinc-200" title={userEmail ?? undefined}>
                {userEmail ?? "—"}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800">
              <p className="border-b border-zinc-800 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Attempted
              </p>
              <ul className="flex-1 overflow-y-auto px-2 py-2">
                {attemptedList.length === 0 ? (
                  <li className="py-3 text-center text-xs text-zinc-500">None yet</li>
                ) : (
                  attemptedList.map((a, i) => (
                    <li key={a.created_at ? `${a.problem_id}-${a.created_at}` : `attempt-${i}`} className="border-b border-zinc-800/80 py-2 last:border-0">
                      <p className="truncate text-sm text-zinc-200" title={a.problem_id}>
                        {formatProblemTitle(a.problem_id)}
                      </p>
                      <span
                        className={`mt-0.5 inline-block text-xs ${
                          a.outcome === "solved" ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {a.outcome === "solved" ? "Got it" : "Didn't get it"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="border-t border-zinc-800 p-4">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
              >
                Log out
              </button>
            </div>
          </aside>

          <main className="min-h-screen flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-3xl flex flex-col items-center gap-6">
            <div className="text-4xl font-mono font-semibold">{formatTime(elapsedMs)}</div>

            <div className="text-center space-y-1">
              <h1 className="text-4xl font-bold tracking-tight">Further Maths</h1>
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

            {/* Main card: question PNG, then swaps to answer PNG after "Show Answer" */}
            <div className="w-full flex items-center justify-center">
              {problem && (
                <div className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl">
                  {phase === "stopped" && answerRevealed && answerImageUrl && (
                    <p className="text-center text-sm font-semibold text-zinc-700 mb-2">Answer</p>
                  )}
                  {phase === "stopped" && answerRevealed && answerNotice && !answerImageUrl ? (
                    <div className="rounded-xl bg-zinc-100 px-4 py-8 text-center text-sm text-zinc-700">
                      {answerNotice}
                      <p className="mt-3 text-xs text-zinc-500">
                        You can still record how you did below.
                      </p>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cardImageSrc}
                      alt={cardAlt}
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  )}
                </div>
              )}
            </div>

            <div ref={actionsRef} className="w-full max-w-2xl flex flex-col gap-4">
              {phase === "ready" && (
                <button
                  onClick={handleStart}
                  disabled={!problem || loadingProblems}
                  className="w-full rounded-full bg-emerald-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Start
                </button>
              )}

              {phase === "running" && (
                <button
                  onClick={handleStop}
                  className="w-full rounded-full bg-amber-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-amber-300"
                >
                  Stop timer
                </button>
              )}

              {phase === "stopped" && !answerRevealed && (
                <button
                  type="button"
                  onClick={() => void handleShowAnswer()}
                  disabled={answerLoading || !problem}
                  className="w-full rounded-full bg-sky-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-sky-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {answerLoading ? "Loading…" : "Show Answer"}
                </button>
              )}

              {phase === "stopped" && answerRevealed && (
                <div className="w-full flex flex-col gap-4">
                  {problem?.solution_video_url && (
                    <a
                      href={problem.solution_video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-red-600 px-6 py-3 text-center text-lg font-semibold text-white shadow-md hover:bg-red-500 transition"
                    >
                      Watch solution video
                    </a>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4">
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
                      {isSaving ? "Saving..." : "Didn't Get It"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </main>
        </div>
      )}
    </>
  );
}
