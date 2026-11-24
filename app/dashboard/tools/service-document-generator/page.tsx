"use client";
import { useRouter } from "next/navigation";
import ServiceDocumentGeneratorTool from "../ServiceDocumentGeneratorTool";
export default function ServiceDocumentGeneratorPage() {
  const router = useRouter();
  return <ServiceDocumentGeneratorTool onClose={() => router.push("/dashboard")} />;
}
