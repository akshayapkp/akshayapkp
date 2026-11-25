"use client";
import { useRouter } from "next/navigation";
import ServiceDocumentGeneratorTool from "../ServiceDocumentGeneratorTool";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function ServiceDocumentGeneratorPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Service Document Generator"><ServiceDocumentGeneratorTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
