"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/AdminSidebar";

const ADMIN_KEY = "ra_admin_access_v1";

type LeadRow = {
  id: number;
  email: string;
  created_at: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminLeadsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ADMIN_KEY) !== "true") {
        router.replace("/admin");
        return;
      }
      setChecking(false);
    } catch {
      router.replace("/admin");
    }
  }, [router]);

  useEffect(() => {
    if (checking) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: e } = await supabase
        .from("leads")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

      if (e) {
        setError(e.message);
        setLeads([]);
      } else {
        setLeads((data as LeadRow[]) ?? []);
      }
      setLoading(false);
    };

    void load();
  }, [checking]);

  const startEdit = (row: LeadRow) => {
    setEditingId(row.id);
    setEditEmail(row.email);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditEmail("");
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const trimmed = editEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSavingId(editingId);
    setError(null);
    const { error: e } = await supabase
      .from("leads")
      .update({ email: trimmed })
      .eq("id", editingId);

    if (e) {
      setError(
        e.message.includes("duplicate") || e.code === "23505"
          ? "That email is already in the list."
          : e.message
      );
    } else {
      setLeads((prev) =>
        prev.map((l) => (l.id === editingId ? { ...l, email: trimmed } : l))
      );
      cancelEdit();
    }
    setSavingId(null);
  };

  const deleteLead = async (row: LeadRow) => {
    const ok = window.confirm(`Delete this lead?\n\n${row.email}`);
    if (!ok) return;
    setDeletingId(row.id);
    setError(null);
    const { error: e } = await supabase.from("leads").delete().eq("id", row.id);
    if (e) {
      setError(e.message);
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== row.id));
      if (editingId === row.id) cancelEdit();
    }
    setDeletingId(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Leads</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Landing-page signups. Edit email or remove entries.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading leads...</p>
          ) : leads.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No leads yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-4 py-3 font-semibold text-zinc-300">Email</th>
                    <th className="px-4 py-3 font-semibold text-zinc-300 w-48">Signed up</th>
                    <th className="px-4 py-3 font-semibold text-zinc-300 w-40 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-zinc-800/80 last:border-0 hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 text-zinc-200">
                        {editingId === row.id ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full max-w-md rounded-md border border-zinc-600 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                        ) : (
                          <span className="break-all">{row.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === row.id ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit()}
                              disabled={savingId === row.id}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {savingId === row.id ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={savingId === row.id}
                              className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              disabled={deletingId === row.id || editingId !== null}
                              className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteLead(row)}
                              disabled={deletingId === row.id || editingId !== null}
                              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {deletingId === row.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-6 text-xs text-zinc-600">
            If edit/delete fails, run <code className="text-zinc-400">supabase/leads-update-delete-policies.sql</code>{" "}
            in the Supabase SQL Editor.
          </p>
        </div>
      </main>
    </div>
  );
}
