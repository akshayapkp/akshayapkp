"use client";
import { useRouter } from "next/navigation";
import ServiceDocumentGeneratorTool from "../../dashboard/tools/ServiceDocumentGeneratorTool";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";
export default function ServiceDocumentGeneratorPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Service Document Generator"><ServiceDocumentGeneratorTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
