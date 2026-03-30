import { redirect } from "next/navigation";

/** Old URL: send people to /login */
export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const q = new URLSearchParams();
  if (typeof p.next === "string" && p.next.startsWith("/")) q.set("next", p.next);
  if (p.error) q.set("error", p.error);
  const suffix = q.toString();
  redirect(suffix ? `/login?${suffix}` : "/login");
}
