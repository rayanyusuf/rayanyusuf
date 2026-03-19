import { NextResponse } from "next/server";
import { Resend } from "resend";

const SUBJECT = "You will get access soon";
const BODY_TEXT = "You will get access soon\n\n- Rayan Yusuf";
const BODY_HTML =
  "<p>You will get access soon</p><p style=\"margin-top:1em;\">– Rayan Yusuf</p>";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error("[leads/notify] RESEND_API_KEY is missing");
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required." }, { status: 400 });
  }

  /**
   * Must be a verified domain in Resend for real delivery.
   * Default `onboarding@resend.dev` only works for testing and often only sends to your Resend signup email.
   */
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject: SUBJECT,
    text: BODY_TEXT,
    html: BODY_HTML,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[leads/notify] Resend error:", error);
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Resend rejected the send.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
