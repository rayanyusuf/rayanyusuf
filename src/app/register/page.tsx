import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const p = await searchParams;
  const nextPath = typeof p.next === "string" && p.next.startsWith("/") ? p.next : "/tool";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <SignUpForm nextPath={nextPath} />
    </div>
  );
}
