"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_KEY = "ra_admin_access_v1";
const PAST_PAPERS_BUCKET = "past-papers";

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
  const [papers, setPapers] = useState<{ path: string; name: string }[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{
    page: number;
    total: number;
  } | null>(null);
  const [pages, setPages] = useState<
    { pageNumber: number; path: string; url?: string }[]
  >([]);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);

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

  // Load list of uploaded PDFs from storage
  useEffect(() => {
    if (active !== "past-papers") return;

    const load = async () => {
      const { data, error } = await supabase.storage
        .from(PAST_PAPERS_BUCKET)
        .list("uploads", { limit: 100, offset: 0, sortBy: { column: "name", order: "desc" } });

      if (error) return;
      const pdfs =
        data
          ?.filter((o) => o.name.toLowerCase().endsWith(".pdf"))
          .map((o) => ({ name: o.name, path: `uploads/${o.name}` })) ?? [];

      setPapers(pdfs);
    };

    load();
  }, [active]);

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
      const uploads = await Promise.allSettled<
        { path: string; name: string; url?: string }
      >(
        pdfs.map(async (file) => {
          const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
          // Add randomness so multiple files dropped at once never collide
          const random = Math.random().toString(16).slice(2);
          const path = `uploads/${Date.now()}-${random}-${safeName}`;

          const { error } = await supabase.storage
            .from(PAST_PAPERS_BUCKET)
            .upload(path, file, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (error) {
            // Common Supabase errors here are permission/policy related.
            throw new Error(error.message);
          }

          const { data } = supabase.storage.from(PAST_PAPERS_BUCKET).getPublicUrl(path);
          return { path, name: file.name, url: data.publicUrl };
        })
      );

      const successes = uploads
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<{ path: string; name: string; url?: string }>).value);

      const failures = uploads
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));

      if (successes.length > 0) {
        setUploaded((prev) => [...successes, ...prev]);
        setPapers((prev) => [
          ...successes.map((s) => ({ name: s.name, path: s.path })),
          ...prev,
        ]);
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

  const convertSelectedPdfToPngs = async () => {
    if (!selectedPaper) return;

    setUploadError(null);
    setIsConverting(true);
    setConvertProgress(null);
    setPages([]);
    setSelectedPageUrl(null);

    try {
      const { data: blob, error } = await supabase.storage
        .from(PAST_PAPERS_BUCKET)
        .download(selectedPaper.path);

      if (error || !blob) {
        throw new Error(error?.message ?? "Failed to download PDF.");
      }

      const arrayBuffer = await blob.arrayBuffer();

      // Dynamic import to keep initial bundle light.
      const pdfjs = await import("pdfjs-dist");
      const { GlobalWorkerOptions, getDocument } = pdfjs;
      // Serve worker from our own public folder so it always resolves.
      GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

      // @ts-expect-error - getDocument typing
      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const totalPages: number = pdf.numPages;
      const paperBase = selectedPaper.name.replace(/\.pdf$/i, "");

      const generated: { pageNumber: number; path: string; url?: string }[] = [];

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        setConvertProgress({ page: pageNumber, total: totalPages });

        // @ts-expect-error pdfjs typing
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas not supported.");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // @ts-expect-error pdfjs typing
        await page.render({ canvasContext: context, viewport }).promise;

        const pngBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG conversion failed."))), "image/png");
        });

        const path = `pages/${paperBase}/page-${String(pageNumber).padStart(3, "0")}.png`;

        const { error: uploadErr } = await supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .upload(path, pngBlob, { contentType: "image/png", upsert: true });

        if (uploadErr) {
          throw new Error(uploadErr.message);
        }

        const { data: publicData } = supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .getPublicUrl(path);

        generated.push({ pageNumber, path, url: publicData.publicUrl });
      }

      setPages(generated);
      if (generated[0]?.url) setSelectedPageUrl(generated[0].url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed.";
      setUploadError(msg);
    } finally {
      setIsConverting(false);
      setConvertProgress(null);
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
                  Upload PDFs, then convert pages to PNGs to browse them.
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

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: PDF list */}
              <div className="lg:col-span-1">
                <div className="text-sm font-semibold text-zinc-200 mb-2">
                  Uploaded PDFs
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
                  {papers.length > 0 ? (
                    papers.map((p) => {
                      const isSelected = selectedPaper?.path === p.path;
                      return (
                        <button
                          key={p.path}
                          onClick={() => setSelectedPaper(p)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-500/10"
                              : "border-zinc-800 bg-black/30 hover:bg-black/40"
                          }`}
                        >
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="truncate text-xs text-zinc-500">{p.path}</div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-zinc-500">
                      No PDFs yet. Upload one above.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={convertSelectedPdfToPngs}
                  disabled={!selectedPaper || isConverting}
                  className="mt-3 w-full rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isConverting
                    ? convertProgress
                      ? `Converting ${convertProgress.page}/${convertProgress.total}...`
                      : "Converting..."
                    : "Convert selected PDF to PNGs"}
                </button>
                <p className="mt-2 text-xs text-zinc-500">
                  Pages upload to `{PAST_PAPERS_BUCKET}/pages/...`
                </p>
              </div>

              {/* Right: Page browser */}
              <div className="lg:col-span-2">
                <div className="text-sm font-semibold text-zinc-200 mb-2">
                  Pages
                </div>

                {pages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Thumbnails */}
                    <div className="md:col-span-1 max-h-[55vh] overflow-auto pr-1 space-y-2">
                      {pages.map((pg) => (
                        <button
                          key={pg.path}
                          onClick={() => setSelectedPageUrl(pg.url ?? null)}
                          className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                            selectedPageUrl === pg.url
                              ? "border-emerald-400 bg-emerald-500/10"
                              : "border-zinc-800 bg-black/30 hover:bg-black/40"
                          }`}
                        >
                          <div className="text-xs text-zinc-300 mb-2">
                            Page {pg.pageNumber}
                          </div>
                          {pg.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pg.url}
                              alt={`Page ${pg.pageNumber}`}
                              className="w-full h-auto rounded-md"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-xs text-zinc-500">No preview URL</div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Large preview */}
                    <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-black/30 p-3 flex items-center justify-center min-h-[55vh]">
                      {selectedPageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedPageUrl}
                          alt="Selected page"
                          className="max-h-[52vh] w-auto object-contain rounded-lg"
                        />
                      ) : (
                        <div className="text-sm text-zinc-500">
                          Select a page to preview.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">
                    Select a PDF, convert it, then pages will appear here.
                  </div>
                )}
              </div>
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

