"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = new URLSearchParams();
    const next = searchParams.get("next");
    if (next?.startsWith("/")) q.set("next", next);
    const err = searchParams.get("error");
    if (err) q.set("error", err);
    const suffix = q.toString();
    router.replace(suffix ? `/login?${suffix}` : "/login");
  }, [router, searchParams]);

  return null;
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthRedirectInner />
    </Suspense>
  );
}
