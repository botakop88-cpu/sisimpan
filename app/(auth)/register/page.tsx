"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface">SISIMPAN</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-outline">Cloud Aggregator</p>
        </div>

        {success ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-3xl">mail</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-on-surface">Check your email</h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              We sent a confirmation link to <b>{email}</b>. Click it to activate your account.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
            <div className="mb-6 text-center">
              <h2 className="font-display text-xl font-semibold text-on-surface">Create Account</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Start aggregating your cloud storage</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-on-surface">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Budi Santoso"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-on-surface">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="name@school.sch.id"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-on-surface">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Minimum 6 characters"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Processing..." : "Sign Up"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-outline">
          &copy; 2026 SISIMPAN &middot; Cloud Storage Aggregator
        </div>
      </div>
    </div>
  );
}
