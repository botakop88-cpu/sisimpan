"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

type ShareLink = {
  id: string;
  name: string;
  share_token: string;
  created_at: string;
  share_expires_at: string | null;
  original_size: number;
  password: boolean;
};

export default function ShareLinksPage() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("files")
        .select("id, name, share_token, created_at, share_expires_at, original_size, share_password_hash")
        .not("share_token", "is", null)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      setLinks((data ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        share_token: f.share_token,
        created_at: f.created_at,
        share_expires_at: f.share_expires_at,
        original_size: f.original_size,
        password: !!f.share_password_hash,
      })));
    } catch (e) {
      console.error("Failed to load share links:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function revokeLink(id: string) {
    if (!confirm("Revoke this share link?")) return;
    try {
      const res = await fetch(`/api/files/${id}/share`, { method: "DELETE" });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.error("Failed to revoke:", e);
    }
  }

  function copyToClipboard(id: string, token: string) {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-on-surface">Share Links</h1>
        <p className="text-sm text-on-surface-variant">Manage your shared file links</p>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-outline text-3xl">share</span>
          </div>
          <p className="text-sm text-on-surface-variant">No share links yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-xs text-on-surface-variant">
                <th className="px-6 py-3 font-medium">File Name</th>
                <th className="px-6 py-3 font-medium">Share Link</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Password</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-outline-variant/60 last:border-0 transition-colors hover:bg-surface-container-low">
                  <td className="px-6 py-4 font-medium text-on-surface">{link.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant truncate max-w-[160px]">
                        {typeof window !== "undefined" ? `${window.location.origin}/s/${link.share_token}` : `/s/${link.share_token}`}
                      </span>
                      <button
                        onClick={() => copyToClipboard(link.id, link.share_token)}
                        className="shrink-0 rounded p-1 text-outline hover:text-primary transition-colors"
                      >
                        {copiedId === link.id ? (
                          <span className="text-xs text-primary">Copied!</span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {new Date(link.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {link.share_expires_at
                        ? new Date(link.share_expires_at).toLocaleDateString("id-ID")
                        : "Never"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{formatBytes(link.original_size)}</td>
                  <td className="px-6 py-4">
                    {link.password ? (
                      <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-xs font-medium text-on-primary-fixed-variant">Enabled</span>
                    ) : (
                      <span className="text-xs text-outline">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(link.id, link.share_token)}
                        className="rounded p-1.5 text-outline hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                      <button
                        onClick={() => revokeLink(link.id)}
                        className="rounded p-1.5 text-outline hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
