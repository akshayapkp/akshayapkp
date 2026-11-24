"use client";
import { useRouter } from "next/navigation";
import PhotoStudioTool from "../PhotoStudioTool";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function PhotoStudioPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Photo Studio"><PhotoStudioTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
