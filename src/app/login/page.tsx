import { SignInForm } from "@/components/auth/SignInForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const nextPath = typeof p.next === "string" && p.next.startsWith("/") ? p.next : "/tool";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <SignInForm nextPath={nextPath} initialError={p.error} />
    </div>
  );
}
