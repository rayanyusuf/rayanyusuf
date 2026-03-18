import { NextResponse } from "next/server";

function timingSafeEqual(a: string, b: string) {
  // avoid early-return timing differences
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function POST(req: Request) {
  const envPassword = process.env.PASSWORD;
  if (!envPassword) {
    return NextResponse.json(
      { ok: false, error: "Missing PASSWORD env var on server." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const password = body?.password;
  if (!password || typeof password !== "string") {
    return NextResponse.json({ ok: false, error: "Missing password." }, { status: 400 });
  }

  const ok = timingSafeEqual(password, envPassword);
  return NextResponse.json({ ok });
}

