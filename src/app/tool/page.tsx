"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const ACCESS_KEY = "ra_access_granted_v1";

type Problem = {
  id: string;
  src: string;
  alt: string;
  subject: string;
  title: string; // e.g. "2024 Sample Paper 1 Question 8"
  topic: string; // e.g. "Complex Numbers"
};

const problems: Problem[] = [
  {
    id: "further-maths-june-2023-paper-2-question-3",
    src: "/problems/further-maths-june-2023-paper-2-question-3.png",
    alt: "Further Maths June 2023 Paper 2 Question 3",
    subject: "Further Maths",
    title: "June 2023 Paper 2 Question 3",
    topic: "Matrices",
  },
  {
    id: "further-maths-june-2024-paper-1-question-5",
    src: "/problems/further-maths-june-2024-paper-1-question-5.png",
    alt: "Further Maths June 2024 Paper 1 Question 5",
    subject: "Further Maths",
    title: "June 2024 Paper 1 Question 5",
    topic: "Complex Numbers",
  },
  {
    id: "further-maths-june-2024-paper-1-question-8",
    src: "/problems/further-maths-june-2024-paper-1-question-8.png",
    alt: "Further Maths June 2024 Paper 1 Question 8",
    subject: "Further Maths",
    title: "June 2024 Paper 1 Question 8",
    topic: "Complex Numbers",
  },
  {
    id: "further-maths-sample-paper-1-question-2",
    src: "/problems/further-maths-sample-paper-1-question-2.png",
    alt: "Further Maths Sample Paper 1 Question 2",
    subject: "Further Maths",
    title: "2024 Sample Paper 1 Question 2",
    topic: "Vectors / Planes",
  },
  {
    id: "further-maths-sample-paper-1-question-3",
    src: "/problems/further-maths-sample-paper-1-question-3.png",
    alt: "Further Maths Sample Paper 1 Question 3",
    subject: "Further Maths",
    title: "2024 Sample Paper 1 Question 3",
    topic: "Matrices",
  },
  {
    id: "further-maths-sample-paper-1-question-8",
    src: "/problems/further-maths-sample-paper-1-question-8.png",
    alt: "Further Maths Sample Paper 1 Question 8",
    subject: "Further Maths",
    title: "2024 Sample Paper 1 Question 8",
    topic: "Complex Numbers",
  },
  {
    id: "further-maths-sample-paper-2-question-1",
    src: "/problems/further-maths-sample-paper-2-question-1.png",
    alt: "Further Maths Sample Paper 2 Question 1",
    subject: "Further Maths",
    title: "Sample Paper 2 Question 1",
    topic: "Cubic Equations / Roots",
  },
  {
    id: "further-maths-sample-paper-2-question-2",
    src: "/problems/further-maths-sample-paper-2-question-2.png",
    alt: "Further Maths Sample Paper 2 Question 2",
    subject: "Further Maths",
    title: "Sample Paper 2 Question 2",
    topic: "Induction / Divisibility",
  },
  {
    id: "further-maths-sample-paper-2-question-3",
    src: "/problems/further-maths-sample-paper-2-question-3.png",
    alt: "Further Maths Sample Paper 2 Question 3",
    subject: "Further Maths",
    title: "Sample Paper 2 Question 3",
    topic: "Matrix Transformations",
  },
  {
    id: "further-maths-sample-paper-2-question-4",
    src: "/problems/further-maths-sample-paper-2-question-4.png",
    alt: "Further Maths Sample Paper 2 Question 4",
    subject: "Further Maths",
    title: "Sample Paper 2 Question 4",
    topic: "Complex Numbers / Trig Identities",
  },
];

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getRandomProblem(excludeId?: string, topic?: string): Problem {
  let pool = problems.filter((p) => p.id !== excludeId);

  if (topic) {
    const sameTopic = pool.filter((p) => p.topic === topic);
    if (sameTopic.length > 0) {
      pool = sameTopic;
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

type Phase = "ready" | "running" | "stopped";

export default function ToolPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
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

  // Initial random problem
  useEffect(() => {
    setProblem(getRandomProblem());
  }, []);

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
      problem_id: problem.id,
      duration_seconds: durationSeconds,
      outcome,
    });

    const next =
      outcome === "solved"
        ? getRandomProblem(problem.id)
        : getRandomProblem(problem.id, problem.topic);

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
            {problem?.subject ?? "Further Maths"}
          </h1>
          <p className="text-lg text-zinc-300">
            {problem?.title ?? "Loading problem..."}
          </p>
        </div>

        {/* Problem card */}
        <div className="w-full flex items-center justify-center">
          {problem && (
            <div className="w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl">
              <Image
                src={problem.src}
                alt={problem.alt}
                width={1400}
                height={900}
                className="w-full h-auto object-contain rounded-xl"
                priority
              />
            </div>
          )}
        </div>

        {/* Controls depending on phase */}
        {phase === "ready" && (
          <button
            onClick={handleStart}
            disabled={!problem}
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

