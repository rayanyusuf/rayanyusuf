"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/tool";
  const err = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <SignInForm nextPath={nextPath} initialError={err === "auth" ? "auth" : undefined} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-400">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
