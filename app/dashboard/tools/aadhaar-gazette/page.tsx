"use client";
import { useRouter } from "next/navigation";
import AadhaarGazetteTool from "../AadhaarGazetteTool";
import StandaloneToolLayout from "../StandaloneToolLayout";
export default function AadhaarGazettePage() {
  const router = useRouter();
  return <StandaloneToolLayout title="Aadhaar Gazette"><AadhaarGazetteTool standalone onClose={() => router.push("/dashboard")} /></StandaloneToolLayout>;
}
