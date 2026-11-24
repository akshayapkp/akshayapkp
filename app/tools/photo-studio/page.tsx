"use client";
import { useRouter } from "next/navigation";
import PhotoStudioTool from "../../dashboard/tools/PhotoStudioTool";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";
export default function PhotoStudioPage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Photo Studio"><PhotoStudioTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
