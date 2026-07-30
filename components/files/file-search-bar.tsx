"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";


const CATEGORIES = [
  { value: "all", label: "All Types" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Document" },
  { value: "other", label: "Other" },
];

const SORTS = [
  { value: "created_at:desc", label: "Newest" },
  { value: "created_at:asc", label: "Oldest" },
  { value: "name:asc", label: "Name (A-Z)" },
  { value: "name:desc", label: "Name (Z-A)" },
  { value: "original_size:desc", label: "Largest" },
  { value: "original_size:asc", label: "Smallest" },
];

export function FileSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => { e.preventDefault(); updateParams({ q: query }); }}
        className="relative min-w-[200px] flex-1 max-w-md"
      >
        <span className="material-symbols-outlined absolute left-3 top-1/2 text-[16px] -translate-y-1/2 text-outline">search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files..."
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </form>

      <select
        value={`${searchParams.get("sortBy") || "created_at"}:${searchParams.get("sortDir") || "desc"}`}
        onChange={(e) => {
          const [sortBy, sortDir] = e.target.value.split(":");
          updateParams({ sortBy, sortDir });
        }}
        className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
