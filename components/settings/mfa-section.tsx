"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";


type Factor = {
  id: string;
  status: "verified" | "unverified";
};

export function MfaSection() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadFactors() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors(data.all);
    }
    setLoading(false);
  }

  useEffect(() => { loadFactors(); }, []);

  async function handleEnroll() {
    setEnrolling(true);
    setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      setMsg({ type: "error", text: error?.message ?? "Failed to enroll MFA" });
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setFactorId(data.id);
    setEnrolling(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setMsg(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setMsg({ type: "error", text: challengeError?.message ?? "Challenge failed" });
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });

    if (verifyError) {
      setMsg({ type: "error", text: verifyError.message });
      setVerifying(false);
      return;
    }

    setMsg({ type: "success", text: "MFA has been enabled." });
    setQrCode(null);
    setFactorId(null);
    setVerifyCode("");
    await loadFactors();
    setVerifying(false);
  }

  async function handleUnenroll(factorId: string) {
    if (!confirm("Disable MFA? Your account will lose two-factor protection.")) return;
    setMsg(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    setMsg({ type: "success", text: "MFA has been disabled." });
    await loadFactors();
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const hasMfa = verifiedFactors.length > 0;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[20px]">shield</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-on-surface">Two-Factor Authentication (MFA)</h2>
          <p className="text-xs text-on-surface-variant">Add an extra layer of security to your account</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      ) : hasMfa ? (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-fixed px-3 py-1.5 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span> MFA Active ({verifiedFactors.length} factor{verifiedFactors.length > 1 ? "s" : ""})
          </div>
          {verifiedFactors.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">smartphone</span>
                <span className="text-sm text-on-surface">TOTP Authenticator</span>
              </div>
              <button
                onClick={() => handleUnenroll(f.id)}
                className="text-xs font-medium text-error hover:text-error transition-colors"
              >
                Disable
              </button>
            </div>
          ))}
        </div>
      ) : qrCode ? (
        <div className="space-y-4 max-w-sm">
          <p className="text-sm text-on-surface-variant">
            Scan the QR code with Google Authenticator or another TOTP app, then enter the 6-digit code below.
          </p>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="MFA QR Code" className="h-44 w-44 rounded-lg border border-outline-variant" />
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 text-[16px] -translate-y-1/2 text-outline">key</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg border border-outline-variant py-2 pr-4 pl-10 text-center text-lg tracking-widest outline-none focus:border-primary"
                required
              />
            </div>
            {msg && (
              <p className={`flex items-center gap-1.5 text-xs ${msg.type === "success" ? "text-primary" : "text-error"}`}>
                {msg.type === "success" ? <span className="material-symbols-outlined text-[12px]">check_circle</span> : <span className="material-symbols-outlined text-[12px]">error</span>}
                {msg.text}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={verifying || verifyCode.length !== 6}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => { setQrCode(null); setFactorId(null); setVerifyCode(""); setMsg(null); }}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface-variant transition-all hover:bg-surface-container-low"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant max-w-md">
            Two-factor authentication adds an extra layer of security by requiring a verification code from an authenticator app in addition to your password.
          </p>
          {msg && (
            <p className={`flex items-center gap-1.5 text-xs ${msg.type === "success" ? "text-primary" : "text-error"}`}>
              {msg.type === "success" ? <span className="material-symbols-outlined text-[12px]">check_circle</span> : <span className="material-symbols-outlined text-[12px]">error</span>}
              {msg.text}
            </p>
          )}
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
          >
            {enrolling ? "Setting up..." : "Enable MFA"}
          </button>
        </div>
      )}
    </div>
  );
}
