"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/files", label: "Files", icon: "folder" },
  { href: "/upload", label: "Upload", icon: "cloud_upload" },
  { href: "/storage", label: "Storage Accounts", icon: "account_tree" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/share-links", label: "Share Links", icon: "link" },
  { href: "/audit-log", label: "Audit Log", icon: "history" },
  { href: "/recovery", label: "Recovery", icon: "restore" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/files", label: "Files", icon: "folder" },
  { href: "/upload", label: "Upload", icon: "cloud_upload" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg mx-2 my-1 px-4 py-3 transition-all duration-200 active:scale-[0.98] ${
        active
          ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      <span className={`material-symbols-outlined ${active ? "text-on-primary-container" : "text-on-surface-variant"} text-[20px]`}
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
        {icon}
      </span>
      <span className="text-body-base font-body-base">{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthChecked(true);
      if (!user) return;
      supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setProfile({ name: data?.name, email: user.email, role: data?.role });
        });
    });
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col border-r border-outline-variant bg-surface-container-lowest shadow-sm lg:flex">
        <div className="px-6 pt-6 pb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>cloud</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-primary leading-tight">SISIMPAN</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cloud Aggregator</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-custom">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(item.href)} />
          ))}
          {profile?.role === "admin" && (
            <NavLink href="/admin" label="Admin" icon="admin_panel_settings" active={isActive("/admin")} />
          )}
        </nav>

        <div className="px-4 mt-auto pb-6">
          {/* Storage Widget */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 mb-6">
            <p className="text-label-caps font-label-caps text-on-surface-variant mb-1">STORAGE</p>
            <div className="w-full bg-outline-variant h-1 rounded-full overflow-hidden mb-2">
              <div className="bg-primary w-4/5 h-full rounded-full" />
            </div>
            <button className="w-full py-2 bg-primary text-on-primary text-body-sm font-bold rounded-lg hover:brightness-110 transition-all">
              Upgrade Storage
            </button>
          </div>

          {/* User Profile */}
          {authChecked && !profile ? (
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-outline">
                <span className="material-symbols-outlined text-[20px]">login</span>
              </div>
              <span>Sign In</span>
            </Link>
          ) : profile ? (
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high transition-all cursor-pointer">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container text-sm font-bold">
                {initials(profile?.name, profile?.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">{profile?.name || profile?.email}</p>
                <p className="truncate text-[10px] text-on-surface-variant">{profile?.role === "admin" ? "Administrator" : "Member"}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant shrink-0">chevron_right</span>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Top Navbar */}
      <header className="fixed top-0 right-0 z-40 flex h-16 items-center justify-between w-[calc(100%-240px)] border-b border-outline-variant bg-surface px-6">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary text-sm font-bold">
            S
          </div>
          <span className="text-base font-bold text-on-surface">SISIMPAN</span>
        </div>
        <div className="hidden lg:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search files, folders..."
              className="w-full rounded-full bg-surface-container-low border-none py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline outline-none transition-all focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-90">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error" />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-90">
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-90"
          >
            {theme === "light" ? <span className="material-symbols-outlined text-[20px]">dark_mode</span> : <span className="material-symbols-outlined text-[20px]">light_mode</span>}
          </button>
          <div className="h-8 w-px bg-outline-variant mx-2" />
          <div className="hidden sm:flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-sm font-semibold leading-none mb-1">Administrator</p>
              <p className="text-xs text-on-surface-variant leading-none">Status: Online</p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
            {profile ? initials(profile?.name, profile?.email) : "?"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[240px] pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-outline-variant bg-surface-container-lowest px-2 py-2 lg:hidden">
        {MOBILE_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-colors ${
                active ? "text-primary" : "text-outline"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px]`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
