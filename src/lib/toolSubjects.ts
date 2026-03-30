/** URL-safe slugs for the practice tool */
export type SubjectSlug = "math" | "further-maths" | "physics" | "chemistry";

export type ToolSubject = {
  slug: SubjectSlug;
  label: string;
  /** Short label for tabs */
  shortLabel: string;
};

export const TOOL_SUBJECTS: ToolSubject[] = [
  { slug: "math", label: "Math", shortLabel: "Math" },
  { slug: "further-maths", label: "Further Maths", shortLabel: "Further Maths" },
  { slug: "physics", label: "Physics", shortLabel: "Physics" },
  { slug: "chemistry", label: "Chemistry", shortLabel: "Chemistry" },
];

export function isSubjectSlug(s: string): s is SubjectSlug {
  return TOOL_SUBJECTS.some((x) => x.slug === s);
}

/**
 * Map a problem_id to a subject tab. Convention: prefix before year, e.g.
 * Further-Maths-2024-paper-1-Question-3, Physics-2023-paper-2-Question-1.
 * Unknown / legacy ids fall into Math.
 */
export function inferSubjectFromProblemId(problemId: string): SubjectSlug {
  const t = problemId.trim();
  if (/^Further-Maths/i.test(t)) return "further-maths";
  if (/^Physics/i.test(t)) return "physics";
  if (/^Chemistry/i.test(t)) return "chemistry";
  if (/^Math(?:ematics)?-/i.test(t)) return "math";
  return "math";
}

export function problemMatchesSubject(problemId: string, slug: SubjectSlug): boolean {
  return inferSubjectFromProblemId(problemId) === slug;
}

/** Human-readable title from common id patterns */
export function formatProblemTitle(problemId: string): string {
  const m = problemId.match(/(\d{4})[-_]paper[-_](\d+)[-_]Question[-_](\d+)/i);
  if (m) {
    return `${m[1]} Paper ${m[2]} Question ${m[3]}`;
  }
  return problemId;
}

/**
 * Match `answers.answer_id` to `problems.problem_id` (paper + Answers variants).
 */
export function candidateAnswerIds(problemId: string): string[] {
  const out = new Set<string>();
  const t = problemId.trim();
  out.add(t);
  const m = t.match(/^(.+)-(\d{4})-paper-(\d+)-Question-(\d+)$/i);
  if (m) {
    const prefix = m[1]!;
    const y = m[2]!;
    const p = m[3]!;
    const q = m[4]!;
    out.add(`${prefix}-${y}-paper-${p}-Question-${q}`);
    out.add(`${prefix}-${y}-Answers-${p}-Question-${q}`);
  }
  return [...out];
}
