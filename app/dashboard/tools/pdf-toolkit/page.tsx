"use client";
import { useRouter } from "next/navigation";
import PDFToolkitTool from "../PDFTool";
export default function PdfToolkitPage() {
  const router = useRouter();
  return <PDFToolkitTool onClose={() => router.push("/dashboard")} />;
}
