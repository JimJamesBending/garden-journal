"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/admin/DataTable";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  plan: string;
  journalRevealed: boolean;
  plantCount: number;
  lastMessage: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (row: User) => (
        <div>
          <p className="font-medium text-white">{row.name || "Unnamed"}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: User) => (
        <span className="text-gray-400 text-sm font-mono">
          {row.phone || "-"}
        </span>
      ),
    },
    {
      key: "plantCount",
      label: "Plants",
      render: (row: User) => (
        <span className="text-white font-medium">{row.plantCount}</span>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row: User) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            row.plan === "pro"
              ? "bg-purple-900 text-purple-300"
              : row.plan === "grower"
                ? "bg-green-900 text-green-300"
                : "bg-gray-800 text-gray-400"
          }`}
        >
          {row.plan}
        </span>
      ),
    },
    {
      key: "journalRevealed",
      label: "Journal",
      render: (row: User) => (
        <span className={row.journalRevealed ? "text-green-400" : "text-gray-600"}>
          {row.journalRevealed ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "lastMessage",
      label: "Last Active",
      render: (row: User) => (
        <span className="text-gray-400 text-sm">
          {row.lastMessage
            ? new Date(row.lastMessage).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (row: User) => (
        <span className="text-gray-500 text-sm">
          {new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {users.length} total users
        </p>
      </div>
      <DataTable
        columns={columns}
        data={users}
        emptyMessage="No users yet"
      />
    </div>
  );
}
