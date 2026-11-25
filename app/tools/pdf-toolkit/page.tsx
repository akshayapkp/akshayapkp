"use client";
import { useRouter } from "next/navigation";
import PDFToolkitTool from "../../dashboard/tools/PDFTool";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";
export default function PdfToolkitPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="PDF Tool"><PDFToolkitTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
