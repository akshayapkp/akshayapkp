import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akshaya Pookiparamba",
  description: "A focused workspace for managing Akshaya services, staff, wallets, bills, and customer operations.",
  icons: {
    icon: "/akshaya-logo.png",
    shortcut: "/akshaya-logo.png",
    apple: "/akshaya-logo.png",
  },
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
