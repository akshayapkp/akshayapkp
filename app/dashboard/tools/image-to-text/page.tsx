"use client";
import { useRouter } from "next/navigation";
import ImageToTextTool from "../ImageToText";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function ImageToTextPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Image to Text"><ImageToTextTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
