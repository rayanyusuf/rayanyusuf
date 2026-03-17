import { NextResponse } from "next/server";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/** Try to get project root: cwd first, then from this file's location (various bundle depths). */
function getProjectRoots(): string[] {
  const roots = [process.cwd()];
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    for (let up = 4; up <= 8; up++) {
      const parts = Array(up).fill("..");
      roots.push(path.resolve(dir, ...parts));
    }
  } catch {
    // ignore
  }
  return [...new Set(roots)];
}

/** Last resort: find OpenAI key (sk-proj-...) in .env.local, try multiple encodings. */
function readKeyFromEnvFile(envPath: string): string | undefined {
  const encodings: BufferEncoding[] = ["utf-8", "utf16le", "latin1"];
  for (const enc of encodings) {
    try {
      let content: string;
      if (enc === "utf-8") {
        content = readFileSync(envPath, "utf-8");
      } else {
        content = readFileSync(envPath, { encoding: enc });
      }
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
      const match = content.match(/sk-proj-\S+/);
      if (match) return match[0];
    } catch {
      // try next encoding
    }
  }
  return undefined;
}

function getApiKey(): string | undefined {
  let apiKey = process.env.OPEN_AI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (apiKey) return apiKey;
  for (const root of getProjectRoots()) {
    const envPath = path.join(root, ".env.local");
    if (!existsSync(envPath)) continue;
    const result = dotenv.config({ path: envPath });
    const parsed = result.parsed as Record<string, string> | undefined;
    apiKey = parsed?.OPEN_AI_API_KEY ?? parsed?.OPENAI_API_KEY;
    if (apiKey) return apiKey;
    apiKey = readKeyFromEnvFile(envPath);
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

