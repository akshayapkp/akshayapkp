"use client";

import Link from "next/link";

export default function ResumeBuilderPage() {
  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f3f4f6",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 20px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: "20px" }}>Resume Builder</h1>
      </header>

      <iframe
        src="/resume-builder/index.html"
        title="Resume Builder"
        style={{
          flex: 1,
          width: "100%",
          border: "none",
        }}
      />
    </main>
  );
}