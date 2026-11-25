"use client";
import { useRouter } from "next/navigation";
import PDFToolkitTool from "../PDFTool";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function PdfToolkitPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="PDF Tool"><PDFToolkitTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
