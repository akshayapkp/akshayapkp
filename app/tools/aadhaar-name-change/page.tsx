"use client";

import AadhaarNameChangePage from "../../dashboard/tools/aadhaar-name-change/page";
import StandaloneToolLayout from "../../dashboard/tools/StandaloneToolLayout";

export default function AadhaarNameCheckToolPage() {
  return (
    <StandaloneToolLayout title="Aadhaar Name Check">
      <div className="h-full min-h-0 overflow-y-auto">
        <AadhaarNameChangePage />
      </div>
    </StandaloneToolLayout>
  );
}
