"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MfaSection } from "@/components/settings/mfa-section";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    email: string;
    name: string;
    role: string;
    joinedAt: string;
  } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setProfile(d);
          setNameInput(d.name);
        }
      });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: json.error ?? "Failed to save" });
      } else {
        setMessage({ type: "success", text: "Name updated successfully." });
        setProfile((p) => (p ? { ...p, name: json.name } : p));
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: json.error ?? "Failed to change password" });
      } else {
        setPasswordMsg({ type: "success", text: "Password changed successfully." });
        setPasswordForm({ current: "", new: "", confirm: "" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Failed to change password" });
    }
  }

  if (!profile) {
    return <p className="text-sm text-on-surface-variant">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant">Manage your profile and account</p>
      </div>

      {/* Profile Info */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-lg font-bold text-primary">
            {(profile.name || profile.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-on-surface">{profile.name || "User"}</h2>
            <p className="text-sm text-on-surface-variant">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-on-surface-variant">Role</p>
            <p className="font-medium text-on-surface capitalize">{profile.role}</p>
          </div>
          {profile.joinedAt && (
            <div>
              <p className="text-xs text-on-surface-variant">Member since</p>
              <p className="font-medium text-on-surface">
                {new Date(profile.joinedAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-on-surface mb-1">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-primary" : "text-error"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
        <h2 className="text-lg font-semibold text-on-surface">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-on-surface mb-1">
              Current Password
            </label>
            <input
              id="current"
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
            />
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-on-surface mb-1">
              New Password
            </label>
            <input
              id="new"
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-on-surface mb-1">
              Confirm New Password
            </label>
            <input
              id="confirm"
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              required
            />
          </div>
          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.type === "success" ? "text-primary" : "text-error"}`}>
              {passwordMsg.text}
            </p>
          )}
          <button
            type="submit"
            className="rounded-lg border border-outline-variant px-5 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-all"
          >
            Change Password
          </button>
        </form>
      </div>

      {/* MFA */}
      <MfaSection />

      {/* Connected Accounts Summary */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
        <h2 className="text-lg font-semibold text-on-surface">Connected Cloud Accounts</h2>
        <p className="text-sm text-on-surface-variant">
          Manage your cloud accounts on the{" "}
          <a href="/storage" className="font-medium text-primary hover:underline underline-offset-2">
            Storage Accounts
          </a>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
