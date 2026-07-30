"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className,
  icon,
}: {
  className?: string;
  icon?: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "w-full rounded-lg border border-outline-variant px-3 py-2 text-sm font-medium text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
      }
    >
      {icon}
      Sign Out
    </button>
  );
}
