"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glowPos, setGlowPos] = useState({ x: 1060, y: 704 });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      setGlowPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const r = await supabase.auth.signInWithPassword({ email, password });
    if (r.error) {
      if (r.error.message.includes("MFA") || r.error.message.includes("mfa")) {
        router.push(`/mfa/verify?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }
      setError(r.error.message);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${redirectTo}`,
      },
    });
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-on-background selection:bg-primary-fixed-dim selection:text-on-primary-fixed overflow-hidden">
      {/* Left Panel - Brand & Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-surface-bright via-white to-primary-fixed/20 p-container-padding">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-container/10 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary-fixed/20 blur-[100px]" />
        <div className="relative z-10 max-w-xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 backdrop-blur-md">
              <span className="material-symbols-outlined text-[18px] text-primary">cloud_sync</span>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Multi-account pooling</span>
            </div>
            <h1 className="font-display text-[48px] leading-[1.1] font-extrabold tracking-tight text-on-background">
              Aggregate your storage into one{" "}
              <span className="text-primary underline decoration-wavy underline-offset-8">seamless</span> cloud.
            </h1>
            <p className="font-body-base text-body-base text-on-surface-variant max-w-md">
              SISIMPAN intelligently merges your Google Drive, Dropbox, and S3 buckets into a single high-performance data pool with enterprise-grade security.
            </p>
          </div>

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/50">
            <img src="/hero-illustration.png" alt="Cloud storage aggregator illustration" className="w-full h-full object-cover" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/80 border border-outline-variant/30 p-6 shadow-sm backdrop-blur-sm">
              <span className="material-symbols-outlined text-primary mb-2 text-2xl">security</span>
              <h3 className="text-sm font-semibold text-on-surface mb-1">AES-256 Security</h3>
              <p className="text-xs text-on-surface-variant">Your data is encrypted before it even leaves your device.</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-outline-variant/30 p-6 shadow-sm backdrop-blur-sm">
              <span className="material-symbols-outlined text-primary mb-2 text-2xl">dataset</span>
              <h3 className="text-sm font-semibold text-on-surface mb-1">Smart Pooling</h3>
              <p className="text-xs text-on-surface-variant">Automatic distribution across multiple providers for zero downtime.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-4">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center overflow-hidden">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxT0guQlvTEZ0JUZkkZXSie8Okn6v_PVA_LEv7GOmJsWsTpZhbD21R_KsSxD1eq3Uvec4Uda5I4hL6w7RFhIAUsavH7OdkmJ00DyHn5-pWiJmAiJbxRqHJg7S3zuY2MoH_TuFEMY5BdOb1nhIuR0x1wV5Q4pBFaVU-PuLg6j8BjtJmT6K_ZdfgEuY55B-uEeGIU4DzbuQ2xK2Dr9-m0Wcu9q53bfDTrQBDPg_Q-Lkg" alt="" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center overflow-hidden">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL_SfQCwXrP-bQdq8hnwCAiIwHHPWsjC2kmQdnP8M5nuaIxnYIB86HanRxXWMGA68s3Z1-32KollfyImJtnbV9tqy_J0fRfTXfXsR53u3A-T01hDH4GRSqVvN23kd9rIkow-NcJ2uGMlwUoiU5luFiH-6v5tR32pRCf-Ovagw-D8ZYksUSETKIN53IG53a6Yod5iimZ0bN-dp3tgJwfS_WhD4FKyiZ0PqxHpJaP3LaCxQtfGywoII" alt="" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center overflow-hidden">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJZFA43cqPidtY8wNwwh23aq8V2pm0nODsfaL_ReY5_JLKvTgAFvr9bkcIHEna8tPAVC7MnFYs5a4bl5ypRPDZmrZUyzrdjkT-hnZpZurW9U7pUG0KpCDKTsQJ5Wo62CG_NkOzBnCUGYnOAqdhkCR9p8Kzwck1vRDfJvnnkMu9YiDXmhhdSpGTGWf3UC4APC4fq6joIvmyMUUT411bb3qrJh356ncvLG16qiZdW7ESl8tXSu37byI" alt="" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-primary-container text-white flex items-center justify-center text-xs font-bold">+10k</div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">Trusted by teams at Global Fortune 500 companies.</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full items-center justify-center bg-surface p-container-padding lg:w-1/2 relative">
        <div className="absolute top-8 left-8 lg:hidden">
          <span className="font-display text-2xl font-extrabold tracking-tighter text-primary">SISIMPAN</span>
        </div>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <h2 className="font-display text-display-lg text-on-surface">Welcome back</h2>
            <p className="font-body-base text-on-surface-variant">Please enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-title-sm text-[13px] text-on-surface-variant flex items-center gap-1.5" htmlFor="email">
                  <span className="material-symbols-outlined text-[16px]">mail</span> Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-base text-on-surface outline-none transition-all placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-title-sm text-[13px] text-on-surface-variant flex items-center gap-1.5" htmlFor="password">
                    <span className="material-symbols-outlined text-[16px]">lock</span> Password
                  </label>
                  <a href="#" className="text-xs font-title-sm text-primary hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-base text-on-surface outline-none transition-all placeholder:text-outline/50 focus:border-primary focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input id="remember" type="checkbox" className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" />
              <label htmlFor="remember" className="ml-2 text-body-sm text-on-surface-variant cursor-pointer select-none">Remember me for 30 days</label>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-container text-white py-3.5 font-title-sm shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && (
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              )}
            </button>
          </form>

          <div className="relative flex items-center gap-4">
            <div className="flex-grow border-t border-outline-variant" />
            <span className="text-xs font-label-caps uppercase tracking-widest text-outline">or continue with</span>
            <div className="flex-grow border-t border-outline-variant" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-outline-variant bg-white py-3 font-title-sm text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </button>

          <p className="text-center font-body-base text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">Create an account</Link>
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 opacity-50">
            <a href="#" className="font-body-sm text-body-sm hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="font-body-sm text-body-sm hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="font-body-sm text-body-sm hover:text-primary transition-colors">Help Center</a>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 hidden lg:block opacity-30 select-none">
          <span className="font-display text-6xl font-extrabold text-surface-dim pointer-events-none">SISIMPAN</span>
        </div>

        <div
          className="fixed hidden lg:block w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] pointer-events-none z-0 transition-opacity duration-500"
          style={{ left: glowPos.x - 200 + "px", top: glowPos.y - 200 + "px", opacity: 1 }}
        />
      </div>
    </div>
  );
}