import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Akshaya | Business Operations Hub",
  description: "A focused workspace for managing Akshaya services, staff, wallets, bills, and customer operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-[#eef4ff]">
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
