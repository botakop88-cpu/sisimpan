"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function MfaVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error || !data) {
        setError(error?.message ?? "Failed to load MFA factors");
        setLoading(false);
        return;
      }
      const totp = data.totp.find((f: { status: string }) => f.status === "verified");
      if (!totp) {
        setError("No verified MFA factor found.");
        setLoading(false);
        return;
      }
      setFactorId(totp.id);
      setLoading(false);
    });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Failed to start challenge");
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError(verifyError.message);
      setVerifying(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="font-display text-xl font-bold text-on-surface">Two-Factor Verification</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Enter the code from your authenticator app</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg border border-outline-variant px-3 py-3 text-center text-2xl tracking-[0.5em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              required
              autoFocus
            />

            {error && <p className="text-sm text-error text-center">{error}</p>}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    }>
      <MfaVerifyForm />
    </Suspense>
  );
}
