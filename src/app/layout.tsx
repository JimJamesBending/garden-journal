import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Garden Journal — Bristol 2025",
  description:
    "Tracking seedlings from sowing to harvest. A living photo log of what grows in Bristol.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Garden",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1f0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} font-body antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-moss-800/50 px-6 py-4">
            <nav className="max-w-6xl mx-auto flex items-center justify-between">
              <a href="/" className="group">
                <h1 className="font-display text-2xl font-light text-parchment-300 group-hover:text-parchment-200 transition-colors">
                  Garden Journal
                </h1>
                <p className="font-mono text-xs text-moss-500 tracking-wider uppercase">
                  Bristol &middot; 2025
                </p>
              </a>
              <div className="flex gap-6 font-mono text-sm text-moss-400">
                <a
                  href="/"
                  className="hover:text-parchment-300 transition-colors"
                >
                  Plants
                </a>
                <a
                  href="/garden"
                  className="hover:text-parchment-300 transition-colors"
                >
                  Portal
                </a>
              </div>
            </nav>
          </header>

          <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
            {children}
          </main>

          <footer className="border-t border-moss-800/50 px-6 py-6">
            <div className="max-w-6xl mx-auto text-center font-mono text-xs text-moss-600">
              <p>Sown with care in Bristol</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
