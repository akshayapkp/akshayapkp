"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: 520, width: "100%", padding: 32, border: "1px solid #e2e8f0", borderRadius: 24, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Akshaya Centre</h1>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>An unexpected error occurred. Please try again.</p>
            <button onClick={() => reset()} style={{ border: 0, borderRadius: 12, padding: "10px 18px", cursor: "pointer" }}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
