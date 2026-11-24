"use client";
import { useRouter } from "next/navigation";
import TranslatorTool from "../TranslatorTool";
export default function TranslatorPage() {
  const router = useRouter();
  return <TranslatorTool onClose={() => router.push("/dashboard")} />;
}
