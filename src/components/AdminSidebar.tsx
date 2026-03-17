"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_KEY = "ra_admin_access_v1";

const navItems = [
  { href: "/admin/dashboard", label: "Past papers" },
  { href: "/admin/problems", label: "Problems" },
] as const;

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const logout = () => {
    try {
      window.localStorage.removeItem(ADMIN_KEY);
    } catch {
      // ignore
    }
    router.replace("/admin");
  };

  return (
    <aside className="w-20 sm:w-32 bg-zinc-200 text-black flex flex-col py-4 px-2 shrink-0">
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md transition flex items-center gap-2 px-2 py-2 ${
                isActive ? "bg-zinc-400 text-black" : "text-zinc-800 hover:bg-zinc-300 hover:text-black"
              }`}
              title={item.label}
            >
              <span className="w-6 h-6 rounded bg-zinc-500/60 shrink-0" aria-hidden />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="w-full rounded-md bg-orange-500 hover:bg-orange-400 transition flex items-center gap-2 px-2 py-2 mt-2"
        aria-label="Logout"
        title="Logout"
      >
        <span className="w-6 h-6 rounded bg-black/20 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">Logout</span>
      </button>
    </aside>
  );
}
