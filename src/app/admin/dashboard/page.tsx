"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_KEY = "ra_admin_access_v1";

type NavItem = {
  id: string;
  label: string;
};

const navItems: NavItem[] = [
  { id: "past-papers", label: "Past papers" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState<NavItem["id"]>("past-papers");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<
    { path: string; name: string; url?: string }[]
  >([]);

  useEffect(() => {
    try {
      const ok = window.localStorage.getItem(ADMIN_KEY) === "true";
      if (!ok) {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    } catch {
      router.replace("/admin");
    }
  }, [router]);

  const logout = () => {
    try {
      window.localStorage.removeItem(ADMIN_KEY);
    } catch {
      // ignore
    }
    router.replace("/admin");
  };

  const uploadPdfs = async (files: File[]) => {
    setUploadError(null);

    const pdfs = files.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfs.length === 0) {
      setUploadError("Please drop PDF files only.");
      return;
    }

    setIsUploading(true);
    setUploadingCount(pdfs.length);

    try {
      const uploads = await Promise.allSettled(
        pdfs.map(async (file) => {
          const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
          // Add randomness so multiple files dropped at once never collide
          const random = Math.random().toString(16).slice(2);
          const path = `uploads/${Date.now()}-${random}-${safeName}`;

          const { error } = await supabase.storage
            .from("past-papers")
            .upload(path, file, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (error) {
            // Common Supabase errors here are permission/policy related.
            throw new Error(error.message);
          }

          const { data } = supabase.storage.from("past-papers").getPublicUrl(path);
          return { path, name: file.name, url: data.publicUrl };
        })
      );

      const successes = uploads
        .filter(
          (r): r is PromiseFulfilledResult<{ path: string; name: string; url?: string }> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value);

      const failures = uploads
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

      if (successes.length > 0) {
        setUploaded((prev) => [...successes, ...prev]);
      }

      if (failures.length > 0) {
        setUploadError(
          `Uploaded ${successes.length}/${pdfs.length}. Errors: ${failures.join(" | ")}`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setUploadError(
        `${msg} (If this says 'not allowed' or similar, you need a Supabase Storage policy that allows uploads to the 'past-papers' bucket.)`
      );
    } finally {
      setIsUploading(false);
      setUploadingCount(0);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (active !== "past-papers") return;

    const files = Array.from(e.dataTransfer.files ?? []);
    await uploadPdfs(files);
  };

  const handleChooseFiles = () => {
    if (active !== "past-papers") return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    if (active !== "past-papers") return;
    const files = Array.from(e.target.files ?? []);
    // allow re-selecting the same file later
    e.target.value = "";
    await uploadPdfs(files);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-300">Loading admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left menu */}
      <aside className="w-28 sm:w-40 bg-zinc-200 text-black flex flex-col py-4 px-3">
        <div className="flex-1 w-full flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full rounded-md transition flex items-center gap-3 px-2 py-2 ${
                  isActive ? "bg-zinc-400" : "bg-zinc-300 hover:bg-zinc-400"
                }`}
                aria-label={item.label}
                title={item.label}
              >
                <span className="h-8 w-8 rounded bg-zinc-500/60 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="w-full rounded-md bg-orange-500 hover:bg-orange-400 transition flex items-center gap-3 px-2 py-2 mt-2"
          aria-label="Logout"
          title="Logout"
        >
          <span className="h-8 w-8 rounded bg-black/20 shrink-0" />
          <span className="text-sm font-semibold">Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 p-8"
        onDragEnter={(e) => {
          if (active !== "past-papers") return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          if (active !== "past-papers") return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (active !== "past-papers") return;
          e.preventDefault();
          // Only clear if leaving the whole panel, not moving between children
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        {active === "past-papers" ? (
          <div className="h-full min-h-[70vh] rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 relative overflow-hidden">
            <div className="flex items-baseline justify-between gap-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Past papers
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Drag and drop PDF files anywhere in this panel to upload them.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <button
                  type="button"
                  onClick={handleChooseFiles}
                  disabled={isUploading}
                  className="rounded-md bg-zinc-200 px-3 py-2 text-xs font-semibold text-black hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Choose files
                </button>
                <div className="text-sm text-zinc-300 min-w-[12ch] text-right">
                  {isUploading ? `Uploading ${uploadingCount}...` : null}
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {uploadError}
              </div>
            )}

            <div className="mt-6">
              {uploaded.length > 0 ? (
                <div className="space-y-2">
                  {uploaded.map((u) => (
                    <div
                      key={u.path}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/30 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {u.name}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          {u.path}
                        </div>
                      </div>
                      {u.url ? (
                        <a
                          href={u.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-md bg-zinc-200 px-3 py-2 text-xs font-semibold text-black hover:bg-white transition"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-10 text-center text-zinc-500">
                  Drop PDFs here to upload.
                </div>
              )}
            </div>

            {/* Drag overlay */}
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-500/10 border-2 border-emerald-400 rounded-2xl">
                <div className="text-center">
                  <div className="text-2xl font-semibold">Drop your PDFs</div>
                  <div className="mt-2 text-sm text-zinc-200">
                    Upload past papers to your library
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight capitalize">
              {active}
            </h1>
          </div>
        )}
      </main>
    </div>
  );
}

