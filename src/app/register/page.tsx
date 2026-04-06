"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";

function RegisterContent() {
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextPath = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/tool";

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <SignUpForm nextPath={nextPath} />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black px-4 text-zinc-400">
          Loading…
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
