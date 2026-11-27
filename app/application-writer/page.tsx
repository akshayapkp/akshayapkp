"use client";
import { useEffect, useState } from "react";

export default function ApplicationWriterPage() {
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      if (!user?.username) { window.location.replace("/login"); return; }
      setAuthorized(true);
    } catch { window.location.replace("/login"); }
  }, []);
  if (!authorized) return <main className="flex h-[100dvh] w-full items-center justify-center bg-slate-50 text-sm text-slate-500">Loading Application Writer…</main>;
  return <main className="h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-50"><iframe title="Akshaya PKP Application Writer" src="/application-writer/index.html" className="block h-full w-full border-0" referrerPolicy="same-origin" /></main>;
}