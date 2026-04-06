import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next.js 16+: use `proxy` (Node by default) instead of `middleware` (Edge) so Supabase auth fetch works. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/tool",
    "/tool/:path*",
    "/login",
    "/register",
    "/auth",
    "/auth/:path*",
  ],
};
