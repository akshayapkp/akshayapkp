"use client";

function ResumeBuilder() {
  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 120px)",
        minHeight: "700px",
        overflow: "hidden",
        borderRadius: "12px",
        background: "#ffffff",
      }}
    >
      <iframe
        src="/resume-builder/index.html"
        title="Resume Builder"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}

export { ResumeBuilder };
export default ResumeBuilder;