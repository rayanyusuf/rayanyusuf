import { NextResponse } from "next/server";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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

function readKeyFromEnvFile(envPath: string): string | undefined {
  const encodings: BufferEncoding[] = ["utf-8", "utf16le", "latin1"];
  for (const enc of encodings) {
    try {
      const content = readFileSync(envPath, { encoding: enc });
      const match = content.match(/sk-proj-\S+/);
      if (match) return match[0];
    } catch {
      // try next
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

const PROMPT = `The image is a cropped exam question. The question number is printed in the TOP-LEFT corner, like "1." or "4".
Return ONLY valid JSON: {"question": <integer>}
`;

export async function POST(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Set OPEN_AI_API_KEY in .env.local." },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageBase64 = body?.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "Missing imageBase64 in body." }, { status: 400 });
  }

  const url =
    imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 60,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `OpenAI error (${res.status}): ${text}` },
        { status: 500 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | { type: string; text?: string }[] } }[];
    };
    const raw = data?.choices?.[0]?.message?.content;
    const content =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? (raw.find((p) => p?.type === "text" && p?.text)?.text ?? "")
          : "";
    if (!content) return NextResponse.json({ error: "No response content." }, { status: 500 });

    const parsed = JSON.parse(String(content)) as { question?: number };
    const q = Number(parsed.question);
    if (!Number.isFinite(q) || q < 1 || q > 200) {
      return NextResponse.json({ error: "Invalid question number." }, { status: 500 });
    }
    return NextResponse.json({ question: q });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

