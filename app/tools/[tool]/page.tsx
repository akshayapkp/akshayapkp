"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import SSLCCalculatorTool from "@/app/dashboard/tools/SSLCCalculatorTool";
import PassportSize from "@/app/dashboard/tools/PassportSize";
import PhotoStudioTool from "@/app/dashboard/tools/PhotoStudioTool";
import PDFToolkitTool from "@/app/dashboard/tools/PDFTool";
import LandAreaConverterTool from "@/app/dashboard/tools/ConverterTool";
import ImageToTextTool from "@/app/dashboard/tools/ImageToText";
import TranslatorTool from "@/app/dashboard/tools/TranslatorTool";
import AadhaarGazetteTool from "@/app/dashboard/tools/AadhaarGazetteTool";
import ServiceDocumentGeneratorTool from "@/app/dashboard/tools/ServiceDocumentGeneratorTool";
import AadhaarNameChangePage from "@/app/dashboard/tools/aadhaar-name-change/page";
import "./standalone-tools.css";

const TOOL_TITLES: Record<string, string> = {
  "sslc-calculator": "SSLC Percentage Calculator",
  "photo-studio": "Photo Studio",
  "passport-size": "Passport Photo Creator",
  translator: "Smart Text Assistant",
  "pdf-toolkit": "PDF Toolkit",
  "land-area-converter": "Land Area Converter",
  "image-to-text": "Image & PDF To Text",
  "aadhaar-gazette": "Aadhaar Gazette",
  "service-document-generator": "Service Document Generator",
  "aadhaar-name-check": "Aadhaar Name Change Check",
};

export default function StandaloneDashboardToolPage() {
  const params = useParams<{ tool: string }>();
  const router = useRouter();
  const tool = String(params.tool || "");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      if (!user?.username) window.location.replace("/login");
    } catch {
      window.location.replace("/login");
    }
  }, []);

  const close = () => router.push("/dashboard");
  let content: ReactNode;

  switch (tool) {
    case "sslc-calculator": content = <SSLCCalculatorTool onClose={close} />; break;
    case "photo-studio": content = <PhotoStudioTool onClose={close} />; break;
    case "passport-size": content = <PassportSize onClose={close} />; break;
    case "translator": content = <TranslatorTool onClose={close} />; break;
    case "pdf-toolkit": content = <PDFToolkitTool onClose={close} />; break;
    case "land-area-converter": content = <LandAreaConverterTool onClose={close} />; break;
    case "image-to-text": content = <ImageToTextTool onClose={close} />; break;
    case "aadhaar-gazette": content = <AadhaarGazetteTool onClose={close} />; break;
    case "service-document-generator": content = <ServiceDocumentGeneratorTool onClose={close} />; break;
    case "aadhaar-name-check": content = <AadhaarNameChangePage />; break;
    default: content = <div className="flex h-full items-center justify-center text-sm text-slate-500">Tool not found.</div>;
  }

  return (
    <main className="standalone-tool-shell">
      <header className="standalone-tool-header">
        <button type="button" onClick={close} className="standalone-tool-back">← Back to Dashboard</button>
        <h1>{TOOL_TITLES[tool] || "Akshaya PKP Tool"}</h1>
      </header>
      <section className="standalone-tool-stage">{content}</section>
    </main>
  );
}
