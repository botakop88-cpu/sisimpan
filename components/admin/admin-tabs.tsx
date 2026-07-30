"use client";

import { useState } from "react";
import { UserManagementTable, type AdminUserRow } from "./user-management-table";
import { ActivityLogTable, type ActivityLogRow } from "./activity-log-table";

export function AdminTabs({
  users: initialUsers,
  logs,
  totalUsersCount,
}: {
  users: AdminUserRow[];
  logs: ActivityLogRow[];
  totalUsersCount: number;
}) {
  const [tab, setTab] = useState<"users" | "logs">("users");
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");

  async function handleRoleChange(userId: string, newRole: AdminUserRow["role"]) {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex border-b border-outline-variant px-5">
        <button
          onClick={() => setTab("users")}
          className={`px-5 py-3.5 text-sm font-semibold transition-all ${
            tab === "users"
              ? "border-b-2 border-primary text-primary"
              : "border-b-2 border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-5 py-3.5 text-sm font-semibold transition-all ${
            tab === "logs"
              ? "border-b-2 border-primary text-primary"
              : "border-b-2 border-transparent text-on-surface-variant hover:text-primary"
          }`}
        >
          Activity Log
        </button>
      </div>

      <div className="p-5">
        {tab === "users" ? (
          <UserManagementTable
            users={filteredUsers}
            searchValue={search}
            onSearchChange={setSearch}
            onRoleChange={handleRoleChange}
          />
        ) : (
          <ActivityLogTable logs={logs} />
        )}
      </div>

      {tab === "users" && (
        <div className="flex items-center justify-between px-5 py-3 text-xs text-on-surface-variant border-t border-outline-variant">
          <span>Showing {filteredUsers.length} of {totalUsersCount}</span>
        </div>
      )}
    </div>
  );
}
