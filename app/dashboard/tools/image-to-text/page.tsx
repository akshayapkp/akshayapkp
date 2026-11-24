"use client";
import { useRouter } from "next/navigation";
import ImageToTextTool from "../ImageToText";
export default function ImageToTextPage() {
  const router = useRouter();
  return <ImageToTextTool onClose={() => router.push("/dashboard")} />;
}
