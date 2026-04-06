"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  TOOL_SUBJECTS,
  type SubjectSlug,
  candidateAnswerIds,
  formatProblemTitle,
  problemMatchesSubject,
} from "@/lib/toolSubjects";

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

type Phase = "ready" | "running" | "stopped";

export default function ToolPage() {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement | null>(null);
  /** Default Further Maths: matches current `Further-Maths-*` ids in the DB. */
  const [activeSubject, setActiveSubject] = useState<SubjectSlug>("further-maths");
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [problemLoadError, setProblemLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  /** Set when `getSession` fails (network / Supabase down) so we don't spin forever or leave an unhandled rejection. */
  const [authFetchError, setAuthFetchError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  type AttemptRow = { problem_id: string; outcome: string; created_at?: string };
  const [attemptedList, setAttemptedList] = useState<AttemptRow[]>([]);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [answerImageUrl, setAnswerImageUrl] = useState<string | null>(null);
  const [answerNotice, setAnswerNotice] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  const subjectProblems = useMemo(
    () => allProblems.filter((p) => problemMatchesSubject(p.problem_id, activeSubject)),
    [allProblems, activeSubject]
  );

  const subjectLabel = useMemo(
    () => TOOL_SUBJECTS.find((s) => s.slug === activeSubject)?.label ?? "Practice",
    [activeSubject]
  );

  const attemptedForSubject = useMemo(
    () => attemptedList.filter((a) => problemMatchesSubject(a.problem_id, activeSubject)),
    [attemptedList, activeSubject]
  );

  const resetAnswerState = useCallback(() => {
    setAnswerRevealed(false);
    setAnswerImageUrl(null);
    setAnswerNotice(null);
    setAnswerLoading(false);
  }, []);

  const pickProblemForSubject = useCallback(
    (slug: SubjectSlug, list: Problem[], excludeId?: string) => {
      const pool = list.filter((p) => problemMatchesSubject(p.problem_id, slug));
      if (pool.length === 0) return null;
      return getRandomProblem(pool, excludeId);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setAuthFetchError(null);
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (cancelled) return;
        if (error) {
          setAuthFetchError(error.message || "Could not verify your session.");
          setCheckingAuth(false);
          return;
        }
        if (!session) {
          router.replace("/login?next=/tool");
          return;
        }
        setUserEmail(session.user?.email ?? null);
        setUserId(session.user?.id ?? null);
        setCheckingAuth(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg =
          e instanceof Error && e.message === "Failed to fetch"
            ? "Network error: could not reach sign-in (check connection, VPN, or ad blockers)."
            : e instanceof Error
              ? e.message
              : "Could not reach sign-in service.";
        setAuthFetchError(msg);
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

        setAllProblems(withUrls);
      } catch (e) {
        setAllProblems([]);
        setProblemLoadError(e instanceof Error ? e.message : "Failed to load problems.");
      } finally {
        setLoadingProblems(false);
      }
    };

    load();
  }, [checkingAuth]);

  // When subject changes or full list loads: reset drill state and pick a problem in this subject
  useEffect(() => {
    if (checkingAuth || loadingProblems) return;
    setPhase("ready");
    setElapsedMs(0);
    resetAnswerState();
    const next = pickProblemForSubject(activeSubject, allProblems);
    setProblem(next);
  }, [activeSubject, allProblems, checkingAuth, loadingProblems, pickProblemForSubject, resetAnswerState]);

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

    const next = pickProblemForSubject(activeSubject, allProblems, problem.problem_id);

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

  const retryAuthCheck = () => {
    setAuthFetchError(null);
    setCheckingAuth(true);
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setAuthFetchError(error.message || "Could not verify your session.");
          setCheckingAuth(false);
          return;
        }
        if (!session) {
          router.replace("/login?next=/tool");
          return;
        }
        setUserEmail(session.user?.email ?? null);
        setUserId(session.user?.id ?? null);
        setCheckingAuth(false);
      })
      .catch((e) => {
        const msg =
          e instanceof Error && e.message === "Failed to fetch"
            ? "Network error: could not reach sign-in (check connection, VPN, or ad blockers)."
            : e instanceof Error
              ? e.message
              : "Could not reach sign-in service.";
        setAuthFetchError(msg);
        setCheckingAuth(false);
      });
  };

  return (
    <>
      {authFetchError ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
          <p className="max-w-md text-sm text-zinc-300">{authFetchError}</p>
          <button
            type="button"
            onClick={retryAuthCheck}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Try again
          </button>
        </div>
      ) : checkingAuth ? (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-sm text-zinc-300">Checking your account...</p>
        </div>
      ) : (
        <div className="flex min-h-screen flex-col bg-black text-white">
          {/* Subject tabs */}
          <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 sm:px-4">
              <span className="mr-2 hidden text-xs font-medium uppercase tracking-wider text-zinc-500 sm:inline">
                Subject
              </span>
              {TOOL_SUBJECTS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setActiveSubject(s.slug)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    activeSubject === s.slug
                      ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
                      : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                  }`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80">
              <div className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Logged in as</p>
                <p className="mt-1 truncate text-sm text-zinc-200" title={userEmail ?? undefined}>
                  {userEmail ?? "—"}
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800">
                <p className="border-b border-zinc-800 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Attempted ({subjectLabel})
                </p>
                <ul className="flex-1 overflow-y-auto px-2 py-2">
                  {attemptedForSubject.length === 0 ? (
                    <li className="py-3 text-center text-xs text-zinc-500">None yet</li>
                  ) : (
                    attemptedForSubject.map((a, i) => (
                      <li
                        key={a.created_at ? `${a.problem_id}-${a.created_at}` : `attempt-${i}`}
                        className="border-b border-zinc-800/80 py-2 last:border-0"
                      >
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

            <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
              <div className="flex w-full max-w-3xl flex-col items-center gap-6">
                <div className="text-4xl font-mono font-semibold">{formatTime(elapsedMs)}</div>

                <div className="space-y-1 text-center">
                  <h1 className="text-4xl font-bold tracking-tight">{subjectLabel}</h1>
                  <p className="text-lg text-zinc-300">
                    {loadingProblems
                      ? "Loading problems..."
                      : problem
                        ? formatProblemTitle(problem.problem_id)
                        : subjectProblems.length === 0
                          ? "No problems for this subject yet."
                          : "No problems yet."}
                  </p>
                  {problemLoadError && <p className="text-sm text-rose-300">{problemLoadError}</p>}
                </div>

                <div className="flex w-full items-center justify-center">
                  {problem && (
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl">
                      {phase === "stopped" && answerRevealed && answerImageUrl && (
                        <p className="mb-2 text-center text-sm font-semibold text-zinc-700">Answer</p>
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
                          className="w-full h-auto rounded-xl object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div ref={actionsRef} className="flex w-full max-w-2xl flex-col gap-4">
                  {phase === "ready" && (
                    <button
                      onClick={handleStart}
                      disabled={!problem || loadingProblems}
                      className="w-full rounded-full bg-emerald-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
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
                      className="w-full rounded-full bg-sky-400 px-6 py-4 text-xl font-semibold text-black shadow-lg hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {answerLoading ? "Loading…" : "Show Answer"}
                    </button>
                  )}

                  {phase === "stopped" && answerRevealed && (
                    <div className="flex w-full flex-col gap-4">
                      {problem?.solution_video_url && (
                        <a
                          href={problem.solution_video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-red-600 px-6 py-3 text-center text-lg font-semibold text-white shadow-md transition hover:bg-red-500"
                        >
                          Watch solution video
                        </a>
                      )}
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <button
                          onClick={() => handleResult("solved")}
                          disabled={isSaving}
                          className="flex-1 rounded-full bg-emerald-400 px-4 py-3 text-lg font-semibold text-black shadow-md hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Got It Right"}
                        </button>
                        <button
                          onClick={() => handleResult("couldnt_solve")}
                          disabled={isSaving}
                          className="flex-1 rounded-full bg-amber-400 px-4 py-3 text-lg font-semibold text-black shadow-md hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>
      )}
    </>
  );
}
