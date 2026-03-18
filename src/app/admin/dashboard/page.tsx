"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/AdminSidebar";

const ADMIN_KEY = "ra_admin_access_v1";
const PAST_PAPERS_BUCKET = "past-papers";
const PROBLEM_IMAGES_BUCKET = "problem-images";

export default function AdminDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pagePreviewRef = useRef<HTMLDivElement | null>(null);
  const [checking, setChecking] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openAiStatus, setOpenAiStatus] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");
  const [openAiMessage, setOpenAiMessage] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<
    { path: string; name: string; url?: string }[]
  >([]);
  const [papers, setPapers] = useState<{ path: string; name: string }[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [safeSelectedPaperBase, setSafeSelectedPaperBase] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{
    page: number;
    total: number;
  } | null>(null);
  const [pages, setPages] = useState<
    { pageNumber: number; path: string; url?: string }[]
  >([]);
  const [selectedPage, setSelectedPage] = useState<{
    pageNumber: number;
    path: string;
    url?: string;
  } | null>(null);

  // Crop box in normalized coords (0..1) relative to the displayed preview image
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropActionRef = useRef<
    | null
    | {
        kind: "move";
        startClientX: number;
        startClientY: number;
        startCrop: { x: number; y: number; w: number; h: number };
      }
    | {
        kind: "resize";
        handle: "nw" | "ne" | "sw" | "se";
        startClientX: number;
        startClientY: number;
        startCrop: { x: number; y: number; w: number; h: number };
      }
  >(null);

  const [isAiCropping, setIsAiCropping] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirmingProblem, setIsConfirmingProblem] = useState(false);
  const [extracted, setExtracted] = useState<
    { name: string; path: string; url?: string; fromPage: number }[]
  >([]);
  const [confirmedProblemIds, setConfirmedProblemIds] = useState<Set<string>>(new Set());
  const [savedPagesThisSession, setSavedPagesThisSession] = useState<Set<number>>(new Set());
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const blobUrlMapRef = useRef<Map<string, string>>(new Map());

  const logDebug = (msg: string) => {
    const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
    // eslint-disable-next-line no-console
    console.log(line);
    setDebugLogs((prev) => [line, ...prev].slice(0, 50));
  };

  const revokeBlobUrl = (path: string) => {
    const m = blobUrlMapRef.current;
    const existing = m.get(path);
    if (existing) {
      try {
        URL.revokeObjectURL(existing);
      } catch {
        // ignore
      }
      m.delete(path);
    }
  };

  useEffect(() => {
    return () => {
      // cleanup blob URLs
      for (const url of blobUrlMapRef.current.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
      blobUrlMapRef.current.clear();
    };
  }, []);

  const resolvePreviewUrl = async (path: string) => {
    // 1) signed URL
    const signedRes = await supabase.storage
      .from(PAST_PAPERS_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (signedRes.error) {
      logDebug(`signedUrl FAIL for ${path}: ${signedRes.error.message}`);
    } else if (signedRes.data?.signedUrl) {
      logDebug(`signedUrl OK for ${path}`);
      return signedRes.data.signedUrl;
    }

    // 2) try direct download and use blob: URL
    const dl = await supabase.storage.from(PAST_PAPERS_BUCKET).download(path);
    if (dl.error || !dl.data) {
      logDebug(`download FAIL for ${path}: ${dl.error?.message ?? "no data"}`);
    } else {
      revokeBlobUrl(path);
      const blobUrl = URL.createObjectURL(dl.data);
      blobUrlMapRef.current.set(path, blobUrl);
      logDebug(`download OK -> blobUrl for ${path}`);
      return blobUrl;
    }

    // 3) public URL fallback (may be broken for private buckets)
    const publicUrl = supabase.storage.from(PAST_PAPERS_BUCKET).getPublicUrl(path).data.publicUrl;
    logDebug(`publicUrl fallback for ${path}: ${publicUrl}`);
    return publicUrl;
  };

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

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  /**
   * Standard formats:
   * - paper id:  Further-Maths-2022-paper-1
   * - problem id: Further-Maths-2022-paper-1-Question-4
   */
  const getPaperMeta = (paperName: string) => {
    const base = paperName.replace(/\.pdf$/i, "").trim();
    const yearMatch = base.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1]! : new Date().getFullYear().toString();
    // Only trust an explicit "Paper N" in the filename; QP (n) is not reliable for paper number.
    const paperMatch = base.match(/\bPaper\s*(\d+)\b/i);
    const paperNum = paperMatch ? (paperMatch[1] ?? "1") : "1";
    const paperId = `Further-Maths-${year}-paper-${paperNum}`;
    return { year, paperNum, paperId };
  };

  const getPreviewSize = () => {
    const el = pagePreviewRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  const normalizeCrop = (c: { x: number; y: number; w: number; h: number }) => {
    const minSize = 0.02; // 2% of image
    let { x, y, w, h } = c;
    w = clamp(w, minSize, 1);
    h = clamp(h, minSize, 1);
    x = clamp(x, 0, 1 - w);
    y = clamp(y, 0, 1 - h);
    return { x, y, w, h };
  };

  const suggestCrop = () => {
    // Simple heuristic: centered question block with padding (admin can adjust)
    setCrop(
      normalizeCrop({
        x: 0.08,
        y: 0.18,
        w: 0.84,
        h: 0.64,
      })
    );
  };

  const suggestCropWithAi = async () => {
    if (!selectedPage) return;
    setUploadError(null);
    setIsAiCropping(true);
    try {
      const { data: blob, error } = await supabase.storage
        .from(PAST_PAPERS_BUCKET)
        .download(selectedPage.path);
      if (error || !blob) {
        throw new Error(error?.message ?? "Failed to download page image.");
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const dataUrl = r.result as string;
          const b = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
          resolve(b ?? "");
        };
        r.onerror = () => reject(new Error("Failed to read image."));
        r.readAsDataURL(blob);
      });
      const res = await fetch("/api/openai/crop-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        crop?: { x: number; y: number; w: number; h: number };
      };
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      if (json.crop) {
        setCrop(normalizeCrop(json.crop));
      } else {
        throw new Error("No crop returned.");
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "AI crop failed.");
    } finally {
      setIsAiCropping(false);
    }
  };

  const startMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!crop) return;
    e.preventDefault();
    cropActionRef.current = {
      kind: "move",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: crop,
    };
  };

  const startResize = (
    handle: "nw" | "ne" | "sw" | "se"
  ): React.MouseEventHandler<HTMLDivElement> => {
    return (e) => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      cropActionRef.current = {
        kind: "resize",
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCrop: crop,
      };
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const action = cropActionRef.current;
      if (!action || !crop) return;
      const size = getPreviewSize();
      if (!size) return;

      const dx = (e.clientX - action.startClientX) / size.width;
      const dy = (e.clientY - action.startClientY) / size.height;

      if (action.kind === "move") {
        setCrop(
          normalizeCrop({
            ...action.startCrop,
            x: action.startCrop.x + dx,
            y: action.startCrop.y + dy,
          })
        );
        return;
      }

      // resize
      const sc = action.startCrop;
      let x = sc.x;
      let y = sc.y;
      let w = sc.w;
      let h = sc.h;

      if (action.handle.includes("n")) {
        y = sc.y + dy;
        h = sc.h - dy;
      }
      if (action.handle.includes("s")) {
        h = sc.h + dy;
      }
      if (action.handle.includes("w")) {
        x = sc.x + dx;
        w = sc.w - dx;
      }
      if (action.handle.includes("e")) {
        w = sc.w + dx;
      }

      setCrop(normalizeCrop({ x, y, w, h }));
    };

    const onUp = () => {
      cropActionRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [crop]);

  // Load list of uploaded PDFs from storage
  useEffect(() => {
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
  }, []);

  // When a paper is selected, try to load already-converted page PNGs from Storage
  useEffect(() => {
    if (!selectedPaper) return;

    const paperBase = selectedPaper.name.replace(/\.pdf$/i, "");
    const safePaperBase = paperBase
      .trim()
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    const { paperId } = getPaperMeta(selectedPaper.name);
    const safePaperId = paperId
      .trim()
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    setSafeSelectedPaperBase(safePaperBase);
    setUploadError(null);
    setPages([]);
    setSelectedPage(null);
    setCrop(null);

    const loadPages = async () => {
      const tryFolders = [`pages/${safePaperId}`, `pages/${safePaperBase}`];
      let data: { name: string }[] | null = null;
      let chosenFolderBase: string | null = null;
      for (const folder of tryFolders) {
        const res = await supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .list(folder, { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
        if (res.error) continue;
        if (res.data && res.data.length > 0) {
          data = res.data as unknown as { name: string }[];
          // store which folder we’re using for conversions too
          chosenFolderBase = folder.replace(/^pages\//, "");
          setSafeSelectedPaperBase(chosenFolderBase);
          break;
        }
      }
      if (!data || data.length === 0) return;

      const folderBase = chosenFolderBase ?? safePaperId;
      const pngs = data.filter((o) => o.name.toLowerCase().endsWith(".png"));
      const parsed = (await Promise.all(
        pngs.map(async (o) => {
          const match = o.name.match(/page-(\d+)\.png$/i);
          const pageNumber = match ? Number(match[1]) : 0;
          const path = `pages/${folderBase}/${o.name}`;
          const url = await resolvePreviewUrl(path);
          return { pageNumber, path, url };
        })
      ))
        .filter((p) => p.pageNumber > 0)
        .sort((a, b) => a.pageNumber - b.pageNumber);

      if (parsed.length > 0) {
        setPages(parsed);
        setSelectedPage(parsed[0]);
      }
    };

    loadPages();
  }, [selectedPaper]);

  // When a paper is selected, load confirmed problems so we can avoid duplicates.
  useEffect(() => {
    if (!selectedPaper) {
      setConfirmedProblemIds(new Set());
      setSavedPagesThisSession(new Set());
      return;
    }

    const loadConfirmed = async () => {
      const { paperId } = getPaperMeta(selectedPaper.name);
      const prefix = `${paperId}-Question-`;

      const { data, error } = await supabase
        .from("problems")
        .select("problem_id")
        .like("problem_id", `${prefix}%`)
        .limit(2000);

      if (error) {
        // don't block UI; just don't show badges
        setConfirmedProblemIds(new Set());
        return;
      }

      const ids = new Set<string>(
        (data as { problem_id: string }[] | null | undefined)?.map((r) => r.problem_id) ?? []
      );
      setConfirmedProblemIds(ids);
    };

    loadConfirmed();
  }, [selectedPaper]);

  const logout = () => {
    try {
      window.localStorage.removeItem(ADMIN_KEY);
    } catch {
      // ignore
    }
    router.replace("/admin");
  };

  const testOpenAi = async () => {
    setOpenAiStatus("testing");
    setOpenAiMessage(null);
    try {
      const res = await fetch("/api/openai/ping", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | null
        | { ok?: boolean; error?: string; debug?: Record<string, unknown> };
      if (!res.ok || !json?.ok) {
        setOpenAiStatus("error");
        const msg = json?.error ?? "OpenAI connection failed.";
        const debugStr = json?.debug
          ? `\nDebug: ${JSON.stringify(json.debug)}`
          : "";
        setOpenAiMessage(msg + debugStr);
        return;
      }
      setOpenAiStatus("ok");
      setOpenAiMessage("OpenAI connected.");
    } catch (e) {
      setOpenAiStatus("error");
      setOpenAiMessage(e instanceof Error ? e.message : "OpenAI connection failed.");
    }
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
          // Render first page to PNG and ask AI for {year, paper} to standardize name
          let standardName: string | null = null;
          // First try to parse from filename (fast + reliable when name contains year/paper)
          try {
            const base = file.name.replace(/\.pdf$/i, "").trim();
            const yearMatch = base.match(/\b(20\d{2})\b/);
            const paperMatch = base.match(/\bPaper\s*(\d+)\b/i);
            const year = yearMatch ? Number(yearMatch[1]) : NaN;
            const paper = paperMatch ? Number(paperMatch[1]) : 1;
            if (Number.isFinite(year)) {
              standardName = `Further-Maths-${year}-Paper-${paper}.pdf`;
            }
          } catch {
            // ignore
          }
          try {
            if (!standardName) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfjs = await import("pdfjs-dist");
            const { GlobalWorkerOptions, getDocument } = pdfjs;
            GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
            const loadingTask = getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported.");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            const pngBlob: Blob = await new Promise((resolve, reject) => {
              canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed."))), "image/png");
            });
            const base64 = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => {
                const dataUrl = r.result as string;
                const b = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
                resolve(b ?? "");
              };
              r.onerror = () => reject(new Error("Failed to read image."));
              r.readAsDataURL(pngBlob);
            });
            const res = await fetch("/api/openai/paper-meta", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageBase64: base64 }),
            });
            const json = (await res.json().catch(() => ({}))) as { year?: number; paper?: number; error?: string };
            if (res.ok && json.year && json.paper) {
              standardName = `Further-Maths-${json.year}-Paper-${json.paper}.pdf`;
            } else if (!res.ok && json?.error) {
              // Non-fatal: still upload, but show why naming failed
              setUploadError((prev) => prev ?? `Paper naming (AI) failed: ${json.error}`);
            }
            }
          } catch {
            // fallback below
          }

          const safeName = (standardName ?? file.name).replace(/[^\w.\-() ]+/g, "_");
          let path = `uploads/${safeName}`;

          const { error } = await supabase.storage
            .from(PAST_PAPERS_BUCKET)
            .upload(path, file, {
              contentType: "application/pdf",
              upsert: false,
            });

          if (error) {
            // If name already exists, add a suffix (keeps base format recognizable)
            if (error.message.toLowerCase().includes("exists") || error.message.toLowerCase().includes("duplicate")) {
              const suffix = Math.random().toString(16).slice(2, 6);
              const alt = safeName.replace(/\.pdf$/i, `-${suffix}.pdf`);
              path = `uploads/${alt}`;
              const retry = await supabase.storage.from(PAST_PAPERS_BUCKET).upload(path, file, {
                contentType: "application/pdf",
                upsert: false,
              });
              if (retry.error) throw new Error(retry.error.message);
            } else {
              // Common Supabase errors here are permission/policy related.
              throw new Error(error.message);
            }
          }

          const { data } = supabase.storage.from(PAST_PAPERS_BUCKET).getPublicUrl(path);
          return { path, name: safeName, url: data.publicUrl };
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

  const deletePdf = async (p: { path: string; name: string }) => {
    const ok = window.confirm(
      `Delete this past paper?\n\n${p.name}\n\nThis deletes the PDF and all its converted page PNGs.`
    );
    if (!ok) return;
    setUploadError(null);
    try {
      // Delete PDF
      const { error: pdfErr } = await supabase.storage
        .from(PAST_PAPERS_BUCKET)
        .remove([p.path]);
      if (pdfErr) throw new Error(pdfErr.message);

      // Delete converted pages from both the new standardized folder and the legacy folder
      const paperBase = p.name.replace(/\.pdf$/i, "");
      const legacyBase = paperBase
        .trim()
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
      const paperId = getPaperMeta(p.name).paperId
        .trim()
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      const folders = [`pages/${paperId}`, `pages/${legacyBase}`];
      for (const folder of folders) {
        const { data, error } = await supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .list(folder, { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
        if (error || !data || data.length === 0) continue;
        const toRemove = data.map((o) => `${folder}/${o.name}`);
        const { error: rmErr } = await supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .remove(toRemove);
        if (rmErr) throw new Error(rmErr.message);
      }

      setPapers((prev) => prev.filter((x) => x.path !== p.path));
      if (selectedPaper?.path === p.path) {
        setSelectedPaper(null);
        setPages([]);
        setSelectedPage(null);
        setCrop(null);
        setExtracted([]);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const convertSelectedPdfToPngs = async () => {
    if (!selectedPaper) return;

    setUploadError(null);
    setIsConverting(true);
    setConvertProgress(null);
    setPages([]);
      setSelectedPage(null);
      setCrop(null);

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

      const loadingTask = getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const totalPages: number = pdf.numPages;
      const safePaperBase =
        safeSelectedPaperBase ??
        getPaperMeta(selectedPaper.name).paperId
          .trim()
          .replace(/[^\w.\-]+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");
      // Ensure we keep using the same folder for later operations
      setSafeSelectedPaperBase(safePaperBase);

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        setConvertProgress({ page: pageNumber, total: totalPages });

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas not supported.");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({ canvasContext: context, viewport, canvas }).promise;

        const pngBlob: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG conversion failed."))), "image/png");
        });

        const path = `pages/${safePaperBase}/page-${String(pageNumber).padStart(3, "0")}.png`;

        const { error: uploadErr } = await supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .upload(path, pngBlob, { contentType: "image/png", upsert: true });

        if (uploadErr) {
          // eslint-disable-next-line no-console
          console.log("page png upload error", { path, message: uploadErr.message, uploadErr });
          throw new Error(uploadErr.message);
        }

        const { data: publicData } = supabase.storage
          .from(PAST_PAPERS_BUCKET)
          .getPublicUrl(path);

        const url = await resolvePreviewUrl(path);
        const pageObj = { pageNumber, path, url };
        // Append/update immediately so user can start cropping while conversion continues
        setPages((prev) => {
          const existingIdx = prev.findIndex((p) => p.pageNumber === pageNumber);
          const next = existingIdx >= 0 ? [...prev] : [...prev, pageObj];
          if (existingIdx >= 0) next[existingIdx] = pageObj;
          next.sort((a, b) => a.pageNumber - b.pageNumber);
          return next;
        });
        setSelectedPage((prev) => prev ?? pageObj);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed.";
      setUploadError(msg);
    } finally {
      setIsConverting(false);
      setConvertProgress(null);
    }
  };

  const confirmCrop = async () => {
    if (!selectedPaper || !selectedPage || !crop) return;

    setUploadError(null);
    setIsExtracting(true);

    try {
      // Download the page PNG from Supabase (avoids CORS issues)
      const { data: pageBlob, error } = await supabase.storage
        .from(PAST_PAPERS_BUCKET)
        .download(selectedPage.path);

      if (error || !pageBlob) {
        throw new Error(error?.message ?? "Failed to download page image.");
      }

      const bitmap = await createImageBitmap(pageBlob);
      const sx = Math.floor(crop.x * bitmap.width);
      const sy = Math.floor(crop.y * bitmap.height);
      const sw = Math.floor(crop.w * bitmap.width);
      const sh = Math.floor(crop.h * bitmap.height);

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");

      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

      const outBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Problem PNG export failed."))),
          "image/png"
        );
      });

      const paperBase = selectedPaper.name.replace(/\.pdf$/i, "");
      const safePaper = paperBase
        .trim()
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
      const path = `problems/${safePaper}/page-${String(selectedPage.pageNumber).padStart(
        3,
        "0"
      )}/${Date.now()}-problem.png`;

      const { error: upErr } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .upload(path, outBlob, { contentType: "image/png", upsert: false });

      if (upErr) {
        // Helpful debugging: inspect full Supabase Storage error object in DevTools.
        // eslint-disable-next-line no-console
        console.log("problem-images upload error", {
          bucket: PROBLEM_IMAGES_BUCKET,
          path,
          message: upErr.message,
          name: (upErr as unknown as { name?: string }).name,
          status: (upErr as unknown as { status?: number }).status,
          statusCode: (upErr as unknown as { statusCode?: number }).statusCode,
          error: (upErr as unknown as { error?: string }).error,
          cause: (upErr as unknown as { cause?: unknown }).cause,
        });
        const msg =
          upErr.message.toLowerCase().includes("bucket")
            ? `Bucket '${PROBLEM_IMAGES_BUCKET}' not found. Create it in Supabase Storage (or double-check the name).`
            : `${upErr.message} (You may need a Storage policy allowing uploads to the '${PROBLEM_IMAGES_BUCKET}' bucket.)`;
        throw new Error(msg);
      }

      const { data: publicData } = supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .getPublicUrl(path);

      setExtracted((prev) => [
        { name: "problem.png", path, url: publicData.publicUrl, fromPage: selectedPage.pageNumber },
        ...prev,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Crop failed.";
      setUploadError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  /** Standardized problem_id: Further-Maths-<year>-paper-<paperNum>-Question-<questionNum> */
  const generateProblemId = (paperName: string, pageNumber: number): string => {
    const { paperId } = getPaperMeta(paperName);
    const questionNum = String(pageNumber);
    return `${paperId}-Question-${questionNum}`;
  };

  const confirmProblem = async () => {
    const latest = extracted[0];
    if (!latest || !selectedPaper) return;

    setUploadError(null);
    setIsConfirmingProblem(true);

    try {
      // Determine question number from the extracted image (top-left of screenshot)
      const { data: extractedBlob, error: extractedDownErr } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .download(latest.path);
      if (extractedDownErr || !extractedBlob) {
        throw new Error(extractedDownErr?.message ?? "Failed to download extracted image.");
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const dataUrl = r.result as string;
          const b = dataUrl.indexOf(",") >= 0 ? dataUrl.split(",")[1] : dataUrl;
          resolve(b ?? "");
        };
        r.onerror = () => reject(new Error("Failed to read image."));
        r.readAsDataURL(extractedBlob);
      });

      const qRes = await fetch("/api/openai/question-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const qJson = (await qRes.json().catch(() => ({}))) as { question?: number; error?: string };
      if (!qRes.ok || !qJson.question) {
        throw new Error(qJson?.error ?? `Question detection failed (${qRes.status}).`);
      }

      const problemId = `${getPaperMeta(selectedPaper.name).paperId}-Question-${qJson.question}`;
      if (confirmedProblemIds.has(problemId)) {
        throw new Error(`Already saved: ${problemId}`);
      }
      const confirmedPath = `confirmed/${problemId}.png`;

      const { error: upErr } = await supabase.storage
        .from(PROBLEM_IMAGES_BUCKET)
        .upload(confirmedPath, extractedBlob, { contentType: "image/png", upsert: true });

      if (upErr) {
        throw new Error(upErr.message);
      }

      const { error: dbErr } = await supabase.from("problems").upsert(
        { problem_id: problemId, problem_image: confirmedPath },
        { onConflict: "problem_id" }
      );

      if (dbErr) {
        throw new Error(dbErr.message);
      }

      setUploadError(null);
      setExtracted((prev) => prev.filter((p) => p.path !== latest.path));
      setConfirmedProblemIds((prev) => {
        const next = new Set(prev);
        next.add(problemId);
        return next;
      });
      setSavedPagesThisSession((prev) => {
        const next = new Set(prev);
        next.add(latest.fromPage);
        return next;
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Confirm problem failed.");
    } finally {
      setIsConfirmingProblem(false);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files ?? []);
    await uploadPdfs(files);
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
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
      <AdminSidebar />

      {/* Main: left column (drop + pages) + right column (page viewer) */}
      <main
        className="flex-1 flex min-h-0 p-4 gap-4"
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        {/* Left column: drop zone + PDF list + Convert + page list */}
        <div className="w-72 shrink-0 min-h-0 flex flex-col gap-3 overflow-hidden border border-zinc-800 rounded-xl bg-zinc-950/60 p-4 max-h-[calc(100vh-2rem)]">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-8 px-4 cursor-pointer transition ${
              isDragging
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-zinc-600 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-800/40"
            }`}
          >
            <p className="text-sm font-medium text-zinc-300 text-center">
              Drag and drop PDFs here
            </p>
            <p className="text-xs text-zinc-500 mt-1">or click to choose files</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {isUploading && (
            <p className="text-xs text-zinc-400">Uploading {uploadingCount} PDF(s)...</p>
          )}

          {papers.length > 0 && (
            <>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Uploaded PDFs
              </div>
              <div className="space-y-1 max-h-24 overflow-auto">
                {papers.map((p) => {
                  const isSelected = selectedPaper?.path === p.path;
                  return (
                    <div
                      key={p.path}
                      className={`w-full rounded px-2 py-1.5 text-xs transition flex items-center gap-2 ${
                        isSelected ? "bg-emerald-500/20 text-emerald-200" : "hover:bg-zinc-800"
                      }`}
                      title={p.name}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPaper(p)}
                        className="flex-1 text-left truncate"
                      >
                        {p.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void deletePdf(p);
                        }}
                        className="shrink-0 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30 px-2 py-1 hover:bg-rose-500/30"
                        title="Delete PDF"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={convertSelectedPdfToPngs}
                disabled={!selectedPaper || isConverting}
                className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConverting && convertProgress
                  ? `Converting ${convertProgress.page}/${convertProgress.total}...`
                  : "Convert to PNGs"}
              </button>
            </>
          )}

          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-1 shrink-0">
            Pages
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 overscroll-contain">
            {pages.length > 0 ? (
              pages.map((pg) => (
                (() => {
                  const isSaved = savedPagesThisSession.has(pg.pageNumber);
                  return (
                <button
                  key={pg.path}
                  type="button"
                  onClick={() => {
                    setSelectedPage(pg);
                    setCrop(null);
                  }}
                  className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                    selectedPage?.path === pg.path
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-xs text-zinc-300">Page {pg.pageNumber}</div>
                    {isSaved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        Saved
                      </span>
                    ) : null}
                  </div>
                  {pg.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pg.url}
                      alt={`Page ${pg.pageNumber}`}
                      className="w-full h-auto rounded max-h-48 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const src = (e.currentTarget as HTMLImageElement).src;
                        logDebug(`IMG onError page=${pg.pageNumber} path=${pg.path} src=${src}`);
                      }}
                    />
                  ) : (
                    <div className="text-xs text-zinc-500">No preview</div>
                  )}
                </button>
                  );
                })()
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-2">
                {selectedPaper ? "Convert PDF to see pages." : "Select a PDF above."}
              </p>
            )}
          </div>
        </div>

        {/* Right column: full page + crop + extract + confirm */}
        <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-lg font-semibold text-zinc-100 truncate">
              {selectedPage ? `Page ${selectedPage.pageNumber}` : "Past papers"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={testOpenAi}
                disabled={openAiStatus === "testing"}
                className={`rounded px-2 py-1.5 text-xs font-semibold ${
                  openAiStatus === "ok"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : openAiStatus === "error"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-zinc-700 text-zinc-300"
                }`}
                title="Test OpenAI"
              >
                {openAiStatus === "testing" ? "..." : openAiStatus === "ok" ? "OpenAI OK" : "OpenAI"}
              </button>
              <button
                type="button"
                onClick={handleChooseFiles}
                disabled={isUploading}
                className="rounded px-2 py-1.5 text-xs font-semibold bg-zinc-600 text-zinc-200 hover:bg-zinc-500 disabled:opacity-50"
              >
                Choose files
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {uploadError}
            </div>
          )}
          {openAiMessage && (
            <div
              className={`mb-2 rounded-lg border px-3 py-2 text-xs ${
                openAiStatus === "ok"
                  ? "border-emerald-500/40 text-emerald-200"
                  : "border-rose-500/40 text-rose-200"
              }`}
            >
              {openAiMessage}
            </div>
          )}

          {debugLogs.length > 0 && (
            <details className="mb-2 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-300">
                Debug ({debugLogs.length})
              </summary>
              <div className="mt-2 max-h-40 overflow-auto text-[11px] text-zinc-400 whitespace-pre-wrap">
                {debugLogs.join("\n")}
              </div>
            </details>
          )}

          {pages.length > 0 && selectedPage?.url ? (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {/* PROBLEM: extracted preview at top */}
              {extracted.length > 0 && (
                <div className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/50 p-2">
                  <div className="text-xs font-semibold text-zinc-400 mb-2">Extracted problem</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {extracted.slice(0, 4).map((p) => (
                      <a
                        key={p.path}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 w-24 h-24 rounded border border-zinc-700 overflow-hidden hover:border-emerald-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="w-full h-full object-contain" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Crop tools */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={suggestCrop}
                  className="rounded-md bg-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-500"
                >
                  Suggest crop
                </button>
                <button
                  type="button"
                  onClick={suggestCropWithAi}
                  disabled={isAiCropping}
                  className="rounded-md bg-violet-500 px-3 py-2 text-xs font-semibold text-black hover:bg-violet-400 disabled:opacity-50"
                >
                  {isAiCropping ? "Analysing..." : "Crop with AI"}
                </button>
                <button
                  type="button"
                  onClick={confirmCrop}
                  disabled={!crop || isExtracting}
                  className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isExtracting ? "Extracting..." : "Confirm crop"}
                </button>
                <button
                  type="button"
                  onClick={confirmProblem}
                  disabled={extracted.length === 0 || isConfirmingProblem}
                  className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {isConfirmingProblem ? "Saving..." : "Confirm problem"}
                </button>
              </div>

              {/* Full page with crop overlay (NOT PROBLEM area) */}
              <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto">
                <div
                  ref={pagePreviewRef}
                  className="relative inline-block max-h-[85vh] w-max"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPage.url}
                      alt="Selected page"
                      className="max-h-[85vh] w-auto block rounded-lg select-none"
                      draggable={false}
                    />

                    {crop && (
                      <div
                        onMouseDown={startMove}
                        className="absolute border-2 border-dashed border-emerald-300 bg-emerald-400/10 cursor-move"
                        style={{
                          left: `${crop.x * 100}%`,
                          top: `${crop.y * 100}%`,
                          width: `${crop.w * 100}%`,
                          height: `${crop.h * 100}%`,
                        }}
                      >
                        <div
                          onMouseDown={startResize("nw")}
                          className="absolute -left-2 -top-2 h-4 w-4 rounded bg-emerald-300 cursor-nwse-resize"
                        />
                        <div
                          onMouseDown={startResize("ne")}
                          className="absolute -right-2 -top-2 h-4 w-4 rounded bg-emerald-300 cursor-nesw-resize"
                        />
                        <div
                          onMouseDown={startResize("sw")}
                          className="absolute -left-2 -bottom-2 h-4 w-4 rounded bg-emerald-300 cursor-nesw-resize"
                        />
                        <div
                          onMouseDown={startResize("se")}
                          className="absolute -right-2 -bottom-2 h-4 w-4 rounded bg-emerald-300 cursor-nwse-resize"
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>

          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Drop a PDF on the left, convert it, then select a page to crop and extract problems.
            </div>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-500/10 border-2 border-emerald-400 rounded-xl z-10">
              <div className="text-center">
                <div className="text-xl font-semibold">Drop your PDFs</div>
                <div className="mt-1 text-sm text-zinc-300">Upload past papers</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

