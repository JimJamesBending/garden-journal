"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "\u{1F4CA}" },
  { href: "/admin/users", label: "Users", icon: "\u{1F465}" },
  { href: "/admin/conversations", label: "Conversations", icon: "\u{1F4AC}" },
  { href: "/admin/plants", label: "Plants", icon: "\u{1F331}" },
  { href: "/admin/diagnostics", label: "Diagnostics", icon: "\u{1F527}" },
  { href: "/admin/analytics", label: "Analytics", icon: "\u{1F4C8}" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-950 text-gray-300 flex flex-col min-h-screen border-r border-gray-800">
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href="/admin" className="text-white font-bold text-lg">
          Hazel Admin
        </Link>
        <p className="text-xs text-gray-500 mt-0.5">Garden management</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-800">
        <Link
          href="/garden"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Back to garden
        </Link>
      </div>
    </aside>
  );
}
