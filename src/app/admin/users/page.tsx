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
          <p className="font-medium text-gray-900">{row.name || "Unnamed"}</p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: User) => (
        <span className="text-gray-600 text-base font-mono">
          {row.phone || "-"}
        </span>
      ),
    },
    {
      key: "plantCount",
      label: "Plants",
      render: (row: User) => (
        <span className="text-gray-900 font-medium">{row.plantCount}</span>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row: User) => (
        <span
          className={`px-2 py-0.5 rounded text-sm font-medium ${
            row.plan === "pro"
              ? "bg-purple-100 text-purple-700"
              : row.plan === "grower"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
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
        <span className={row.journalRevealed ? "text-green-600" : "text-gray-400"}>
          {row.journalRevealed ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "lastMessage",
      label: "Last Active",
      render: (row: User) => (
        <span className="text-gray-600 text-base">
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
        <span className="text-gray-500 text-base">
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
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-base text-gray-500 mt-1">
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
