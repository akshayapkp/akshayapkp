"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function StandaloneToolLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white text-slate-800">
      <header className="z-20 flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-3 sm:px-5">
        <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <span className="sr-only">{title}</span>
      </header>
      <section className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</section>
    </main>
  );
}
