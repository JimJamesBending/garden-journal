"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/admin/DataTable";

interface Conversation {
  id: string;
  userName: string;
  userPhone: string;
  channel: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  media_urls: string[];
  created_at: string;
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function openConversation(id: string) {
    setSelectedId(id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/conversations?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setProfileName(data.profile?.name || "Unknown");
      }
    } catch {
      // Silent
    } finally {
      setLoadingMessages(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading conversations...</p>
      </div>
    );
  }

  // Message thread view
  if (selectedId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setSelectedId(null);
            setMessages([]);
          }}
          className="text-base text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back to conversations
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          Conversation with {profileName}
        </h1>

        {loadingMessages ? (
          <p className="text-gray-500">Loading messages...</p>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl px-4 py-3 max-w-lg ${
                  msg.role === "user"
                    ? "bg-gray-100 mr-auto"
                    : "bg-green-50 border border-green-200 ml-auto"
                }`}
              >
                <p className="text-sm text-gray-500 mb-1">
                  {msg.role === "user" ? profileName : "Hazel"}{" "}
                  <span className="text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                </p>
                <p className="text-base text-gray-800 whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg.media_urls && msg.media_urls.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {msg.media_urls.map((url, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={i}
                        src={url}
                        alt="Media"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-gray-500 text-center py-8">No messages</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Conversation list
  const columns = [
    {
      key: "userName",
      label: "User",
      render: (row: Conversation) => (
        <div>
          <p className="font-medium text-gray-900">{row.userName}</p>
          <p className="text-sm text-gray-500 font-mono">{row.userPhone}</p>
        </div>
      ),
    },
    {
      key: "channel",
      label: "Channel",
      render: (row: Conversation) => (
        <span className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-600">
          {row.channel}
        </span>
      ),
    },
    {
      key: "messageCount",
      label: "Messages",
      render: (row: Conversation) => (
        <span className="text-gray-900 font-medium">{row.messageCount}</span>
      ),
    },
    {
      key: "lastMessageAt",
      label: "Last Message",
      render: (row: Conversation) => (
        <span className="text-gray-600 text-base">
          {row.lastMessageAt
            ? new Date(row.lastMessageAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
        <p className="text-base text-gray-500 mt-1">
          {conversations.length} conversations, auto-refreshes
        </p>
      </div>
      <DataTable
        columns={columns}
        data={conversations}
        onRowClick={(row) => openConversation(row.id)}
        emptyMessage="No conversations yet"
      />
    </div>
  );
}
