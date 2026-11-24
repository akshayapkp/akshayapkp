"use client";
import { useRouter } from "next/navigation";
import TranslatorTool from "../TranslatorTool";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function TranslatorPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Translator"><TranslatorTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
