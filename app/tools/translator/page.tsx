"use client";
import { useRouter } from "next/navigation";
import TranslatorTool from "../../dashboard/tools/TranslatorTool";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";
export default function TranslatorPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Translator"><TranslatorTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
