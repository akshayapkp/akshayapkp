"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ResumeBuilderStandalonePage() {
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      if (!user?.username) window.location.replace("/login");
    } catch {
      window.location.replace("/login");
    }
  }, []);

  return (
    <main className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-100">
      <header className="z-10 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 shadow-sm sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span> Back to Dashboard
        </Link>
        <h1 className="truncate text-base font-bold text-slate-800 sm:text-lg">Resume Builder</h1>
      </header>
      <iframe
        src="/resume-builder/index.html"
        title="Resume Builder"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </main>
  );
}
