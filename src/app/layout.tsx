import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobBlast",
  description: "High-volume job application assistant",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur">
          <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              Job<span className="text-indigo-500">Blast</span>
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-indigo-500 transition-colors">
                Dashboard
              </Link>
              <Link href="/review" className="hover:text-indigo-500 transition-colors">
                Review
              </Link>
              <Link href="/tracker" className="hover:text-indigo-500 transition-colors">
                Tracker
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
