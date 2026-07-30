import { useState, useRef, useEffect } from "react";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  joinedAt: string;
}

const ALL_ROLES: AdminUserRow["role"][] = ["admin", "user", "viewer"];

const ROLE_ICON: Record<AdminUserRow["role"], string> = {
  admin: "shield",
  user: "person",
  viewer: "visibility",
};

const ROLE_BADGE: Record<AdminUserRow["role"], string> = {
  admin: "bg-primary-fixed text-primary",
  user: "bg-tertiary-fixed text-tertiary",
  viewer: "bg-surface-container-high text-on-surface-variant",
};

const ROLE_LABEL: Record<AdminUserRow["role"], string> = {
  admin: "ADMIN",
  user: "USER",
  viewer: "VIEWER",
};

function RoleMenu({
  user,
  onRoleChange,
}: {
  user: AdminUserRow;
  onRoleChange: (userId: string, newRole: AdminUserRow["role"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-outline transition-colors hover:text-primary"
        aria-label={`Actions for ${user.name}`}
      >
        <span className="material-symbols-outlined text-[16px]">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
          {ALL_ROLES.map((r) => {
            const iconName = ROLE_ICON[r];
            const isActive = r === user.role;
            return (
              <button
                key={r}
                disabled={isActive}
                onClick={() => {
                  onRoleChange(user.id, r);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-primary-fixed/20 text-primary font-semibold"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{iconName}</span>
                <span className="flex-1 capitalize">{r}</span>
                {isActive && <span className="material-symbols-outlined text-[14px] text-primary">check</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UserManagementTable({
  users,
  searchValue,
  onSearchChange,
  onFilterClick,
  onRoleChange,
}: {
  users: AdminUserRow[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onFilterClick?: () => void;
  onRoleChange?: (userId: string, newRole: AdminUserRow["role"]) => void;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute top-1/2 left-3 text-[16px] -translate-y-1/2 text-outline">search</span>
          <input
            type="text"
            placeholder="Search name, email, or role..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-background py-2 pr-4 pl-10 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <button
            onClick={onFilterClick}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-3.5 py-2 text-sm font-medium transition-all hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter
          </button>
          <button className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-on-primary transition-all hover:brightness-110 active:scale-95">
            + Add New
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Name</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Email</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Role</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5">Joined</th>
              <th className="border-b border-outline-variant bg-surface-container-low px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map((u) => (
              <tr key={u.id} className="border-b border-outline-variant transition-colors hover:bg-surface-container-low">
                <td className="px-4 py-3.5 font-medium text-on-surface">{u.name}</td>
                <td className="px-4 py-3.5 text-on-surface-variant">{u.email}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_BADGE[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-on-surface-variant">{u.joinedAt}</td>
                <td className="px-4 py-3.5 text-right">
                  <RoleMenu user={u} onRoleChange={(id, r) => onRoleChange?.(id, r)} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-on-surface-variant">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
