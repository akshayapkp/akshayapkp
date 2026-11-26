"use client";

import { useEffect, useState } from "react";

export default function DocumentCreatorPage() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      if (!user?.username) {
        window.location.replace("/login");
        return;
      }
      setAuthorized(true);
    } catch {
      window.location.replace("/login");
    }
  }, []);

  if (!authorized) {
    return (
      <main className="flex h-[100dvh] w-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading Document Creator…
      </main>
    );
  }

  return (
    <main className="h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-50">
      <iframe
        title="Akshaya PKP Document Creator"
        src="/document-creator/index.html"
        className="block h-full w-full border-0"
        referrerPolicy="same-origin"
      />
    </main>
  );
}
