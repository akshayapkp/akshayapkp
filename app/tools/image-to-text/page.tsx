"use client";
import { useRouter } from "next/navigation";
import ImageToTextTool from "../../dashboard/tools/ImageToText";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";
export default function ImageToTextPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Image to Text"><ImageToTextTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
