"use client";

import { useEffect, useState } from "react";

export default function AffidavitWriterPage() {
  const [src, setSrc] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      if (!user?.username) {
        window.location.replace("/login");
        return;
      }
      const role = String(user.role || "staff").toLowerCase();
      setSrc(`/affidavit-writer/index.html?role=${encodeURIComponent(role)}`);
    } catch {
      window.location.replace("/login");
    }
  }, []);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-slate-100">
      {src ? (
        <iframe
          title="Akshaya PKP Affidavit and Form Writer"
          src={src}
          className="h-full w-full border-0"
          referrerPolicy="same-origin"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading Affidavit Writer…
        </div>
      )}
    </div>
  );
}
