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
    <div className="-m-3 h-[calc(100vh-64px)] min-h-[680px] overflow-hidden bg-slate-100 sm:-m-4 lg:-m-5 xl:-m-6">
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
