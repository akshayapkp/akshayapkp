"use client";
import { useRouter } from "next/navigation";
import AadhaarGazetteTool from "../AadhaarGazetteTool";
export default function AadhaarGazettePage() {
  const router = useRouter();
  return <AadhaarGazetteTool onClose={() => router.push("/dashboard")} />;
}
