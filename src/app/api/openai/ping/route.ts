import { NextResponse } from "next/server";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/** Try to get project root: cwd first, then from this file's location. */
function getProjectRoots(): string[] {
  const roots = [process.cwd()];
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    roots.push(path.resolve(dir, "..", "..", "..", "..", ".."));
  } catch {
    // ignore
  }
  return [...new Set(roots)];
}

function getApiKey(): string | undefined {
  let apiKey = process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (apiKey) return apiKey;
  // Next.js may not load .env.local in some setups; load it with dotenv
  for (const root of getProjectRoots()) {
    const envPath = path.join(root, ".env.local");
    if (!existsSync(envPath)) continue;
    const result = dotenv.config({ path: envPath });
    const parsed = result.parsed as Record<string, string> | undefined;
    apiKey = parsed?.OPEN_AI_API_KEY ?? parsed?.OPENAI_API_KEY;
    if (apiKey) return apiKey;
  }
  return undefined;
}

/** Returns diagnostic info when key is missing (no secret values). */
function getDebug(): Record<string, unknown> {
  const roots = getProjectRoots();
  const tried = roots.map((root) => {
    const envPath = path.join(root, ".env.local");
    const fileExists = existsSync(envPath);
    let hasKey = false;
    let parseError: string | undefined;
    if (fileExists) {
      try {
        const result = dotenv.config({ path: envPath });
        const p = result.parsed as Record<string, string> | undefined;
        hasKey = !!(p?.OPEN_AI_API_KEY ?? p?.OPENAI_API_KEY);
      } catch (e) {
        parseError = String(e);
      }
    }
    return { root, envPath, fileExists, hasKey, parseError };
  });
  return { envSet: !!process.env.OPEN_AI_API_KEY, tried };
}

export async function GET() {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing API key. Set OPEN_AI_API_KEY in .env.local.",
        debug: getDebug(),
      },
      { status: 500 }
    );
  }

  try {
    // Lightweight request just to verify the key works.
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: `OpenAI request failed (${res.status}). ${text}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

