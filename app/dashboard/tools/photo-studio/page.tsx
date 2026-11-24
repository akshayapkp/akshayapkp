"use client";
import { useRouter } from "next/navigation";
import PhotoStudioTool from "../PhotoStudioTool";
export default function PhotoStudioPage() {
  const router = useRouter();
  return <PhotoStudioTool onClose={() => router.push("/dashboard")} />;
}
